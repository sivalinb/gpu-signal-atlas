# Retrieval and Chunking Ablation Report

Generated with `npm run ablate -- --write` against the checked-in 31-case expectation set.

## Retrieval strategy comparison

| Variant | Corpus records | Recall@5 | MRR |
|---|---:|---:|---:|
| BM25 only | 27 | 100.0% | 0.931 |
| Vector only | 27 | 83.3% | 0.692 |
| Hybrid RRF | 27 | 95.8% | 0.826 |
| Hybrid + contextual rerank | 27 | 100.0% | 0.951 |

The comparison separates exact sparse matching, feature-hash vector similarity, reciprocal-rank fusion, and the final contextual boosts. Scores measure retrieval only; refusal and generation remain covered by the main evaluation.

## Chunking strategy comparison

| Variant | Corpus records | Recall@5 | MRR |
|---|---:|---:|---:|
| Fixed 90-token source windows | 30 | 91.7% | 0.896 |
| Structure-aware identifier records | 27 | 100.0% | 0.951 |

The fixed baseline concatenates records by source page, splits them into 90-token windows with 15-token overlap, and therefore permits multiple identifiers to share a chunk. The selected corpus keeps one Xid or metric concept per reviewed record with attached authority, evidence, and limitations.

## Interpretation

- BM25 is the strongest exact-identifier baseline.
- The local vector stage adds symptom-language recall but is intentionally weaker than a trained semantic model.
- RRF combines complementary ranks without mixing incomparable raw scores.
- Contextual exact-ID, model, and driver boosts improve ordering for telemetry-shaped input.
- Structure-aware records preserve citation precision and answer-field boundaries even when Recall@5 is similar on this small corpus.

These are regression results for a curated demonstration corpus, not generalized GPU-diagnostic accuracy.
