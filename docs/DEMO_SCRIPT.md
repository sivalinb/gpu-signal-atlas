# Five-Minute Demo Script

Target duration: 4 minutes 30 seconds to 5 minutes.

Open the **Visual demo** section and click **Run full pipeline** during the architecture portion. The animation advances through all nine implemented stages and can be paused or inspected one stage at a time.

## 0:00–0:35 — Problem and project

“GPU Signal Atlas is a citation-first RAG application for NVIDIA Xid events, DCGM metrics, and GPU observability pipelines. GPU telemetry is full of exact but cryptic identifiers, and the supporting meaning is distributed across vendor catalogs, field references, deployment guides, and internal runbooks.

This project is intentionally not another autonomous incident agent. It retrieves evidence, explains what a signal means, identifies what evidence is missing, and refuses when its corpus cannot support an answer.”

Show the website title and the Xid 79 sample.

## 0:35–1:30 — Primary Xid 79 flow

“The first replay contains Xid 79, a PCIe replay counter, an H100 model, and driver branch R565. When I click Analyze, the application extracts those identifiers before retrieval.

The retrieval trace exposes sparse and vector ranks. BM25 is important for exact names such as the DCGM field. The local vector baseline helps with symptom wording. Reciprocal-rank fusion combines the two, and exact identifier matches receive an additional boost.

The output is a signal card—not a root-cause verdict. It shows the official documented meaning, evidence to collect next, and an evidence boundary. Every source is linked.”

Click the first NVIDIA citation.

## 1:30–2:15 — Multi-source ECC example

Select **Xid 48 + ECC**.

“This sample combines an Xid with a DCGM ECC counter. The application retrieves both the Xid definition and metric/runbook context. Notice that it asks for volatile and aggregate counters, a time delta, GPU identity, and related recovery events.

The generator only uses reviewed fields from retrieved records. An official source leads the definition; an internal demonstration runbook can add evidence steps but cannot redefine the vendor event.”

## 2:15–2:50 — Refusal behavior

Select **Unknown identifier**.

“The most important path is the refusal. Xid 999 is not in the local authoritative corpus. The application does not substitute a similar Xid or produce a plausible diagnosis. It returns zero citations and asks for supported context.

This behavior is automated in both unit tests and the evaluation suite.”

## 2:50–3:35 — Architecture

Scroll to **System flow**.

“The pipeline has five visible stages: extract, embed, retrieve, rerank, and ground or refuse. The embedding is a deterministic 256-dimensional feature-hash baseline, so the complete demonstration works without a model key or GPU. It is a replaceable component, not a claim of state-of-the-art semantic search.

The optional integration replays GPU logs through Fluent Bit to an OpenTelemetry Collector over OTLP. The checked-in path ends at the Collector debug exporter; I paste a replayed record into the browser analyzer. That explicit boundary keeps the RAG evaluation reproducible and avoids implying an unimplemented backend.”

## 3:35–4:20 — Evaluation and testing

Scroll to **Evaluation evidence**.

“The checked-in evaluation has 31 independent expectations across exact identifiers, semantic symptoms, multi-source retrieval, unanswerable questions, and six adversarial same-domain negatives.

The current run records 100 percent Recall@5, 0.931 mean reciprocal rank, 100 percent citation validity, 100 percent field-level claim grounding, and 100 percent refusal precision and recall. These are regression results for the curated corpus, not generalized GPU diagnostic accuracy.

The repository also has 17 unit and regression tests, type checking, linting, a production website build, and GitHub Actions CI.”

## 4:20–4:55 — Local reproduction and close

Show the command block.

“Anyone can reproduce the project with Node 22: install dependencies, run the tests, run the evaluation, and start the website. No production telemetry, credentials, Kubernetes cluster, or GPU is required.

The main learning is that observability RAG needs exact retrieval and strong refusal boundaries as much as it needs semantic search. GPU Signal Atlas makes that retrieval path visible and testable.”
