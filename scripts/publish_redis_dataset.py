"""Publish the local prompt/outcome JSONL dataset to Redis Cloud.

Usage:
  REDIS_URL='redis://...' python scripts/publish_redis_dataset.py

The URL is read only from the environment and is never written to disk or
included in the Redis manifest.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from harness.redis_dataset import (  # noqa: E402
    DEFAULT_DATASET,
    DEFAULT_VERSION,
    publish_rows,
    verify_dataset,
)
from harness.training_data import DEFAULT_DATASET_PATH, load_jsonl  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dataset-path",
        type=pathlib.Path,
        default=DEFAULT_DATASET_PATH,
    )
    parser.add_argument("--dataset", default=DEFAULT_DATASET)
    parser.add_argument("--version", default=DEFAULT_VERSION)
    parser.add_argument(
        "--append",
        action="store_true",
        help="Do not clear this exact dataset version before publishing.",
    )
    parser.add_argument("--batch-size", type=int, default=25)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        raise SystemExit("REDIS_URL is required")

    try:
        import redis
    except ImportError as exc:
        raise SystemExit(
            "redis package missing; install requirements.txt"
        ) from exc

    rows = load_jsonl(args.dataset_path)
    client = redis.Redis.from_url(
        redis_url,
        socket_connect_timeout=10,
        socket_timeout=30,
        health_check_interval=30,
    )
    client.ping()
    manifest = publish_rows(
        client,
        rows,
        dataset=args.dataset,
        version=args.version,
        replace=not args.append,
        batch_size=args.batch_size,
    )
    verified = verify_dataset(
        client,
        dataset=args.dataset,
        version=args.version,
    )

    print("published", json.dumps(manifest, sort_keys=True))
    print(
        "verified",
        json.dumps(
            {
                "row_count": verified["row_count"],
                "score_count": verified["score_count"],
                "view_count": verified["view_count"],
                "tiers": verified["tiers"],
                "sample_ids": [
                    sample["example_id"]
                    for sample in verified["samples"]
                ],
            },
            sort_keys=True,
        ),
    )


if __name__ == "__main__":
    main()
