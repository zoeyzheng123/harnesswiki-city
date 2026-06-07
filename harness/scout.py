"""
scout.py — Trend Scout (Workstream C). Produces the `TrendContext` the loop's
`trend_source()` consumes.

- **Live path (opt-in):** Tavily social-media research → a real trending short-form dance
  + a synthesized summary/signals/sources.
- **Offline default** (no `TAVILY_API_KEY` / `tavily` not installed): a deterministic
  curated `TrendContext` — mirrors `loop_core/meta_agent.py`'s client/stub pattern, so the
  loop + tests run with no network.

Either path enforces the harness's audio policy: the chosen `audio` is in the critic's
**approved pool** (AF-04) and prefers a **rising** sound (AA-03), so downstream concepts can
clear those criteria. Pool membership is owned by `harness.critic` (single source of truth);
this module only adds display names + rising flags, and asserts they stay a subset of it.

Returns the lean `loop_core.contracts.TrendContext` the loop expects (same lean↔canonical
boundary as `harness/bridge.py`).

Loop wiring (Eng 1/3, not done here): `run_generation_loop(trend_source=make_scout())`.
Live path needs: `pip install tavily-python` + `TAVILY_API_KEY` set.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import loop_core.contracts as lean  # noqa: E402  — the loop consumes lean TrendContext
from harness.critic import (  # noqa: E402  — AF-04 pool is owned by the critic
    APPROVED_AUDIO_POOL_AS_OF,
    AVOID_AUDIO_TITLES,
    PRIORITY_AUDIO_TITLES,
)


def _norm(name: str) -> str:
    """Normalize an audio title the same way the critic's AA-01 does."""
    return (name or "").strip().lower()


# Approved tracks: display name + is_rising. The display name MUST normalize into the
# critic's PRIORITY_AUDIO_TITLES (bare titles) so AA-01 passes downstream. Membership stays
# authoritative in harness.critic; this list only adds display + the AA-03 rising flag.
_APPROVED_TRACKS: list[tuple[str, bool]] = [
    ("I Just Might", True),
    ("Shabang", True),
    ("The Fate of Ophelia", True),
    ("The Cure", False),
    ("Be Her", False),
]


def _assert_pool_consistency() -> None:
    """Guard against drift: every scout track must be in the critic's approved pool."""
    titles = {_norm(n) for n, _ in _APPROVED_TRACKS}
    unknown = titles - PRIORITY_AUDIO_TITLES
    if unknown:
        raise AssertionError(
            f"scout._APPROVED_TRACKS has titles not in the critic's approved pool: "
            f"{sorted(unknown)} — harness.critic.PRIORITY_AUDIO_TITLES is the source of truth"
        )
    if titles & AVOID_AUDIO_TITLES:
        raise AssertionError("scout would surface a track on the critic's avoid list")


def _pick_track() -> str:
    """Deterministically pick a RISING approved track (falls back to any approved one)."""
    rising = [n for n, r in _APPROVED_TRACKS if r and _norm(n) not in AVOID_AUDIO_TITLES]
    return (rising or [n for n, _ in _APPROVED_TRACKS])[0]


def _curated_trend(track: str) -> lean.TrendContext:
    """Deterministic offline trend (no network). Audio is pool-gated + rising."""
    return lean.TrendContext(
        trend_id="trend_scout_stub",
        topic="high-energy dance challenge",
        hook="POV: the beat drops and you can't not move",
        format="peak_motion_loop",
        audio=track,
        region="US",
        source_urls=[],
        raw_signals={
            "source": "stub",
            "approved_audio_pool_as_of": APPROVED_AUDIO_POOL_AS_OF,
            "signals": [
                {"label": "format: peak-motion loop", "strength": 0.85},
                {"label": f"sound: {track} (rising)", "strength": 0.80},
                {"label": "single-color-background loops outperform", "strength": 0.70},
            ],
        },
    )


def _tavily_trend(track: str) -> lean.TrendContext:
    """Live path: discover a trending dance via Tavily, then gate audio to the approved pool.

    Tavily is *discovery*; the audio is still forced to an approved rising track (AF-04/AA-03)
    rather than whatever sound the discovered trend happens to use.
    """
    from tavily import TavilyClient  # raises if not installed → caller falls back

    client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])
    res = client.search(
        query="trending TikTok and YouTube Shorts dance challenges this week: format, hook, sound",
        topic="general",
        search_depth="advanced",
        max_results=8,
        include_answer=True,
    )
    summary = (res.get("answer") or "Trending short-form dance challenge.").strip()
    results = res.get("results") or []
    source_urls = [r["url"] for r in results if r.get("url")][:6]
    signals = [
        {"label": (r.get("title") or "")[:80], "strength": round(float(r.get("score", 0.5)), 3)}
        for r in results[:5]
    ]
    return lean.TrendContext(
        trend_id="trend_scout_live",
        topic="trending short-form dance challenge",
        hook=summary[:140],
        format="peak_motion_loop",
        audio=track,
        region="US",
        source_urls=source_urls,
        raw_signals={
            "source": "live",
            "tavily_answer": summary,
            "signals": signals,
            "approved_audio_pool_as_of": APPROVED_AUDIO_POOL_AS_OF,
        },
    )


def make_scout(use_tavily: str = "auto") -> Callable[[], lean.TrendContext]:
    """Return `trend_source() -> TrendContext` for `run_generation_loop`.

    Uses the live Tavily path when `use_tavily != "never"` AND `TAVILY_API_KEY` is set AND
    `tavily` is importable; otherwise a deterministic curated trend. Either way the chosen
    `audio` is in the critic's approved pool (AF-04) and prefers a rising sound (AA-03).
    """
    _assert_pool_consistency()
    track = _pick_track()

    def trend_source() -> lean.TrendContext:
        if use_tavily != "never" and os.getenv("TAVILY_API_KEY"):
            try:
                return _tavily_trend(track)
            except Exception as exc:  # noqa: BLE001 — any live failure → safe offline trend
                print(f"[scout] Tavily unavailable ({exc}); using curated trend")
        return _curated_trend(track)

    return trend_source


if __name__ == "__main__":
    tc = make_scout()()
    print(f"trend: {tc.topic} | audio: {tc.audio} | source: {tc.raw_signals.get('source')}")
    print(f"audio in approved pool (AF-04 clear): {_norm(tc.audio) in PRIORITY_AUDIO_TITLES}")
