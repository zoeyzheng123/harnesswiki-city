# Decisions

Lightweight ADR log. Newest first. Record a decision here when it would
otherwise get re-litigated or drift across files.

## 2026-06-07 — Bridge + inner-loop + v2 meta-agent (Eng 1)

### D16. Bridge landed + inner loop fixed + meta-agent v2 levers

The Eng 1 tasks from D15 are done:

- **Bridge (`harness/bridge.py`):** One-way adapter maps the loop's lean output
  (`loop_core/contracts.py`) to canonical `GenerationRecord[]` → writes
  `data/generations.latest.json`. Also provides `make_acoe_critic()` — wraps
  `harness.critic.score_concept()` so the loop can call the real ACOE critic
  with lean types and get canonical `RewardScore` back (with `total_score`,
  `distribution_tier`, `auto_fails_triggered`, `category_breakdown`,
  `suggested_policy_updates`). A `BridgeCollector` accumulates records across
  generations via the loop's new `on_generation` hook. Validated via
  `GenerationRecord.model_validate()`.

- **Inner-loop policy (`loop_core/loop.py` `update_policy`):** Replaced the
  crude Hedge (eta=2.0, fixed 0.5 baseline, rich-get-richer) with:
  1. Exploration floor (min 0.03) on every element
  2. Auto-fail shield — don't learn from auto-failed generations
  3. Evidence-based `suggested_policy_updates` from the critic (preferred)
  4. Fallback Hedge with moving-mean baseline (EMA) and low eta (0.4)

- **Meta-agent v2 levers (`loop_core/meta_agent.py`):**
  - Stub candidate list replaced with 6 v2 elements: `you_hook_opening` (HQ-05),
    `curiosity_gap_payoff` (RL-04), `conflict_phrasing` (RL-05),
    `visual_cut_rhythm` (VP-04), `rising_audio_early` (AA-03),
    `polarizing_comment_bait` (EB-03)
  - `_V2_PROMPT_SNIPPETS` injects meaningful prompt additions per element
  - `_SYS` system prompt biased toward v2 levers (micro-curiosity gap,
    second-person hook, conflict phrasing, visual rhythm, rising audio,
    polarizing bait)
  - LLM `return_schema` extended with `v2_mechanic` + `expected_acoe_impact`

The loop now runs with the real ACOE critic by default (falling back to stub).
The stub generator still produces generic concepts that score seed_jail —
`harness/generator.py` is the next bottleneck.

## 2026-06-07 — ACOE v2

### D15. ACOE-YT-SHORTS-v2.0 — rebalanced weights + new criteria

A second rubric version (`data/policies/ACOE-YT-SHORTS-v2.0.json`; v1 retained)
rebalances and extends the proxy reward. (It is still a **proxy** — the
ground-truth `actual_engagement` loop remains open; v2 is a better-shaped guess.)

- **Weights:** audio 5→15 (trending/rising sound is a primary distribution driver); engagement_bait 20→10 (overt bait is penalized). hook 30 / retention 25 / visual 15 / metadata 5 unchanged.
- **New criteria:** HQ-05 "You" hook (2nd-person), RL-04 delayed resolution + RL-05 conflict phrasing (But/So), VP-04 cut/motion frequency (≤2.5s), AA-03 rising sound.
- **AF-05 brand-safety** auto-fail replaces vague cringe/brand-fit scoring with a hard boundary.
- **ExecutionMetadata** submodel (`hashtag_set`, `posting_time`) separates platform execution from the creative concept; top-level `ContentConcept.hashtag_set`/`posting_time` are deprecated; `cut_frequency` is now scored (VP-04).
- Prompt mechanics in `HarnessState.script_prompt`: "You" hook, micro-curiosity gap (premise 0:00 → payoff ~0:13), conflict phrasing, cut ≤2.5s, rising audio; 13–15s retained.

Done **backend-additive** (build stays green): `RewardDimensions` stays demoted (D14, not deleted); `hashtag_set`/`posting_time` kept deprecated. Deferred to **Eng 4** (`docs/DASHBOARD_MIGRATION.md`): rebalance `CATEGORY_MAX` to v2 (audio 15, engagement 10), drop `legacyDims`, delete `dimensions`, migrate reads to `execution`. Deferred to **Eng 1**: the meta-agent micro-curiosity-gap prompt + consuming `suggested_policy_updates`.

