# Week 4 Evaluation Report

## Executive result

GPU Signal Atlas was evaluated on the same frozen, human-reviewed 48-case dataset before and after three targeted changes. The pass rate improved from **81.2%** to **100.0%**. All **9** baseline failures were resolved and the controlled rerun introduced **0 regressions**.

This evaluation tests the evidence agent's retrieval, refusal, citation, output-contract, security, and latency behavior. It does not claim that a single GPU event proves root cause.

## Frozen dataset

- Version: `gpu-signal-atlas-week4-golden-v1`
- SHA-256: `e9aa12ed6c48e5dfef7cb4932109134ba1c66498047e24959896180a7c821399`
- 24 happy-path cases, 14 edge cases, 7 known-failure regressions, and 3 adversarial cases
- Inputs use synthetic or curated public telemetry formats; no production payload is uploaded
- Expected evidence IDs and refusal labels are stored outside the operational corpus

## Controlled comparison

| Metric | Baseline | Improved | Delta |
|---|---:|---:|---:|
| Pass rate | 81.2% | 100.0% | +18.8 pp |
| Recall@5 | 100.0% | 100.0% | +0.0 pp |
| MRR | 95.7% | 95.7% | +0.0 pp |
| Citation validity | 100.0% | 100.0% | +0.0 pp |
| Claim faithfulness | 100.0% | 100.0% | +0.0 pp |
| Task contract | 100.0% | 100.0% | +0.0 pp |
| Guardrail pass rate | 93.8% | 100.0% | +6.2 pp |
| Refusal F1 | 69.0% | 100.0% | +31.0 pp |
| p95 latency (ms) | 2.877 | 3.018 | +0.141 |

Latency is local process time and should be read separately from hosted Pinecone network latency. The deterministic generation path uses zero LLM tokens and has zero model cost; optional LLM mode is evaluated independently.

## Managed Pinecone production-path check

The improved agent also ran the identical 48 cases against the configured Pinecone namespace. It passed **48/48 cases**, preserved **100.0% Recall@5**, citation validity, claim faithfulness, refusal F1, and guardrail behavior, consumed **48 query read units**, and measured **442.4 ms p50 / 987.6 ms p95** end-to-end retrieval latency. No Pinecone credential or raw telemetry is stored in the result artifact.


## Baseline failure clusters

- `refusal_boundary`: 9 cases
- `adversarial_guardrail`: 3 cases

## Targeted improvements

### 1. Normalize collector output

**Observed problem:** Lowercase DCGM keys bypassed exact-signal extraction.

**Targeted change:** Case-insensitive parsing with canonical uppercase metric IDs.
### 2. Harden Xid parsing and semantic routing

**Observed problem:** Short, key-value, and operational paraphrases could be refused.

**Targeted change:** Additional safe syntax and reviewed intent patterns; exact IDs can clear the length gate.
### 3. Add an instruction-manipulation guardrail

**Observed problem:** Telemetry containing prompt-injection language could reach grounded generation.

**Targeted change:** Explicit pre-retrieval refusal with zero citations and a visible decision reason.

## Resolved regression cases

- `failure-lowercase-temp`
- `failure-lowercase-power`
- `failure-short-xid`
- `failure-xid-equals`
- `failure-unreachable-link`
- `failure-fluentbit-k8s`
- `adversarial-ignore-evidence`
- `adversarial-role-override`
- `adversarial-fake-citation`

## LangSmith experiment design

The Python evaluation harness syncs the frozen dataset to LangSmith and creates paired baseline and improved experiments. Each test case has one root run, replay/agent and contract-validation child runs, dataset/example linkage, scenario metadata, deterministic evaluator feedback, latency, token, cost, and privacy fields. Experiment names and links are recorded in `evaluation/week4/results/langsmith.json` after upload.

## Production monitoring proposal

- Quality drift: pass rate, Recall@5, citation validity, claim faithfulness
- Safety drift: refusal F1 and adversarial guardrail pass rate
- Performance drift: p50/p95 latency, Pinecone query counts, tokens, and cost
- Reliability: tool errors, empty retrievals, and stale corpus versions

## Reproduce

```bash
python3 -m venv .venv-week4
.venv-week4/bin/pip install -r requirements-week4.txt
.venv-week4/bin/python evaluation/week4/python/validate_dataset.py
.venv-week4/bin/python evaluation/week4/python/run_evaluation.py --variant improved --output evaluation/week4/results/improved.json
.venv-week4/bin/python evaluation/week4/python/compare_results.py
```

The LangSmith upload command is documented in `docs/WEEK4_LOCAL_TESTING.md`; it reads the local key file without printing or copying the secret into the repository.
