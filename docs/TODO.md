# TO-DOs

Per-engineer next actions, grounded in the current build. See `docs/STATUS.md` for the
component table and `docs/DECISIONS.md` for the *why*. Ordered by priority within each
section. **🔴 blocks the "show the climb" demo · 🟡 Stage 2 (learning from real outcomes) · ⚪ polish/observability.**

_Last updated: 2026-06-07 (from the workstream survey)._

## Where we are

The self-improving loop **runs end-to-end today** — `python loop_core/loop.py` scores
concepts with the real ACOE-YT-SHORTS-v2.0 critic and writes canonical
`GenerationRecord[]` to `data/generations.latest.json` via the bridge. But the demo isn't
compelling yet: the **stub generator** emits generic 8s / no-on-screen-text concepts that
trip auto-fails (AF-02, AF-03), so scores **plateau in seed_jail** instead of climbing.

**Critical path to "watch the harness improve":** Eng 3 generator + scout → Eng 1
candidate-capture → Eng 4 wire real data → (Stage 2) outcome ingestion + real-data
calibration.

**Reward representation (Stage 3, D18):** 0–100 is display/diagnosis; the *learning* target
moves to a **Bradley-Terry preference reward**. The offline prototype is landed
(`scripts/calibrate.py` — it beats the absolute proxy on held-out pairwise winners,
0.64 vs 0.55); the live wiring is the Eng-2 + Eng-1 🟡 items below.

---

## Eng 1 — Loop Core (`loop_core/`, `harness/bridge.py`)

Loop, meta-agent, inner-loop policy, and bridge are **landed and working**. Remaining:

1. 🔴 **Candidate-batch capture** (S) — `loop_core/loop.py::run_generation_loop`.
   Accumulate all K `(concept, reward)` pairs per generation (not just the argmax), wrap
   as `Candidate[]` (`selected=True` for the winner, `exploration=True` for the rest), and
   extend the `on_generation` hook payload. The bridge already passes `candidates`
   through, so `GenerationRecord.candidates` then populates. ~5 lines, additive.
   *Why:* the contrastive signal for credit assignment + Stage-2 preference learning, and
   the dashboard's candidates panel — currently discarded. Spec in `docs/LOOP_CORE_BRIDGE.md`.

