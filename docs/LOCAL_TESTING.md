# Local Setup and Complete Testing Guide

## Prerequisites

- Git
- Node.js 22.13 or newer
- npm

Required for the Pinecone-backed website and managed-index evaluation:

- Pinecone serverless index using dense 256-dimensional cosine vectors
- `PINECONE_API_KEY`, `PINECONE_INDEX_HOST`, `PINECONE_INDEX_NAME`, and `PINECONE_NAMESPACE`

Optional integration tools:

- Fluent Bit
- OpenTelemetry Collector Contrib
- Docker or Podman, if you prefer containers for the optional replay
- Mistral, Neo4j Aura, and Deepgram accounts for the optional multimodal evidence fabric

A GPU, Kubernetes cluster, model API key, and telemetry backend are not required. Pinecone is optional for the local CLI, unit tests, ablations, and offline evaluation.

## 1. Clone and install

```bash
git clone https://github.com/sivalinb/gpu-signal-atlas.git
cd gpu-signal-atlas
npm install
```

For a clean CI-equivalent installation after the lockfile exists:

```bash
npm ci
```

## 2. Run the automated tests

```bash
npm test
```

Expected summary (the exact test count may grow; zero failures is authoritative):

```text
tests 52
pass 52
fail 0
```

## 3. Run the retrieval evaluation

```bash
npm run evaluate
```

Expected acceptance conditions:

- `Failures: 0`
- Recall@5 at least 85%
- Citation validity at least 90%
- Refusal precision and recall at least 90%
- p95 latency below 5000 ms

Run the retrieval and chunking ablations:

```bash
npm run ablate
```

Verify the persistent index and source freshness controls:

```bash
npm run index:check
npm run freshness
```

## 4. Configure and validate Pinecone

Copy `.env.example` to `.env.local`, add the server-only values, and never commit the file. Promote the reviewed corpus and run the live evaluation:

```bash
npm run pinecone:sync
npm run evaluate:pinecone
```

Expected conditions:

- 17 records in the configured namespace;
- Recall@5 `100.0%`;
- MRR `0.931`;
- citation validity `100.0%`;
- refusal precision and recall `100.0%`; and
- zero failures.

## 5. Type-check and build the website

```bash
npm run typecheck
npm run lint
npm run build
```

All commands should exit with status zero.

## 6. Start the interactive website

```bash
npm run dev
```

Open `http://localhost:3000`.

Verify these four paths:

1. **Xid 79 + PCIe replay** — grounded result, NVIDIA Xid 79 citation, PCIe evidence guidance.
2. **Xid 48 + ECC** — grounded result with Xid and ECC evidence.
3. **Thermal signal** — temperature/power evidence and the limitation that one sample does not prove throttling.
4. **Unknown identifier** — refusal, no citations, request for supported context.

Also verify:

- each sample button updates the editor;
- `Analyze signal` updates the result;
- `Reset` restores the Xid 79 sample;
- citation links open the named official source;
- the retrieval trace shows top result plus sparse/vector rank;
- diagnostics identify `pinecone` as the retrieval backend and the configured namespace;
- the page remains usable at narrow/mobile width; and
- keyboard focus is visible on buttons and links;
- clicking **Run full pipeline** advances through all nine visual stages;
- pause, reset, and direct stage selection work; and
- clicking **Telemetry → Run end-to-end flow** advances through all ten collection, sanitization, RAG, and AI-observability components;
- switching to **Live telemetry** reports either **SSE connected** or the labeled **Live HTTPS fallback**, **Emit safe replay** adds a sanitized inbox event, and **Analyze selected** updates the main signal card; and
- the browser console contains no hydration error.

## 7. Run a CLI analysis

```bash
npm run analyze -- "Xid 48 DCGM_FI_DEV_ECC_DBE_VOL_TOTAL=2 A100 R570"
```

The JSON should include:

- `status` other than `refused`;
- extracted Xid `48`;
- extracted metric name;
- `nvidia-xid-48` and/or `dcgm-ecc-dbe` citations; and
- evidence and limitation arrays.

Test the refusal path:

```bash
npm run analyze -- "NVRM: Xid (PCI:0000:65:00): 999 on H100 R565"
```

Expected fields:

```json
{
  "status": "refused",
  "evidenceStrength": "insufficient",
  "citations": []
}
```

## Optional schema-constrained model mode

See [`LLM_MODE.md`](LLM_MODE.md) for local provider configuration. Unknown identifiers are refused before the model call, and accepted model output must pass both JSON-schema and field-level grounding validation.

## Optional multimodal evidence fabric

See [`MULTIMODAL_EVIDENCE_FABRIC.md`](MULTIMODAL_EVIDENCE_FABRIC.md) for the provider-by-provider data contract. Add the relevant server-only variables from `.env.example`; never commit `.env.local` or credential source files.

Validate the optional trained-embedding comparison and seed the relationship graph:

```bash
npm run ablate:mistral
npm run neo4j:sync
```

In the website:

1. confirm `/api/integrations` reports the intended providers and `secretsExposedToBrowser: false`;
2. choose **Mistral structured output** and analyze Xid 79;
3. refresh **Live Neo4j evidence paths** and confirm bounded Signal, Evidence, BenchmarkRun, and Technology relationships;
4. click **Record question**, grant microphone access, say a short GPU signal, click **Stop**, and review the editable transcript; and
5. analyze the transcript and click **Listen to briefing**.

## Refresh an allow-listed source

See [`INGESTION_AND_FRESHNESS.md`](INGESTION_AND_FRESHNESS.md). A refresh creates a review candidate; it never changes the corpus automatically.

## Optional You.com discovery and LangSmith traces

