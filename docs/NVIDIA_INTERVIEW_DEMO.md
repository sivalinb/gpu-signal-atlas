# NVIDIA solution architecture interview demo

Target: 8–10 minutes, with optional depth for follow-up questions.

## Executive framing — 45 seconds

“GPU Signal Atlas is an evidence system for two related decisions: what a GPU signal supports, and whether an inference configuration should be promoted. It combines citation-first RAG for Xid/DCGM telemetry with a benchmark workbench for latency, throughput, topology, health, and capacity. The design goal is explainability: raw inputs, retrieval evidence, metric direction, provenance, SLO checks, and safety boundaries remain inspectable.”

## Reliability path — 90 seconds

Run Xid 79 in **Analyze**. Explain exact identifier extraction, Pinecone + BM25 retrieval, reranking, citations, compatibility, and refusal behavior. Emphasize that a DCGM interval metric or one Xid narrows the investigation but does not prove kernel-level root cause.

## Collection and correlation — 90 seconds

Run **Telemetry → Run end-to-end flow**. Map responsibilities:

- Fluent Bit tails and enriches GPU/Kubernetes logs.
- The OpenTelemetry Collector normalizes resource identity and transports logs/traces.
- The safe gateway authenticates, bounds, allow-lists, and redacts.
- DCGM and Triton would contribute GPU and serving time series.
- Only an explicitly selected sanitized snapshot reaches the RAG evidence service.
- LangSmith receives redacted RAG-stage traces, not raw telemetry.

Then open **Performance → Signal correlation** and explain the join keys: benchmark/run ID, model revision, pod/node, GPU UUID or MIG identity, and synchronized timestamps.

## Multimodal evidence fabric — 90 seconds

Open **Graph & voice**. Frame the section as an architecture demonstration, not a pile of vendor logos:

- The public demo intentionally avoids a browser challenge; production scale should add platform-level rate limits, identity, quotas, and provider-cost controls.
- Pinecone and BM25 retrieve reviewed text evidence, while Neo4j answers relationship questions across signals, evidence, benchmark runs, models, backends, and technologies.
- Mistral is an optional schema-constrained generator. It receives bounded identifiers and retrieved evidence, and its result must pass the same grounding validator as the deterministic path.
- Deepgram makes the workflow accessible in both directions: opt-in speech becomes editable input, and a grounded result becomes an executive audio briefing.
- OpenTelemetry and LangSmith show the AI-system timing and outcome without exporting the raw pasted telemetry.

Refresh the Neo4j paths, record “Xid 79 with PCIe replay counter on H100,” run the analysis, and play the briefing. Emphasize that credentials remain server-only and that no provider is permitted to diagnose or remediate outside the evidence gate.

## Performance architecture decision — 2 minutes

Open **Benchmark studio**. Compare public Run A and Run C. State the evidence limitation before discussing the deltas: these are NVIDIA documentation example values whose GPU model and repetitions are not reported.

Walk through:

- p99 TTFT and ITL for user experience;
- request and token throughput for capacity;
- GPU power, utilization, and memory for saturation and economics;
- each SLO check independently;
- why a passing sample advances to repeated target-stack testing rather than production.

Mention that new benchmark work should use NVIDIA AIPerf, while the bundled example comes from GenAI-Perf.

## Topology, MIG, and diagnostics — 90 seconds

Open **Fleet & MIG**. Explain three control points:

1. DCGM passive health can watch memory, PCIe, thermal/power, NVLink, and driver conditions.
2. MIG geometry changes require workload coordination and GPU Operator state verification.
3. Active DCGM diagnostics consume GPU and interconnect resources, so an AI recommendation cannot start them; an approved maintenance window is required.

This demonstrates product judgment in addition to tool familiarity.

## Capacity and evidence package — 60 seconds

Open **Capacity planner**. Change request rate, headroom, and hourly cost. Explain that the deterministic formula is useful for scenario discussion but only target-stack measurements and approved pricing can support procurement.

Open **Decision report**, download JSON, and show that provenance and the safety boundary travel with the recommendation.

## Strong closing — 30 seconds

“The product value is not another dashboard. It creates a chain of evidence from benchmark stimulus and GPU telemetry to a bounded architecture decision. The next production step is an AIPerf experiment registry backed by object storage and analytical SQL, with Triton/DCGM telemetry joined through OpenTelemetry and Pinecone reserved for reviewed textual evidence.”

## Likely follow-up questions

### Why not store benchmark metrics in Pinecone?

Numeric comparisons, percentiles, filters, and time windows belong in structured analytical storage. Pinecone is useful for semantic retrieval over documentation, prior incident narratives, and architecture decisions.

### How would you avoid benchmark bias?

Pin prompts, input/output token distributions, model revision, precision, endpoint, server configuration, GPU topology, warmup, random seed, and repetitions. Record confidence intervals and reject unstable runs.

### What would prove a GPU bottleneck?

No single utilization metric. Align queue latency, compute time, SM/tensor/memory activity, power/thermal state, memory pressure, PCIe/NVLink behavior, topology, and request traces. Use Nsight Systems only when deeper profiling is justified.

### How would this scale?

Object storage for immutable artifacts, PostgreSQL/ClickHouse for experiments, Prometheus/Mimir for metrics, Tempo/Jaeger for traces, Loki/OpenSearch for logs, and Pinecone for semantic evidence. OTel resource attributes and benchmark IDs tie them together.

### Why both Pinecone and Neo4j?

Pinecone retrieves semantically similar reviewed passages. Neo4j traverses explicit, inspectable relationships such as a Signal supported by Evidence or a BenchmarkRun using a ServingBackend. A production GraphRAG path can combine them, but the current demo keeps retrieval and graph context visibly separate so their evidence roles are not overstated.
