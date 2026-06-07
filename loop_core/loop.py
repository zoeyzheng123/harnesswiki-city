"""
loop.py — workstream A backbone.

THE deliverable: `python loop.py` runs 5 generations and writes 5
GenerationRecords to ./records/*.json (plus the evolving harness to ./harness/).

Two self-improvement loops live here:
  INNER (every concept): update_policy() nudges element weights from RewardScore.
  OUTER (every generation): meta() rewrites the HarnessState (expands the taxonomy).

B and C swap their real code in by passing callables to run_generation_loop().
Signatures they must match:
  generator(trend: TrendContext, harness: HarnessState, policy: dict) -> ContentConcept   (C)
  critic(concept: ContentConcept, harness: HarnessState) -> RewardScore                   (B)
  meta(harness: HarnessState, records: list[GenerationRecord]) -> HarnessState            (A/meta)
  trend_source() -> TrendContext                                                          (C)
"""

from __future__ import annotations
import math
from pathlib import Path
from contracts import (TrendContext, ContentConcept, RewardScore,
                       HarnessState, GenerationRecord, stub_trend, stub_harness)

# ---- Weave spine (WeaveHacks gate). No-op if weave isn't installed. ----
try:
    import weave
    weave_op = weave.op
except Exception:
    def weave_op(fn=None, **_):
        return (lambda f: f) if fn is None else fn


# ---- INNER loop: policy over element weights (workstream A owns this) ----
def init_policy(taxonomy: list[str]) -> dict[str, float]:
    return {e: 1.0 for e in taxonomy}

def sync_policy(policy: dict[str, float], taxonomy: list[str]) -> None:
    boost = (max(policy.values()) * 1.5) if policy else 1.0
    for e in taxonomy:                       # new elements (added by meta) enter with a lead, so they get explored
        policy.setdefault(e, boost)

def normalize(policy: dict[str, float], taxonomy: list[str]) -> dict[str, float]:
    total = sum(policy[e] for e in taxonomy) or 1.0
    return {e: policy[e] / total for e in taxonomy}

def top_k(weights: dict[str, float], k: int = 3) -> list[str]:
    return sorted(weights, key=lambda e: -weights[e])[:k]

def update_policy(policy, concept, reward, eta=2.0):
    advantage = reward.predicted_score - 0.5            # Hedge / multiplicative weights
    for e in top_k(concept.elements):
        policy[e] *= math.exp(eta * advantage)
    return policy


# ---- Swappable STUB agents (B replaces critic; C replaces generator + trend_source) ----
_VALUES = {"text_hook_frame1": 0.12, "trending_audio_sync": 0.10, "comedy": 0.05,
           "90s_aesthetic": 0.04, "slow_pan_intro": -0.12,
           "pattern_interrupt_3s": 0.15, "captions_burned_in": 0.10, "duet_bait_ending": 0.12}

def stub_trend_source() -> TrendContext:
    return stub_trend()

def stub_generator(trend, harness, policy) -> ContentConcept:
    norm = normalize(policy, harness.element_taxonomy)
    used = top_k(norm)
    return ContentConcept(
        trend_id=trend.trend_id, generation=harness.generation,
        elements={e: round(norm[e], 3) for e in harness.element_taxonomy},
        storyboard=[f"emphasize {u}" for u in used],
        script=trend.hook,
        seedance_prompt=f"8s {trend.format}; {trend.topic}; lead with {used[0]}",
    )

def stub_critic(concept, harness) -> RewardScore:
    used = top_k(concept.elements)
    raw = sum(_VALUES.get(e, 0.03) for e in used)        # unknown/meta-added: small positive
    score = max(0.0, min(1.0, 0.5 + raw))
    return RewardScore(concept_id=concept.concept_id, predicted_score=round(score, 3),
        pairwise_winprob=round(max(0.01, min(0.99, 0.5 + raw)), 3),
        rationale="; ".join(f"{e} {_VALUES.get(e, 0.03):+.2f}" for e in used),
        scored_by="stub-critic")

