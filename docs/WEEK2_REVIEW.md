# Week 2 Expert Review

## Verdict

**Technical score: 98/100 - excellent and submission-ready after the video is recorded.**

GPU Signal Atlas implements every technical layer named in the Week 2 handout: a specific corpus, ingestion and cleaning, freshness controls, chunking, embeddings, vector storage, hybrid retrieval, reranking, cited generation, refusal, and evaluation. The public application and repository substantially exceed the baseline project.

The final submission is not yet complete because the handout separately requires a live video of five minutes or less. The script and demo surface are ready, but the recording and its public link remain an external deliverable.

The new product homepage, original GPU-to-evidence illustration, and audience-specific pitch scripts improve reviewer comprehension and recording readiness. They do not increase the technical score because the communication/documentation category was already at its maximum and the missing video remains a separate submission gate.

## Scope choice

The project uses the handout's **bring-your-own use case** option and a custom code-heavy TypeScript/React implementation. The handout explicitly permits other frameworks, so the absence of LangChain or LangGraph is not a gap.

Neo4j is an implemented bonus evidence graph. The submission does not claim the suggested "GraphRAG for Organizational Knowledge" use case, so that optional track's separate 10-query GraphRAG-versus-vector comparison is not a core acceptance condition.

## Handout framework mapping

| Required field | GPU Signal Atlas decision | Status |
|---|---|---|
| One-line use case | Helps GPU platform engineers explain NVIDIA Xid/DCGM signals from a reviewed observability corpus in a public web application, targeting at least 90% citation validity, Recall@5 above 85%, and p95 retrieval below five seconds. | Complete |
| Corpus | 27 reviewed English structure-aware records from NVIDIA Xid/DCGM/NVLink/NVSwitch/NCCL/GPU Operator, Fluent Bit, OpenTelemetry, and labeled internal demonstration runbooks. | Complete; deliberately bounded |
| Ingestion + cleaning | Allow-listed HTTPS or local HTML input, removal of page chrome/scripts/forms, preservation of headings/tables/code/identifiers, source metadata, fingerprints, and a human review candidate. | Complete |
| Ingestion + freshness | Seven-day official-source and 30-day internal-runbook review SLAs, content fingerprints, CI freshness gate, staging namespace, regression checks, and explicit promotion/rollback. | Complete |
| Chunking + embedding | Identifier-centered structured records compared with fixed 90-token windows; deterministic 256d feature hashing for the reproducible Pinecone path plus a live 1024d `mistral-embed` ablation. | Complete |
| Retrieve | Pinecone dense candidates + BM25 sparse ranking + reciprocal-rank fusion + exact-ID/model/driver boosts; final top five. | Complete |

## Assignment-quality mapping

| Week 2 emphasis or deliverable | Evidence | Judge assessment |
|---|---|---|
| Match chunking and embedding decisions | Structure-aware and fixed-window ablations are checked in; trained and deterministic embedding paths are compared without mutating production. | Excellent |
| Hybrid retrieval | Pinecone dense and BM25 sparse candidates retain independent ranks, then use RRF and bounded reranking. | Excellent |
| "I don't know" path | Unknown identifiers, unrelated questions, and six same-domain hard negatives refuse with zero diagnostic citations. | Excellent |
| Cited generation | Deterministic output is default; optional Mistral strict-schema generation uses evidence-derived enums plus post-generation grounding validation. | Excellent |
| Evaluation | 100 owner-reviewed primary cases, a separate 16-case post-change holdout, automated tests, retrieval/chunking ablations, 100% Recall@5, 0.987 MRR, and complete citation/refusal metrics on the bounded primary set. Independent GPU-SME review remains pending. | Excellent for the reviewed corpus |
| Google Doc | Overview, dataset, prompts/instructions, iterations, learnings, architecture, evaluation, limitations, setup, and requirement mapping. | Complete and updated |
| Live demo | Public website demonstrates analysis, refusal, telemetry flow, performance intelligence, privacy boundaries, graph context, and voice interaction. | Complete |
| Product communication | Homepage pitch, original GPU-to-evidence visual, interviewer script, instructor script, and 30-second elevator version explain the system before the technical walkthrough. | Complete |
| AI coding-tool explanation | Repository and document explain Codex's role and the validation gates used to accept changes. | Complete |
| Project assets | Public GitHub repository contains code, tests, configs, evaluation, and documentation. | Complete |
| Video, five minutes or less | Recording-ready script exists; final recording/public link does not yet exist. | **Pending** |

## Verified implementation evidence

