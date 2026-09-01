# Provider Observability Dashboard

## Purpose

The public **Provider observability** section makes the runtime dependencies of GPU Signal Atlas visible without copying secrets or sensitive telemetry into the browser. It answers four operator questions:

1. Is the reviewed Pinecone corpus reachable and fully indexed?
2. What latency and read-unit cost did application queries observe?
3. Which RAG stage dominated the latest request?
4. Which optional providers are configured, active, or returning errors?

## Data flow

```mermaid
flowchart LR
    U[Browser action] --> A[Server API route]
    A --> P[Pinecone query/stats]
    A -. redacted OTLP trace .-> L[LangSmith]
    A -. bounded request .-> M[Mistral]
    A -. read-only path .-> N[Neo4j]
    A -. explicit voice action .-> D[Deepgram]
    F[Fluent Bit] --> O[OTel Collector] --> G[Safe ingest gateway]
    P --> R[Sanitized runtime recorder]
    L --> R
    M --> R
    N --> R
    D --> R
    G --> R
    R --> S[/api/observability/summary]
    S --> V[Public charts]
```

`core/provider-observability.ts` keeps a bounded ring of 120 operational observations in the current server runtime. It records provider, operation, duration, success, item count, and Pinecone read units. It cannot accept raw logs, prompts, model output, API keys, trace payloads, usernames, or tenant identifiers.

The browser polls `GET /api/observability/summary` every 15 seconds. That route performs a live Pinecone `describe_index_stats` check, combines it with the bounded operation records and the sanitized 15-minute telemetry buffer, and returns a no-store JSON summary.

## What each chart means

| View | Source | Interpretation |
|---|---|---|
| Pinecone vectors | `describe_index_stats` | Current namespace vector count versus reviewed corpus record count |
| Vector dimension | `describe_index_stats` | Confirms the live index matches the 256-dimensional embedding contract |
| Query p95 | Application timing around Pinecone `/query` | Tail latency observed by this application runtime |
| Read units | Pinecone query response `usage` | Operation-level query consumption, not billing totals |
| Query latency line | Last 24 Pinecone query observations | Recent runtime latency shape |
| RAG stage bars | Analyzer stage spans | Relative time in extraction, retrieval, and evidence-gated generation |
| Provider activity | Instrumented server adapters | Request count, errors, p50, and last-seen time |
| RAG outcomes | Analyzer result contract | Grounded/needs-investigation grouped as evidence-backed, plus refusals and failures |
| OTel safety buffer | Sanitized gateway | Buffered event and redaction counts with 15-minute retention |

## Honest scope

This is an application-observed operational dashboard, not a replacement for vendor control planes. The in-memory sample window resets when the server runtime is recycled and is explicitly labeled **non-durable**. Pinecone organization cost, historical Prometheus metrics, LangSmith token/cost charts, Neo4j Aura platform metrics, and Deepgram account usage remain in their respective consoles unless dedicated metrics credentials and a durable time-series backend are added.

For production scale, export these same sanitized counters and histograms through OpenTelemetry to Prometheus/Grafana, use Pinecone's supported Prometheus or Datadog integration, store aggregates in a tenant-isolated metrics backend, and add authentication plus rate limits to the public summary route.

## Local verification

Start the app, open `http://localhost:3000/#provider-observability`, and click **Refresh**. Run one analyzer sample, then refresh again. The Pinecone query count, read units, latency series, stage bars, and RAG outcome counts should update. Calling graph or voice features updates their provider cards; replaying telemetry updates OpenTelemetry activity and the safe-buffer totals.

No raw telemetry should appear in the summary:

```bash
curl -s http://localhost:3000/api/observability/summary
```

The aggregation and payload boundary are covered by `tests/provider-observability.test.ts`.