_NEW = ["pattern_interrupt_3s", "captions_burned_in", "duet_bait_ending"]

def stub_meta(harness, records) -> HarnessState:
    tax = list(harness.element_taxonomy)
    diff, prompt = "no change", harness.system_prompt
    i = harness.generation
    if i < len(_NEW) and _NEW[i] not in tax:
        tax.append(_NEW[i])
        diff = f"added element '{_NEW[i]}'"
        prompt = harness.system_prompt + f" Use {_NEW[i]} when it fits."
    return HarnessState(generation=harness.generation + 1, system_prompt=prompt,
        tools=harness.tools, element_taxonomy=tax,
        few_shot_examples=harness.few_shot_examples, rubric_version=harness.rubric_version,
        parent_harness_id=harness.harness_id, diff_summary=diff)


# ---- Weave-traced call sites (the spine) ----
@weave_op()
def traced_generate(generator, trend, harness, policy): return generator(trend, harness, policy)
@weave_op()
def traced_score(critic, concept, harness): return critic(concept, harness)
@weave_op()
def traced_meta(meta, harness, records): return meta(harness, records)


# ---- Persistence: plain JSON files (inspectable; Redis is a WeaveHacks stretch) ----
def save_harness(h: HarnessState) -> None:
    Path("harness").mkdir(exist_ok=True)
    Path(f"harness/gen_{h.generation}.json").write_text(h.model_dump_json(indent=2))

def save_record(r: GenerationRecord) -> None:
    Path("raw").mkdir(exist_ok=True)          # raw/ = immutable observations (Karpathy raw layer)
    Path(f"raw/gen_{r.generation}.json").write_text(r.model_dump_json(indent=2))

def load_records() -> list[GenerationRecord]:
    return [GenerationRecord.model_validate_json(p.read_text())
            for p in sorted(Path("raw").glob("gen_*.json"))]


# ---- THE backbone ----
@weave_op()
def run_generation_loop(n_generations=5, concepts_per_gen=4,
                        generator=stub_generator, critic=stub_critic,
                        meta=stub_meta, trend_source=stub_trend_source, eta=2.0):
    harness = stub_harness(0)
    policy = init_policy(harness.element_taxonomy)
    records: list[GenerationRecord] = []
    for _ in range(n_generations):
        sync_policy(policy, harness.element_taxonomy)
        trend = trend_source()
        best = None
        for _ in range(concepts_per_gen):
            concept = traced_generate(generator, trend, harness, dict(policy))
            reward = traced_score(critic, concept, harness)
            update_policy(policy, concept, reward, eta)          # INNER loop
            if best is None or reward.predicted_score > best[1].predicted_score:
                best = (concept, reward)
        concept, reward = best
        rec = GenerationRecord(generation=harness.generation, trend_id=trend.trend_id,
            concept_id=concept.concept_id, harness_id=harness.harness_id,
            predicted_score=reward.predicted_score, harness_diff=harness.diff_summary,
            rubric_version=harness.rubric_version, selected=True)
        save_harness(harness); save_record(rec); records.append(rec)
        harness = traced_meta(meta, harness, records)            # OUTER loop
    return records


if __name__ == "__main__":
    try:
        import weave; weave.init("sia-social-loop")
    except Exception:
        print("(weave not installed — running without tracing)\n")
    records = run_generation_loop()
    print(" gen | winner score | #elements | harness change")
    print("-----+--------------+-----------+----------------------------")
    for r in records:
        h = HarnessState.model_validate_json(Path(f"harness/gen_{r.generation}.json").read_text())
        print(f"  {r.generation}  |     {r.predicted_score:0.2f}     |     {len(h.element_taxonomy)}     | {r.harness_diff}")
    print(f"\nwrote {len(records)} GenerationRecords to ./raw/  [ok]")
