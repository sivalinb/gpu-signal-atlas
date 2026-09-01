# Five-Minute Demo Script

Target duration: 4 minutes 55 seconds. Stop at five minutes even if a secondary point is skipped.

## Pre-recording checklist

- Open the public website in a clean browser window and confirm the Xid 79 result loads.
- Keep the GitHub repository and public Google Doc available in adjacent tabs.
- Use 100% browser zoom and record at 1080p when possible.
- Close notifications and hide bookmarks or tabs containing personal information.
- Do one timed rehearsal. The recording should demonstrate the application rather than read every paragraph.

Open the **Visual demo** section and click **Run full pipeline** during the architecture portion. The animation advances through all nine implemented stages and can be paused or inspected one stage at a time.

## 0:00–0:30 — Problem and project

“GPU Signal Atlas is a citation-first RAG application for NVIDIA Xid events, DCGM metrics, and GPU observability pipelines. GPU telemetry is full of exact but cryptic identifiers, and the supporting meaning is distributed across vendor catalogs, field references, deployment guides, and internal runbooks.

This project is intentionally not another autonomous incident agent. It retrieves evidence, explains what a signal means, identifies what evidence is missing, and refuses when its corpus cannot support an answer.”

Show the website title and the Xid 79 sample.

## 0:30–1:20 — Primary Xid 79 flow

“The first replay contains Xid 79, a PCIe replay counter, an H100 model, and driver branch R565. When I click Analyze, the application extracts those identifiers before retrieval.

The retrieval trace exposes sparse and vector ranks. BM25 is important for exact names such as the DCGM field. Pinecone returns candidates from the deterministic vector representation to help with symptom wording. Reciprocal-rank fusion combines the two, and exact identifier matches receive an additional boost.

The output is a signal card—not a root-cause verdict. It shows the official documented meaning, evidence to collect next, and an evidence boundary. Every source is linked.”

Click the first NVIDIA citation.

## 1:20–2:00 — Multi-source ECC example

Select **Xid 48 + ECC**.

“This sample combines an Xid with a DCGM ECC counter. The application retrieves both the Xid definition and metric/runbook context. Notice that it asks for volatile and aggregate counters, a time delta, GPU identity, and related recovery events.

The generator only uses reviewed fields from retrieved records. An official source leads the definition; an internal demonstration runbook can add evidence steps but cannot redefine the vendor event.”

## 2:00–3:25 — Visual architecture and Pinecone

Scroll to **Interactive visual demo** and click **Run full pipeline**.

“This button exposes all nine stages: allow-listed ingestion, cleaning, identifier-centered chunking, vector promotion into Pinecone, telemetry extraction, dense and sparse retrieval, reranking, evidence gating, and structured generation.

Now scroll to the technology map. Pinecone is the managed dense-vector store for the public application. You.com is an optional discovery adapter: it searches only approved public documentation and puts every result in a human review queue—it never writes to Pinecone. LangSmith is an optional AI-observability adapter: it receives redacted OpenTelemetry spans for extraction, retrieval, evidence gating, and generation, with ranks, latency, and outcomes but no original telemetry. Fluent Bit collects and enriches logs; OpenTelemetry transports logs and traces.”

## 3:25–3:55 — Refusal behavior

Select **Unknown identifier**.

“The most important path is the refusal. Xid 999 is not in the reviewed authoritative corpus. The application does not substitute a similar Xid or produce a plausible diagnosis. It returns zero citations and asks for supported context.

This behavior is automated in both unit tests and the evaluation suite.”

## 3:55–4:25 — Evaluation and testing

Scroll to **Evaluation evidence**.

“The checked-in evaluation has 31 independent expectations across exact identifiers, semantic symptoms, multi-source retrieval, unanswerable questions, and six adversarial same-domain negatives.

The current run records 100 percent Recall@5, 0.931 mean reciprocal rank, 100 percent citation validity, 100 percent field-level claim grounding, and 100 percent refusal precision and recall. These are regression results for the curated corpus, not generalized GPU diagnostic accuracy.

The repository also has 35 unit and regression tests, a separate live Pinecone evaluation, type checking, linting, a production website build, and GitHub Actions CI.”

## 4:25–4:55 — AI coding tools, assets, and close

Show the submission section, GitHub link, and public Google Doc.

“I used OpenAI Codex as the AI coding assistant for repository inspection, TypeScript and React implementation, Pinecone integration, test expansion, configuration review, and documentation. I kept the domain decisions explicit and accepted changes only after tests, evaluation, type checking, linting, a production build, and live endpoint verification.

The public GitHub repository contains the code and evaluation assets, and the public Google Doc contains the complete Week 2 narrative. My main learning is that observability RAG needs exact retrieval and a tested refusal boundary as much as it needs semantic search.”

## If time runs long

Keep the Xid 79 result, the nine-stage visual pipeline, the refusal, the metrics, and the AI coding explanation. Skip opening an individual citation or describing the optional replay in detail.
