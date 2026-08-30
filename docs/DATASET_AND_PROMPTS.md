# Dataset, Chunking, Generation Instructions, and Iterations

## Corpus overview

The demonstration corpus contains compact, structure-aware records derived from authoritative public documentation and two clearly labeled demonstration runbooks.

| Source family | Coverage | Authority |
|---|---|---|
| NVIDIA Xid Errors | Xids 13, 31, 43, 48, 79, and 154 | Official |
| NVIDIA DCGM | PCIe replay, temperature, power, ECC, exporter selection and health | Official |
| NVIDIA GPU Operator | Kubernetes DCGM Exporter deployment and workload mapping | Official |
| Fluent Bit Manual | Kubernetes metadata enrichment and OpenTelemetry output | Official |
| OpenTelemetry Specification | Semantic conventions across telemetry signals | Official |
| GPU Signal Atlas runbooks | Xid 79 and ECC evidence bundles | Internal demonstration |

## Source-of-truth boundary

The corpus paraphrases source material. The linked vendor/specification URL remains authoritative. Each record carries:

- stable local ID;
- title and source;
- source URL and authority;
- signal types;
- exact identifiers;
- optional GPU and driver applicability;
- curated retrieval content;
- documented meaning;
- evidence to collect next; and
- explicit limitations.

The application never silently treats a demonstration runbook as an official vendor definition.

## Ingestion and cleaning design

The production ingestion design is:

1. Fetch only allow-listed documentation URLs.
2. Record source URL, fetch timestamp, document version, and content hash.
3. Remove navigation, cookie banners, repeated page chrome, and unrelated cross-links.
4. Preserve headings, tables, code blocks, field names, units, model applicability, and version notes.
5. Convert catalog rows and DCGM field rows into one structured record per identifier.
6. Keep narrative troubleshooting sections as heading-aware chunks.
7. Validate that every chunk contains a human-readable title and canonical source URL.
8. Reject duplicate IDs and non-HTTPS citations.

The checked-in project uses reviewed static records so evaluation cannot change when an external page changes.

## Freshness strategy

For a production corpus:

- refresh official documentation weekly;
- compare the content hash before re-embedding;
- preserve old versions when driver or GPU applicability changes;
- run the evaluation suite after every corpus update;
- require review when an exact identifier changes meaning or recommended action; and
- display corpus version and staleness in the UI.

The demonstration corpus uses explicit `updated` metadata but does not make network requests.

## Chunking comparison

### Rejected baseline: fixed 500-token chunks

Problems:

- several Xids could occur in one chunk;
- the correct identifier might be far from its action or applicability cells;
- citations would point to overly broad text;
- table structure and units could be lost; and
- one retrieved chunk could mix unrelated failure classes.

### Selected strategy: structure-aware identifier chunks

- one Xid or metric concept per record;
- exact identifier metadata outside the prose;
- short reviewed meaning and limitations;
- separate evidence-collection steps; and
- source/authority metadata attached to every record.

This design is the main reason exact query retrieval is stable in the small corpus.

## Embedding choice

The local build uses a deterministic 256-dimensional feature-hash embedding of unigrams and adjacent bigrams. It was selected because it:

- works offline and without credentials;
- runs in a browser and Node;
- produces reproducible vectors for tests;
- demonstrates a replaceable vector-retrieval stage; and
- avoids implying that a paid model call was made.

Its limitation is weak semantic generalization. The BM25 and curated synonym-rich content compensate for the evaluated query set. A production extension should compare this baseline against an approved sentence embedding on the same labels.

## Retrieval instruction

The retrieval algorithm is code rather than a free-form prompt:

```text
1. Extract exact Xid/DCGM identifiers and compatibility fields.
2. Compute query embedding and BM25 terms.
3. Rank every corpus document in both views.
4. Fuse ranks with RRF(k=60).
5. Boost exact identifier, GPU-model, and driver matches.
6. Return the top five and preserve both source ranks.
```

## Generator instruction

The structured generator follows this contract:

```text
Use only fields from retrieved corpus records.
Prefer an official record for the lead documented meaning.
Do not convert a possible interpretation into a confirmed fact.
Copy evidence steps only from retrieved records.
Copy limitations only from retrieved records.
Attach citations only to documents present in the current retrieval result.
If an exact identifier is unknown, refuse and request more context.
Never recommend or execute a reset, drain, reboot, restart, or hardware replacement.
```

The implementation uses a deterministic template, not an LLM, so compliance is directly testable.

## Representative build prompts

These prompts summarize the design work used to create the project:

1. Design a GPU observability RAG application that is clearly different from a multi-signal incident agent.
2. Make numeric Xids and long DCGM field names first-class retrieval metadata.
3. Combine exact keyword retrieval with a local vector baseline and expose both ranks.
4. Generate a signal card that separates documented meaning, evidence to collect, and limitations.
5. Refuse unknown identifiers instead of retrieving a semantically adjacent GPU error.
6. Label synthetic telemetry and internal runbooks honestly.
7. Build independent evaluation labels and measure Recall@5, MRR, citation validity, refusal quality, and latency.
8. Provide a working website, CI, observability replay, visual guide, local testing guide, and five-minute demo script.

## Major iterations

1. **Generic GPU search** — rejected because symptom similarity could overpower exact identifiers.
2. **Dense-only retrieval** — replaced by hybrid retrieval so Xids and DCGM names remain exact.
3. **Unstructured chunks** — replaced by one identifier per structured record.
4. **Always-answer behavior** — replaced by a hard unknown-identifier refusal.
5. **Opaque confidence** — retrieval trace now exposes sparse and vector ranks.
6. **Unlabeled runbooks** — authority is now explicit on every citation.
7. **Model-generated prose** — replaced by deterministic structured generation for reproducible evaluation.
8. **Static mockup** — replaced by a live browser analysis that runs the real retrieval core.

## Learnings

- Exact telemetry identifiers need sparse retrieval even when vector search is available.
- Small, well-structured chunks can outperform a larger corpus of poorly segmented pages on a bounded task.
- Compatibility metadata belongs in retrieval and answer presentation, not only in prose.
- Refusal labels must be tested alongside positive retrieval labels.
- A transparent baseline is more defensible than an unverifiable model-quality claim.
- Corpus authority and answer authority are distinct: internal operational guidance can complement, but not redefine, vendor facts.
