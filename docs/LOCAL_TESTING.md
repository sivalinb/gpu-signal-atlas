# Local Setup and Complete Testing Guide

## Prerequisites

- Git
- Node.js 22.13 or newer
- npm

Optional integration tools:

- Fluent Bit
- OpenTelemetry Collector Contrib
- Docker or Podman, if you prefer containers for the optional replay

A GPU, Kubernetes cluster, model API key, and telemetry backend are not required.

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
tests 13
pass 13
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

## 4. Type-check and build the website

```bash
npm run typecheck
npm run build
```

Both commands should exit with status zero.

## 5. Start the interactive website

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
- the page remains usable at narrow/mobile width; and
- keyboard focus is visible on buttons and links.

## 6. Run a CLI analysis

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
  "confidence": 0,
  "citations": []
}
```

## 7. Optional Fluent Bit and OpenTelemetry replay

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

If Fluent Bit is started from a different directory, update the relative `Path` and `Parsers_File` values or run from the repository root.

This replay validates collection shape only. It does not feed the website automatically and does not make any cluster changes.

## 8. Full release checklist

```bash
npm test
npm run evaluate
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
