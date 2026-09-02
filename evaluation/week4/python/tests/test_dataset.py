from __future__ import annotations

import sys
import unittest
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SCRIPT_DIR.parents[2]
sys.path.insert(0, str(SCRIPT_DIR))

from week4_eval.dataset import EXPECTED_DISTRIBUTION, load_cases
from week4_eval.scoring import aggregate_results, score_case


class DatasetTests(unittest.TestCase):
    def setUp(self) -> None:
        self.cases = load_cases(REPO_ROOT / "evaluation/week4/golden-v1.jsonl")

    def test_frozen_dataset_distribution(self) -> None:
        self.assertEqual(len(self.cases), 48)
        self.assertEqual(
            dict(Counter(case.scenario_type for case in self.cases)),
            EXPECTED_DISTRIBUTION,
        )

    def test_perfect_grounded_case_scores_pass(self) -> None:
        case = self.cases[0]
        result = score_case(
            case,
            {
                "status": "grounded",
                "retrievedIds": list(case.expected_ids),
                "citationIds": list(case.expected_ids),
                "citationValidity": True,
                "claimGrounded": True,
                "headline": "Grounded title",
                "documentedMeaning": "Grounded meaning",
                "nextEvidence": ["Collect evidence"],
                "limitations": ["Not root cause"],
                "rawTelemetryExported": False,
                "latencyMs": 10,
            },
        )
        self.assertTrue(result["passed"])
        self.assertEqual(aggregate_results([result])["passRate"], 1.0)

    def test_v2_dataset_has_100_cases_and_target_distribution(self) -> None:
        cases = load_cases(REPO_ROOT / "evaluation/week4/golden-v2.jsonl")
        self.assertEqual(len(cases), 100)
        self.assertEqual(
            dict(Counter(case.scenario_type for case in cases)),
            {"happy_path": 50, "edge_case": 30, "known_failure": 15, "adversarial": 5},
        )
        self.assertTrue(all(case.labeler == "human-reviewed" for case in cases))

    def test_primary_evidence_and_signal_extraction_are_enforced(self) -> None:
        case = next(case for case in load_cases(REPO_ROOT / "evaluation/week4/golden-v2.jsonl") if case.id == "v2-failure-xid-event-key")
        result = score_case(
            case,
            {
                "status": "grounded",
                "observed": {"xids": [], "metrics": [], "gpuModels": ["A100"], "driverBranches": []},
                "retrievedIds": ["nvidia-xid-48", "runbook-ecc"],
                "citationIds": ["runbook-ecc", "nvidia-xid-48"],
                "citationValidity": True,
                "claimGrounded": True,
                "headline": "Grounded title",
                "documentedMeaning": "Grounded meaning",
                "nextEvidence": [],
                "limitations": [],
                "rawTelemetryExported": False,
            },
        )
        self.assertFalse(result["passed"])
        self.assertIn("signal_extraction", result["failureReasons"])
        self.assertIn("primary_evidence_precision", result["failureReasons"])


if __name__ == "__main__":
    unittest.main()
