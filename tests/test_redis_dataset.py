from __future__ import annotations

import json
import unittest

from harness.redis_dataset import dataset_prefix, publish_rows


class _Pipeline:
    def __init__(self, client):
        self.client = client
        self.calls = []

    def __getattr__(self, name):
        def call(*args, **kwargs):
            self.calls.append((name, args, kwargs))
            return self
        return call

    def execute(self):
        return [True] * len(self.calls)


class _Client:
    def __init__(self):
        self.pipe = _Pipeline(self)

    def pipeline(self, transaction=True):
        self.transaction = transaction
        return self.pipe


class RedisDatasetTests(unittest.TestCase):
    def test_publish_uses_namespaced_core_redis_types(self) -> None:
        rows = [
            {
                "schema_version": "prompt-outcome-v1",
                "example_id": "example-1",
                "total_score": 82,
                "views_at_168h": 9000,
                "distribution_tier": "growing",
                "label_source": "synthetic",
            }
        ]
        client = _Client()
        manifest = publish_rows(
            client,
            rows,
            dataset="dance",
            version="test-v1",
        )
        names = [name for name, _, _ in client.pipe.calls]

        self.assertTrue(client.transaction)
        self.assertEqual(dataset_prefix("dance", "test-v1"),
                         "harnesswiki:datasets:dance:test-v1")
        self.assertIn("hset", names)
        self.assertIn("zadd", names)
        self.assertIn("sadd", names)
        self.assertIn("set", names)
        self.assertEqual(manifest["rows"], 1)
        self.assertNotIn("redis_url", json.dumps(manifest))


if __name__ == "__main__":
    unittest.main()
