from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from harness.training_data import (
    append_jsonl,
    load_jsonl,
    publish_wandb_dataset,
    rows_from_records,
)
from scripts.synth_prompt_outcomes import generate


class _FakeTable:
    def __init__(self, *, columns, data):
        self.columns = columns
        self.data = data


class _FakeArtifact:
    def __init__(self, *, name, type, description, metadata):
        self.name = name
        self.type = type
        self.description = description
        self.metadata = metadata
        self.items = {}
        self.files = []

    def add(self, value, name):
        self.items[name] = value

    def add_file(self, path, name):
        self.files.append((path, name))


class _FakeLoggedArtifact:
    def __init__(self):
        self.waited = False

    def wait(self):
        self.waited = True


class _FakeRun:
    def __init__(self):
        self.logged = []
        self.artifact = None
        self.aliases = None
        self.linked = None

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def log(self, payload):
        self.logged.append(payload)

    def log_artifact(self, artifact, aliases):
        self.artifact = artifact
        self.aliases = aliases
        return _FakeLoggedArtifact()

    def link_artifact(self, artifact, target_path, aliases):
        self.linked = (artifact, target_path, aliases)


class _FakeWandb:
    Table = _FakeTable
    Artifact = _FakeArtifact

    def __init__(self):
        self.run = _FakeRun()
        self.init_kwargs = None

    def init(self, **kwargs):
        self.init_kwargs = kwargs
        return self.run


class TrainingDataTests(unittest.TestCase):
    def setUp(self) -> None:
        self.records = generate(m=2, k=3)
        self.rows = rows_from_records(
            self.records,
            run_id="test-synthetic-run",
        )

    def test_every_candidate_becomes_a_training_row(self) -> None:
        self.assertEqual(len(self.rows), 6)
        self.assertTrue(all(row["generation_prompt"] for row in self.rows))
        self.assertTrue(all(row["views_at_168h"] for row in self.rows))
        self.assertTrue(
            all(row["label_source"] == "synthetic" for row in self.rows)
        )
        self.assertTrue(
            all(row["target_log1p_views"] > 0 for row in self.rows)
        )
        for row in self.rows:
            score = row["total_score"]
            views = row["views_at_168h"]
            if score < 65:
                self.assertLessEqual(views, 199)
            elif score < 85:
                self.assertGreaterEqual(views, 200)
                self.assertLessEqual(views, 13_999)
            else:
                self.assertGreaterEqual(views, 14_000)

    def test_jsonl_append_is_idempotent_for_one_run(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "dataset.jsonl"
            self.assertEqual(append_jsonl(self.rows, path), 6)
            self.assertEqual(append_jsonl(self.rows, path), 0)
            self.assertEqual(len(load_jsonl(path)), 6)

    def test_wandb_artifact_and_registry_link(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "dataset.jsonl"
            append_jsonl(self.rows, path)
            fake = _FakeWandb()
            result = publish_wandb_dataset(
                self.rows,
                dataset_path=path,
                project="test-project",
                artifact_name="test-dataset",
                registry_path="wandb-registry-Datasets/test-dataset",
                run_id="test-run",
                wandb_module=fake,
            )

        self.assertTrue(result.published)
        self.assertEqual(fake.run.artifact.type, "dataset")
        self.assertIn("prompt_outcomes", fake.run.artifact.items)
        self.assertEqual(fake.run.aliases, ["latest", "synthetic"])
        self.assertEqual(
            fake.run.linked[1],
            "wandb-registry-Datasets/test-dataset",
        )


if __name__ == "__main__":
    unittest.main()
