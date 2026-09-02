#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
sys.path.insert(0, str(SCRIPT_DIR))

from week4_eval import load_cases  # noqa: E402

source = REPO_ROOT / "evaluation/week4/golden-v1.jsonl"
destination = REPO_ROOT / "evaluation/week4/datasets"
destination.mkdir(parents=True, exist_ok=True)
groups: dict[str, list[dict]] = defaultdict(list)

for case in load_cases(source):
    payload = {
        "id": case.id,
        "query": case.query,
        "expected_ids": list(case.expected_ids),
        "should_refuse": case.should_refuse,
        "scenario_type": case.scenario_type,
        "category": case.category,
        "difficulty": case.difficulty,
        "source_type": case.source_type,
        "notes": case.notes,
    }
    groups[case.scenario_type].append(payload)

for scenario, rows in sorted(groups.items()):
    output = destination / f"{scenario.replace('_', '-')}.jsonl"
    output.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
    print(f"{output.relative_to(REPO_ROOT)}: {len(rows)} cases")

catalog = {
    "datasets": [
        {
            "id": "golden-v1",
            "name": "Week 4 Golden Dataset",
            "cases": sum(len(rows) for rows in groups.values()),
            "purpose": "Frozen baseline/post-change comparison",
        },
        *[
            {
                "id": scenario,
                "name": scenario.replace("_", " ").title(),
                "cases": len(rows),
                "purpose": {
                    "happy_path": "Expected GPU and telemetry workflows",
                    "edge_case": "Format noise, hard negatives, and compatibility limits",
                    "known_failure": "Regression cases derived from measured weaknesses",
                    "adversarial": "Prompt-injection and evidence-manipulation controls",
                }[scenario],
            }
            for scenario, rows in sorted(groups.items())
        ],
    ],
    "relatedProductDatasets": [
        {
            "name": "Reviewed NVIDIA/DCGM evidence corpus",
            "records": 17,
            "location": "core/corpus.ts",
        },
        {
            "name": "Public GPU performance benchmark records",
            "records": 6,
            "location": "core/benchmark.ts",
        },
    ],
}
(destination / "catalog.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
