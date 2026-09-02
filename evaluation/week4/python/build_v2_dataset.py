#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
sys.path.insert(0, str(SCRIPT_DIR))

from week4_eval import dataset_fingerprint, load_cases  # noqa: E402

V1_PATH = REPO_ROOT / "evaluation/week4/golden-v1.jsonl"
ADDITIONS_PATH = REPO_ROOT / "evaluation/week4/v2-additions.jsonl"
V2_PATH = REPO_ROOT / "evaluation/week4/golden-v2.jsonl"


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def canonical_signals(query: str) -> dict[str, list[str]]:
    xids = re.findall(r"\bxid(?:[_:#=\-\s]|\s*\([^)]*\)\s*:?)*(?:event\s*=\s*|error\s+)?(\d{1,3})\b", query, re.I)
    metrics = [item.upper() for item in re.findall(r"\bDCGM_(?:FI|EXP)_[A-Z0-9_]+\b", query, re.I)]
    models = [item.upper() for item in re.findall(r"\b(A100|H100|H200|B100|GB200|V100|T4|L4|L40S)\b", query, re.I)]
    drivers = [f"R{item}" for item in re.findall(r"\bR(\d{3})\b", query, re.I)]
    return {
        key: list(dict.fromkeys(values))
        for key, values in {
            "xids": xids,
            "metrics": metrics,
            "gpuModels": models,
            "driverBranches": drivers,
        }.items()
        if values
    }


def enrich(row: dict[str, Any]) -> dict[str, Any]:
    status = ["refused"] if row["should_refuse"] else (
        ["needs-investigation"] if row["category"] in {"compatibility", "ambiguity"} else ["grounded", "needs-investigation"]
    )
    severity = {
        "happy_path": "low",
        "edge_case": "medium",
        "known_failure": "high",
        "adversarial": "critical",
    }[row["scenario_type"]]
    return {
        **row,
        "expected_statuses": status,
        "required_signals": canonical_signals(row["query"]),
        "severity": severity,
        "labeler": "human-reviewed",
    }


def main() -> None:
    rows = [enrich(row) for row in [*read_jsonl(V1_PATH), *read_jsonl(ADDITIONS_PATH)]]
    V2_PATH.write_text("".join(json.dumps(row, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")
    cases = load_cases(V2_PATH)
    print(f"gpu-signal-atlas-week4-golden-v2-100: {len(cases)} valid cases")
    print(f"SHA-256: {dataset_fingerprint(V2_PATH)}")


if __name__ == "__main__":
    main()
