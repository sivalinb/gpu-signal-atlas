#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
sys.path.insert(0, str(SCRIPT_DIR))

from week4_eval import dataset_fingerprint, dataset_version_for, load_cases  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate a frozen Week 4 JSONL dataset")
    parser.add_argument("--dataset", type=Path, default=REPO_ROOT / "evaluation/week4/golden-v2.jsonl")
    args = parser.parse_args()
    path = args.dataset.resolve()
    cases = load_cases(path)
    print(f"{dataset_version_for(path)}: {len(cases)} valid cases")
    print(f"SHA-256: {dataset_fingerprint(path)}")


if __name__ == "__main__":
    main()
