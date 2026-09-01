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

GPU Signal Atlas helps GPU platform engineers explain NVIDIA Xid events and DCGM metric anomalies from reviewed official-documentation snapshots and internal runbooks through a web application, targeting at least 90% citation validity, Recall@5 above 85%, and p95 production retrieval below five seconds.

## Week 2 expert assessment

Technical score: **98/100 — excellent; final submission is ready after the required five-minute video is recorded**.

| Area | Score | Reviewer feedback |
|---|---:|---|
| Use case and measurable targets | 10/10 | Specific user, corpus, surface, faithfulness target, retrieval target, and latency ceiling. |
| Corpus, ingestion, and freshness | 14/15 | Reviewed provenance and promotion gates are implemented; the corpus is intentionally small. |
| Chunking, embedding, and vector storage | 15/15 | Structure-aware ablation, live Pinecone storage, the persistent offline baseline, and a live `mistral-embed` comparison are implemented. |
| Retrieval, citations, and refusal safety | 20/20 | Hybrid retrieval, reranking, citation allow-listing, claim grounding, and zero-citation refusal are explicit and tested. |
| Evaluation and experimentation | 19/20 | Thirty-one cases, retrieval/chunking ablations, and the trained-embedding comparison are reproducible; a larger blinded set and GPU SME review remain future work. |
| Public demo and reproducibility | 10/10 | Public website, GitHub, CI, local instructions, and visual walkthrough are complete. |
| Documentation and observability differentiation | 10/10 | Technology mapping, Fluent Bit/OpenTelemetry boundaries, extension model, prompts, iterations, and learnings are clear. |

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

The implemented ingestion workflow fetches only allow-listed sources or accepts a local HTML capture, records HTTP metadata and a cleaned-content fingerprint, removes page chrome, and preserves headings, tables, identifiers, and code. It produces a review candidate rather than silently changing the corpus. The demonstration freezes approved records so evaluation stays reproducible.

Official pages should be refreshed weekly in a production extension. Any changed identifier meaning or applicability should trigger human review and the complete regression suite.

## Chunking and embedding

Fixed-size chunks were rejected because one chunk could contain multiple Xids or lose table-row relationships. The selected strategy creates one identifier-centered record with separate meaning, evidence, and limitation fields.

The application computes a deterministic 256-dimensional feature-hash embedding over unigrams and adjacent bigrams. The public website stores reviewed document vectors in a versioned Pinecone namespace and queries it only from a server route. A checked-in index remains the credential-free offline regression and ablation baseline. BM25 provides exact keyword retrieval, especially for numeric Xids and long DCGM field names.

## Retrieval and reranking

Dense and sparse ranks are combined with reciprocal-rank fusion. The final score adds bounded boosts for exact identifiers, matching GPU models, and matching driver branches. The top five are returned; the website exposes the sparse and vector rank of the leading evidence.

## Generation and refusal

Generation is deterministic and structured. It selects an official retrieved record for the leading meaning when available, combines evidence and limitations only from retrieved records, and attaches only retriever-backed citations.

The system refuses when:

- the input is too short;
- an exact Xid or DCGM identifier is unknown;
- an input without an exact identifier does not match an explicitly supported semantic intent in the retrieved evidence.

## Prompts and instructions

Representative design instructions included:

1. Make exact Xids and DCGM names first-class retrieval metadata.
2. Combine BM25 with a deterministic embedding served from a versioned Pinecone namespace.
3. Expose retrieval ranks so results are inspectable.
4. Keep official definitions distinct from internal runbooks.
5. Generate only from retrieved structured fields.
6. Refuse unknown identifiers with zero citations.
7. Test successful retrieval and refusal behavior independently.

Deterministic generation remains the default. The optional Mistral mode is live and server-side: it receives extracted identifiers and retrieved evidence rather than the original raw telemetry, requests a provider-compatible strict JSON schema with evidence-derived enums, and then rejects unknown citations, unsupported fields, excess cardinality, or claims not reproduced from cited evidence.

## How AI coding tools were used

