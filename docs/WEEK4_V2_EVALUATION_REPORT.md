# Week 4 Evaluation Report

## Executive result

GPU Signal Atlas was evaluated on the same frozen, owner-reviewed 100-case dataset before and after targeted changes. The pass rate improved from **75.0%** to **100.0%**. All **25** baseline failures were resolved and the controlled rerun introduced **0 regressions**. A separate post-change holdout preserves its first-run 15/16 result; independent NVIDIA-domain label review remains pending.

This evaluation tests the evidence agent's retrieval, refusal, citation, output-contract, security, and latency behavior. It does not claim that a single GPU event proves root cause.

## Frozen dataset

- Version: `gpu-signal-atlas-week4-golden-v2-100`
- SHA-256: `000fb91ba463072074232dd2971fc5bf14e7aeb9fd54d3aa464886073cd8c715`
- 50 happy-path cases, 30 edge cases, 15 known-failure regressions, and 5 adversarial cases
- Inputs use synthetic or curated public telemetry formats; no production payload is uploaded
- Expected evidence IDs and refusal labels are stored outside the operational corpus
- Labels were reviewed by the project owner; blinded review by an independent GPU-domain expert has not yet occurred
- A separate 16-case post-change holdout covers the newly added NVLink/NVSwitch, NCCL, MIG, memory-health, Kubernetes, and driver-readiness families

## Controlled comparison

| Metric | Baseline | Improved | Delta |
|---|---:|---:|---:|
| Pass rate | 75.0% | 100.0% | +25.0 pp |
| Recall@5 | 97.7% | 100.0% | +2.3 pp |
| MRR | 93.7% | 98.7% | +5.1 pp |
| Status accuracy | 81.0% | 100.0% | +19.0 pp |
| Signal extraction recall | 98.5% | 100.0% | +1.5 pp |
| Primary evidence precision | 81.0% | 100.0% | +19.0 pp |
| Citation validity | 100.0% | 100.0% | +0.0 pp |
| Claim faithfulness | 100.0% | 100.0% | +0.0 pp |
| Task contract | 100.0% | 100.0% | +0.0 pp |
| Guardrail pass rate | 98.0% | 100.0% | +2.0 pp |
| Refusal F1 | 74.5% | 100.0% | +25.5 pp |
| p95 latency (ms) | 3.344 | 4.058 | +0.714 |

Latency is local process time and should be read separately from hosted Pinecone network latency. The deterministic generation path uses zero LLM tokens and has zero model cost; optional LLM mode is evaluated independently.

## Managed Pinecone production-path check

The improved agent also ran the identical 100 cases against the configured Pinecone namespace. It passed **100/100 cases**, preserved **100.0% Recall@5**, citation validity, claim faithfulness, refusal F1, and guardrail behavior, consumed **100 query read units**, and measured **436.2 ms p50 / 685.0 ms p95** end-to-end retrieval latency. No Pinecone credential or raw telemetry is stored in the result artifact.


## Baseline failure clusters

- `primary_evidence_precision`: 19 cases
- `status_classification`: 19 cases
- `refusal_boundary`: 13 cases
- `signal_extraction`: 2 cases
- `retrieval_miss`: 2 cases
- `adversarial_guardrail`: 2 cases

## Targeted improvements

### 1. Expand safe telemetry parsing

**Observed problem:** JSON Xid fields, XID_EVENT keys, and Xid Error syntax crossed the refusal boundary.

**Targeted change:** A bounded parser recognizes only explicit Xid-labelled numeric forms and preserves canonical metric IDs.
### 2. Close measured semantic gaps

**Observed problem:** Thermal, power, ECC, workload-attribution, Fluent Bit, and OpenTelemetry paraphrases were too narrow.

**Targeted change:** Reviewed intent patterns now route these terms to specific corpus records with a bounded score boost.
### 3. Make primary evidence precise

**Observed problem:** A relevant runbook could appear before the authoritative signal definition.

**Targeted change:** The selected official source is placed first while every citation remains retrieval-backed.
### 4. Expose compatibility ambiguity

**Observed problem:** Multiple GPU models or driver branches could look fully grounded without device mapping.

**Targeted change:** Ambiguous hardware context returns needs-investigation with an explicit compatibility note.
### 5. Broaden instruction-manipulation guardrails

**Observed problem:** Developer-role and do-not-refuse variants were not recognized.

**Targeted change:** Pre-retrieval safety patterns refuse those requests with zero citations and a visible reason.

## Resolved regression cases

- `happy-ecc-metric`
- `failure-unreachable-link`
- `failure-fluentbit-k8s`
- `v2-happy-xid43-app-fault`
- `v2-happy-xid48-ecc-pair`
- `v2-happy-operator-workload`
- `v2-happy-otel-service-attrs`
- `v2-happy-h200-xid79`
- `v2-happy-a100-xid48`
- `v2-happy-l40s-xid31`
- `v2-happy-v100-xid13`
- `v2-happy-xid79-pcie`
- `v2-happy-operator-semantic`
- `v2-edge-multi-gpu`
- `v2-edge-conflicting-context`
- `v2-failure-json-xid-field`
- `v2-failure-xid-event-key`
- `v2-failure-ecc-plain-language`
- `v2-failure-thermal-limit`
- `v2-failure-board-draw-cap`
- `v2-failure-attribution-gap`
- `v2-failure-xid-error-form`
- `v2-failure-ecc-counter-semantic`
- `v2-adversarial-developer-message`
- `v2-adversarial-do-not-refuse`

## LangSmith experiment design

The Python evaluation harness idempotently syncs the frozen dataset to LangSmith and creates paired baseline and improved experiment records. When the LangSmith plan has available trace capacity, each test case receives a root run, replay/agent and contract-validation child runs, dataset/example linkage, scenario metadata, deterministic evaluator feedback, latency, token, cost, and privacy fields. The current account reached its monthly unique-trace quota during this v2 run; therefore the checked-in Python JSON/CSV/XLSX artifacts are the complete result source of truth. Experiment names and links are recorded in `evaluation/week4/results/v2-langsmith.json`.

## Production monitoring proposal

- Quality drift: pass rate, Recall@5, citation validity, claim faithfulness
- Safety drift: refusal F1 and adversarial guardrail pass rate
- Performance drift: p50/p95 latency, Pinecone query counts, tokens, and cost
- Reliability: tool errors, empty retrievals, and stale corpus versions

## Reproduce

```bash
python3 -m venv .venv-week4
.venv-week4/bin/pip install -r requirements-week4.txt
.venv-week4/bin/python evaluation/week4/python/validate_dataset.py --dataset evaluation/week4/golden-v2.jsonl
.venv-week4/bin/python evaluation/week4/python/run_evaluation.py --dataset evaluation/week4/golden-v2.jsonl --variant improved --output evaluation/week4/results/v2-improved.json
.venv-week4/bin/python evaluation/week4/python/compare_results.py --baseline evaluation/week4/results/v2-baseline.json --improved evaluation/week4/results/v2-improved.json --output-dir evaluation/week4/results/v2 --report docs/WEEK4_V2_EVALUATION_REPORT.md
```

The LangSmith upload command is documented in `docs/WEEK4_LOCAL_TESTING.md`; it reads the local key file without printing or copying the secret into the repository.
