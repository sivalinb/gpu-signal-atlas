# Architecture and Design

## System context

```mermaid
flowchart TB
    U[GPU platform engineer]
    W[GPU Signal Atlas website]
    A[Server-only analysis API]
    C[Curated evidence corpus]
    P[Pinecone versioned namespace]
    E[Evaluation suite]
    F[Fluent Bit replay]
    O[OpenTelemetry Collector]

    U -->|pastes telemetry| W
    W -->|same-origin POST| A
    C -->|reviewed fields and BM25| A
    P -->|dense candidates| A
    A -->|grounded result or refusal| W
    E -->|regression expectations| A
    F -. optional OTLP logs .-> O
    O -. normalized replay .-> U
```

The deployed application keeps input and rendering in the browser but performs retrieval through a same-origin server route. That route is the only component allowed to use the Pinecone credential. The credential-free command-line path and checked-in vector index remain available for deterministic regression testing and ablations.

## Component architecture

```mermaid
flowchart LR
    subgraph Input
      A[Raw log / metric text]
      B[Sample replays]
    end

    subgraph Retrieval core
      X[Signal extractor]
      T[Tokenizer]
      V[256d feature-hash query embedding]
      P[Pinecone versioned document namespace]
      L[Checked-in offline index]
      M[BM25]
      R[Dense and sparse ranks]
      F[RRF + contextual boosts]
    end

    subgraph Answer boundary
      K[Known-identifier check]
      G[Structured generator]
      Q[Refusal generator]
      Z[Citation validator]
    end

    subgraph Surfaces
      UI[React website]
      CLI[CLI JSON output]
      EV[Evaluation runner]
    end

    A --> X
    B --> X
    X --> T
    T --> V
    P --> R
    L -. offline evaluation .-> R
    T --> M
    V --> R
    M --> R
    R --> F
    X --> K
    F --> K
    K -->|supported| G
    K -->|unsupported| Q
    G --> Z
    Z --> UI
    Z --> CLI
    Z --> EV
    Q --> UI
    Q --> CLI
    Q --> EV
```

## Data model

Each corpus entry is a structure-aware chunk:

```ts
interface CorpusDocument {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  authority: 'official' | 'internal';
  signalTypes: ('xid' | 'metric' | 'pipeline' | 'runbook')[];
  identifiers: string[];
  gpuModels: string[];
  driverBranches: string[];
  updated: string;
  provenance: {
    sourceVersion: string;
    retrievedAt: string;
    sourceSection: string;
    curatedContentHash: string;
    reviewStatus: 'curated-demo-review';
  };
  content: string;
  documentedMeaning: string;
  nextEvidence: string[];
  limitations: string[];
}
```

This model is deliberately richer than a plain text chunk. Exact identifiers drive retrieval, while the three answer fields restrict generation to reviewed content.

## Retrieval design

### Tokenization

The tokenizer lowercases text, preserves underscores and telemetry punctuation, and removes one-character noise. A name such as `DCGM_FI_DEV_GPU_TEMP` remains one searchable token.

### Dense encoding and vector storage

The embedding stage creates a 256-dimensional deterministic feature-hash vector:

1. Generate unigram and adjacent-bigram features.
2. Hash each feature with FNV-1a.
3. Select a vector bucket and signed direction from the hash.
4. Apply logarithmic term-frequency weighting.
5. L2-normalize the vector.

The representation is reproducible and suitable for controlled retrieval experiments. The production sync workflow upserts reviewed document vectors and metadata into the `corpus-2026-08-31` Pinecone namespace. Query vectors are computed by the server route and submitted to Pinecone for cosine search. The checked-in `core/generated/vector-index.ts` remains an offline baseline; CI verifies its dimensions, corpus fingerprint, record coverage, and numerical equivalence. Pinecone changes storage and serving, not the semantic quality of the embedding itself.

### BM25

For query term `q` in document `d`, the implementation uses:

```text
IDF(q) × TF(q,d) × (k1 + 1)
────────────────────────────────────
TF(q,d) + k1 × (1 - b + b × |d|/avgdl)
```

with `k1 = 1.5` and `b = 0.75`.

### Rank fusion

Dense cosine ranks and BM25 ranks are combined using reciprocal-rank fusion:

```text
RRF(d) = 1 / (60 + sparse_rank(d)) + 1 / (60 + dense_rank(d))
```

The system then adds bounded terms for:

- exact Xid or DCGM identifier matches;
- matching GPU model;
- matching driver branch;
- normalized lexical score; and
- normalized vector similarity.

