# Detailed Problem Statement and Solution

## Executive summary

GPU failure telemetry is precise enough for machines but frequently too compressed for humans. A log line such as `Xid 79` or a metric such as `DCGM_FI_DEV_PCIE_REPLAY_COUNTER` contains an exact identifier, yet the surrounding diagnostic meaning is distributed across vendor catalogs, field references, Kubernetes deployment documentation, log-pipeline manuals, and organization-specific runbooks.

GPU Signal Atlas solves that retrieval problem. It accepts a small telemetry snapshot, extracts stable identifiers and environment metadata, retrieves the most relevant official and internal evidence, and produces a cited signal card. It explicitly distinguishes documented meaning from possible interpretation and refuses when its local corpus cannot support an answer.

## Users

### Primary user

A GPU platform engineer or SRE responding to an alert, support ticket, or failed training/inference workload.

### Secondary users

- An application engineer who needs to package useful evidence before escalating
- A support engineer explaining a GPU event to another team
- An observability engineer validating a Fluent Bit or OpenTelemetry pipeline
- A technical leader evaluating whether a GPU symptom has sufficient evidence for disruptive action

## The current workflow problem

1. An operator sees an opaque Xid or DCGM metric.
2. Exact vendor identifiers are searched manually across several documentation products.
3. Search results often omit hardware, driver, or cumulative-counter context.
4. A plausible explanation is copied into an incident channel without a citation.
5. A symptom is accidentally presented as a root cause.
6. Operators repeat the same evidence-gathering work during the next incident.

This is not primarily a language-model problem. It is a retrieval-quality and evidence-boundary problem.

## Why ordinary semantic search is insufficient

- Numeric identifiers such as `79` or `154` are poor semantic features without the `Xid` label.
- DCGM identifiers must match exactly; a near semantic neighbor can describe a different unit or lifetime.
- A cumulative counter needs a delta and time window, not merely a definition.
- Vendor applicability can depend on GPU generation and driver branch.
- Internal runbooks may be operationally useful but must not override the vendor definition.
- Unsupported identifiers require refusal, not a semantically adjacent guess.

## Solution principles

### 1. Exact identifiers are first-class

The extractor identifies Xids, DCGM fields, GPU models, and driver branches before retrieval. Matching corpus identifiers receive an explicit boost.

### 2. Sparse and vector retrieval are complementary

BM25 preserves exact tokens and field names. Pinecone serves dense candidates from the deterministic embedding to support phrase and symptom overlap. Reciprocal-rank fusion combines both without pretending either score is a calibrated probability.

### 3. Official meaning outranks local interpretation

The generator chooses an official retrieved document for the lead definition when available. Internal runbooks contribute evidence-collection steps but remain labeled `internal`.

### 4. Generation is bounded by structured evidence

The generated signal card is assembled only from `documentedMeaning`, `nextEvidence`, and `limitations` fields on retrieved documents. Citation IDs must appear in the retrieval result.

### 5. Refusal is a product feature

An unknown Xid or DCGM field causes a hard refusal. The response asks for a complete identifier and environment context rather than inventing an explanation.

## Functional requirements

| Requirement | Implementation |
|---|---|
| Accept raw GPU telemetry | Browser textarea and CLI argument |
| Parse exact identifiers | Regex-based Xid, DCGM, GPU, and driver extraction |
| Embed query and corpus | Deterministic 256-dimensional feature hashing with Pinecone storage |
| Sparse retrieval | BM25 with document-frequency weighting |
| Hybrid ranking | Reciprocal-rank fusion plus explicit boosts |
| Generate grounded result | Structured signal-card template |
| Cite evidence | Direct official/internal source links |
| Refuse unsupported requests | Unknown-identifier and domain-threshold checks |
| Explain retrieval | Browser trace displays top rank and sparse/vector positions |
| Evaluate quality | 100 owner-reviewed primary cases plus a separate 16-case post-change holdout; independent GPU-SME review remains pending |
| Protect credentials | Pinecone key is server-only; no client-side secret or model key |

## Non-functional requirements

- Deterministic output for reproducible evaluation
- Pinecone-backed p95 analysis under five seconds for the demonstration corpus
- No production writes or operational side effects
- Source and authority visible to the user
- Responsive, keyboard-accessible website
- Node 22-compatible tests and an edge-compatible production build
- Clear path to swap in provider embeddings without changing the public analysis contract

## Out of scope

- General-purpose root-cause analysis
- Live Prometheus, Loki, OpenSearch, or Jaeger querying
- Automatic node drain, GPU reset, pod restart, or host reboot
- Manufacturer support entitlement decisions
- Production hardware replacement recommendations
- Training a custom embedding or generation model
- Claiming that the curated regression set represents all GPU failures

## Success criteria

| Criterion | Target | Checked-in result |
|---|---:|---:|
| Recall@5 | ≥85% | 100.0% |
| Citation validity | ≥90% | 100.0% |
| Refusal precision | ≥90% | 100.0% |
| Refusal recall | ≥90% | 100.0% |
| p95 local analysis latency | <5 seconds | 0.92 ms |
| p95 Pinecone analysis latency | <5 seconds | 518.05 ms |
| Unapproved production writes | 0 | 0 by design |

## Production extension path

1. Replace the demonstration corpus with a version-pinned ingestion job and content manifest.
2. Benchmark the deterministic feature hash against an approved provider or self-hosted sentence embedding behind the same Pinecone interface.
3. Add a cross-encoder reranker while preserving exact-ID boosts.
4. Place generation behind a strict JSON schema and citation validator.
5. Add authenticated access and approved internal runbooks.
6. Connect read-only telemetry backends after data-governance review.
7. Add independently labeled, de-identified incidents; the current 100-case primary set and 16-case holdout are owner-reviewed.

The local build intentionally stops before those production concerns so Week 2 learning remains centered on retrieval, grounding, and evaluation.
