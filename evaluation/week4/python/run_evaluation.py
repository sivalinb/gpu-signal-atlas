#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
sys.path.insert(0, str(SCRIPT_DIR))

from week4_eval import (  # noqa: E402
    aggregate_results,
    dataset_fingerprint,
    dataset_version_for,
    load_cases,
    score_case,
)

DEFAULT_DATASET = REPO_ROOT / "evaluation/week4/golden-v1.jsonl"


def parse_environment_file(path: Path | None) -> dict[str, str]:
    if path is None:
        return {}
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def invoke_agent(case_id: str, query: str, variant: str, backend: str, provider_environment: dict[str, str]) -> dict[str, Any]:
    request = json.dumps({"caseId": case_id, "query": query, "variant": variant, "backend": backend})
    completed = subprocess.run(
        ["node", "--experimental-strip-types", "scripts/week4-agent.ts"],
        cwd=REPO_ROOT,
        input=request,
        text=True,
        capture_output=True,
        check=False,
        timeout=20,
        env={**os.environ, **provider_environment},
    )
    if completed.returncode != 0:
        raise RuntimeError(f"Agent failed for {case_id}: {completed.stderr.strip()}")
    return json.loads(completed.stdout)


def run_local(dataset_path: Path, variant: str, backend: str, provider_environment: dict[str, str]) -> dict[str, Any]:
    cases = load_cases(dataset_path)
    scored: list[dict[str, Any]] = []
    for index, case in enumerate(cases, start=1):
        output = invoke_agent(case.id, case.query, variant, backend, provider_environment)
        scored.append(score_case(case, output))
        state = "PASS" if scored[-1]["passed"] else "FAIL"
        print(f"[{index:02d}/{len(cases)}] {state} {case.id}")
    return {
        "schemaVersion": 1,
        "datasetVersion": dataset_version_for(dataset_path),
        "datasetSha256": dataset_fingerprint(dataset_path),
        "variant": variant,
        "agentVersion": os.environ.get("GPU_ATLAS_AGENT_VERSION", variant),
        "retrievalBackend": backend,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "privacy": {
            "dataset": "synthetic-and-curated-public-formats",
            "rawProductionTelemetryExported": False,
        },
        "aggregate": aggregate_results(scored),
        "cases": scored,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the GPU Signal Atlas Week 4 evaluation")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--variant", choices=("baseline", "improved", "holdout"), required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--backend", choices=("local", "pinecone"), default="local")
    parser.add_argument("--provider-env-file", type=Path)
    args = parser.parse_args()

    result = run_local(
        args.dataset.resolve(),
        args.variant,
        args.backend,
        parse_environment_file(args.provider_env_file),
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    aggregate = result["aggregate"]
    print(
        f"\n{args.variant.title()} result: {aggregate['passed']}/{aggregate['cases']} passed "
        f"({aggregate['passRate'] * 100:.1f}%), Recall@5 "
        f"{aggregate['retrieval']['recallAt5'] * 100:.1f}%, refusal F1 "
        f"{aggregate['refusal']['f1'] * 100:.1f}%"
    )


if __name__ == "__main__":
    main()
