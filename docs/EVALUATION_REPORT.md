# Evaluation Report

## Objective

Measure whether GPU Signal Atlas retrieves the expected corpus evidence, keeps citations tied to retrieved documents, refuses unsupported inputs, and meets latency targets for both the offline baseline and Pinecone-backed production path.

## Evaluation boundary

The results apply only to:

- the checked-in curated corpus;
- the deterministic embedding and ranking implementation using either the checked-in index or Pinecone namespace;
- the 31 independently defined query expectations; and
- the local Node runtime used for the recorded run.

They do not measure broad GPU-diagnostic accuracy, production telemetry coverage, or LLM answer quality.

## Dataset

`evaluation/cases.ts` contains 31 cases:

| Category | Count | Purpose |
|---|---:|---|
| Exact identifiers | 11 | Xids and DCGM field names |
| Semantic symptoms | 10 | Equivalent natural-language descriptions |
| Multi-source | 1 | Xid + metric + runbook evidence |
| Unanswerable | 3 | Unknown identifiers and unrelated questions |
| Hard negatives | 6 | In-domain vocabulary that is outside the supported corpus scope |

Expected document IDs are outside the operational corpus records. The retrieval engine never reads an expected answer.

## Metrics

### Recall@5

Fraction of expected document IDs that appear in the top five results.

### Mean reciprocal rank

Average inverse rank of expected evidence. An expected document at rank one contributes `1.0`; rank two contributes `0.5`.

### Citation validity

Fraction of generated citations whose IDs both exist in the corpus and appear in the same query’s retrieval result.

### Claim grounding

Fraction of non-refused answers whose lead meaning, evidence steps, and limitations are reproduced exactly from the cited structured corpus fields.

### Refusal precision

Fraction of refusals that correspond to a case labeled unanswerable.

### Refusal recall

Fraction of labeled unanswerable cases that the system refused.

### Latency

Wall-clock duration of extraction, embedding, retrieval, reranking, and structured generation. The local measurement excludes network access. The Pinecone measurement includes the managed-index network query and therefore represents the production retrieval path more closely.

## Recorded result

Command:

```bash
npm run evaluate
```

Output:

```text
GPU Signal Atlas evaluation
Cases: 31
Recall@5: 100.0%
MRR: 0.931
Citation validity: 100.0%
Claim grounding: 100.0%
Refusal precision: 100.0%
Refusal recall: 100.0%
Latency p50: 0.49 ms
Latency p95: 0.92 ms
Failures: 0
```

The managed-index command:

```bash
npm run evaluate:pinecone
```

Recorded Pinecone result:

```text
GPU Signal Atlas Pinecone evaluation
Cases: 31
Recall@5: 100.0%
MRR: 0.931
Citation validity: 100.0%
Refusal precision: 100.0%
Refusal recall: 100.0%
Latency p50: 171.59 ms
Latency p95: 518.05 ms
Failures: 0
```

Latency varies by machine and network. Both paths remain well inside the five-second acceptance threshold.

## Ablation evidence

`npm run ablate` evaluates retrieval changes independently of refusal and generation. The checked-in report compares BM25-only, vector-only, RRF, hybrid-plus-contextual-rerank, fixed 90-token source windows, and structure-aware identifier records. See [`ABLATION_REPORT.md`](ABLATION_REPORT.md).

The recorded run shows 100% Recall@5 and 0.931 MRR for BM25 and hybrid-plus-rerank, while the vector-only baseline reaches 91.7% and 0.753. Structure-aware records reach 100% and 0.931 versus 91.7% and 0.896 for fixed windows.

## What the tests verify

- tokenizer preserves exact telemetry identifiers;
- local embeddings are deterministic and normalized;
- extraction deduplicates Xids, DCGM fields, model, and driver;
- exact Xid and metric queries rank the corresponding evidence first;
- all generated citations come from the retrieval result;
- unknown Xids and metrics refuse with zero citations;
- unrelated questions refuse;
- model/driver incompatibility adds a warning;
- corpus IDs are unique, source URLs use HTTPS, and every record has review provenance;
- result count is bounded; and
- Pinecone requests preserve the namespace, stable IDs, 256-dimensional vectors, and reviewed metadata;
- the Pinecone path reports its backend and namespace in diagnostics;
- the complete evaluation set meets retrieval and refusal targets.

## Failure analysis

Two defects were found during implementation and fixed before this report:

### Common NVIDIA Xid syntax was not fully parsed

Initial extraction handled `Xid 79` but not the common form `Xid (PCI:0000:65:00): 79`. That allowed an unknown Xid in the longer form to bypass the exact-identifier refusal. The extractor now explicitly handles the parenthesized PCI segment, and a regression case covers it.

### In-domain vocabulary could receive a weak lexical match

Because RRF always assigns a rank, an unrelated question—or even an unsupported Kubernetes, OpenTelemetry, Prometheus, GPU, or PCIe question—can still have a top document. The refusal gate now requires either a supported exact identifier or a supported semantic intent that also appears in the top retrieved evidence. Six hard-negative regression cases cover this boundary.

These failures demonstrate why refusal behavior must be evaluated independently of successful queries.

## Recommended next evaluation

1. Expand to at least 100 independently authored cases.
2. Add more hard negatives with paraphrases and valid numbers used outside an Xid context.
3. Compare fixed chunks against the structure-aware corpus.
4. Compare dense-only, BM25-only, hybrid, and hybrid-plus-rerank.
5. Have a GPU SME grade factual entailment and action safety.
6. Add real de-identified incident evidence with hardware and driver diversity.
7. Measure corpus-update regressions across version snapshots.
