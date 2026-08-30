# GPU Signal Atlas — Week 2 Project Documentation

## Project overview

GPU Signal Atlas is a retrieval-augmented application for GPU platform engineers. It explains NVIDIA Xid events, DCGM metrics, and related observability-pipeline behavior using a curated corpus of official documentation and demonstration runbooks.

The user pastes a raw GPU log or metric snapshot into the website. The application extracts exact telemetry identifiers, performs dense and sparse retrieval, fuses and reranks the results, then builds a cited signal card containing:

- extracted identifiers and environment metadata;
- documented meaning;
- additional evidence to collect;
- compatibility warnings;
- explicit limitations; and
- direct source citations.

If an exact identifier is absent from the corpus, the application refuses rather than substituting a similar event.

## One-liner

GPU Signal Atlas helps GPU platform engineers explain NVIDIA Xid events and DCGM metric anomalies from version-pinned official documentation and internal runbooks through a web application with measurable retrieval, citation, refusal, and latency targets.

## Why this problem

GPU logs contain exact but opaque identifiers. The meaning is spread across vendor catalogs, field references, deployment guides, log-processing documentation, and internal procedures. Operators frequently spend time searching those sources manually and can accidentally describe a symptom as a confirmed root cause.

The project focuses on the retrieval layer that prevents that error. It is not another autonomous incident-investigation agent and does not perform remediation.

## Dataset used

The checked-in corpus contains 17 reviewed, structure-aware records covering:

- NVIDIA Xids 13, 31, 43, 48, 79, and 154;
- DCGM PCIe replay, temperature, power, ECC, exporter selection, Xid count, and health signals;
- NVIDIA GPU Operator telemetry deployment;
- Fluent Bit Kubernetes enrichment and OTLP output;
- OpenTelemetry semantic conventions; and
- two demonstration evidence-collection runbooks.

Official entries link directly to NVIDIA, Fluent Bit, or OpenTelemetry documentation. Internal runbooks are labeled separately.

Synthetic telemetry replays are used for the demo so no production logs, credentials, or GPU hardware are required.

## Ingestion, cleaning, and freshness

The production design fetches allow-listed sources, records version and content hash, removes page chrome, preserves tables and code, and creates one structured record per Xid or DCGM field. The demonstration freezes reviewed records so evaluation stays reproducible.

Official pages should be refreshed weekly in a production extension. Any changed identifier meaning or applicability should trigger human review and the complete regression suite.

## Chunking and embedding

Fixed-size chunks were rejected because one chunk could contain multiple Xids or lose table-row relationships. The selected strategy creates one identifier-centered record with separate meaning, evidence, and limitation fields.

The application computes a 256-dimensional local feature-hash embedding over unigrams and adjacent bigrams. This credential-free baseline runs in both Node and the browser. BM25 provides exact keyword retrieval, especially for numeric Xids and long DCGM field names.

## Retrieval and reranking

Dense and sparse ranks are combined with reciprocal-rank fusion. The final score adds bounded boosts for exact identifiers, matching GPU models, and matching driver branches. The top five are returned; the website exposes the sparse and vector rank of the leading evidence.

## Generation and refusal

Generation is deterministic and structured. It selects an official retrieved record for the leading meaning when available, combines evidence and limitations only from retrieved records, and attaches only retriever-backed citations.

The system refuses when:

- the input is too short;
- an exact Xid or DCGM identifier is unknown;
- the input lacks GPU/observability domain language; or
- the retrieval score does not cross the evidence boundary.

## Prompts and instructions

Representative design instructions included:

1. Make exact Xids and DCGM names first-class retrieval metadata.
2. Combine BM25 with a deterministic local embedding.
3. Expose retrieval ranks so results are inspectable.
4. Keep official definitions distinct from internal runbooks.
5. Generate only from retrieved structured fields.
6. Refuse unknown identifiers with zero citations.
7. Test successful retrieval and refusal behavior independently.

The final implementation does not call a generative model, so no hidden prompt or API output is presented as real evidence.

## Iterations tried

- Replaced dense-only retrieval with hybrid retrieval.
- Replaced fixed-length narrative chunks with identifier-centered records.
- Added exact identifier boosts after observing numeric ambiguity.
- Expanded Xid parsing to support parenthesized PCI bus syntax.
- Added a domain-language gate after an unrelated question received a weak RRF result.
- Added compatibility notes for model/driver mismatches.
- Exposed sparse and vector ranks in the browser.
- Added a hard refusal example to the primary demo.

## Evaluation

Twenty-five independent cases cover exact identifiers, semantic symptoms, multi-source questions, and unsupported inputs.

Recorded result:

| Metric | Result |
|---|---:|
| Recall@5 | 100.0% |
| MRR | 0.931 |
| Citation validity | 100.0% |
| Refusal precision | 100.0% |
| Refusal recall | 100.0% |
| p95 local latency | 4.96 ms |

The full test suite contains 13 passing tests. These results validate the checked-in regression set only.

## Observability integration

The repository contains a Fluent Bit tail/parser configuration and an OpenTelemetry Collector OTLP receiver with debug output. It replays a synthetic Xid 79 log through `http://127.0.0.1:4318/v1/logs`.

This optional path shows how GPU telemetry can be normalized and transported. It is separate from the deterministic RAG evaluation so the project works on any laptop.

## User interface

The first viewport is a working analysis surface rather than a marketing page. It contains four replay buttons, editable telemetry, a live retrieval trace, grounded/refusal output, evidence steps, limitations, and citations.

Below the analyzer, the website explains the five-stage RAG flow, optional telemetry pipeline, safety contract, evaluation metrics, query mix, and local commands.

## Learnings

- Hybrid retrieval is especially valuable when a domain mixes natural language and exact machine identifiers.
- Chunk topology can matter more than corpus size.
- Refusal quality requires labeled negative queries.
- Retrieval confidence should not be described as diagnostic probability.
- Structured generation makes citation validation straightforward.
- A small reproducible baseline is more defensible than an unverified claim about live model accuracy.

## Limitations

- Small, manually curated corpus
- Synthetic telemetry fixtures
- Local feature-hash embedding rather than a trained semantic model
- Template generator rather than an LLM
- No live observability backend
- No production action or remediation
- No generalized GPU diagnostic-accuracy claim

## Deliverables

- Working interactive website
- Complete source repository
- Automated tests and CI
- Evaluation runner and report
- Architecture and visual flow documentation
- Dataset, prompts, iterations, and learnings
- Fluent Bit/OpenTelemetry replay assets
- Local setup and verification guide
- Five-minute demo script
