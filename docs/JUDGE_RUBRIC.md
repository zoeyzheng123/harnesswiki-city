# Judge Rubric

Owner of *scoring*. The Reward Critic and the Meta-Agent optimize against this
doc. The rubric is the project's evaluation policy:

> **ACOE-YT-SHORTS-v2.0** — canonical machine-readable form at
> `data/policies/ACOE-YT-SHORTS-v2.0.json` (v1 retained for history).
> `HarnessState.rubric_version` points at it. This doc is the human-readable explanation.

ACOE scores an AI-generated YouTube Shorts **dance** video out of **100**, maps
the total to a distribution tier, and applies hard auto-fails. Generation is kept
separate from evaluation: the critic owns this rubric; the rest of the system
references it only by `rubric_version`.

## Categories (weights sum to 100) — v2

| Category | Max | Evaluates (v2) |
|----------|-----|-----------|
| `hook_quality` | 30 | Peak motion in frame 1, high-contrast bg, pattern interrupt, no build-up, **HQ-05 "You" hook** (2nd-person in first 2s). |
| `retention_and_loop` | 25 | 13–15s, seamless loop, no dead zones, **RL-04 delayed resolution** (payoff withheld to ~final 15%), **RL-05 conflict phrasing** (But/So, not And/Also). |
| `engagement_bait` | **10** | Typed-answer on-screen question, legible, divisive — **down-weighted** in v2 (overt bait is penalized; balance with organic intrigue via RL-04). |
| `visual_production` | 15 | Dancer isolation, reflective outfit, clean 4K render, **VP-04 cut/motion frequency** (a visual change ≤2.5s). |
| `audio_alignment` | **15** | Approved trending pool + beat sync + **AA-03 rising sound** — audio is a primary distribution driver. |
| `metadata` | 5 | Title mirrors the question, 3-niche/4-broad/1-audio hashtag mix, description CTA. |

Per-criterion points and pass/partial/fail rules live in the JSON. (v1→v2: audio 5→15, engagement 20→10; added HQ-05 / RL-04 / RL-05 / VP-04 / AA-03; added AF-05.)

## Distribution tiers

- **viral** — total ≥ 85 (expected 14k+ views)
- **growing** — total ≥ 65 (1k–13,999)
- **seed_jail** — total < 65 (0–199)

## Auto-fail conditions (override scores)

- **AF-01 Standing Start** — static frame 1 → total **overridden to 0**, regenerate.
- **AF-02 No On-Screen Text** (first 2s) → `hook_quality` + `engagement_bait` = 0.
- **AF-03 Duration Violation** (<13s or >20s) → `retention_and_loop` = 0.
- **AF-04 No Trending Audio** → `audio_alignment` = 0.
- **AF-05 Brand Safety Violation** — explicit content / hate speech / brand-safety breach → total **overridden to 0**, regenerate (replaces vague cringe/brand-fit scoring with a hard boundary).

## Score surface

The Critic emits, in `RewardScore`:

- `total_score` (0–100), `distribution_tier`, `auto_fails_triggered` (e.g. `["AF-02"]`)
- `category_breakdown` — points per ACOE category (keys = the 6 above)
- `lowest_scoring_category` + `recommended_fix_priority` (drives the loop's fix step)
- `judge_rationale` (≡ `rationale`), `confidence`

**Deprecated:** the 8 `dimensions` are now **optional and unconsumed** — the
dashboard renders `category_breakdown` + tiers and the loop optimizes the scalar
`weighted_total`/`predicted_score`. The critic and stubs no longer emit
`dimensions` (DECISIONS.md D14); the `RewardDimensions` type lingers pending full
removal.

## Audio note

The "approved trending audio pool" must be sourced from the platform's licensed
/ cleared music library — the policy lists chart references, not files to ship.

## The critic (`harness/critic.py`)

The judge runs in three **evaluation modes**: `prompt_preflight` (judge the
generation prompt, offline-deterministic, no LLM needed), `rendered_video`, and
`publishing_package` (also scores title/description/hashtags). It records a
`score_type` — `projected` (preflight), `verified` (full rendered evidence), or
`partial`. It emits `total_score` / `distribution_tier` / `category_breakdown`
plus the scalar `weighted_total` (= `total_score/100` minus risk penalties), and
preserves the full criterion detail in `RewardScore.rubric_breakdown`. (The legacy
8-`RewardDimensions` mapping was retired — DECISIONS.md D14.)

**Confidence-gated learning:** the critic proposes bounded element-weight deltas
(±0.10) as `suggested_policy_updates` (+ `winning_elements`/`weak_elements`), but
only from non-preflight evidence with confidence ≥ 0.70 — a prompt projection
never mutates policy. The Loop Core decides whether to apply them (DECISIONS.md D13).

## Not the same as element weights or taxonomy

These categories describe *how we score*. They are distinct from
`HarnessState.element_weights` (generation biases, e.g. `peak_motion_frame1`) and
`element_taxonomy` (the action space) — see `docs/DATA_CONTRACTS.md` → "Three
vocabularies".
