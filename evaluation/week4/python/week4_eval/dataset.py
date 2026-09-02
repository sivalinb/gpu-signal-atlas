from __future__ import annotations

import hashlib
import json
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

DATASET_VERSION = "gpu-signal-atlas-week4-golden-v1"
DATASET_CONFIGS = {
    "golden-v1.jsonl": {
        "version": DATASET_VERSION,
        "count": 48,
        "distribution": {"happy_path": 24, "edge_case": 14, "known_failure": 7, "adversarial": 3},
    },
    "golden-v2.jsonl": {
        "version": "gpu-signal-atlas-week4-golden-v2-100",
        "count": 100,
        "distribution": {"happy_path": 50, "edge_case": 30, "known_failure": 15, "adversarial": 5},
    },
    "holdout-v1.jsonl": {
        "version": "gpu-signal-atlas-week4-post-change-holdout-v1-16",
        "count": 16,
        "distribution": {"happy_path": 8, "edge_case": 4, "known_failure": 2, "adversarial": 2},
    },
}
EXPECTED_DISTRIBUTION = DATASET_CONFIGS["golden-v1.jsonl"]["distribution"]


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
    expected_statuses: tuple[str, ...]
    required_signals: dict[str, tuple[str, ...]]
    severity: str
    labeler: str

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
            expected_statuses=tuple(
                str(item)
                for item in value.get(
                    "expected_statuses",
                    ["refused"] if value["should_refuse"] else ["grounded", "needs-investigation"],
                )
            ),
            required_signals={
                str(key): tuple(str(item) for item in items)
                for key, items in value.get("required_signals", {}).items()
            },
            severity=str(value.get("severity", "medium")),
            labeler=str(value.get("labeler", "human-reviewed")),
        )

    def reference_output(self) -> dict[str, Any]:
        return {
            "expected_ids": list(self.expected_ids),
            "should_refuse": self.should_refuse,
            "expected_statuses": list(self.expected_statuses),
            "required_signals": {key: list(items) for key, items in self.required_signals.items()},
        }

    def metadata(self, dataset_version: str = DATASET_VERSION) -> dict[str, Any]:
        return {
            "case_id": self.id,
            "scenario_type": self.scenario_type,
            "category": self.category,
            "difficulty": self.difficulty,
            "source_type": self.source_type,
            "severity": self.severity,
            "labeler": self.labeler,
            "dataset_version": dataset_version,
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
    validate_cases(cases, path.name)
    return cases


def dataset_version_for(path: Path) -> str:
    config = DATASET_CONFIGS.get(path.name)
    if config is None:
        raise ValueError(f"Unsupported golden dataset filename: {path.name}")
    return str(config["version"])


def validate_cases(cases: list[GoldenCase], dataset_filename: str = "golden-v1.jsonl") -> None:
    config = DATASET_CONFIGS.get(dataset_filename)
    if config is None:
        raise ValueError(f"Unsupported golden dataset filename: {dataset_filename}")
    expected_count = int(config["count"])
    if len(cases) != expected_count:
        raise ValueError(f"Expected {expected_count} golden cases, found {len(cases)}")
    ids = [case.id for case in cases]
    duplicates = sorted(case_id for case_id, count in Counter(ids).items() if count > 1)
    if duplicates:
        raise ValueError(f"Duplicate case IDs: {', '.join(duplicates)}")
    actual = dict(Counter(case.scenario_type for case in cases))
    expected_distribution = config["distribution"]
    if actual != expected_distribution:
        raise ValueError(f"Scenario distribution {actual} does not match {expected_distribution}")
    for case in cases:
        if not case.query.strip():
            raise ValueError(f"{case.id} has an empty query")
        if case.should_refuse and case.expected_ids:
            raise ValueError(f"{case.id} cannot both refuse and require retrieval IDs")
        if case.should_refuse and case.expected_statuses != ("refused",):
            raise ValueError(f"{case.id} refusal label must require refused status")
        if not set(case.expected_statuses).issubset({"grounded", "needs-investigation", "refused"}):
            raise ValueError(f"{case.id} contains an invalid expected status")


def dataset_fingerprint(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()
