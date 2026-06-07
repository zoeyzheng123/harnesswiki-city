# Dashboard Migration — ACOE-YT-SHORTS-v1.0

> **Status:** the migration is **done** (`14d59c4`, `9009931`) and the 8 `dimensions` are now optional + deprecated (DECISIONS.md **D14**). Remaining cleanup: drop `legacyDims()` from `src/ui/lib/synthetic.ts` and stop setting `dimensions:` on synthetic records. The spec below is retained for reference.

Spec for Eng 4 to migrate `src/ui` from the legacy 0..1 founder rubric to ACOE
short-form scoring. The contracts are already additive (DECISIONS.md D11), so the
dashboard compiles today; this migration swaps what it *renders*. Owned by Eng 4.

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
