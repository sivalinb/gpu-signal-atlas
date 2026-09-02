#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
sys.path.insert(0, str(SCRIPT_DIR))

from week4_eval import DATASET_VERSION, dataset_fingerprint, load_cases  # noqa: E402

path = REPO_ROOT / "evaluation/week4/golden-v1.jsonl"
cases = load_cases(path)
print(f"{DATASET_VERSION}: {len(cases)} valid cases")
print(f"SHA-256: {dataset_fingerprint(path)}")
