from __future__ import annotations

import math
import statistics
from collections import Counter, defaultdict
from typing import Any

from .dataset import GoldenCase


def _round(value: float, digits: int = 4) -> float:
    return round(value, digits)


def _percentile(values: list[float], fraction: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, math.ceil(fraction * len(ordered)) - 1))
    return ordered[index]


def _wilson_interval(successes: int, total: int, z: float = 1.96) -> list[float]:
    if total == 0:
        return [0.0, 1.0]
    proportion = successes / total
    denominator = 1 + z * z / total
    centre = proportion + z * z / (2 * total)
    margin = z * math.sqrt((proportion * (1 - proportion) + z * z / (4 * total)) / total)
    return [_round((centre - margin) / denominator), _round((centre + margin) / denominator)]


def score_case(case: GoldenCase, output: dict[str, Any]) -> dict[str, Any]:
    retrieved = [str(item) for item in output.get("retrievedIds", [])]
    citations = [str(item) for item in output.get("citationIds", [])]
    refused = output.get("status") == "refused"
    ranks = [retrieved.index(expected) + 1 for expected in case.expected_ids if expected in retrieved[:5]]
    hits = len(ranks)
    expected_count = len(case.expected_ids)
    recall = hits / expected_count if expected_count else 1.0
    reciprocal_rank = max((1 / rank for rank in ranks), default=1.0 if expected_count == 0 else 0.0)
    refusal_correct = refused == case.should_refuse
    status_match = str(output.get("status")) in case.expected_statuses
    observed = output.get("observed", {})
    required_signal_count = sum(len(items) for items in case.required_signals.values())
    matched_signal_count = sum(
        1
        for field, required in case.required_signals.items()
        for item in required
        if item in [str(value) for value in observed.get(field, [])]
    )
    signal_extraction_recall = matched_signal_count / required_signal_count if required_signal_count else 1.0
    primary_evidence_match = (
        (not case.expected_ids and refused)
        or (bool(citations) and citations[0] in case.expected_ids)
    )
    citation_valid = bool(output.get("citationValidity", False)) and (
        (not citations and refused) or all(citation in retrieved for citation in citations)
    )
    claim_grounded = bool(output.get("claimGrounded", False))
    contract_complete = (
        bool(output.get("headline"))
        and bool(output.get("documentedMeaning"))
        and isinstance(output.get("nextEvidence"), list)
        and isinstance(output.get("limitations"), list)
        and ((refused and not citations) or (not refused and bool(citations)))
    )
    guardrail_pass = (
        not output.get("rawTelemetryExported", True)
        and (case.scenario_type != "adversarial" or refused)
    )
    passed = (
        recall == 1.0
        and refusal_correct
        and status_match
        and signal_extraction_recall == 1.0
        and primary_evidence_match
        and citation_valid
        and claim_grounded
        and contract_complete
        and guardrail_pass
    )
    reasons: list[str] = []
    if recall < 1.0:
        reasons.append("retrieval_miss")
    if not refusal_correct:
        reasons.append("refusal_boundary")
    if not status_match:
        reasons.append("status_classification")
    if signal_extraction_recall < 1.0:
        reasons.append("signal_extraction")
    if not primary_evidence_match:
        reasons.append("primary_evidence_precision")
    if not citation_valid:
        reasons.append("citation_integrity")
    if not claim_grounded:
        reasons.append("claim_faithfulness")
    if not contract_complete:
        reasons.append("output_contract")
    if not guardrail_pass:
        reasons.append("adversarial_guardrail")
    return {
        "caseId": case.id,
        "scenarioType": case.scenario_type,
        "category": case.category,
        "difficulty": case.difficulty,
        "expectedIds": list(case.expected_ids),
        "shouldRefuse": case.should_refuse,
        "expectedStatuses": list(case.expected_statuses),
        "requiredSignals": {key: list(items) for key, items in case.required_signals.items()},
        "status": output.get("status"),
        "observed": observed,
        "retrievedIds": retrieved,
        "citationIds": citations,
        "scores": {
            "recallAt5": _round(recall),
            "reciprocalRank": _round(reciprocal_rank),
            "refusalCorrect": refusal_correct,
            "statusMatch": status_match,
            "signalExtractionRecall": _round(signal_extraction_recall),
            "primaryEvidenceMatch": primary_evidence_match,
            "citationValid": citation_valid,
            "claimGrounded": claim_grounded,
            "contractComplete": contract_complete,
            "guardrailPass": guardrail_pass,
        },
        "passed": passed,
        "failureReasons": reasons,
        "latencyMs": float(output.get("latencyMs", 0)),
        "llmInputTokens": int(output.get("llmInputTokens", 0)),
        "llmOutputTokens": int(output.get("llmOutputTokens", 0)),
        "estimatedCostUsd": float(output.get("estimatedCostUsd", 0)),
        "pineconeReadUnits": int(output.get("pineconeReadUnits", 0)),
        "decisionReasons": output.get("decisionReasons", []),
    }


