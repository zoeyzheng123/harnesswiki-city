"""Redis mirror for the prompt/outcome training dataset.

Credentials are never accepted as source-code constants. Pass a Redis URL at
runtime (normally through ``REDIS_URL``). The publisher uses only core Redis
types so it works on Redis Cloud without requiring RedisJSON:

- HASH: one JSON payload per ``example_id``
- SORTED SETS: score and seven-day-view indexes
- SETS: distribution-tier indexes
- STRING: manifest and latest-version pointer
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping

DEFAULT_DATASET = "dance-prompt-engagement"
DEFAULT_VERSION = "test-v1"
ROOT_PREFIX = "harnesswiki:datasets"


def dataset_prefix(
    dataset: str = DEFAULT_DATASET,
    version: str = DEFAULT_VERSION,
) -> str:
    return f"{ROOT_PREFIX}:{dataset}:{version}"


def publish_rows(
    client: Any,
    rows: Iterable[Mapping[str, Any]],
    *,
    dataset: str = DEFAULT_DATASET,
    version: str = DEFAULT_VERSION,
    replace: bool = True,
    batch_size: int = 25,
) -> dict[str, Any]:
    """Publish rows idempotently and return the written manifest."""
    materialized = [dict(row) for row in rows]
    if not materialized:
        raise ValueError("no prompt/outcome rows to publish")
    if batch_size < 1:
        raise ValueError("batch_size must be positive")

    prefix = dataset_prefix(dataset, version)
    rows_key = f"{prefix}:rows"
    scores_key = f"{prefix}:scores"
    views_key = f"{prefix}:views"
    manifest_key = f"{prefix}:manifest"
    tier_keys = {
        tier: f"{prefix}:tier:{tier}"
        for tier in ("seed_jail", "growing", "viral")
    }

    if replace:
        pipe = client.pipeline(transaction=True)
        pipe.delete(
            rows_key,
            scores_key,
            views_key,
            manifest_key,
            *tier_keys.values(),
        )
        pipe.execute()

    for start in range(0, len(materialized), batch_size):
        chunk = materialized[start:start + batch_size]
        payloads: dict[str, str] = {}
        scores: dict[str, float] = {}
        views_index: dict[str, float] = {}
        tier_members: dict[str, list[str]] = {
            tier: [] for tier in tier_keys
        }
        for row in chunk:
            example_id = str(row["example_id"])
            payloads[example_id] = json.dumps(
                row,
                sort_keys=True,
                separators=(",", ":"),
            )

            score = row.get("total_score")
            if score is not None:
                scores[example_id] = float(score)

            views = row.get("views_at_168h")
            if views is not None:
                views_index[example_id] = math.log1p(float(views))

            tier = row.get("distribution_tier")
            if tier in tier_members:
                tier_members[tier].append(example_id)

        pipe = client.pipeline(transaction=True)
        pipe.hset(rows_key, mapping=payloads)
        if scores:
            pipe.zadd(scores_key, scores)
        if views_index:
            pipe.zadd(views_key, views_index)
        for tier, members in tier_members.items():
            if members:
                pipe.sadd(tier_keys[tier], *members)
        pipe.execute()

    manifest = {
        "schema_version": materialized[0].get("schema_version"),
        "dataset": dataset,
        "version": version,
        "prefix": prefix,
        "rows": len(materialized),
        "synthetic_rows": sum(
            row.get("label_source") == "synthetic"
            for row in materialized
        ),
        "score_min": min(float(row["total_score"]) for row in materialized),
        "score_max": max(float(row["total_score"]) for row in materialized),
        "views_min": min(int(row["views_at_168h"]) for row in materialized),
        "views_max": max(int(row["views_at_168h"]) for row in materialized),
        "published_at": datetime.now(timezone.utc).isoformat(),
    }
    final = client.pipeline(transaction=True)
    final.set(manifest_key, json.dumps(manifest, sort_keys=True))
    final.set(f"{ROOT_PREFIX}:{dataset}:latest", version)
    final.execute()
    return manifest


def verify_dataset(
    client: Any,
    *,
    dataset: str = DEFAULT_DATASET,
    version: str = DEFAULT_VERSION,
) -> dict[str, Any]:
    """Read back counts and a deterministic low/high-score sample."""
    prefix = dataset_prefix(dataset, version)
    rows_key = f"{prefix}:rows"
    manifest_raw = client.get(f"{prefix}:manifest")
    if not manifest_raw:
        raise ValueError(f"missing Redis manifest for {prefix}")

    low = client.zrange(f"{prefix}:scores", 0, 0)
    high = client.zrevrange(f"{prefix}:scores", 0, 0)
    sample_ids = [
        value.decode() if isinstance(value, bytes) else str(value)
        for value in [*low, *high]
    ]
    samples = []
    for example_id in sample_ids:
        payload = client.hget(rows_key, example_id)
        if payload:
            if isinstance(payload, bytes):
                payload = payload.decode()
            samples.append(json.loads(payload))

    def count(key: str) -> int:
        return int(client.scard(key))

    if isinstance(manifest_raw, bytes):
        manifest_raw = manifest_raw.decode()
    return {
        "manifest": json.loads(manifest_raw),
        "row_count": int(client.hlen(rows_key)),
        "score_count": int(client.zcard(f"{prefix}:scores")),
        "view_count": int(client.zcard(f"{prefix}:views")),
        "tiers": {
            tier: count(f"{prefix}:tier:{tier}")
            for tier in ("seed_jail", "growing", "viral")
        },
        "samples": samples,
    }