Scores are ranking features, not probabilities. The UI reports a categorical evidence strength and exposes the trace ID, execution time, corpus version, and decision reasons; it never presents a ranking score as diagnostic probability.

## Refusal design

```mermaid
flowchart TD
    A[Input] --> B{At least 8 characters?}
    B -->|No| R[Refuse]
    B -->|Yes| C[Extract exact signals]
    C --> D{Unknown Xid or DCGM field?}
    D -->|Yes| R
    D -->|No| E[Hybrid retrieval]
    E --> F{Exact supported signal or explicit supported semantic intent?}
    F -->|No| R
    F -->|Yes| G[Generate from top evidence]
    R --> H[Ask for exact identifier and environment context]
```

The refusal response intentionally contains no citations because no evidence cleared the answer boundary.

## Citation contract

A generated answer is valid only when:

1. its document ID exists in the corpus;
2. the same ID appears in the current retrieval result; and
3. its URL is taken directly from that corpus record.
4. the documented meaning exactly matches a cited record field; and
5. every evidence step and limitation is reproduced from one of the cited records.

The evaluation runner checks citation membership and field-level claim grounding for every non-refused answer.

## Optional LLM generation boundary

The public and evaluated path uses the deterministic template. `core/llm.ts` adds an optional server-side OpenAI-compatible composer that receives only the top-three reviewed evidence records and requests a strict JSON schema. A second validation layer rejects unknown citation IDs, unexpected fields, paraphrased unsupported claims, and any output that cannot be reproduced from cited structured fields. Unknown telemetry refuses before a provider call, and no credential is exposed to the browser.

## Ingestion and freshness boundary

`ingestion/source-manifest.ts` is the source allow-list. `npm run ingest` fetches one selected source or cleans a local HTML capture and writes a candidate snapshot. It does not mutate the operational corpus. `npm run freshness` validates allow-list coverage, HTTPS, curated-content fingerprints, and seven-day official-source or 30-day internal-source review SLAs. An approved corpus change must rebuild the offline baseline, upsert a new Pinecone namespace, pass both evaluations, and only then promote the namespace configuration.

## Compatibility behavior

When an input names a GPU model or driver branch and the selected document contains a restricted applicability list, the response adds a compatibility note if there is no overlap. It does not remove the source because the identifier may still be useful; it marks the uncertainty for operator review.

## Website design

The website is a working surface, not a marketing landing page. The first viewport contains:

- sample selectors;
- a raw telemetry editor;
- the analysis action;
- a live retrieval trace; and
- the full cited answer or refusal.

The graphite and mint visual system references telemetry terminals, signal traces, and evidence highlighting. The primary green is reserved for grounded/active information; amber indicates uncertainty or refusal.

## Security and privacy

- Analysis is sent only to the same-origin server route and is not persisted by the application.
- The Pinecone API key is a server secret and is never bundled into browser JavaScript.
- Submitted telemetry is used as a transient query vector; no raw telemetry record is upserted into the documentation index.
- No input is transmitted to a model provider.
- No secret is included in the repository.
- External links are static authoritative documentation URLs.
- Observability configuration outputs to localhost only.
- The optional replay ends at the OpenTelemetry Collector debug exporter; the browser analyzer accepts copied or pasted text and is not wired to that collector.
- CI requires tests, evaluation, type checking, linting, and a production build.

## Key design decisions

| Decision | Reason | Tradeoff |
|---|---|---|
| Persistent deterministic local index | Credential-free, reproducible evaluation without per-query document embedding | Weaker semantic generalization than a trained model; rebuild required after corpus change |
| Structured corpus records | Exact identifiers and bounded generation | Manual curation effort |
| RRF rather than raw-score mixing | Dense and sparse scores have different scales | Rank positions lose some score magnitude |
| Template generation | Complete citation traceability | Less conversational flexibility |
| Hard unknown-ID refusal | Prevents adjacent-identifier hallucination | Cannot answer new identifiers until corpus refresh |
| Browser-resident corpus | Private, instant demo | Not appropriate for a large enterprise corpus |

## Replacement boundaries

The following functions form stable seams:

- `embed(text)` can be replaced by a provider or local sentence transformer.
- `retrieve(query)` can call Qdrant, OpenSearch, or another hybrid index.
- `analyzeTelemetry(query)` can pass validated evidence to an LLM JSON-schema generator.
- The `SignalAnalysis` interface can remain unchanged across those upgrades.