OpenAI Codex supported repository inspection, TypeScript and React implementation, Pinecone integration, test-case expansion, configuration review, documentation, and deployment preparation. Domain choices were kept explicit: corpus boundaries, identifier preservation, chunk structure, hybrid retrieval, refusal conditions, the evidence schema, and evaluation thresholds. AI-produced changes were accepted only after automated tests, retrieval evaluation, ablations, type checking, linting, production build validation, and live endpoint verification.

## Iterations tried

- Replaced dense-only retrieval with hybrid retrieval.
- Replaced fixed-length narrative chunks with identifier-centered records.
- Added exact identifier boosts after observing numeric ambiguity.
- Expanded Xid parsing to support parenthesized PCI bus syntax.
- Replaced the broad domain-language gate with explicit supported-intent routing after six same-domain hard negatives exposed false answers.
- Added record-level provenance and field-level claim-grounding evaluation.
- Replaced pseudo-probabilistic confidence with categorical evidence strength and analysis diagnostics.
- Added compatibility notes for model/driver mismatches.
- Exposed sparse and vector ranks in the browser.
- Added a hard refusal example to the primary demo.

## Evaluation

Thirty-one independent cases cover exact identifiers, semantic symptoms, multi-source questions, unsupported inputs, and six adversarial same-domain negatives. A separate ablation runner compares BM25, vector-only, RRF, contextual reranking, fixed windows, and structure-aware records.

Recorded result:

| Metric | Result |
|---|---:|
| Recall@5 | 100.0% |
| MRR | 0.931 |
| Citation validity | 100.0% |
| Claim grounding | 100.0% |
| Refusal precision | 100.0% |
| Refusal recall | 100.0% |
| p95 local latency | 0.92 ms |
| p95 Pinecone retrieval latency | 518.05 ms |

The expanded test suite contains 51 passing tests covering retrieval, refusal, ingestion, freshness, index integrity, Pinecone requests and operation-level usage, provider-metric aggregation, OpenAI-compatible and Mistral model contracts, Neo4j Query API mapping, Deepgram secret boundaries, ablations, observability configuration, telemetry redaction and OTLP normalization, immediate SSE delivery, public status redaction, You.com governance, LangSmith redaction/export contracts, public benchmark provenance, SLO evaluation, comparison math, capacity headroom, and report safety boundaries. The live 31-case Pinecone evaluation also records zero failures. These results validate the reviewed regression set only.

## Observability integration

The repository contains a Fluent Bit tail/parser configuration, resource enrichment, and an OpenTelemetry Collector OTLP receiver with resource normalization. It replays synthetic GPU logs through `http://127.0.0.1:4318/v1/logs`. The Collector fans out to detailed debug output and a token-gated OTLP/JSON gateway at `http://127.0.0.1:3000/api/telemetry/v1/logs`.

The gateway accepts at most 64 KiB and 20 events, allow-lists low-risk observability metadata, redacts inline credentials and workload identifiers, and keeps at most 50 sanitized events for 15 minutes. A reconnecting Server-Sent Events route carries only those envelopes to the browser and flushes its ready event immediately. When a hosting edge buffers streams, the UI explicitly labels and uses a 1.5-second HTTPS poll of the same sanitized buffer. The public replay button accepts only checked-in synthetic samples; arbitrary external writes require `TELEMETRY_INGEST_TOKEN`. Collection never triggers analysis automatically. The operator explicitly selects an inbox event, after which only that sanitized snapshot reaches the Pinecone-backed evidence service.

The project also implements governed provider adapters that are configured in the current public deployment. You.com searches only allow-listed public documentation and emits `pending-review` candidates; it cannot change the corpus or Pinecone automatically. LangSmith accepts redacted OpenTelemetry traces from extraction, retrieval, evidence gating, and generation. Mistral provides optional strict-schema generation and a trained-embedding ablation. Neo4j exposes bounded relationships across signals, reviewed evidence, benchmark runs, models, backends, and technologies. Deepgram provides explicit opt-in speech-to-text and grounded text-to-speech. Permanent credentials remain server-only.

The technology mapping is deliberate: Fluent Bit collects and enriches logs; OpenTelemetry normalizes logs and represents RAG stages as traces; You.com discovers source candidates; Pinecone stores and retrieves reviewed vectors; Neo4j stores explicit relationships; Mistral produces bounded optional output; Deepgram handles opt-in audio; and LangSmith measures the RAG system. The safe public status route exposes configuration booleans only, never a provider secret. Full setup and scale-out guidance is in `docs/YOU_LANGSMITH_INTEGRATION.md` and `docs/MULTIMODAL_EVIDENCE_FABRIC.md`.