See [`YOU_LANGSMITH_INTEGRATION.md`](YOU_LANGSMITH_INTEGRATION.md) for the complete data boundaries and scale-out design. Add only the server-side keys you need to `.env.local`.

Create a You.com review queue without editing the corpus or Pinecone:

```bash
npm run discover:you -- "NVIDIA Xid 79 recovery documentation"
```

With `LANGSMITH_API_KEY` and `LANGSMITH_PROJECT` configured, every website analysis attempts a redacted OTLP trace export. The response diagnostic is `exported`, `failed`, or `disabled`. The exporter never sends the original telemetry string, and an export failure never blocks analysis.

Verify the safe public status endpoint:

```bash
curl http://localhost:3000/api/integrations
```

The booleans should match the integrations configured in `.env.local`, and `secretsExposedToBrowser` must remain `false`. The response must never include a provider credential.

## 8. Optional Fluent Bit and OpenTelemetry replay

Add a non-production gateway token to `.env.local` before starting the website:

```text
TELEMETRY_INGEST_TOKEN=local-demo-only-change-me
```

Start the website first:

```bash
npm run dev
```

In another terminal, export the same token and start an OpenTelemetry Collector with the checked-in configuration:

```bash
export TELEMETRY_INGEST_TOKEN=local-demo-only-change-me
otelcol-contrib --config observability/otel-collector.yaml
```

In another terminal, from the repository root:

```bash
fluent-bit -c observability/fluent-bit.conf
```

Expected behavior:

- Fluent Bit reads `examples/gpu-events.log` from the beginning.
- Parsed events appear on standard output.
- The OpenTelemetry output sends logs to `http://127.0.0.1:4318/v1/logs`.
- The collector debug exporter prints received log records.
- The collector's second OTLP/HTTP exporter sends JSON to `http://127.0.0.1:3000/api/telemetry/v1/logs` with the server-only token.
- The gateway bounds the payload, allow-lists attributes, redacts secrets/workload identifiers, and keeps at most 50 events for 15 minutes.
- The website's **Telemetry → Live telemetry** inbox receives only the sanitized envelope over Server-Sent Events. On an edge platform that buffers streaming responses, the UI labels and uses the `/api/telemetry/recent` HTTPS fallback instead of pretending SSE is connected.
- Records carry `service.name`, `service.namespace`, `deployment.environment.name`, `event.domain`, and `telemetry.source` context.

If Fluent Bit is started from a different directory, update the relative `Path` and `Parsers_File` values or run from the repository root.

The replay now feeds the live browser inbox automatically but never auto-analyzes an event and never makes cluster changes. Select the inbox event and click **Analyze selected** to cross the explicit evidence boundary. See [`TELEMETRY_LIVE_FLOW.md`](TELEMETRY_LIVE_FLOW.md) for the API contract, redaction rules, and production queue extension.

## 9. Full release checklist

```bash
npm test
npm run index:check
npm run freshness
npm run evaluate
npm run evaluate:pinecone
npm run ablate
npm run typecheck
npm run lint
npm run build
git status
```

Confirm:

- no secrets or `.env` files are staged;
- evaluation failures are zero;
- documentation metrics match the latest run;
- the synthetic nature of fixtures is disclosed;
- source URLs remain reachable; and
- no production-action code was introduced.
- You.com output remains `pending-review` and `autoPromoted: false`; and
- sampled LangSmith traces contain no raw telemetry or tenant/workload identifiers.

## 10. Performance workbench and public benchmark API

Open `http://localhost:3000/#performance-lab` and verify all five views:

1. **Benchmark studio:** choose Run A as baseline and Run C as candidate. TTFT and request latency should decrease, output-token throughput should increase, and the default demonstration SLO should pass.
2. **Signal correlation:** confirm the chart is labeled as a derived demonstration series.
3. **Fleet & MIG:** confirm passive health, change approval, and active diagnostics are presented as distinct stages.
4. **Capacity planner:** enter `10 req/s`, `30%` headroom, and `$4/hour`; the result should be `11` GPUs and `$32,120/month` for this intentionally illustrative scenario.
5. **Decision report:** download JSON and confirm it contains `provenance`, `comparison`, `capacity`, and `safetyBoundary`. Use **Print / PDF** to test the human-readable export.

API checks:

```bash
curl -s http://localhost:3000/api/benchmarks
curl -s -X POST http://localhost:3000/api/benchmarks/compare \
  -H 'content-type: application/json' \
  -d '{"baselineId":"gpt2-config-100","candidateId":"gpt2-config-200"}'
```

The first response must identify the records as `public-measurement` and include a source URL. The comparison response must state that it does not prove root cause or authorize active diagnostics.

## Troubleshooting

### Node cannot import `.ts` files in tests

Confirm Node is version 22.13 or newer. The scripts use Node’s type-stripping support.

### Port 3000 is already in use

Stop the conflicting process or follow the alternate URL printed by the development server.

### Fluent Bit cannot find the log fixture

Run it from the repository root or change `Path` to an absolute path.

### OTLP export fails

Confirm the collector is listening on `127.0.0.1:4318`, the website is listening on `127.0.0.1:3000`, both processes use the same `TELEMETRY_INGEST_TOKEN`, the HTTP receiver is enabled, and no local firewall blocks either connection. If the Collector runs in a container, use a host address reachable from that container instead of `127.0.0.1` for the gateway exporter.

### An expected identifier refuses

Check that `core/corpus.ts` contains the exact normalized identifier. Add a corpus record and an independent evaluation case together; never add only the expected label.

### Pinecone retrieval is unavailable

Confirm `.env.local` contains all four variables, the index is Ready, its dimension is 256, and the configured namespace contains 17 vectors. Run `npm run pinecone:sync` before starting the website.
