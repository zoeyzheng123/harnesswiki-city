"""
meta_agent.py — the OUTER loop, as Karpathy's LLM-Wiki cycle.

Per generation:
  ingest  — take the immutable raw/ records (passed in as `records`)
  compile — (re)write wiki/*.md: accumulate lessons, don't just append
  lint    — resolve contradictions, mark stale lessons, no orphan elements
  emit    — derive the next HarnessState (the schema layer) from the wiki

Backed by a Nebius model; falls back to a deterministic stub so the loop runs
offline (no creds) and the wiki is ALWAYS produced for the demo.

Plug in:  run_generation_loop(meta=make_meta())
"""

from __future__ import annotations
import os, json, re
from pathlib import Path
from contracts import HarnessState, GenerationRecord

WIKI = Path("wiki")

# The stub's action space — elements it can introduce when no LLM is available.
_CANDIDATES = ["pattern_interrupt_3s", "captions_burned_in", "duet_bait_ending",
               "first_comment_cta", "trend_audio_remix"]


# ---------------- compile (deterministic stub) ----------------
def _compile_lessons(records: list[GenerationRecord]) -> str:
    lines = ["# Lessons (auto-compiled from raw/)\n",
             "What the generator has learned, recompiled each generation.\n"]
    prev = None
    for r in records:
        delta = "" if prev is None else f" ({r.predicted_score - prev:+.2f})"
        lines.append(f"- **Gen {r.generation}** — score {r.predicted_score:.2f}{delta}; "
                     f"change: {r.harness_diff or 'no change'}")
        prev = r.predicted_score
    if records:
        best = max(records, key=lambda r: r.predicted_score)
        lines.append(f"\n**Best recipe so far:** gen {best.generation} @ {best.predicted_score:.2f}.")
        if len(records) > 1 and records[-1].predicted_score <= records[-2].predicted_score:
            lines.append("**Lint:** last change did not improve score — candidate to revert.")
    return "\n".join(lines) + "\n"

def _compile_elements(harness: HarnessState, proposed: str | None) -> str:
    lines = ["# Elements\n", "Active action space, cross-linked.\n"]
    for e in harness.element_taxonomy:
        lines.append(f"- [[{e}]] — active")
    if proposed:
        lines.append(f"- [[{proposed}]] — proposed next")
    lines.append("\n**Lint:** no contradictions (stub compile).")
    return "\n".join(lines) + "\n"

def _propose_element(harness: HarnessState) -> str | None:
    for c in _CANDIDATES:
        if c not in harness.element_taxonomy:
            return c
    return None

def _emit_stub(harness: HarnessState, records: list[GenerationRecord]) -> HarnessState:
    WIKI.mkdir(exist_ok=True)
    new_el = _propose_element(harness)
    tax = list(harness.element_taxonomy)
    diff, prompt = "no change", harness.system_prompt
    if new_el:
        tax.append(new_el)
        diff = f"wiki suggests trying [[{new_el}]] next"
        prompt = harness.system_prompt + f" Use {new_el} when it fits."
    (WIKI / "lessons.md").write_text(_compile_lessons(records))
    (WIKI / "elements.md").write_text(_compile_elements(harness, new_el))
    return HarnessState(generation=harness.generation + 1, system_prompt=prompt,
        tools=harness.tools, element_taxonomy=tax,
        few_shot_examples=harness.few_shot_examples, rubric_version=harness.rubric_version,
        parent_harness_id=harness.harness_id, diff_summary=diff)


# ---------------- compile (real, via Nebius) ----------------
def _parse_json(text: str) -> dict:
    t = re.sub(r"^```(json)?", "", text.strip()).strip()
    t = re.sub(r"```$", "", t).strip()
    m = re.search(r"\{.*\}", t, re.S)
    return json.loads(m.group(0) if m else t)

_SYS = ("You are the meta-agent maintaining an LLM-Wiki for a self-improving short-form "
        "video generator. Ingest the new run records, RECOMPILE the wiki (accumulate and "
        "consolidate, do not just append), LINT it (resolve contradictions, mark stale "
        "lessons, no orphan elements), and propose ONE concrete next harness change. "
        "Separate observation from speculation. Return ONLY a JSON object.")

def _emit_llm(client, model: str, harness: HarnessState,
              records: list[GenerationRecord]) -> HarnessState:
    WIKI.mkdir(exist_ok=True)
    existing = (WIKI / "lessons.md").read_text() if (WIKI / "lessons.md").exists() else ""
    user = json.dumps({
        "current_harness": harness.model_dump(mode="json"),
        "existing_wiki_lessons": existing,
        "raw_records": [r.model_dump(mode="json") for r in records],
        "return_schema": {
            "lessons_md": "full recompiled wiki/lessons.md",
            "elements_md": "full wiki/elements.md with [[wikilinks]] + status",
            "new_element": "snake_case element NOT already in taxonomy, or empty string",
            "prompt_addition": "<=12 words appended to system_prompt, or empty string",
            "diff_summary": "one line",
            "lint_notes": "contradictions / stale items you resolved",
        },
    })
    resp = client.chat.completions.create(model=model, temperature=0.4, max_tokens=1500,
        messages=[{"role": "system", "content": _SYS}, {"role": "user", "content": user}])
    out = _parse_json(resp.choices[0].message.content)
    (WIKI / "lessons.md").write_text(out.get("lessons_md") or _compile_lessons(records))
    (WIKI / "elements.md").write_text(out.get("elements_md") or _compile_elements(harness, None))
    tax = list(harness.element_taxonomy)
    ne = (out.get("new_element") or "").strip()
    if ne and ne not in tax:
        tax.append(ne)
    add = out.get("prompt_addition") or ""
    return HarnessState(generation=harness.generation + 1,
        system_prompt=harness.system_prompt + (f" {add}" if add else ""),
        tools=harness.tools, element_taxonomy=tax,
        few_shot_examples=harness.few_shot_examples, rubric_version=harness.rubric_version,
        parent_harness_id=harness.harness_id, diff_summary=out.get("diff_summary") or "wiki recompiled")


# ---------------- factory ----------------
def make_meta(model: str | None = None, base_url: str | None = None, api_key: str | None = None):
    """Returns a meta(harness, records) -> HarnessState callable for run_generation_loop.
    Uses Nebius if NEBIUS_API_KEY is set; otherwise the deterministic stub.
    Token Factory base url: https://api.tokenfactory.nebius.com/v1/  (or AI Studio: https://api.studio.nebius.com/v1/)
    Set META_MODEL to one of your Nebius models (Qwen / DeepSeek / GLM / Kimi)."""
    api_key = api_key or os.getenv("NEBIUS_API_KEY")
    base_url = base_url or os.getenv("NEBIUS_BASE_URL", "https://api.studio.nebius.com/v1/")
    model = model or os.getenv("META_MODEL", "Qwen/Qwen3-30B-A3B")
    client = None
    if api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=base_url)
        except Exception as e:
            print(f"[meta] could not init Nebius client ({e}); using stub")

    def meta(harness: HarnessState, records: list[GenerationRecord]) -> HarnessState:
        if client is not None:
            try:
                return _emit_llm(client, model, harness, records)
            except Exception as e:
                print(f"[meta] LLM compile failed ({e}); falling back to stub")
        return _emit_stub(harness, records)

    return meta


if __name__ == "__main__":
    from loop import run_generation_loop
    recs = run_generation_loop(meta=make_meta())
    print("\nscores:", [r.predicted_score for r in recs])
    print("\n--- wiki/lessons.md ---\n" + (WIKI / "lessons.md").read_text())
