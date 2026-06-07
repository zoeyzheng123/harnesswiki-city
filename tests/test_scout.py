"""Trend Scout tests — offline, deterministic. The scout must produce a valid TrendContext
whose audio is in the critic's approved pool (AF-04), prefers a rising sound (AA-03), and is
never on the avoid list — without any network/API key."""

from __future__ import annotations

import unittest

from harness.scout import _APPROVED_TRACKS, _norm, make_scout
from harness.critic import AVOID_AUDIO_TITLES, PRIORITY_AUDIO_TITLES


class ScoutTests(unittest.TestCase):
    def setUp(self) -> None:
        self.trend = make_scout(use_tavily="never")()  # force offline

    def test_trend_is_valid(self) -> None:
        self.assertTrue(self.trend.topic and self.trend.hook and self.trend.format)
        self.assertIsNotNone(self.trend.audio)
        self.assertEqual(self.trend.raw_signals.get("source"), "stub")

    def test_audio_is_pool_gated(self) -> None:
        # AF-04 / AA-01: the chosen audio normalizes into the critic's approved pool…
        self.assertIn(_norm(self.trend.audio), PRIORITY_AUDIO_TITLES)
        # …and is never on the avoid list.
        self.assertNotIn(_norm(self.trend.audio), AVOID_AUDIO_TITLES)

    def test_prefers_rising(self) -> None:
        rising = {_norm(n) for n, is_rising in _APPROVED_TRACKS if is_rising}
        self.assertIn(_norm(self.trend.audio), rising)  # AA-03

    def test_pool_subset_of_critic(self) -> None:
        # Drift guard: every scout track lives in the critic's authoritative pool.
        titles = {_norm(n) for n, _ in _APPROVED_TRACKS}
        self.assertTrue(titles <= PRIORITY_AUDIO_TITLES)

    def test_deterministic(self) -> None:
        again = make_scout(use_tavily="never")()
        self.assertEqual(self.trend.audio, again.audio)
        self.assertEqual(self.trend.topic, again.topic)


if __name__ == "__main__":
    unittest.main()
