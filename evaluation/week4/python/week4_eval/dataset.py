from __future__ import annotations

import hashlib
import json
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DATASET_VERSION = "gpu-signal-atlas-week4-golden-v1"
EXPECTED_DISTRIBUTION = {
    "happy_path": 24,
    "edge_case": 14,
    "known_failure": 7,
    "adversarial": 3,
}


@dataclass(frozen=True)
class GoldenCase:
    id: str
    query: str
    expected_ids: tuple[str, ...]
    should_refuse: bool
    scenario_type: str
    category: str
    difficulty: str
    source_type: str
    notes: str

    @classmethod
    def from_dict(cls, value: dict[str, Any]) -> "GoldenCase":
        return cls(
            id=str(value["id"]),
            query=str(value["query"]),
            expected_ids=tuple(str(item) for item in value["expected_ids"]),
            should_refuse=bool(value["should_refuse"]),
            scenario_type=str(value["scenario_type"]),
            category=str(value["category"]),
            difficulty=str(value["difficulty"]),
            source_type=str(value["source_type"]),
            notes=str(value["notes"]),
        )

    def reference_output(self) -> dict[str, Any]:
        return {
            "expected_ids": list(self.expected_ids),
            "should_refuse": self.should_refuse,
        }

    def metadata(self) -> dict[str, Any]:
        return {
            "case_id": self.id,
            "scenario_type": self.scenario_type,
            "category": self.category,
            "difficulty": self.difficulty,
            "source_type": self.source_type,
            "labeler": "human-reviewed",
            "dataset_version": DATASET_VERSION,
        }


def load_cases(path: Path) -> list[GoldenCase]:
    cases: list[GoldenCase] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            cases.append(GoldenCase.from_dict(json.loads(line)))
        except (KeyError, TypeError, json.JSONDecodeError) as error:
            raise ValueError(f"Invalid case at {path}:{line_number}: {error}") from error
    validate_cases(cases)
    return cases


def validate_cases(cases: list[GoldenCase]) -> None:
    if len(cases) != 48:
        raise ValueError(f"Expected 48 golden cases, found {len(cases)}")
    ids = [case.id for case in cases]
    duplicates = sorted(case_id for case_id, count in Counter(ids).items() if count > 1)
    if duplicates:
        raise ValueError(f"Duplicate case IDs: {', '.join(duplicates)}")
    actual = dict(Counter(case.scenario_type for case in cases))
    if actual != EXPECTED_DISTRIBUTION:
        raise ValueError(f"Scenario distribution {actual} does not match {EXPECTED_DISTRIBUTION}")
    for case in cases:
        if not case.query.strip():
            raise ValueError(f"{case.id} has an empty query")
        if case.should_refuse and case.expected_ids:
            raise ValueError(f"{case.id} cannot both refuse and require retrieval IDs")


def dataset_fingerprint(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()
