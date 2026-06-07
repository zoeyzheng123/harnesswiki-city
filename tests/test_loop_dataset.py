from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from harness.bridge import make_bridge_hook
from harness.training_data import load_jsonl
from loop_core.loop import run_generation_loop


class LoopDatasetTests(unittest.TestCase):
    def test_loop_retains_every_candidate_and_writes_training_rows(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            previous = os.getcwd()
            os.chdir(tmp)
            try:
                hook, collector = make_bridge_hook(run_id="loop-test")
                run_generation_loop(
                    n_generations=2,
                    concepts_per_gen=3,
                    on_generation=hook,
                )
                dataset_path = Path(tmp) / "prompt_outcomes.jsonl"
                collector.write(
                    path=str(Path(tmp) / "generations.json"),
                    training_path=dataset_path,
                    publish_wandb=False,
                )
            finally:
                os.chdir(previous)

            rows = load_jsonl(dataset_path)

        self.assertEqual(len(collector.records), 2)
        self.assertTrue(
            all(len(record.candidates or []) == 3 for record in collector.records)
        )
        self.assertTrue(
            all(record.outcome is not None for record in collector.records)
        )
        self.assertEqual(len(rows), 6)
        self.assertEqual(sum(bool(row["selected"]) for row in rows), 2)


if __name__ == "__main__":
    unittest.main()
