# Observability replay and extension boundary

The optional replay is a real telemetry transport path with an intentionally narrow endpoint:

```text
examples/gpu-events.log
  -> Fluent Bit tail + regex parser
  -> resource enrichment
  -> OTLP/HTTP POST /v1/logs
  -> OpenTelemetry Collector OTLP receiver
  -> resource processor + batch processor
  -> debug exporter + token-gated OTLP/JSON gateway
  -> allow-list + redaction + 15-minute buffer
  -> SSE browser inbox
  -> explicit Analyze action
```

Fluent Bit reads the synthetic log fixture, parses the timestamp and message, and adds stable resource context: `service.name`, `service.namespace`, `deployment.environment.name`, `event.domain`, and `telemetry.source`. Its OpenTelemetry output serializes records as OTLP logs and sends them to the Collector on localhost.

The Collector accepts OTLP over HTTP or gRPC, upserts the core service resource attributes, batches records, and prints the resulting telemetry through its debug exporter. A second exporter posts JSON to the local gateway with `TELEMETRY_INGEST_TOKEN`. The gateway enforces body/batch limits, allow-lists metadata, redacts inline secrets and workload identifiers, and exposes only sanitized envelopes to a reconnecting SSE inbox. The website labels and uses a bounded `/api/telemetry/recent` polling fallback when its hosting edge buffers long-lived streams.

Collection remains deliberately separate from analysis: an arriving event is displayed but is never diagnosed automatically. The user selects one sanitized event and clicks **Analyze selected** to run the deterministic retrieval/evidence flow. A production implementation can replace the in-memory ring buffer with a tenant-isolated adapter from Loki, OpenSearch, ClickHouse, a SIEM, Kafka, or another OTLP-derived event stream while preserving this explicit boundary.

The analyzer also emits an application diagnostic envelope on every result: trace ID, execution duration, evidence margin, matched semantic intents, decision reasons, and corpus version. The API maps extraction, retrieval, and evidence-gate/generation work to OpenTelemetry spans and can export them to LangSmith:

- span: `gpu.signal.analyze`
- attributes: `gpu.signal.status`, `gpu.signal.evidence_strength`, `rag.corpus.version`, `rag.intent.ids`
- metrics: analysis duration, refusal count, supported-intent count, and citation/claim validation failures

`otel-collector-langsmith.yaml` is the optional trace fan-out configuration. It removes generic `input.value` and `output.value` attributes before sending traces to both the debug exporter and LangSmith. The in-process exporter in `core/langsmith.ts` is narrower: it emits recognized identifiers, input length, ranks, latency, versions, and outcomes, with `rag.raw_telemetry_exported=false`. It never serializes the raw pasted telemetry.

LangSmith export is fail-open. The current public deployment has it configured. Missing configuration reports `disabled`, and a network/exporter failure reports `failed`; the analysis result is still returned. Set `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, and optionally `LANGSMITH_OTEL_ENDPOINT` in a server-only environment to activate it elsewhere.

The public replay endpoint accepts only checked-in synthetic fixtures; do not place production logs or credentials in the public demo. External OTLP ingestion must use a private deployment with tenant isolation, retention controls, quotas, and a rotated token.
