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

Expected summary:

```text
tests 35
pass 35
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

The booleans should match the integrations configured in `.env.local`, and `secretsExposedToBrowser` must remain `false`. The current public deployment reports Pinecone, You.com, and LangSmith configured.

## 8. Optional Fluent Bit and OpenTelemetry replay

Start an OpenTelemetry Collector with the checked-in configuration:

```bash
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
- Records carry `service.name`, `service.namespace`, `deployment.environment.name`, `event.domain`, and `telemetry.source` context.

If Fluent Bit is started from a different directory, update the relative `Path` and `Parsers_File` values or run from the repository root.

This replay validates collection shape only. It does not feed the website automatically and does not make any cluster changes.

To demonstrate the full project flow, copy a record printed by Fluent Bit or the Collector into the website analyzer. A production extension can replace this manual boundary with an authenticated adapter that reads from a log backend or receives OTLP-derived events.

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

## Troubleshooting

### Node cannot import `.ts` files in tests

Confirm Node is version 22.13 or newer. The scripts use Node’s type-stripping support.

### Port 3000 is already in use

Stop the conflicting process or follow the alternate URL printed by the development server.

### Fluent Bit cannot find the log fixture

Run it from the repository root or change `Path` to an absolute path.

### OTLP export fails

Confirm the collector is listening on `127.0.0.1:4318`, the HTTP receiver is enabled, and no local firewall blocks the connection.

### An expected identifier refuses

Check that `core/corpus.ts` contains the exact normalized identifier. Add a corpus record and an independent evaluation case together; never add only the expected label.

### Pinecone retrieval is unavailable

Confirm `.env.local` contains all four variables, the index is Ready, its dimension is 256, and the configured namespace contains 17 vectors. Run `npm run pinecone:sync` before starting the website.
