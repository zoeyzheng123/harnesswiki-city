# Inner Loop Spec — Parallel Specialized Generators (v2)

The concrete implementation spec for the parallel inner loop in
`docs/ARCHITECTURE_APPROACH.md`. Replaces the single `stub_generator` (which keeps the
loop in seed_jail) with **four specialized generator agents** that each produce a complete,
auto-fail-safe dance-Short `ContentConcept`. Owners: **Eng 3** (the generators), **Eng 1**
(loop wiring + `strategy_weights`). Scored by the existing **ACOE-YT-SHORTS-v2.0** critic.

## 1. Decisions

| Decision | Choice |
|---|---|
| Scope | The 4 specialized generators (parallel inner loop). Critic + meta-agent already exist. |
| Engine | **OpenAI** — `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-5.4-mini`), optional `OPENAI_BASE_URL` — with a **deterministic template fallback** when no key (mirrors `loop_core/meta_agent.py`'s client/stub pattern). |
| Strategy set | **Re-derived from v2 levers** (§2), not the v1-era set in ARCHITECTURE_APPROACH. |
| Policy | **Strategy-level credit** + `element_weights` stays the shared knob the meta-agent evolves. New `HarnessState.strategy_weights` (4 arms), preference-ready (§4). |
| Winner | Max `total_score` now; `strategy_weights` structured to later accept the Bradley-Terry preference ranking over the 4 (DECISIONS **D18**). |

## 2. The four strategies

Each agent **specializes** in one high-weight v2 category but emits a **complete** concept.
Specialization covers 85 of 100 points; `engagement_bait` (10) + `metadata` (5) are
**table-stakes every agent satisfies** (engagement is only 10 pts in v2 — no weak standalone
"bait agent").

| Agent (`created_by` tag) | Primary lever | v2 criteria it pushes |
|---|---|---|
| `hook_architect` | first 2 seconds | `hook_quality` (30): peak-motion frame-1 (HQ-01), high-contrast bg (HQ-02), pattern-interrupt text (HQ-03), no build-up (HQ-04), **"You" hook** (HQ-05) |
| `retention_engineer` | watch-through + loop | `retention_and_loop` (25): seamless loop (RL-02), **delayed resolution / micro-curiosity gap** (RL-04 — the v2 power lever), conflict phrasing (RL-05), no dead zones, 13–15s |
| `audio_anchor` | sound-first | `audio_alignment` (15): approved-pool track (AA-01), beat-sync (AA-02), **rising/early-adopter sound** (AA-03); paces cuts to the drops |
| `visual_stylist` | look + pacing | `visual_production` (15): dancer isolation (VP-01), reflective outfit (VP-02), clean render (VP-03), **cut/motion change ≤2.5s** (VP-04) |

**Shared table-stakes (every agent, every concept):** 13–15s `duration_sec`; `on_screen_text`
in the first 2s; a `comment_bait_question` (EB-01); `execution` hashtags + `title` (MD);
`audio` from the approved pool with `is_rising_sound`; brand-safe — i.e. **zero auto-fails
(AF-01..05)**. The differentiator is the *primary lever*, never completeness.

## 3. Strategy prompts (intent — team writes the exact text)

A shared **preamble** (built from `HarnessState.script_prompt`, which the meta-agent evolves)
carries the table-stakes + the auto-fail rules + the v2 mechanics. Each agent appends its lens:

- **`hook_architect`** — "You own the first 2 seconds. Frame 1 is peak motion (no fade/title); a bold, high-contrast pattern-interrupt overlay that opens in second person ('You'/'Your')."
- **`retention_engineer`** — "You engineer watch-through. Open a micro-curiosity gap at 0:00 and withhold the payoff to ~0:13; seamless final-frame→frame-1; use conflict transitions (But/However/Suddenly)."
- **`audio_anchor`** — "You build around the sound. Choose a *rising* track from the approved pool; structure motion peaks + cuts onto the beat drops."
- **`visual_stylist`** — "You own look + pacing. Isolated dancer, reflective outfit, clean 4K, a distinct visual change at least every 2.5s."

## 4. Interface, scaffolding, policy

**Interface** — each agent satisfies the existing loop contract
`generator(trend: TrendContext, harness: HarnessState, policy: dict) -> ContentConcept`
(`loop_core/loop.py:13`) and tags its output `created_by="<agent id>"`.

**Package** `harness/generators/`:
- `base.py` — the OpenAI client + deterministic fallback; **structured output** (JSON schema = the render-ready `ContentConcept` fields: `hook`, `angle`, `script`, `visual_prompt`, `on_screen_text`, `comment_bait_question`, `audio` (`Audio`), `cut_frequency`, `execution` (`ExecutionMetadata`), `duration_sec`, `elements`); parse → validate via `harness.contracts.ContentConcept`; on API/parse failure → the strategy's template.
- `strategies.py` — the 4 configs (id, prompt lens, ACOE focus, template fallback).
- `__init__.py` — `make_generator_squad() -> list[Callable]` (the 4, in order).

**Offline** — no `OPENAI_API_KEY` → all 4 are deterministic templates → loop + tests run with no network (the repo's offline-first norm).

**Policy (strategy credit + candidate batch):**
- The loop runs **all 4 agents per generation** → 4 concepts → critic scores each → **winner = max `total_score`**. The 4 strategy-tagged concepts are the **candidate batch** (`Candidate`, D17).
- New **`HarnessState.strategy_weights`** (one per agent): updated from wins; **structured to later be driven by the BT-preference ranking over the 4** (D18). It's the legible "the system learned to favor `audio_anchor` for this trend" signal + biases exploration/tie-breaks. Credit is **unconfounded** — the winning *strategy* is observed (unlike per-element credit).
- `element_weights` + `update_policy` stay; the **meta-agent** evolves the shared `script_prompt` + `element_weights` informed by which strategy keeps winning + the critic's `suggested_policy_updates`, lifting all 4 agents.

## 5. How the harness shapes the squad (and the diversity guardrail)

The 4 agents are **fixed-strategy diversity**; the **`HarnessState` is the shared, evolving
scaffold** that lifts them. Each generation every agent receives the same harness and is shaped
through five channels:

1. **`script_prompt` (shared, meta-evolved)** — the primary lever. Each agent's system prompt =
   its strategy lens **+** the shared preamble built from `harness.script_prompt`; one meta-agent
   refinement propagates to all four at once.
2. **`element_weights` (the `policy` arg)** — biases which content elements each agent emphasizes.
3. **`element_taxonomy`** — the expandable action space; new moves (+ their prompt snippets) become
   available to every agent.
4. **`strategy_weights`** — strategy-level credit (which agent wins); biases exploration and tells
   the meta-agent which levers to fold into the shared prompt/weights.
5. **`policy_rules` + `rubric_version`** — the hard constraints (auto-fails) + the ACOE rubric all
   four optimize against.

**Closed loop:** squad → 4 candidates → critic → winner + batch → meta-agent rewrites the harness →
next generation inherits it. The agents don't change; the harness accumulates the lift, so by gen 5
even the weakest strategy starts from a sophisticated baseline.

**Diversity guardrail (important).** Because learning propagates through the *shared* prompt, the
squad can **homogenize** — if the meta-agent keeps folding the winning strategy's levers into the
shared prompt, the four drift toward one template and the parallel diversity (the whole point)
collapses (the mode-collapse risk, DECISIONS D18). So:
- Keep each agent's **strategy lens fixed and strong** — the harness makes an agent *better at its
  lens*; it must not rewrite the lens itself.
- Let the meta-agent evolve only the **shared table-stakes / constraints + `element_weights`**, not
  an agent's strategy identity.
- Add a **diversity floor** — penalize/detect the squad collapsing to near-identical concepts (also
  matches how a real feed rewards novelty over recycled templates).

## 6. Loop wiring (Eng 1 contract)

`run_generation_loop` currently calls one `generator` `concepts_per_gen` times. Change it to
take `generators: list[Callable]` (the squad), run each once per generation, score all,
select the winner, and pass the **full strategy-tagged batch** to the `on_generation` hook →
`GenerationRecord.candidates` (converges with the candidate-capture TODO). Add
`strategy_weights` to `HarnessState` (additive) + a strategy-level update alongside
`update_policy`.

## 7. Boundaries
- Spec only here; **Eng 3 builds the generators, Eng 1 the wiring**. No `src/ui`. Contract change is **additive** (`HarnessState.strategy_weights`; `ContentConcept.created_by` already exists for the tag).

## 8. Verification
- **With `OPENAI_API_KEY`:** 4 **distinct** concepts; each escapes all auto-fails and scores **≥ growing** on `harness.critic.score_concept`; each agent's primary category beats the others' on average (e.g. `audio_anchor` tops `audio_alignment`).
- **Without a key:** 4 **deterministic** template concepts with the same auto-fail-safe + ≥growing guarantees; loop + `tests/test_generator.py` run offline.
- Loop runs end-to-end, **climbs out of seed_jail**, captures the 4-candidate batch with strategy tags, and `strategy_weights` shifts toward winning strategies across generations.

## See also
`docs/ARCHITECTURE_APPROACH.md` (the why), `docs/JUDGE_RUBRIC.md` (ACOE v2 criteria), `docs/DATA_CONTRACTS.md` (`ContentConcept`/`Candidate`), `docs/DECISIONS.md` D17 (candidate batch) / D18 (preference reward), `docs/LOOP_CORE_BRIDGE.md` (the bridge + producers).