The website now also exposes a sanitized provider-observability dashboard. A bounded current-runtime recorder aggregates Pinecone read units and latency, RAG outcomes and stage timing, provider request health, and OpenTelemetry buffer/redaction counts. The public summary route never returns raw telemetry, prompts, model output, traces, or credentials. The interface explicitly distinguishes these application-observed samples from durable provider-console, billing, or Prometheus history; the exact contract and production extension are documented in `docs/PROVIDER_OBSERVABILITY.md`.

## User interface

The first viewport is a product homepage that explains the promise before asking a reviewer to understand the implementation. An original visual maps a GPU and noisy telemetry through collection, tracing, vector evidence, and citation layers into a human-reviewed decision surface. The accompanying Observe → Retrieve → Explain → Decide labels, concise pitch, and direct links to the analyzer and walkthrough set expectations without claiming that the illustration is execution evidence.

The working analysis surface follows immediately. It contains four replay buttons, editable telemetry, a live retrieval trace, grounded/refusal output, evidence steps, limitations, and citations.

Below the analyzer, the website includes the nine-stage corpus/RAG walkthrough and a separate ten-component telemetry visualization with guided and live modes. The live mode exposes the active transport (SSE or labeled HTTPS fallback), sanitized inbox events, redaction counts, component technology, intermediate artifacts, explicit analysis, safety controls, evaluation metrics, and local commands.

The performance workbench adds five solution-architecture views: public benchmark comparison, SLO evaluation, benchmark-to-telemetry correlation, fleet/MIG and diagnostics governance, capacity/cost scenarios, and an exportable decision package. Public measurements and derived scenarios use different evidence labels. Pinecone remains responsible for textual evidence; structured benchmark results are exposed through dedicated data contracts and APIs.

## Learnings

- Hybrid retrieval is especially valuable when a domain mixes natural language and exact machine identifiers.
- Chunk topology can matter more than corpus size.
- Refusal quality requires labeled negative queries.
- Retrieval confidence should not be described as diagnostic probability.
- Structured generation makes citation validation straightforward.
- A small reproducible baseline is more defensible than an unverified claim about live model accuracy.
- Pinecone semantic retrieval and Neo4j relationship traversal solve different evidence questions and should not be presented as interchangeable databases.
- Provider-side structured output still needs an application-side grounding validator.

## Limitations

- Small, manually curated corpus
- Synthetic telemetry fixtures
- Production retrieval intentionally retains the reproducible feature-hash embedding; the trained Mistral comparison is an evaluated ablation rather than a promoted namespace
- Deterministic template generation is the default; optional Mistral generation adds provider latency and cost
- Ephemeral single-process telemetry buffer rather than a durable, tenant-isolated event bus
- Neo4j relationship visualization is not yet a GraphRAG answer path with a matched-query comparison
- Public AI and voice routes have no browser challenge; add platform rate limits, authentication, quotas, and provider-cost governance before production scale
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
- Public Google Doc with Week 2 requirement mapping and expert assessment
- Interactive start-to-finish visual pipeline walkthrough
- Original product-homepage illustration and simple interviewer/instructor pitch scripts
- Implemented Fluent Bit/OpenTelemetry → safe gateway → SSE inbox → explicit RAG analysis flow
- Persistent vector-index build and verification scripts
- Implemented ingestion and freshness workflow
- Optional schema-constrained LLM mode
- Retrieval and chunking ablation report
- Trained-embedding ablation, protected Mistral mode, Neo4j evidence graph, and opt-in Deepgram voice workflow

## Final submission checklist

- Public website: `https://gpu-signal-atlas.siva-babu.chatgpt.site`
- Public repository: `https://github.com/sivalinb/gpu-signal-atlas`
- Public Google Doc: `https://docs.google.com/document/d/1bksyAMQVZFTTbXAq5TY1KnvXqq1rBO-trVjV1gjTezI/edit`
- Video: record the updated sequence in `docs/DEMO_SCRIPT.md`, keep it below five minutes, confirm the link is public, and submit all three assets through the Week 2 form.
