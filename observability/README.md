# Observability replay and extension boundary

The optional replay is a real telemetry transport path with an intentionally narrow endpoint:

```text
examples/gpu-events.log
  -> Fluent Bit tail + regex parser
  -> resource enrichment
  -> OTLP/HTTP POST /v1/logs
  -> OpenTelemetry Collector OTLP receiver
  -> resource processor + batch processor
  -> debug exporter
```

Fluent Bit reads the synthetic log fixture, parses the timestamp and message, and adds stable resource context: `service.name`, `service.namespace`, `deployment.environment.name`, `event.domain`, and `telemetry.source`. Its OpenTelemetry output serializes records as OTLP logs and sends them to the Collector on localhost.

The Collector accepts OTLP over HTTP or gRPC, upserts the core service resource attributes, batches records, and prints the resulting telemetry through its debug exporter. This proves parsing, enrichment, transport, and Collector normalization without requiring a storage backend.

The browser application is deliberately separate. Copy a replayed record into the analyzer to run the deterministic retrieval/evidence flow. A production implementation can replace that manual boundary with an authenticated adapter from Loki, OpenSearch, ClickHouse, a SIEM, or an OTLP-derived event stream.

The analyzer also emits an application diagnostic envelope on every result: trace ID, execution duration, evidence margin, matched semantic intents, decision reasons, and corpus version. The API maps extraction, retrieval, and evidence-gate/generation work to OpenTelemetry spans and can export them to LangSmith:

- span: `gpu.signal.analyze`
- attributes: `gpu.signal.status`, `gpu.signal.evidence_strength`, `rag.corpus.version`, `rag.intent.ids`
- metrics: analysis duration, refusal count, supported-intent count, and citation/claim validation failures

`otel-collector-langsmith.yaml` is the optional trace fan-out configuration. It removes generic `input.value` and `output.value` attributes before sending traces to both the debug exporter and LangSmith. The in-process exporter in `core/langsmith.ts` is narrower: it emits recognized identifiers, input length, ranks, latency, versions, and outcomes, with `rag.raw_telemetry_exported=false`. It never serializes the raw pasted telemetry.

LangSmith export is fail-open. Missing configuration reports `disabled`, and a network/exporter failure reports `failed`; the analysis result is still returned. Set `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, and optionally `LANGSMITH_OTEL_ENDPOINT` in a server-only environment to activate it.

Do not place raw production logs or credentials in the public demo. Redact workload names, tenant identifiers, and tokens before analysis.