- Pinecone production retrieval is server-only and uses a versioned reviewed-corpus namespace.
- The checked-in precomputed index preserves credential-free evaluation and rollback evidence.
- `mistral-embed` live ablation: 22 answerable cases, 1024 dimensions, Recall@5 100%, MRR 1.000, 1,863 tokens.
- Live Mistral strict-schema Xid 79 generation passed the schema, evidence-enum, citation, and local grounding checks.
- Neo4j synchronization maps all reviewed Evidence records plus Signal identifiers, three public-reference BenchmarkRun records, and supporting technology/model/backend relationships.
- The public graph endpoint returns a maximum of 40 read-only relationship paths and stores no raw telemetry.
- Deepgram live validation completed both synthetic text-to-speech and speech-to-text; the website requires explicit microphone and playback actions.
- The public integration endpoint reports every remaining provider configured and `secretsExposedToBrowser=false`.
- Lint, type checking, 50 tests, freshness, index integrity, and the production build pass locally against the exact published tree.

## Score breakdown

| Area | Score | Rationale |
|---|---:|---|
| Use case and measurable targets | 10/10 | Specific user, corpus, surface, faithfulness/retrieval targets, and latency ceiling. |
| Corpus, ingestion, and freshness | 14/15 | Strong provenance and lifecycle; corpus scale remains intentionally small. |
| Chunking, embedding, and vector storage | 15/15 | Structure-aware ablation, Pinecone, persistent baseline, and trained-embedding comparison are implemented. |
| Retrieval, citations, and refusal safety | 20/20 | Hybrid retrieval, reranking, evidence gating, post-validation, and zero-citation refusal are explicit and tested. |
| Evaluation and experimentation | 19/20 | Reproducible suite and ablations are strong; blinded GPU-SME grading and a larger independent set remain absent. |
| Public application and reproducibility | 10/10 | Public product, local setup, safe configuration boundaries, and release-equivalent checks are complete. |
| Documentation and observability differentiation | 10/10 | Required narrative plus unusually strong technology, privacy, and extension mapping. |
| **Technical total** | **98/100** | **Excellent Week 2 implementation.** |

The score is a reviewer-authored assessment because the handout specifies deliverables and framework decisions but does not publish a numeric grading rubric.

## Submission gate scorecard

| Required Week 2 deliverable | Current status | Evidence |
|---|---|---|
| Project documentation | Complete | Public Google Doc includes overview, dataset, prompts/instructions, iterations, learnings, architecture, evaluation, limitations, pitch scripts, and requirement mapping. |
| Project assets | Complete | Public GitHub contains application source, tests, evaluation, workflow/configuration assets, and documentation. |
| Video demo, five minutes or less | Pending | A timed 4:55 script and recording-ready public product are complete; the recording and public video link still must be supplied. |

**Deliverable completion: 2 of 3 submitted artifacts complete; 1 recording artifact pending.** This status is deliberately separate from the 98/100 technical-quality assessment.

## Expert feedback

### What would impress a reviewer

1. Exact GPU identifiers are preserved through parsing, tokenization, retrieval, and citations.
2. Retrieval scores are never presented as probability of root cause.
3. The refusal path is tested as a product behavior, not added as disclaimer text.
4. Pinecone, Neo4j, telemetry backends, and benchmark storage have distinct responsibilities.
5. Mistral output is constrained twice: by provider schema/evidence enums and by local claim validation.
6. The application shows the actual component flow rather than relying on architecture slides.
7. Security and privacy boundaries remain visible even in the public voice and graph demo.

### What still limits production claims

1. The 27-record corpus and bounded evaluation suites are strong regression fixtures but too small for generalized GPU diagnostic accuracy.
2. The evaluation labels have not been independently blinded or graded by an NVIDIA/GPU domain expert.
3. Demonstration telemetry is synthetic; broader model, driver, MIG, NVLink, and workload diversity should be tested with governed incident replays.
4. The Mistral embedding result is an in-memory ablation; production Pinecone intentionally remains on the reproducible 256d representation until a controlled namespace migration is approved.
5. Neo4j currently visualizes reviewed relationships; a true GraphRAG answer path and matched-query comparison would be a valuable next experiment, not something the current project should overclaim.
6. Public AI and voice routes no longer use a browser challenge; production scale requires platform rate limits, authentication, quotas, and provider-cost governance.

## Final recommendation

Submit the project after recording the five-minute video. Open with the homepage visual and 30-second pitch, then spend most of the time on Xid 79, hybrid retrieval, the refusal example, the visual end-to-end flow, and the evaluation evidence. Treat the Mistral/Neo4j/Deepgram additions as concise product differentiation; do not let them obscure the core Week 2 RAG decisions.
