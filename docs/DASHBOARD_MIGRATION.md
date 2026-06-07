# Dashboard — ACOE-YT-SHORTS (display layer)

> **✅ The ACOE v1→v2 dashboard migration is COMPLETE** (`14d59c4`, `9009931`, `fa42f54`): the dashboard renders `total_score` 0–100, tiers, the 6 v2 categories, auto-fails AF-01..05, and the critic-learning panel; `legacyDims()` / `dimensions` / `RewardDimensions` are gone (D14); hashtags read from `ContentConcept.execution`. The live rubric is **ACOE-YT-SHORTS-v2.0** — see `docs/JUDGE_RUBRIC.md`.
>
> **Active work is the [Display-layer viz upgrades](#display-layer-viz-upgrades-active) below.** The original migration spec is **archived for history** at the bottom (its numbers are v1-era, superseded by v2 — not a to-do list).

Owner: Eng 4 (`src/ui`).

## Display-layer viz upgrades (active)

**Principle:** keep **0–100 + tiers** as the headline — it's legible with no legend, gives
the "climb" a bounded/preattentive axis, and is **decomposable** (additive category points
*are* the diagnosis; a relative/Elo score can't be). Do **not** swap it for Elo/win-prob.
Instead, *layer* honesty + causality + outcome-grounding around it. The fields below already
exist on the contracts (`harness/contracts.py` + `src/contracts/index.ts`); the gated views
wait on Eng-1 producers (see `docs/LOOP_CORE_BRIDGE.md` "Producers (pending)").

| # | Upgrade | Why (viz principle) | Fields | When |
|---|---------|---------------------|--------|------|
| 1 | **Confidence + provenance on `HeroCurve`** — a confidence band around the `total_score` line; **projected** (prompt-keyword) scores dashed/ghosted vs **verified** (rendered) solid; a provenance badge + `evidence_coverage` meter on `ScoreDimensions`. | Don't render a noisy proxy as a crisp point — show how much to trust it. | `score.confidence`, `score.score_type`, `score.evidence_coverage` | **now** |
| 2 | **Category trajectory** — a new view (`CategoryTrajectory.tsx`): stacked-area / streamgraph (or a bump chart of category ranks) of the 6 `category_breakdown` values across generations. | The total-only line shows *that* it climbed; this shows *which lever* (audio↑, engagement↓) — the "it learned what to change" pitch. | `score.category_breakdown` across the series | **now** |
| 3 | **Proxy-vs-truth panel** — scatter of predicted `total_score` (x) vs `outcome.avg_percent_viewed` / `views` (y) + a calibration line; **log or percentile** axis for heavy-tailed views. | The key honest-viz chart: makes Goodhart (proxy vs reality) visible. | `score.total_score` + `outcome.*` | gated on Eng-1 outcome ingestion |
| 4 | **Candidate batch — relative encoding** — a ranked dot-plot / slopegraph of the generation's K `candidates` by score (+ win-prob / outcome when present), not an absolute axis. | Preference/relative data wants a relative encoding (mirrors D18). | `GenerationRecord.candidates` | gated on Eng-1 candidate-capture |
| 5 | **Soften tier cliffs** — render seed_jail / growing / viral as gradient *context*, don't dramatize an 84→85 crossing as a step-change on a continuous, noisy scalar. | The underlying scalar is continuous + uncertain; hard bands over-signal. | — | **now** |
| 6 | **Percentile / log framing** (once real outcomes exist) — prefer "top X%" / log-views over raw linear counts. | Bounded *and* meaningful (anchored to a real population) — the long-term headline candidate. | `outcome.*` | gated |

These are layers **around** the 0–100 headline, not replacements for it.

---

## ✅ Archived — original ACOE v1→v2 migration spec (COMPLETE)

> Retained for history. **The migration is done.** The maxes, the auto-fail set
> (`AF-01..04`), and the `ACOE-YT-SHORTS-v1.0.json` reference below are the **v1-era target**
> and are **superseded by v2** (audio 15 / engagement 10, `AF-01..05`,
> `ACOE-YT-SHORTS-v2.0.json`) — see `docs/JUDGE_RUBRIC.md` for the live rubric. Not a to-do list.

## What already changed in the contract (shipped, non-breaking)

`RewardScore` now also carries (optional; populated on dance records):
- `total_score` (0–100), `distribution_tier` ("viral" | "growing" | "seed_jail")
- `category_breakdown: Record<string, number>` — the 6 ACOE categories
- `auto_fails_triggered: string[]`, `lowest_scoring_category`, `recommended_fix_priority`

`ContentConcept` adds: `dance_style`, `audio` (`Audio`), `cut_frequency`,
`hashtag_set`, `posting_time`, `comment_bait_question`, `on_screen_text`,
`title`, `description`.

`weighted_total` (≈ `total_score / 100`) is the stable scalar. The 8 `dimensions`
are now optional + deprecated (D14) and no longer emitted by the critic/stubs —
drop `legacyDims()` and stop setting `dimensions:` on synthetic records.

## What to change in `src/ui`

1. **`lib/synthetic.ts` / `lib/data.ts`** — re-theme the synthetic arc to dance
   Shorts with ACOE scores (rising `total_score` across generations, one
   auto-fail beat for drama). Keep the `GenerationRecord[]` seam.
2. **`lib/format.ts`** — replace the 8 `DIMENSION_*` founder dims with the 6 ACOE
   categories + `max_points`: `hook_quality` 30 · `retention_and_loop` 25 ·
   `engagement_bait` 20 · `visual_production` 15 · `audio_alignment` 5 ·
   `metadata` 5. Add tier labels + colors (reuse the district hues).
3. **`HeroCurve`** — plot `total_score` on a 0–100 axis with tier bands at 65
   (growing) and 85 (viral); annotate the current tier.
4. **`ScoreDimensions` → category panel** — render `category_breakdown` as
   earned/max bars per category; flag `lowest_scoring_category`; show
   `auto_fails_triggered` as badges (AF-01..04).
5. **`GenerationDetail`** — show `distribution_tier`, `recommended_fix_priority`,
   and the concept's `comment_bait_question` / `on_screen_text` / `audio` / `hashtag_set`.
6. **`selectors.ts`** — `curvePoints` reads `total_score`; peak = max `total_score`.

## Sequence

Read the ACOE fields (additive) → migrate the components → once nothing reads
`RewardScore.dimensions`, ping the backend to retire the legacy dimensions from
`harness/contracts.py` + the mirror (DECISIONS.md D11).

References: policy `data/policies/ACOE-YT-SHORTS-v1.0.json`; categories / tiers /
auto-fails in `docs/JUDGE_RUBRIC.md`; shapes in `docs/DATA_CONTRACTS.md`.
