"""Seed and publish the prompt-engagement dataset to W&B.

By default this creates the deterministic 80-generation x 5-candidate corpus,
appends it to the local JSONL training memory, and publishes the cumulative rows
as a versioned W&B dataset Artifact.

Usage:
  python scripts/publish_wandb_dataset.py
  python scripts/publish_wandb_dataset.py --no-wandb
  python scripts/publish_wandb_dataset.py \
    --registry-path wandb-registry-Datasets/dance-prompt-engagement
"""

from __future__ import annotations

import argparse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from harness.training_data import (  # noqa: E402
    DEFAULT_DATASET_PATH,
    append_jsonl,
    load_jsonl,
    publish_wandb_dataset,
    replace_jsonl,
    rows_from_records,
)
from scripts.synth_prompt_outcomes import SEED, generate  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--generations", type=int, default=80)
    parser.add_argument("--candidates", type=int, default=5)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument(
        "--dataset-path",
        type=pathlib.Path,
        default=DEFAULT_DATASET_PATH,
    )
    parser.add_argument("--project")
    parser.add_argument("--artifact-name")
    parser.add_argument("--registry-path")
    parser.add_argument("--no-wandb", action="store_true")
    parser.add_argument(
        "--replace-local",
        action="store_true",
        help="Rebuild the local JSONL snapshot instead of appending unseen rows.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    records = generate(
        seed=args.seed,
        m=args.generations,
        k=args.candidates,
    )
    run_id = (
        f"synthetic-seed-{args.seed}-"
        f"m{args.generations}-k{args.candidates}"
    )
    rows = rows_from_records(records, run_id=run_id)
    appended = (
        replace_jsonl(rows, args.dataset_path)
        if args.replace_local
        else append_jsonl(rows, args.dataset_path)
    )
    cumulative = load_jsonl(args.dataset_path)
    print(
        f"local dataset: {args.dataset_path} "
        f"({appended} new, {len(cumulative)} total rows)"
    )

    if args.no_wandb:
        print("W&B publish skipped (--no-wandb)")
        return

    result = publish_wandb_dataset(
        cumulative,
        dataset_path=args.dataset_path,
        project=args.project,
        artifact_name=args.artifact_name,
        registry_path=args.registry_path,
        run_id=run_id,
    )
    if result.published:
        print(
            f"W&B dataset published: "
            f"{result.artifact_name}:latest ({result.rows} rows)"
        )
    else:
        print(f"W&B publish skipped: {result.reason}")


if __name__ == "__main__":
    main()
