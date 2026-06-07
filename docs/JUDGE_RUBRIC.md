# Judge Rubric

Owner of *scoring*. The Reward Critic and the Meta-Agent optimize against this
doc. The rubric is the project's evaluation policy:

> **ACOE-YT-SHORTS-v1.0** — canonical machine-readable form at
> `data/policies/ACOE-YT-SHORTS-v1.0.json`. `HarnessState.rubric_version` points
> at it. This doc is the human-readable explanation.

ACOE scores an AI-generated YouTube Shorts **dance** video out of **100**, maps
the total to a distribution tier, and applies hard auto-fails. Generation is kept
separate from evaluation: the critic owns this rubric; the rest of the system
references it only by `rubric_version`.

## Categories (weights sum to 100)

| Category | Max | Evaluates |
|----------|-----|-----------|
| `hook_quality` | 30 | First 1.5s: peak motion in frame 1, high-contrast background, pattern-interrupt text, no build-up. |
| `retention_and_loop` | 25 | 13–15s sweet spot, seamless final-frame→frame-1 loop, no dead zones. |
| `engagement_bait` | 20 | A polarizing **typed-answer** on-screen question, legible full-duration, divisive enough to drive comments. |
| `visual_production` | 15 | Dancer isolation, reflective/dynamic outfit, clean 4K render (no AI artifacts). |
| `audio_alignment` | 5 | Track from the approved trending pool + beat-synced motion. |
| `metadata` | 5 | Comment bait mirrored in title, 3-niche/4-broad/3-audio hashtag mix, description CTA. |

Per-criterion points and pass/partial/fail rules live in the JSON.

## Distribution tiers

- **viral** — total ≥ 85 (expected 14k+ views)
- **growing** — total ≥ 65 (1k–13,999)
- **seed_jail** — total < 65 (0–199)

## Auto-fail conditions (override scores)

- **AF-01 Standing Start** — static frame 1 → total **overridden to 0**, regenerate.
- **AF-02 No On-Screen Text** (first 2s) → `hook_quality` + `engagement_bait` = 0.
- **AF-03 Duration Violation** (<13s or >20s) → `retention_and_loop` = 0.
- **AF-04 No Trending Audio** → `audio_alignment` = 0.

## Score surface

The Critic emits, in `RewardScore`:

- `total_score` (0–100), `distribution_tier`, `auto_fails_triggered` (e.g. `["AF-02"]`)
- `category_breakdown` — points per ACOE category (keys = the 6 above)
- `lowest_scoring_category` + `recommended_fix_priority` (drives the loop's fix step)
- `judge_rationale` (≡ `rationale`), `confidence`

**Transitional:** `RewardScore` also still carries the legacy 0..1 `dimensions`
(`RewardDimensions`) and `weighted_total` (= `total_score / 100`) so the current
dashboard keeps rendering until it migrates to ACOE (see
`docs/DASHBOARD_MIGRATION.md`, DECISIONS.md D11). Those dimensions are deprecated
and will be removed once the migration lands.

## Audio note

The "approved trending audio pool" must be sourced from the platform's licensed
/ cleared music library — the policy lists chart references, not files to ship.

## The critic (`harness/critic.py`)

The judge runs in three **evaluation modes**: `prompt_preflight` (judge the
generation prompt, offline-deterministic, no LLM needed), `rendered_video`, and
`publishing_package` (also scores title/description/hashtags). It records a
`score_type` — `projected` (preflight), `verified` (full rendered evidence), or
`partial` — and maps the rubric onto the canonical 8 `RewardDimensions` (e.g.
`hook_quality/30 → hook_strength`, `video_model_feasibility → visual_feasibility`)
plus `weighted_total`, while preserving the full criterion detail in
`RewardScore.rubric_breakdown`.

**Confidence-gated learning:** the critic proposes bounded element-weight deltas
(±0.10) as `suggested_policy_updates` (+ `winning_elements`/`weak_elements`), but
only from non-preflight evidence with confidence ≥ 0.70 — a prompt projection
never mutates policy. The Loop Core decides whether to apply them (DECISIONS.md D13).

## Not the same as element weights or taxonomy

These categories describe *how we score*. They are distinct from
`HarnessState.element_weights` (generation biases, e.g. `peak_motion_frame1`) and
`element_taxonomy` (the action space) — see `docs/DATA_CONTRACTS.md` → "Three
vocabularies".