2. 🟡 **Outcome ingestion** (L) — new producer (e.g. `harness/outcomes.py`). After
   render→post (Eng 3's renderer), poll the platform API for
   views/APV/likes/comments/shares/follows/retention → build a typed
   `Outcome(source="youtube_api")` and attach to `GenerationRecord.outcome` + the matching
   `Candidate.outcome`. *Why:* the ground truth (D17); until it lands, outcomes are
   `stub`/`synthetic` and Stage 2 can't run on real data.

3. 🟡 **Formal `Lesson` objects** (M) — `loop_core/meta_agent.py`. Emit a structured
   `Lesson` (observation / rule / evidence / harness_change / expected_effect) per
   generation into `GenerationRecord.lesson`, not just the terse `diff_summary`.
   *Why:* living memory (`docs/HARNESS_MEMORY.md`) + the dashboard's narrative layer.

4. ⚪ **End-to-end loop test** (M) — `tests/test_loop_e2e.py`. Run 2 generations with
   `make_acoe_critic()` + the bridge hook; assert `raw/gen_*.json` and
   `data/generations.latest.json` round-trip with the ACOE fields + (once #1 lands)
   populated `candidates`. *Why:* protect the spine from regressions.

5. 🟡 **Optimize win-probability, not the absolute scalar** (M, Stage 3 / D18) — switch
   `update_policy` from `advantage = predicted_score − baseline` to a **Bradley-Terry
   win-probability** advantage over the generation's K candidates (depends on #1
   candidate-capture). Keep 0–100 for the dashboard. The offline prototype + benchmark are
   in `scripts/calibrate.py` (`fit_bradley_terry`).

6. 🔴 **Parallel generator squad + `strategy_weights`** (M) — per `docs/INNER_LOOP_SPEC.md`:
   make `run_generation_loop` accept `generators: list[Callable]` (run all 4 per generation
   → score each → winner = max `total_score` → pass the strategy-tagged batch to
   `on_generation`), and add `HarnessState.strategy_weights` (4 arms, additive) with a
   strategy-level update. *Why:* turns the inner loop into the parallel multi-agent search
   the architecture describes; pairs with #1 (candidate capture) and #5 (preference reward).

_Done, no action:_ inner-loop RL fixes (eta 0.4, moving-mean baseline, auto-fail shield,
`suggested_policy_updates` consumption), the bridge + `make_acoe_critic`, wiki persistence.

---

## Eng 2 — Reward Critic (`harness/critic.py`, calibration)

ACOE v2, the offline preflight, the confidence-gated learning signal, score provenance,
and the Stage-1 calibration seed are **landed**. Remaining:

1. 🔴 **Real LLM judge** (M) — `harness/critic.py` accepts a `JudgeCallable` but nothing
   instantiates one, so only the offline `prompt_preflight` runs. Wire a Claude judge
   (e.g. `harness/judge_claude.py`) for `rendered_video` / `publishing_package`.
   *Why:* preflight is **projected** (prompt-keyword) only → `policy_update_allowed` is
   always false, so the confidence-gated learning never fires. Verified-mode scoring is
   what lets the loop learn from the artifact, not the prompt's vocabulary.

2. 🟡 **Calibrate on real outcomes** (M) — once Eng-1 outcomes land, run
   `scripts/calibrate.py` on real `(criterion_vector, Outcome)` pairs; report the
   proxy↔outcome correlation and **validate/iterate the weight assumptions** (especially
   the deliberately-negative engagement-bait weights). Feed the learned weights back as a
   candidate v3 rubric. *Why:* the actual Stage 2 — turning the proxy into a calibrated
   reward model. The synthetic seed (`scripts/synth_outcomes.py`) already proves the method.

3. ⚪ **Provenance e2e test** (S) — `tests/test_critic.py`: assert preflight →
   `score_type="projected"`, `evidence_coverage<1`, `policy_update_allowed=False`; and a
   rendered/verified path → `verified`, coverage 1, learning allowed at confidence ≥ 0.70.
   *Why:* the provenance gate is the lynchpin of honest learning (D13/D17) — lock it down.

4. ⚪ **Audio-pool freshness** (M) — the approved pool (`PRIORITY_AUDIO_TITLES` /
   `AVOID_AUDIO_TITLES`, `AS_OF 2026-06-06`) is hardcoded in `critic.py`. Add a refresh
   path (a `data/policies/` file or small admin step) so AA-01 stays current.
   *Why:* AA-01 gates audio scoring + real distribution; trends move weekly.

5. 🟡 **Pairwise / Bradley-Terry reward** (M, Stage 3 / D18) — add an LLM
   `judge_pairwise(a, b)` ("which is better, and why?") in `harness/critic.py` and fit a
   Bradley-Terry model over each generation's K candidates; feed `_pairwise_probability` a
   real baseline (today it returns 0.5 because the loop never passes one). LLMs rank far more reliably than they
   score 0–100. The offline prototype on synthetic data is landed in `scripts/calibrate.py`
   (`fit_bradley_terry` / `benchmark_preference`) and beats the absolute proxy on held-out pairs.

_Done, no action:_ ACOE v2 rubric, 23-criterion preflight, AF-01..05, the learning signal,
`score_type`/`evidence_coverage`, and the synth + calibrate + `test_calibrate` seed.

---

## Eng 3 — Content Pipeline (`harness/generator.py`, `harness/scout.py`, `harness/seedance.py`)

**Not started — and the #1 bottleneck.** The loop is stuck in seed_jail until these exist.

1. 🔴 **`harness/generators/` — the 4-agent squad** (L) — full spec:
   **`docs/INNER_LOOP_SPEC.md`**. Four specialized agents (`hook_architect` /
   `retention_engineer` / `audio_anchor` / `visual_stylist`), each
   `generator(trend, harness, policy) -> ContentConcept` via OpenAI (`OPENAI_API_KEY`,
   default `OPENAI_MODEL=gpt-5.4-mini`) + a deterministic template fallback. Every concept
   must **escape all auto-fails and score ≥ growing**: 13–15s (AF-03), peak-motion frame 1
   (AF-01), `on_screen_text` first-2s + second-person (AF-02 / HQ-05), approved rising
   `audio` (AF-04 / AA-01 / AA-03), delayed payoff + conflict phrasing (RL-04 / RL-05),
   `cut_frequency ≥ ~0.4` (VP-04), `comment_bait_question` (EB-01), `execution` hashtags;
   tag `created_by=<agent>`. *Why:* the stub scores 0.06 (seed_jail); the squad is the
   single change that lets the loop climb. Verify with `harness.critic.score_concept`.

2. 🔴 **`harness/scout.py`** (M) — `trend_source() -> TrendContext` via Tavily (fallback
   to a curated file if no key). MUST select `audio` from the approved pool (AF-04) and
   prefer **rising** sounds (AA-03); populate `signals`, `topic`, `format`, `source_urls`.
   *Why:* replaces the single hardcoded stub trend so the loop responds to real trends.

3. 🔴 **Wire scout + generator into the loop** (S) — pass the real callables into
   `run_generation_loop` in `loop_core/loop.py __main__` (mirror how `make_acoe_critic()`
   is wired). Confirm winning scores climb seed_jail → growing/viral across 5 generations.
   *Why:* this is the demo payoff — the visible self-improvement.

4. ⚪ **`tests/test_generator.py`** (M) — assert a generated concept triggers **zero**
   auto-fails and scores ≥ 0.65 (growing) via `score_concept`. *Why:* guard generator
   quality; prevent a silent backslide into seed_jail.

5. 🟡 **(stretch) Renderer — `harness/seedance.py`** (L) — Seedance API to render the
   winning concept → `post_url`. Feeds Eng-1's outcome ingestion. *Why:* required for
   **real** outcomes (Stage 2); optional for the concept-scoring demo.

---

## Eng 4 — Dashboard (`src/ui/`) — reference only (not requested, but on the critical path)

The ACOE v2 control room is **done**. Remaining is small and mostly blocked on Eng-1 producers:

1. 🔴 **Wire `VITE_GENERATIONS_URL`** (XS) — point `src/ui/lib/data.ts` at the real bridge
   output (`data/generations.latest.json`, copied to `public/` or served). One line + a
   copy; today it falls back to the synthetic arc.
2. **Display-layer viz upgrades** — full spec + rationale table in
   `docs/DASHBOARD_MIGRATION.md` ("Display-layer viz upgrades"). Keep 0–100 + tiers as the
   headline (decomposable + legible); layer around it. **Now-doable** (fields already
   populated by the critic/stubs):
   - 🔴 **Provenance band on `HeroCurve`** — confidence band + projected-vs-verified
     (dashed/solid) from `score_type` / `evidence_coverage` / `confidence`.
   - 🔴 **`CategoryTrajectory`** — stacked-area / bump chart of the 6 `category_breakdown`
     across generations (the *causal* climb — which lever moved, not just the total).
   - 🔴 **Soften tier cliffs** — gradient bands, not a step-change at 84→85.

   **Gated on Eng-1 producers:**
   - 🟡 **Proxy-vs-truth panel** — predicted `total_score` vs `outcome` APV/views + a
     calibration line (log / percentile axis). Needs outcome ingestion.
   - 🟡 **Candidate-batch view** — ranked dot-plot / slopegraph of the K `candidates`
     (relative encoding). Needs candidate-capture.

   *(Headline stays 0–100 — don't swap for Elo; DECISIONS D18.)*

---

_Keep this file and `docs/STATUS.md` (component table) in sync; record decisions in
`docs/DECISIONS.md`._
