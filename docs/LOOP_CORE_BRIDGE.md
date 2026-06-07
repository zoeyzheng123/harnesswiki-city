# Loop Core → Canonical Bridge (adapter spec)

For Eng 1 (Workstream A). Maps the loop's **lean** output (`loop_core/contracts.py`)
to the **canonical render-ready** `GenerationRecord[]` (`harness/contracts.py`) that
the dashboard reads. One-way, no refactor of the tested loop. **Implemented** in
`harness/bridge.py` (DECISIONS.md **D16**). Rationale: DECISIONS.md **D12**.

The bridge now also carries the Stage-1 ground-truth fields (DECISIONS.md **D17**):
`score_type` / `evidence_coverage` on the score, and `outcome` / `candidates` on the
record — all passthrough, populated once the producers below exist.

## The two contracts

| | `loop_core/contracts.py` (internal) | `harness/contracts.py` (canonical) |
|---|---|---|
| Shape | lean, references by id | render-ready, **embeds** `concept` + `score` |
| Score | `predicted_score` (0..1) | ACOE: `total_score` (0–100), `distribution_tier`, `category_breakdown`, `dimensions` |
| Read by | only `loop_core` | dashboard (`src/ui/lib/data.ts`), Weave, B/C |

## Where the adapter lives

- New module `harness/bridge.py` (imports `harness.contracts`).
- Output: `data/generations.latest.json` — a JSON array of canonical `GenerationRecord`.
- The dashboard's `src/ui/lib/data.ts → loadGenerations()` points at that file (DASHBOARD_MIGRATION.md).

## Capturing the winners (no loop refactor)

`run_generation_loop()` already takes callables and already computes `best =
(concept, reward)` per generation. Two clean options:

1. **Preferred (2-line change, not a refactor):** add an optional
   `on_generation(concept, reward, harness, record)` hook to `run_generation_loop`
   and call it once per generation with the winning pair. The adapter passes a hook
   that accumulates canonical records.
2. **Zero-touch:** wrap `generator`/`critic` in capturing closures that remember the
   highest-scoring `(concept, reward)` seen each generation; emit on each new record.

Either way the adapter has the winning `ContentConcept` + `RewardScore` + the
`HarnessState` + the lean `GenerationRecord` in hand.

## Field mapping (lean → canonical)

**GenerationRecord**
| canonical | from loop_core |
|---|---|
| `id` | `record_id` |
| `generation_number` | `generation` |
| `created_at` | `created_at` |
| `trend_context_id` | `trend_id` |
| `concept` | embed (below) |
| `score` | embed (below) |
| `harness_state_version_before` / `_after` | `f"v{gen}"` / `f"v{gen+1}"` |
| `harness_diff` | optional — build a minimal `HarnessDiff` from `diff_summary`, or leave `None` |
| `harness_id`, `predicted_score`, `rubric_version`, `selected`, `actual_engagement`, `post_url` | passthrough |

**ContentConcept** (embed the winner)
| canonical | from loop_core |
|---|---|
| `id` ← `concept_id`; `generation_number` ← `generation`; `trend_context_id` ← `trend_id` |
| `harness_state_version` ← `f"v{gen}"` |
| `hook` ← `script` (or `storyboard[0]`); `angle` ← short `storyboard` summary |
| `format` ← top element key of `elements` |
| `script` ← `script`; `visual_prompt` ← `seedance_prompt`; `seedance_prompt` ← `seedance_prompt` |
| `elements` ← `list(concept.elements.keys())`; `element_weights` ← `concept.elements` (the dict snapshot) |
| `duration_sec` ← `duration_sec` |

**RewardScore** (embed the winner)
| canonical | from loop_core |
|---|---|
| `concept_id` ← `concept_id` |
| `weighted_total` ← `predicted_score`; `predicted_score` ← `predicted_score` |
| `predicted_win_prob` ← `pairwise_winprob`; `pairwise_winprob` ← `pairwise_winprob` |
| `confidence` ← `confidence`; `scored_by` ← `scored_by`; `rationale` / `judge_rationale` ← `rationale`; `policy_flag` ← `False` |
| `total_score` ← `round(predicted_score * 100)` *(interim — see ACOE gap)* |
| `distribution_tier` ← tier from `total_score` (≥85 `viral`, ≥65 `growing`, else `seed_jail`) |
| `score_type` / `evidence_coverage` ← passed through from the ACOE critic (D17); on stub-loop records these are `None` |
| `outcome` / `candidates` ← passed through (D17); `None` on live records until the producers below land |
| `category_breakdown`, `auto_fails_triggered`, `lowest_scoring_category`, `recommended_fix_priority` ← `None` until ACOE |

*(The legacy 8 `dimensions` / `RewardDimensions` were removed — DECISIONS.md D14 — so the bridge no longer synthesizes them.)*

## The ACOE gap (important)

The loop's **stub** critic emits only `predicted_score`. Real ACOE outputs
(`category_breakdown`, tiers from the real total, `auto_fails_triggered`) require
**Workstream B's critic** to apply `data/policies/ACOE-YT-SHORTS-v2.0.json` (now wired via `make_acoe_critic()`). Until
then the adapter derives `total_score`/`distribution_tier` from `predicted_score`
and leaves the breakdown empty. When B's critic produces a canonical (ACOE)
`RewardScore`, the adapter passes those fields straight through — no further change.

## Producers (pending)

The contracts for ground truth are landed (DECISIONS.md **D17**); two **real
producers** are specced, not built. Both are additive — the bridge already
passes `outcome`/`candidates` through, so populating them needs no bridge change.

1. **Loop candidate-capture (Eng 1, ~5 lines, additive).** In
   `loop_core/loop.py → run_generation_loop`, accumulate the K `(concept, reward)`
   pairs already computed per generation (not just the `best` argmax) and extend the
   `on_generation` hook payload with that list. The adapter wraps each into a
   `Candidate` (`selected=True` for the argmax, `exploration` for non-greedy picks) so
   `GenerationRecord.candidates` populates — the contrastive batch. The winning pair
   path is unchanged.

2. **Outcome ingestion.** render → post → fetch real metrics → build an `Outcome`
   (`source="youtube_api"`, real `avg_percent_viewed`/`views`/…) and attach it to the
   record (`GenerationRecord.outcome`) and/or the matching `Candidate.outcome`. Until
   this lands, outcomes are `stub`/`synthetic` (the D17 calibration seed) and
   `outcome` stays `None` on live records.

## Validate

- Every emitted record must round-trip: `GenerationRecord.model_validate(obj)` (Python) and satisfy the TS mirror (`GenerationRecord[]`).
- Add a check (e.g. in `scripts/dump_stubs.py` or a `bridge` self-test) that `data/generations.latest.json` validates.
- Then point `src/ui/lib/data.ts → loadGenerations()` at it (Eng 4, `docs/DASHBOARD_MIGRATION.md`).

References: contracts `docs/DATA_CONTRACTS.md`; rubric `docs/JUDGE_RUBRIC.md`; dashboard `docs/DASHBOARD_MIGRATION.md`.
