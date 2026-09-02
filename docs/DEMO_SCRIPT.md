# Five-Minute Demo Script

Target duration: 4 minutes 55 seconds. Stop at five minutes even if a secondary point is skipped.

## Pre-recording checklist

- Open the public website at `#home` in a clean browser window; confirm the product illustration loads and the Xid 79 result completes.
- Keep the GitHub repository and public Google Doc available in adjacent tabs.
- Use 100% browser zoom and record at 1080p when possible.
- Close notifications and hide bookmarks or tabs containing personal information.
- Do one timed rehearsal. The recording should demonstrate the application rather than read every paragraph.

Open the **Visual demo** section and click **Run full pipeline** during the architecture portion. The animation advances through all nine implemented stages and can be paused or inspected one stage at a time.

Also rehearse **Telemetry → Run end-to-end flow**. The public button uses a labeled synthetic replay, shows the gateway redaction count, and calls the real Pinecone-backed analyzer. Do not imply that the public site accepts arbitrary external logs.

## 0:00–0:25 — Problem and project

Begin on the product homepage and point to the image from left to right.

“GPU Signal Atlas turns opaque GPU telemetry into cited next steps. This image shows the product promise: cryptic GPU signals move through observable collection, trace, retrieval, and evidence layers before they become human-reviewed decision support.

It is a citation-first RAG application for NVIDIA Xid events, DCGM metrics, and GPU observability pipelines. GPU telemetry is full of exact but cryptic identifiers, and the supporting meaning is distributed across vendor catalogs, field references, deployment guides, and internal runbooks.

This project is intentionally not another autonomous incident agent. It retrieves evidence, explains what a signal means, identifies what evidence is missing, and refuses when its corpus cannot support an answer.”

Scroll to the analyzer and show the Xid 79 sample.

## 0:25–1:05 — Primary Xid 79 flow

“The first replay contains Xid 79, a PCIe replay counter, an H100 model, and driver branch R565. When I click Analyze, the application extracts those identifiers before retrieval.

The retrieval trace exposes sparse and vector ranks. BM25 is important for exact names such as the DCGM field. Pinecone returns candidates from the deterministic vector representation to help with symptom wording. Reciprocal-rank fusion combines the two, and exact identifier matches receive an additional boost.

The output is a signal card—not a root-cause verdict. It shows the official documented meaning, evidence to collect next, and an evidence boundary. Every source is linked.”

Click the first NVIDIA citation.

## 1:05–1:50 — Live telemetry-to-RAG visualization

Scroll to **Live telemetry integration** and click **Run end-to-end flow**.

“This is the implemented collection-to-evidence path. A labeled synthetic GPU event is represented as coming from NVIDIA kernel or DCGM telemetry. Fluent Bit tails and enriches it. The OpenTelemetry Collector receives and batches OTLP logs, keeps a debug copy, and can fan out OTLP JSON to the local gateway.

The gateway is a deliberate safety boundary: external writes require a server-only token; bodies and batches are bounded; metadata is allow-listed; and inline workload identifiers or credentials are redacted. Only the sanitized envelope appears in the short-lived SSE inbox. Collection does not trigger diagnosis automatically—the user selects Analyze. The evidence API then runs Pinecone plus BM25, the evidence gate produces a cited card or refusal, and redacted stage spans can go to LangSmith without the original log.”

Switch briefly to **Live telemetry**, show either the SSE connection badge or the explicitly labeled HTTPS fallback badge, emit one safe replay, select it, and click **Analyze selected**. Explain that both transports expose the same sanitized gateway contract; the fallback exists for edge hosts that buffer streams.

## 1:50–2:40 — RAG lifecycle and control planes

Scroll to **Interactive visual demo** and click **Run full pipeline**.

“This button exposes all nine stages: allow-listed ingestion, cleaning, identifier-centered chunking, vector promotion into Pinecone, telemetry extraction, dense and sparse retrieval, reranking, evidence gating, and structured generation.

Now scroll to the technology map. Pinecone is the managed dense-vector store for reviewed documentation—not for GPU logs. You.com is a governed discovery adapter: it searches approved public documentation and puts results in a human review queue; it never writes to Pinecone automatically. LangSmith receives redacted RAG spans with ranks, latency, and outcomes but no original telemetry. Fluent Bit collects and enriches logs; OpenTelemetry transports logs and traces.”

## 2:40–3:20 — Multimodal evidence fabric

Scroll to **Graph & voice**.

“These integrations have deliberately separate responsibilities. Mistral optionally generates the same grounded schema and provides a trained-embedding comparison. Neo4j shows explicit relationships across signals, reviewed evidence, benchmark runs, models, backends, and technologies; it does not replace Pinecone semantic retrieval. Deepgram turns an opt-in spoken GPU question into editable input and can read the grounded result as an executive briefing.

No permanent credential reaches the browser, Neo4j does not receive raw logs, and Mistral receives extracted identifiers plus retrieved evidence rather than the original telemetry.”

Refresh the Neo4j paths. If the recording is comfortably on time, show the voice controls without completing a long recording.

## 3:20–3:45 — Refusal behavior

Select **Unknown identifier**.

“The most important path is the refusal. Xid 999 is not in the reviewed authoritative corpus. The application does not substitute a similar Xid or produce a plausible diagnosis. It returns zero citations and asks for supported context.

This behavior is automated in both unit tests and the evaluation suite.”

## 3:45–4:25 — Evaluation and testing

Scroll to **Evaluation evidence**.

“The primary evaluation has 100 owner-reviewed expectations across exact identifiers, semantic symptoms, multi-source retrieval, unanswerable questions, and adversarial negatives. Independent GPU-domain review is a pending release gate. A separate 16-case post-change holdout scored 15/16 on its first run, and that miss remains visible.

The current run records 100 percent Recall@5, 0.931 mean reciprocal rank, 100 percent citation validity, 100 percent field-level claim grounding, and 100 percent refusal precision and recall. These are regression results for the curated corpus, not generalized GPU diagnostic accuracy.

The repository also has automated unit and regression tests for retrieval, refusal, Mistral schema contracts, Neo4j mapping, Deepgram privacy boundaries, benchmark provenance and SLO math, OTLP normalization, redaction, buffer bounds, and Collector fan-out. The same release gate also runs primary and holdout evaluation, ablations, source freshness, index integrity, type checking, linting, and a production build.”

## 4:25–4:55 — AI coding tools, assets, and close

Show the submission section, GitHub link, and public Google Doc.

“I used OpenAI Codex as the AI coding assistant for repository inspection, TypeScript and React implementation, Pinecone integration, test expansion, configuration review, and documentation. I kept the domain decisions explicit and accepted changes only after tests, evaluation, type checking, linting, a production build, and live endpoint verification.

The public GitHub repository contains the code and evaluation assets, and the public Google Doc contains the complete Week 2 narrative. My main learning is that observability RAG needs exact retrieval and a tested refusal boundary as much as it needs semantic search.”

## If time runs long

Keep the Xid 79 result, refusal, metrics, and AI coding explanation. Shorten the telemetry animation and show only the Neo4j status card if time is tight; skip voice playback and individual citations.