## 2026-06-06 — Retire the transitional 8 dimensions

### D14. The 8 `RewardDimensions` are demoted to optional + deprecated

Post-dashboard-migration (`14d59c4`), nothing consumes the 8 dims: the dashboard
renders ACOE `category_breakdown` + tiers, the loop optimizes the scalar
`predicted_score`/`weighted_total`, and learning is element-level. The required
`dimensions` field was the last thing forcing fabricated values (`legacyDims()`
in the dashboard's synthetic data) and an unread mapping in the critic.

So `RewardScore.dimensions` is now **optional + deprecated**. The **scalar**
`weighted_total`/`predicted_score` is the stable, rubric-independent optimization
target; ACOE `category_breakdown` is the rubric-specific detail. The critic and
the stub stop emitting `dimensions`. We did **not** resurface them (no consumer;
`brand_fit`/`novelty`/`cringe_risk` are founder-era axes — a future cross-rubric
reward vector, if wanted, should be designed dance-native).

Actions D11's "retire after migration" and closes out D13: Zoey mapped ACOE → the
8 dims as a stable interface, but no consumer adopted them, so the scalar serves
that role. Full removal of the `RewardDimensions` type is a post-demo follow-up;
`src/ui/lib/synthetic.ts` can then drop `legacyDims()` (Eng 4).

## 2026-06-06 — Dance reward critic (PR #2)

### D13. The ACOE critic maps into the 8 dimensions + adds a confidence-gated learning signal

`harness/critic.py` (Zoey, PR #2) implements the ACOE-YT-SHORTS-v1.0 judge. It
applies the rubric criterion-by-criterion, then:
- **maps the result into the canonical 8 `RewardDimensions` + `weighted_total`**
  (so the dashboard contract doesn't expand), keeping the full criterion/category
  detail in `RewardScore.rubric_breakdown`;
- also fills D11's structured ACOE outputs (`total_score`, `distribution_tier`,
  `category_breakdown`, `auto_fails_triggered`, `lowest_scoring_category`,
  `recommended_fix_priority`) from the same judgement — D11 and this decision are
  complementary, not rival;
- emits an **additive, optional learning signal** (`winning_elements`,
  `weak_elements`, `suggested_policy_updates`) that the Loop Core may apply; the
  Critic only proposes bounded deltas (±0.10).

**Confidence gating:** `score_type` is `projected` (prompt preflight), `verified`
(full rendered evidence), or `partial`. Policy updates are allowed only from
non-preflight evidence with confidence ≥ 0.70 — a prompt projection can never
mutate policy.

Integration note: the merged `RewardScore` field set is the **union** of D11's
outputs and the learning signal (all optional → `typecheck:ui` stays green).
`recommended_fix_priority` stays a `str` (joined from the critic's ranked list to
match the dashboard's existing use; the full list is in `rubric_breakdown`).

## 2026-06-06 — Loop-core contract layering

### D12. Canonical contract vs the loop's internal model (two layers + bridge)

PR #1 (`loop_core/`, Workstream A) is built against its own lean
`loop_core/contracts.py`. Rather than force two competing "sources of truth", we
make the layering explicit:

- **`harness/contracts.py` is the single canonical cross-workstream + dashboard
  contract** (superset, render-ready, ACOE). Workstreams B/C and the dashboard
  code against it.
- **`loop_core/contracts.py` is the loop's INTERNAL model** (lean/flat, for the
  policy math). Only `loop_core` imports it; its "single source of truth / import
  this everywhere" docstring was demoted to say so.
- A **one-way bridge adapter** maps the loop's lean output → canonical
  `GenerationRecord[]` → `data/generations.latest.json` (the dashboard's
  `src/ui/lib/data.ts` seam). No refactor of the tested loop — spec in
  `docs/LOOP_CORE_BRIDGE.md`, owned by Eng 1 (the loop_core PR earmarked it as
  the "next PR").

ACOE scoring (`total_score` / `category_breakdown` / tiers) is produced by the
real critic (Workstream B); until then the adapter derives `total_score` + tier
from the loop's `predicted_score`. This is the ports-and-adapters pattern, not a
drift.

## 2026-06-06 — Pivot to the short-form-video vertical

### D11. Pivot to AI YouTube Shorts dance, scored by ACOE-YT-SHORTS-v1.0

The product pivots to AI-generated YouTube Shorts dance videos. The Reward
Critic's evaluation policy is **ACOE-YT-SHORTS-v1.0**, stored verbatim as
`data/policies/ACOE-YT-SHORTS-v1.0.json` (canonical, machine-readable) and
referenced by `HarnessState.rubric_version`. It scores 0–100 across 6 weighted
categories, maps to viral/growing/seed-jail tiers, and applies category-zeroing
auto-fails.

Integration (chosen approach):
- **Additive-first.** `RewardScore` gains optional ACOE outputs (`total_score`,
  `distribution_tier`, `auto_fails_triggered`, `category_breakdown`,
  `lowest_scoring_category`, `recommended_fix_priority`); `ContentConcept` gains
  optional Shorts fields (`comment_bait_question`, `on_screen_text`, `title`,
  `description`, plus the D10 block). The legacy 0..1 `RewardDimensions` stay
  (transitional, `weighted_total = total_score / 100`) so `pnpm typecheck:ui` and
  Eng 4's dashboard keep compiling. The founder dimensions retire once the
  dashboard migrates.
- **Dashboard owned by Eng 4.** `src/ui` is left untouched; the migration to ACOE
  rendering is specced in `docs/DASHBOARD_MIGRATION.md`.
- **Content re-themed** to the dance vertical: stubs, `element_taxonomy`,
  `policy_rules` (the auto-fails), prompts, and all docs.

Supersedes D9's "examples stay AI-founder". Additions stay optional/additive,
consistent with D8/D10.

## 2026-06-06 — Short-form-video contract fields

### D10. Eng 1's short-form-video features land on ContentConcept + the rubric

Eng 1's TikTok feature set (dance style; audio BPM/recency/is-rising; length;
hook strength in first 1–3s; cut frequency; trend-alignment; posting time;
hashtags) is placed by *kind*, not dumped on one model:

- Creative/distribution knobs → **`ContentConcept`** optional fields
  (`dance_style`, `audio: Audio`, `cut_frequency`, `hashtag_set`,
  `posting_time`; `length` = the existing `duration_sec`).
- Scoring criteria (hook strength in first 1–3s, trend-alignment) → the
  **Critic's rubric** (`docs/JUDGE_RUBRIC.md`, referenced by `rubric_version`),
  refining the existing `hook_strength` / `trend_fit`. They are **not** added as
  new `RewardDimensions` keys: the dashboard's `format.ts` declares
  `DIMENSION_LABELS: Record<DimensionKey, string>` (exhaustive), so a new key
  would break `pnpm typecheck:ui`.
- Audio momentum (sound recency / is-rising) → also a **`TrendContext`** signal.
- Posting result → **`GenerationRecord.actual_engagement` / `post_url`**.

All additions are optional (additive; the dashboard stays green). Extends D9.

## 2026-06-06 — Python contracts + superset merge

### D7. Contracts pivot to Python/Pydantic (canonical); repo is polyglot

The backend (loop, critic, generator, meta-agent) is Python, so the canonical
contracts live in `harness/contracts.py` (Pydantic v2). The dashboard stays
TypeScript/React (D6). The repo is officially polyglot: **Python backend + TS
UI**. This supersedes D1's "the codebase is TS" — TS is now only the UI + the
contracts mirror.

### D8. Contract reconciliation = superset merge (Eng 1 ⊕ Eng 4)

Eng 1's lean Pydantic proposal and Eng 4's already-built dashboard both claimed
the canonical `GenerationRecord` but disagreed (embed-vs-reference, 8-dim score
vs `predicted_score` only, `Lesson` vs none, structured vs string diff,
`element_weights` vs `element_taxonomy`). We **merged** rather than pick a side:

- The canonical record stays **render-ready** — it embeds `concept` + `score`,
  keeps the 8-dim `RewardDimensions`, `Lesson`, structured `HarnessDiff`, and
  `HarnessState.element_weights`. So the dashboard keeps working unchanged
  (D3's two vocabularies still stand).
- Eng 1's lean/backend fields (`pairwise_winprob`, `confidence`,
  `parent_harness_id`, `diff_summary`, `actual_engagement`, `post_url`,
  `element_taxonomy`, `storyboard`, `seedance_prompt`, `rubric_version`, id
  references, …) are added as **optional** fields, pending a prune once Eng 1
  and Eng 4 align. Some are renames of a core field; the equivalence is noted
  inline in `harness/contracts.py`.

Canonical = `harness/contracts.py`; `src/contracts/index.ts` is a hand-kept
**mirror** (superset of the old shapes, so `pnpm typecheck:ui` stays green);
`data/stubs/*.json` are generated by `scripts/dump_stubs.py`. This refines D2:
the doc owns the explanation, `contracts.py` owns the definition, the TS mirror
serves the UI, and `pnpm typecheck` over the generated stubs keeps all three
honest.

### D9. Example content stays AI-founder; the contract gains short-form-video fields

The built dashboard tells an **AI-founder** narrative (contrarian/diagnostic
hooks, the policy-refusal arc). So the example/stub *content* stays on that
theme — keeping docs ⟷ stubs ⟷ the live demo in sync and not rewriting Eng 4's
`synthetic.ts`. The *contract* additionally carries the short-form-video fields
Eng 1 introduced (`storyboard`, `seedance_prompt`, `duration_sec`, `audio`,
`actual_engagement`, `post_url`) so the Seedance/Tavily direction is ready when
the real loop lands. (Revisits the earlier "switch theme" intent, for
consistency with the working demo.)

## 2026-06-06 — Dashboard stack

### D6. Dashboard: Vite + React (supersedes the framework note in D1)

The dashboard is a client-only proof artifact with no SSR, routing, or server
needs, so it is built with **Vite + React 19 + Tailwind v4 + Motion** under
`src/ui/`, type-isolated from the contracts typecheck by its own
`src/ui/tsconfig.json` (the root `tsconfig.json` excludes `src/ui`, and
`pnpm typecheck` stays green). This supersedes D1's "Next.js App Router on
Vercel" note: Vite is the leanest path here, and the static build still deploys
to Vercel. Data reaches every view through a single seam, `src/ui/lib/data.ts`,
returning the canonical `GenerationRecord[]` — synthetic demo data now, real
`runLoop` output later with no component changes.

## 2026-06-06 — Initial decisions

### D1. Stack: TypeScript + pnpm

The shared contracts and function shapes are expressed in TypeScript, so the
codebase is TS and the package manager is pnpm. The dashboard targets Next.js
App Router on Vercel when the UI is built (not scaffolded yet). _(The
dashboard-framework portion of this decision is superseded by D6: the UI ships
on Vite + React. The contracts-language portion is superseded by D7: the
canonical contracts are now Python/Pydantic, with TS as the UI mirror.)_

### D2. Contracts are canonical in code, mirrored in the doc

`src/contracts/index.ts` is the single, type-checked source of truth for the
schemas. `docs/DATA_CONTRACTS.md` explains and embeds a copy but defers to the
`.ts` file. This refines the general rule "DATA_CONTRACTS.md owns schemas": the
doc owns the *explanation*, the code owns the *definition*, and a typecheck of
`data/stubs/` keeps them honest. Both must change together. _(Superseded by D7/D8:
the canonical definition moved to `harness/contracts.py`; `src/contracts/index.ts`
is now the TS mirror.)_

### D3. Two distinct vocabularies

*Rubric dimensions* (`RewardScore.dimensions`, how we score) are kept separate
from *element weights* (`HarnessState.element_weights`, generation biases). They
are different lists and are documented as such to prevent conflation. _(Still
holds. D8 adds a third: the *element taxonomy* — `HarnessState.element_taxonomy`,
the action space the meta-agent can expand — distinct from the weights over it.)_

### D4. "Improvement" is defined once

The definition of an improved generation lives only in `docs/HARNESS_LOOP.md`,
expressed against `RewardScore` fields (`predicted_win_prob` up, or
`weighted_total` up, and `policy_risk` not above threshold). _(Retained. Eng 1's
`pairwise_winprob` ≡ `predicted_win_prob` and `predicted_score` ≡ normalized
`weighted_total` are accepted equivalents.)_

### D5. Weave is the only tracing layer

All loop functions are Weave ops. The op-name list and required logged fields
are owned by `docs/WEAVE_TRACING.md`.
