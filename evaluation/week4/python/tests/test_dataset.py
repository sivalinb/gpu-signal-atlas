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


if __name__ == "__main__":
    unittest.main()
