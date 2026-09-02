#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
sys.path.insert(0, str(SCRIPT_DIR))

from week4_eval import load_cases  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Materialize scenario slices from a golden dataset")
    parser.add_argument("--dataset", type=Path, default=REPO_ROOT / "evaluation/week4/golden-v2.jsonl")
    parser.add_argument("--output-dir", type=Path, default=REPO_ROOT / "evaluation/week4/datasets/v2")
    args = parser.parse_args()
    source = args.dataset.resolve()
    destination = args.output_dir.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    groups: dict[str, list[dict]] = defaultdict(list)
    for case in load_cases(source):
        payload = {
            "id": case.id,
            "query": case.query,
            "expected_ids": list(case.expected_ids),
            "should_refuse": case.should_refuse,
            "expected_statuses": list(case.expected_statuses),
            "required_signals": {key: list(items) for key, items in case.required_signals.items()},
            "scenario_type": case.scenario_type,
            "category": case.category,
            "difficulty": case.difficulty,
            "severity": case.severity,
            "source_type": case.source_type,
            "notes": case.notes,
        }
        groups[case.scenario_type].append(payload)
    for scenario, rows in sorted(groups.items()):
        output = destination / f"{scenario.replace('_', '-')}.jsonl"
        output.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
        print(f"{output.relative_to(REPO_ROOT)}: {len(rows)} cases")
    catalog = {
        "dataset": source.name,
        "cases": sum(len(rows) for rows in groups.values()),
        "scenarioSlices": [
            {"id": scenario, "name": scenario.replace("_", " ").title(), "cases": len(rows)}
            for scenario, rows in sorted(groups.items())
        ],
        "relatedProductDatasets": [
            {"name": "Reviewed NVIDIA/DCGM evidence corpus", "records": 17, "location": "core/corpus.ts"},
            {"name": "Public GPU performance benchmark records", "records": 6, "location": "core/benchmark.ts"},
        ],
    }
    (destination / "catalog.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
