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

_Done, no action:_ ACOE v2 rubric, 23-criterion preflight, AF-01..05, the learning signal,
`score_type`/`evidence_coverage`, and the synth + calibrate + `test_calibrate` seed.

---

## Eng 3 — Content Pipeline (`harness/generator.py`, `harness/scout.py`, `harness/seedance.py`)

**Not started — and the #1 bottleneck.** The loop is stuck in seed_jail until these exist.

1. 🔴 **`harness/generator.py`** (L) — `generator(trend, harness, policy) -> ContentConcept`.
   Read `HarnessState.element_taxonomy` + the `policy` weights and produce a dance-Short
   concept that **escapes every auto-fail and scores ≥ growing**:
   - 13–15s `duration_sec` (AF-03), peak-motion frame 1 (AF-01);
   - `on_screen_text` in the first 2s, second-person "You/Your" (AF-02 / HQ-03 / HQ-05);
   - `audio` from the **approved pool**, `is_rising_sound=True` (AF-04 / AA-01 / AA-03);
   - seamless loop + delayed payoff (~0:13) + conflict phrasing (RL-02 / RL-04 / RL-05);
   - `cut_frequency` ≥ ~0.4 (VP-04), a `comment_bait_question` (EB-01);
   - `execution` (hashtags + posting_time), `elements` + the `element_weights` snapshot.
   *Why:* the stub scores **0.06 (seed_jail)**; this is the single change that lets the
   loop climb. Exemplar shape: `data/stubs/generation-records.sample.json`. Verify with
   `harness.critic.score_concept`.

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
2. 🟡 **Stage-1 UI panels** (M, blocked on Eng-1 #1/#2) — an outcome panel (APV/views vs
   proxy `total_score`), the candidates contrastive batch, and `score_type` /
   `evidence_coverage` provenance badges.

---

_Keep this file and `docs/STATUS.md` (component table) in sync; record decisions in
`docs/DECISIONS.md`._
