"""Build and publish prompt-outcome training datasets.

Every candidate prompt becomes one flat training row. Rows are appended to a
local JSONL source of truth and, when the W&B SDK is available, published as a
versioned W&B Table inside a dataset Artifact. Set ``WANDB_REGISTRY_PATH`` to a
path such as ``wandb-registry-Datasets/dance-prompt-engagement`` to also link
each artifact version into a W&B Registry collection.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Mapping, Optional

from harness.contracts import Candidate, GenerationRecord
from harness.weave_trace import op

DEFAULT_PROJECT = "sia-social-loop"
DEFAULT_ARTIFACT = "dance-prompt-engagement"
DEFAULT_DATASET_PATH = Path("data/training/prompt_outcomes.jsonl")
SCHEMA_VERSION = "prompt-outcome-v1"

DATASET_COLUMNS = [
    "schema_version",
    "example_id",
    "loop_run_id",
    "generation_number",
    "variant_id",
    "selected",
    "exploration",
    "concept_id",
    "created_by",
    "generation_prompt",
    "harness_prompt",
    "hook",
    "angle",
    "script",
    "storyboard_json",
    "elements_json",
    "element_weights_json",
    "trend_context_id",
    "trend_topic",
    "trend_hook",
    "trend_format",
    "trend_audio",
    "trend_region",
    "trend_raw_signals_json",
    "harness_state_version",
    "rubric_version",
    "critic_id",
    "predicted_score",
    "total_score",
    "distribution_tier",
    "category_breakdown_json",
    "rubric_breakdown_json",
    "auto_fails_json",
    "critic_confidence",
    "score_type",
    "evidence_coverage",
    "views_at_168h",
    "target_log1p_views",
    "avg_percent_viewed",
    "impressions",
    "likes",
    "comments",
    "shares",
    "follows",
    "label_source",
    "label_collected_at",
    "label_maturity_hours",
]


@dataclass(frozen=True)
class DatasetPublishResult:
    published: bool
    rows: int
    artifact_name: str
    reason: Optional[str] = None


def _json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def _example_id(
    run_id: str,
    record: GenerationRecord,
    candidate: Candidate,
) -> str:
    payload = (
        f"{run_id}|{record.generation_number}|{candidate.variant_id}|"
        f"{candidate.concept.id}"
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:24]


@op
def prompt_result_row(
    record: GenerationRecord,
    candidate: Candidate,
    *,
    run_id: str,
    harness_prompt: str = "",
    trend: Optional[Mapping[str, Any]] = None,
) -> dict[str, Any]:
    """Flatten one candidate into a model-training row and a Weave trace."""
    concept = candidate.concept
    score = candidate.score
    outcome = candidate.outcome
    trend = trend or {}
    views = outcome.views if outcome and outcome.views is not None else None

    return {
        "schema_version": SCHEMA_VERSION,
        "example_id": _example_id(run_id, record, candidate),
        "loop_run_id": run_id,
        "generation_number": record.generation_number,
        "variant_id": candidate.variant_id,
        "selected": candidate.selected,
        "exploration": candidate.exploration,
        "concept_id": concept.id,
        "created_by": concept.created_by,
        "generation_prompt": concept.seedance_prompt or concept.visual_prompt,
        "harness_prompt": harness_prompt,
        "hook": concept.hook,
        "angle": concept.angle,
        "script": concept.script,
        "storyboard_json": _json(concept.storyboard),
        "elements_json": _json(concept.elements),
        "element_weights_json": _json(concept.element_weights),
        "trend_context_id": concept.trend_context_id,
        "trend_topic": trend.get("topic"),
        "trend_hook": trend.get("hook"),
        "trend_format": trend.get("format"),
        "trend_audio": trend.get("audio"),
        "trend_region": trend.get("region"),
        "trend_raw_signals_json": _json(trend.get("raw_signals", {})),
        "harness_state_version": concept.harness_state_version,
        "rubric_version": record.rubric_version,
        "critic_id": score.scored_by,
        "predicted_score": score.predicted_score,
        "total_score": score.total_score,
        "distribution_tier": score.distribution_tier,
        "category_breakdown_json": _json(score.category_breakdown or {}),
        "rubric_breakdown_json": _json(score.rubric_breakdown or {}),
        "auto_fails_json": _json(score.auto_fails_triggered or []),
        "critic_confidence": score.confidence,
        "score_type": score.score_type,
        "evidence_coverage": score.evidence_coverage,
        "views_at_168h": views,
        "target_log1p_views": round(math.log1p(views), 6) if views is not None else None,
        "avg_percent_viewed": outcome.avg_percent_viewed if outcome else None,
        "impressions": outcome.impressions if outcome else None,
        "likes": outcome.likes if outcome else None,
        "comments": outcome.comments if outcome else None,
        "shares": outcome.shares if outcome else None,
        "follows": outcome.follows if outcome else None,
        "label_source": outcome.source if outcome else None,
        "label_collected_at": (
            outcome.collected_at.isoformat() if outcome else None
        ),
        "label_maturity_hours": outcome.maturity_hours if outcome else None,
    }


def rows_from_records(
    records: Iterable[GenerationRecord],
    *,
    run_id: str,
    contexts: Optional[Mapping[str, Mapping[str, Any]]] = None,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    contexts = contexts or {}
    for record in records:
        context = contexts.get(record.id, {})
        candidates = record.candidates or [
            Candidate(
                variant_id=f"g{record.generation_number:03d}_selected",
                concept=record.concept,
                score=record.score,
                selected=True,
                outcome=record.outcome,
            )
        ]
        for candidate in candidates:
            rows.append(
                prompt_result_row(
                    record,
                    candidate,
                    run_id=run_id,
                    harness_prompt=str(context.get("harness_prompt", "")),
                    trend=context.get("trend"),
                )
            )
    return rows


def load_jsonl(path: Path | str = DEFAULT_DATASET_PATH) -> list[dict[str, Any]]:
    path = Path(path)
    if not path.exists():
        return []
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def append_jsonl(
    rows: Iterable[Mapping[str, Any]],
    path: Path | str = DEFAULT_DATASET_PATH,
) -> int:
    """Append unseen examples and return the number of newly written rows."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    existing_ids = {row["example_id"] for row in load_jsonl(path)}
    new_rows = [dict(row) for row in rows if row["example_id"] not in existing_ids]
    if not new_rows:
        return 0
    with path.open("a", encoding="utf-8") as handle:
        for row in new_rows:
            handle.write(json.dumps(row, sort_keys=True, default=str) + "\n")
    return len(new_rows)


