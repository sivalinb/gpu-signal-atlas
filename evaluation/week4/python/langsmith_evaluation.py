#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from langsmith import Client, evaluate, traceable

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
sys.path.insert(0, str(SCRIPT_DIR))

from week4_eval import dataset_fingerprint, dataset_version_for, load_cases  # noqa: E402

EXAMPLE_NAMESPACE = uuid.UUID("86b9464e-4a8a-43b4-9daa-3c47777b1951")


def read_key(path: Path) -> str:
    value = path.read_text(encoding="utf-8").strip()
    if "=" in value:
        value = value.split("=", 1)[1].strip().strip('"').strip("'")
    if not value:
        raise ValueError(f"No API key found in {path}")
    return value


def sync_dataset(client: Client, dataset_path: Path) -> Any:
    cases = load_cases(dataset_path)
    dataset_name = dataset_version_for(dataset_path)
    dataset_version = dataset_version_for(dataset_path)
    try:
        dataset = client.read_dataset(dataset_name=dataset_name)
    except Exception:
        dataset = client.create_dataset(
            dataset_name,
            description=f"Frozen GPU Signal Atlas Week 4 dataset with {len(cases)} happy-path, edge, regression, and adversarial telemetry cases.",
            metadata={
                "version": dataset_version,
                "sha256": dataset_fingerprint(dataset_path),
                "privacy": "synthetic-and-curated-public-formats",
                "labeling": "human-reviewed",
            },
        )
    examples = [
        {
            "id": str(uuid.uuid5(EXAMPLE_NAMESPACE, f"{dataset_version}:{case.id}")),
            "inputs": {"case_id": case.id, "query": case.query},
            "outputs": case.reference_output(),
            "metadata": case.metadata(dataset_version),
            "split": [case.scenario_type, case.category],
        }
        for case in cases
    ]
    existing_ids = {str(example.id) for example in client.list_examples(dataset_id=dataset.id)}
    creates = [example for example in examples if example["id"] not in existing_ids]
    updates = [example for example in examples if example["id"] in existing_ids]
    if creates:
        client.create_examples(dataset_id=dataset.id, examples=creates, max_concurrency=3)
    if updates:
        client.update_examples(dataset_id=dataset.id, updates=updates)
    versions = list(client.list_dataset_versions(dataset_id=dataset.id, limit=1))
    if versions:
        tag = "week4-frozen-v2-100" if dataset_path.name == "golden-v2.jsonl" else "week4-frozen-v1"
        client.update_dataset_tag(dataset_id=dataset.id, as_of=versions[0].as_of, tag=tag)
    return dataset


def artifact_target(result_by_case: dict[str, dict[str, Any]], variant: str):
    @traceable(
        name="week4.replay-agent-output",
        run_type="tool",
        metadata={"stage": "agent", "variant": variant, "artifact_replay": True},
    )
    def replay(inputs: dict[str, Any]) -> dict[str, Any]:
        return result_by_case[str(inputs["case_id"])]

    @traceable(
        name="week4.validate-contract",
        run_type="chain",
        metadata={"stage": "evaluator-input", "variant": variant},
    )
    def validate(output: dict[str, Any]) -> dict[str, Any]:
        return {
            "contract_complete": output["scores"]["contractComplete"],
            "citation_valid": output["scores"]["citationValid"],
            "raw_telemetry_exported": False,
        }

    def target(inputs: dict[str, Any]) -> dict[str, Any]:
        output = replay(inputs)
        validation = validate(output)
        return {**output, "validation": validation, "variant": variant}

    return target


def metric_evaluator(metric: str, path: tuple[str, ...]):
    def evaluator(outputs: dict[str, Any]) -> dict[str, Any]:
        value: Any = outputs
        for key in path:
            value = value[key]
        return {"key": metric, "score": float(value)}

    evaluator.__name__ = metric
    return evaluator


def run_experiment(client: Client, dataset: Any, artifact_path: Path, variant: str, dataset_version: str) -> tuple[str, str | None]:
    artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
    result_by_case = {item["caseId"]: item for item in artifact["cases"]}
    experiment_prefix = f"gpu-signal-atlas-week4-{variant}"
    results = evaluate(
        artifact_target(result_by_case, variant),
        data=dataset,
        evaluators=[
            metric_evaluator("recall_at_5", ("scores", "recallAt5")),
            metric_evaluator("refusal_correct", ("scores", "refusalCorrect")),
            metric_evaluator("status_match", ("scores", "statusMatch")),
            metric_evaluator("signal_extraction_recall", ("scores", "signalExtractionRecall")),
            metric_evaluator("primary_evidence_match", ("scores", "primaryEvidenceMatch")),
            metric_evaluator("citation_valid", ("scores", "citationValid")),
            metric_evaluator("claim_faithfulness", ("scores", "claimGrounded")),
            metric_evaluator("task_contract", ("scores", "contractComplete")),
            metric_evaluator("guardrail_pass", ("scores", "guardrailPass")),
        ],
        metadata={
            "dataset_version": dataset_version,
            "dataset_sha256": artifact["datasetSha256"],
            "agent_variant": variant,
            "source": "frozen-local-evaluation-artifact",
            "raw_production_telemetry_exported": False,
        },
        experiment_prefix=experiment_prefix,
        description=f"Controlled Week 4 {variant} run over the frozen {artifact['aggregate']['cases']}-case GPU Signal Atlas dataset.",
        max_concurrency=3,
        client=client,
        blocking=True,
    )
    experiment_name = str(results.experiment_name)
    project = client.read_project(project_name=experiment_name)
    web_url = getattr(project, "url", None)
    return experiment_name, str(web_url) if web_url else None


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload Week 4 dataset and paired experiments to LangSmith")
    parser.add_argument("--api-key-file", type=Path, required=True)
    parser.add_argument("--dataset", type=Path, default=REPO_ROOT / "evaluation/week4/golden-v1.jsonl")
    parser.add_argument("--baseline", type=Path, default=REPO_ROOT / "evaluation/week4/results/baseline.json")
    parser.add_argument("--improved", type=Path, default=REPO_ROOT / "evaluation/week4/results/improved.json")
    parser.add_argument("--output", type=Path, default=REPO_ROOT / "evaluation/week4/results/langsmith.json")
    args = parser.parse_args()

    api_key = read_key(args.api_key_file)
    os.environ["LANGSMITH_API_KEY"] = api_key
    os.environ["LANGSMITH_TRACING"] = "true"
    os.environ["LANGSMITH_PROJECT"] = "gpu-signal-atlas-week4"
    client = Client(api_key=api_key, hide_inputs=False, hide_outputs=False)
    dataset_version = dataset_version_for(args.dataset)
    dataset = sync_dataset(client, args.dataset)
    experiments = []
    for variant, artifact in (("baseline", args.baseline), ("improved", args.improved)):
        name, url = run_experiment(client, dataset, artifact, variant, dataset_version)
        experiments.append({"variant": variant, "name": name, "url": url})
    payload = {
        "dataset": {
            "name": dataset_version,
            "id": str(dataset.id),
            "tag": "week4-frozen-v2-100" if args.dataset.name == "golden-v2.jsonl" else "week4-frozen-v1",
        },
        "experiments": experiments,
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
        "privacy": "Synthetic and curated public-format cases only; no production payloads or secrets uploaded.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Synced {dataset_version} and {len(experiments)} experiments")
    for experiment in experiments:
        print(f"{experiment['variant']}: {experiment['name']}")


if __name__ == "__main__":
    main()
