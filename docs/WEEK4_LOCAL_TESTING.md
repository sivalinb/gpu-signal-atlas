# Week 4 Local Testing and LangSmith Guide

## What this adds

The Week 4 layer turns the existing GPU evidence application into a controlled evaluation product. Python owns dataset validation, experiment execution, evaluator scoring, failure clustering, CSV/XLSX generation, and LangSmith dataset/experiment upload. The TypeScript analyzer remains the system under test.

## Dataset library

The canonical dataset is `evaluation/week4/golden-v1.jsonl`. It has 48 frozen cases and a checked SHA-256 fingerprint:

| Slice | Cases | Purpose |
|---|---:|---|
| Happy path | 24 | Exact Xids, DCGM metrics, semantic symptoms, and supported telemetry flows |
| Edge case | 14 | Noisy JSON/syslog, compatibility limits, hard negatives, and unsupported inputs |
| Known failure | 7 | Normalization, parser, input-boundary, and semantic-routing regressions |
| Adversarial | 3 | Prompt injection, fabricated evidence, and instruction override attempts |

`evaluation/week4/python/prepare_datasets.py` materializes each scenario as a separate JSONL file and writes a catalog. Related product datasets include the 17-record reviewed NVIDIA/DCGM/Fluent Bit/OpenTelemetry evidence corpus and three attributable public NVIDIA GenAI-Perf benchmark runs.

All evaluation inputs are synthetic or derived from curated public telemetry formats. Do not replace them with raw production logs unless they have passed organizational de-identification and retention review.

## Install

Requirements: Node.js 22.13+, Python 3.12+, and npm.

```bash
npm install
python3 -m venv .venv-week4
.venv-week4/bin/python -m pip install -r requirements-week4.txt
```

No provider key is required for local deterministic evaluation.

## Validate and test

```bash
npm test
npm run week4:validate
npm run week4:test
npm run week4:datasets
```

Expected dataset result:

```text
gpu-signal-atlas-week4-golden-v1: 48 valid cases
```

## Run the current agent

```bash
npm run week4:run
npm run week4:compare
```

`week4:run` executes the current TypeScript evidence agent through the Python harness. `week4:compare` verifies that the stored baseline and improved artifacts use the same dataset fingerprint, then regenerates:

- `evaluation/week4/results/comparison.json`
- `evaluation/week4/results/per_case.csv`
- `evaluation/week4/results/week4_evaluation.xlsx`
- `docs/WEEK4_EVALUATION_REPORT.md`

The stored baseline was captured from commit `5a7bfd349cc8737bce025ffed6904cb7e74abb00` before the targeted Week 4 changes. Running the current source again should reproduce the improved behavior, not overwrite history and call it a new baseline.

## Upload to LangSmith

A LangSmith API key is the only token needed for dataset and experiment upload. The script accepts a protected local key file and does not print or copy its contents:

```bash
npm run week4:langsmith -- \
  --api-key-file /absolute/path/to/langsmith-key \
  --baseline evaluation/week4/results/baseline.json \
  --improved evaluation/week4/results/improved.json
```

The upload is idempotent at the example level. It creates or updates:

- dataset `gpu-signal-atlas-week4-golden-v1`;
- tag `week4-frozen-v1`;
- one dataset-linked root run per case in the baseline experiment;
- one dataset-linked root run per case in the improved experiment;
- child runs for artifact replay/agent output and output-contract validation; and
- evaluator feedback for Recall@5, refusal correctness, citation validity, claim faithfulness, task contract, and guardrail behavior.

The uploaded dataset contains synthetic and curated public-format test text. It contains no API keys or raw production telemetry. The exact experiment names and access-controlled URLs are written to `evaluation/week4/results/langsmith.json`.

## Optional managed Pinecone run

The same 48-case Python harness can call the managed Pinecone namespace instead of the checked-in vector index:

```bash
npm run week4:pinecone -- --provider-env-file /absolute/path/to/pinecone-env
```

The environment file supplies the four server-only Pinecone values documented in `.env.example`. The runner passes them only to the Node subprocess, records the retrieval backend, latency, and aggregate read units, and never writes credentials or raw production telemetry to an artifact. This is an additional production-path check; the controlled baseline/post comparison remains local so it is deterministic and cost-free.

## Optional tokens

| Token | Needed for Week 4? | Use |
|---|---|---|
| LangSmith | Only for hosted experiment evidence | Dataset versions, traces, evaluators, and comparison |
| Pinecone | No for deterministic evaluation; yes for production-path evaluation | Managed dense retrieval and provider metrics |
| Mistral | No | Optional schema-constrained generation or LLM-as-judge extension |
| You.com | No | Allow-listed public source discovery before human review |
| Neo4j / Deepgram | No | Graph and voice product demonstrations, independent of evaluation |

## CI behavior

GitHub Actions installs the pinned Python dependencies, validates the dataset, runs the Python unit tests, executes the current 48-case suite, regenerates the comparison artifacts, and then completes the existing index, freshness, Node tests, type check, lint, and production build. It never uploads to LangSmith or calls a paid provider because CI has no provider key.