def replace_jsonl(
    rows: Iterable[Mapping[str, Any]],
    path: Path | str = DEFAULT_DATASET_PATH,
) -> int:
    """Replace a generated dataset snapshot and return the rows written."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    materialized = [dict(row) for row in rows]
    with path.open("w", encoding="utf-8") as handle:
        for row in materialized:
            handle.write(json.dumps(row, sort_keys=True, default=str) + "\n")
    return len(materialized)


def _table_data(rows: Iterable[Mapping[str, Any]]) -> list[list[Any]]:
    return [[row.get(column) for column in DATASET_COLUMNS] for row in rows]


def publish_wandb_dataset(
    rows: list[dict[str, Any]],
    *,
    dataset_path: Path | str = DEFAULT_DATASET_PATH,
    project: Optional[str] = None,
    artifact_name: Optional[str] = None,
    registry_path: Optional[str] = None,
    run_id: Optional[str] = None,
    wandb_module: Any = None,
) -> DatasetPublishResult:
    """Publish cumulative rows as a versioned W&B dataset Artifact.

    This function is offline-safe: missing SDKs, credentials, or network access
    return a result instead of breaking the generation loop.
    """
    artifact_name = artifact_name or os.getenv(
        "WANDB_DATASET_ARTIFACT", DEFAULT_ARTIFACT
    )
    if os.getenv("WANDB_DATASET_DISABLE"):
        return DatasetPublishResult(False, len(rows), artifact_name, "disabled")
    if not rows:
        return DatasetPublishResult(False, 0, artifact_name, "no rows")

    if wandb_module is None:
        try:
            import wandb as wandb_module  # type: ignore
        except Exception as exc:
            return DatasetPublishResult(
                False, len(rows), artifact_name, f"wandb unavailable: {exc}"
            )

    project = project or os.getenv("WANDB_PROJECT") or os.getenv(
        "WEAVE_PROJECT", DEFAULT_PROJECT
    )
    registry_path = registry_path or os.getenv("WANDB_REGISTRY_PATH")
    dataset_path = Path(dataset_path)

    try:
        with wandb_module.init(
            project=project,
            job_type="prompt-dataset-publish",
            name=f"prompt-dataset-{run_id}" if run_id else None,
            config={
                "schema_version": SCHEMA_VERSION,
                "label_target": "views_at_168h",
                "artifact_name": artifact_name,
            },
        ) as run:
            table = wandb_module.Table(
                columns=DATASET_COLUMNS,
                data=_table_data(rows),
            )
            artifact = wandb_module.Artifact(
                name=artifact_name,
                type="dataset",
                description=(
                    "Dance-video generation prompts, critic results, and "
                    "seven-day engagement labels."
                ),
                metadata={
                    "schema_version": SCHEMA_VERSION,
                    "rows": len(rows),
                    "synthetic_rows": sum(
                        row.get("label_source") == "synthetic" for row in rows
                    ),
                    "target": "views_at_168h",
                },
            )
            artifact.add(table, "prompt_outcomes")
            if dataset_path.exists():
                artifact.add_file(
                    str(dataset_path),
                    name="prompt_outcomes.jsonl",
                )

            run.log(
                {
                    "prompt_outcomes/batch": table,
                    "dataset/rows": len(rows),
                    "dataset/synthetic_rows": sum(
                        row.get("label_source") == "synthetic" for row in rows
                    ),
                }
            )
            synthetic_rows = sum(
                row.get("label_source") == "synthetic" for row in rows
            )
            label_alias = (
                "synthetic"
                if synthetic_rows == len(rows)
                else "observed"
                if synthetic_rows == 0
                else "mixed"
            )
            logged = run.log_artifact(
                artifact,
                aliases=["latest", label_alias],
            )
            if registry_path:
                wait = getattr(logged, "wait", None)
                if callable(wait):
                    wait()
                run.link_artifact(
                    logged,
                    target_path=registry_path,
                    aliases=["latest", label_alias],
                )
    except Exception as exc:
        return DatasetPublishResult(
            False, len(rows), artifact_name, f"publish failed: {exc}"
        )

    return DatasetPublishResult(True, len(rows), artifact_name)