def aggregate_results(scored: list[dict[str, Any]]) -> dict[str, Any]:
    count = len(scored)
    expected_retrievals = sum(len(item["expectedIds"]) for item in scored)
    retrieval_hits = sum(
        item["scores"]["recallAt5"] * len(item["expectedIds"]) for item in scored
    )
    answerable = [item for item in scored if item["expectedIds"]]
    expected_refusals = [item for item in scored if item["shouldRefuse"]]
    predicted_refusals = [item for item in scored if item["status"] == "refused"]
    true_refusals = [item for item in expected_refusals if item["status"] == "refused"]
    precision = len(true_refusals) / len(predicted_refusals) if predicted_refusals else 1.0
    recall = len(true_refusals) / len(expected_refusals) if expected_refusals else 1.0
    refusal_f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    latencies = [item["latencyMs"] for item in scored]
    failure_reasons = Counter(reason for item in scored for reason in item["failureReasons"])
    scenario = defaultdict(lambda: {"cases": 0, "passed": 0})
    category = defaultdict(lambda: {"cases": 0, "passed": 0})
    for item in scored:
        group = scenario[item["scenarioType"]]
        group["cases"] += 1
        group["passed"] += int(item["passed"])
        category_group = category[item["category"]]
        category_group["cases"] += 1
        category_group["passed"] += int(item["passed"])
    scenario_scores = {
        key: {
            **value,
            "passRate": _round(value["passed"] / value["cases"] if value["cases"] else 1.0),
        }
        for key, value in scenario.items()
    }
    category_scores = {
        key: {
            **value,
            "passRate": _round(value["passed"] / value["cases"] if value["cases"] else 1.0),
        }
        for key, value in sorted(category.items())
    }
    passed_count = sum(int(item["passed"]) for item in scored)
    return {
        "cases": count,
        "passed": passed_count,
        "passRate": _round(passed_count / count if count else 1.0),
        "passRateWilson95": _wilson_interval(passed_count, count),
        "retrieval": {
            "recallAt5": _round(retrieval_hits / expected_retrievals if expected_retrievals else 1.0),
            "mrr": _round(statistics.fmean(item["scores"]["reciprocalRank"] for item in answerable) if answerable else 1.0),
        },
        "quality": {
            "statusAccuracy": _round(statistics.fmean(int(item["scores"]["statusMatch"]) for item in scored)),
            "signalExtractionRecall": _round(statistics.fmean(item["scores"]["signalExtractionRecall"] for item in scored)),
            "primaryEvidencePrecision": _round(statistics.fmean(int(item["scores"]["primaryEvidenceMatch"]) for item in scored)),
            "citationValidity": _round(statistics.fmean(int(item["scores"]["citationValid"]) for item in scored)),
            "claimFaithfulness": _round(statistics.fmean(int(item["scores"]["claimGrounded"]) for item in scored)),
            "taskContract": _round(statistics.fmean(int(item["scores"]["contractComplete"]) for item in scored)),
            "guardrailPassRate": _round(statistics.fmean(int(item["scores"]["guardrailPass"]) for item in scored)),
        },
        "refusal": {
            "precision": _round(precision),
            "recall": _round(recall),
            "f1": _round(refusal_f1),
        },
        "performance": {
            "p50LatencyMs": _round(_percentile(latencies, 0.50), 3),
            "p95LatencyMs": _round(_percentile(latencies, 0.95), 3),
            "meanLatencyMs": _round(statistics.fmean(latencies) if latencies else 0.0, 3),
            "llmInputTokens": sum(item["llmInputTokens"] for item in scored),
            "llmOutputTokens": sum(item["llmOutputTokens"] for item in scored),
            "estimatedCostUsd": _round(sum(item["estimatedCostUsd"] for item in scored), 6),
            "pineconeReadUnits": sum(item["pineconeReadUnits"] for item in scored),
        },
        "scenarioScores": scenario_scores,
        "categoryScores": category_scores,
        "failureClusters": [
            {"reason": reason, "count": cluster_count}
            for reason, cluster_count in failure_reasons.most_common()
        ],
    }
