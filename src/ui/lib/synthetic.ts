import type {
  GenerationRecord,
  HarnessState,
  TrendContext,
} from "./contracts";

/**
 * Synthetic demo data — a believable 5-generation arc for the dashboard while
 * the real loop (docs/STATUS.md item 6 of 6) is unbuilt. It CONTINUES the real
 * stubs: generation 1 mirrors data/stubs/generation-records.sample.json, the v0
 * weights come from harness-state.initial.json, and the two TrendContexts are
 * the real ones. Everything is typed against the canonical `GenerationRecord`,
 * so this file is contract-faithful by construction (typecheck:ui is the proof).
 *
 * The arc: climb (g1→g2), a deliberate DIP at g3 where a high-hook concept trips
 * `policy_flag` and the meta-agent REJECTS the diff (the harness refuses a risky
 * win), then a clean recovery to the peak (g4→g5). Versions advance only on
 * accepted diffs, so the run reaches v4, not v5 — g3 leaves the version at v2.
 */

export const INITIAL_HARNESS_STATE: HarnessState = {
  id: "hs_0001",
  version: "v0",
  element_weights: {
    contrarian_hook: 0.5,
    diagnostic_hook: 0.4,
    founder_story: 0.35,
    data_drop: 0.3,
    generic_listicle: 0.2,
  },
  script_prompt:
    "Write a 30-second short-form video script for a founder-facing AI audience. Open with a scroll-stopping hook, deliver one sharp insight, and close with a memorable takeaway. Avoid generic listicles and hype.",
  seedance_prompt_template:
    "A clean, modern talking-head explainer for {{audience}}. Visual style: minimal, high-contrast, on-screen captions. Scene reflects: {{angle}}.",
  judge_rubric:
    "Score hook_strength, trend_fit, brand_fit, novelty, and clarity (higher is better), plus cringe_risk and policy_risk (higher is worse) and visual_feasibility. Penalize the risk dimensions in the weighted total. See docs/JUDGE_RUBRIC.md for the authoritative definition.",
  policy_rules: [
    "No medical, legal, or financial advice presented as fact.",
    "Do not target or identify private individuals.",
    "No unverifiable claims about named companies.",
  ],
};

export const TREND_CONTEXTS: TrendContext[] = [
  {
    id: "tc_0001",
    captured_at: "2026-06-06T09:00:00.000Z",
    platform: "x",
    audience: "ai-founders",
    trend_summary:
      "Founders are pushing back on 'AI wrapper' criticism, arguing distribution and taste are the real moats.",
    signals: [
      {
        label: "format: contrarian take",
        strength: 0.8,
        note: "high engagement on threads challenging the consensus",
      },
      { label: "topic: moats vs wrappers", strength: 0.7 },
      { label: "tone: confident, first-person", strength: 0.6 },
    ],
    source: "stub",
  },
  {
    id: "tc_0002",
    captured_at: "2026-06-06T09:05:00.000Z",
    platform: "linkedin",
    audience: "ai-founders",
    trend_summary:
      "Diagnostic 'why your launch flopped' posts are outperforming celebratory launch announcements.",
    signals: [
      { label: "format: diagnostic teardown", strength: 0.75 },
      { label: "emotion: useful discomfort", strength: 0.65 },
    ],
    source: "stub",
  },
];

export const SYNTHETIC_GENERATIONS: GenerationRecord[] = [
  // ── Generation 1 — baseline (mirrors the real stub gr_0001) ──────────────
  {
    id: "gr_0001",
    generation_number: 1,
    created_at: "2026-06-06T09:10:00.000Z",
    trend_context_id: "tc_0001",
    concept: {
      id: "cc_0001",
      generation_number: 1,
      trend_context_id: "tc_0001",
      harness_state_version: "v0",
      hook: "Your AI startup isn't a wrapper problem. It's a taste problem.",
      format: "contrarian_hook",
      angle: "Distribution and taste are the real moats, not the model.",
      script:
        "Everyone says you're just a GPT wrapper. Cool - so was every SaaS a 'database wrapper.' The moat was never the model. It's taste, distribution, and the thousand product decisions nobody screenshots. Here's how to tell if yours is real...",
      visual_prompt:
        "A clean, modern talking-head explainer for ai-founders. Visual style: minimal, high-contrast, on-screen captions. Scene reflects: distribution and taste as moats.",
      elements: ["contrarian_hook"],
      created_by: "content-generator",
    },
    score: {
      id: "rs_0001",
      concept_id: "cc_0001",
      generation_number: 1,
      harness_state_version: "v0",
      dimensions: {
        hook_strength: 0.82,
        trend_fit: 0.78,
        brand_fit: 0.7,
        novelty: 0.68,
        clarity: 0.74,
        cringe_risk: 0.18,
        policy_risk: 0.05,
        visual_feasibility: 0.8,
      },
      weighted_total: 0.71,
      predicted_win_prob: 0.5,
      policy_flag: false,
      judge_rationale:
        "Strong contrarian hook with clear trend fit and good clarity; novelty is moderate. Low cringe and policy risk. Baseline generation, so the win probability is anchored at 0.5.",
    },
    harness_state_version_before: "v0",
    harness_state_version_after: "v1",
    harness_diff: {
      id: "hd_0001",
      from_version: "v0",
      to_version: "v1",
      element_weight_changes: { contrarian_hook: 0.1, generic_listicle: -0.1 },
      script_prompt_change:
        "Add an explicit instruction to name the consensus view before subverting it.",
      rationale:
        "The contrarian hook scored highest on hook_strength and trend_fit; reinforce it and suppress generic listicles.",
      accepted: true,
    },
    lesson: {
      id: "ls_0001",
      generation_number: 1,
      observation:
        "The contrarian hook outscored generic framings on hook_strength and trend_fit for the AI-founder audience.",
      rule: "For founder-facing AI content, prefer contrarian or diagnostic hooks over generic listicles.",
      evidence:
        "Generation 1: contrarian_hook concept scored 0.82 hook_strength and 0.78 trend_fit, weighted_total 0.71.",
      harness_change:
        "Increase contrarian_hook weight (+0.1) and decrease generic_listicle (-0.1); reinforce in script_prompt.",
      expected_effect:
        "Later generations open with sharper, consensus-subverting hooks and avoid generic listicles, lifting the predicted win probability.",
    },
  },

  // ── Generation 2 — diagnostic framing climbs ─────────────────────────────
  {
    id: "gr_0002",
    generation_number: 2,
    created_at: "2026-06-06T09:14:00.000Z",
    trend_context_id: "tc_0002",
    concept: {
      id: "cc_0002",
      generation_number: 2,
      trend_context_id: "tc_0002",
      harness_state_version: "v1",
      hook: "Your launch didn't flop because of timing. It flopped because nobody could repeat what you do in one sentence.",
      format: "diagnostic_hook",
      angle: "Most launches die on positioning legibility, not on the product.",
      script:
        "Be honest: if a stranger watched your launch, could they repeat your pitch in one sentence? If not, that's the bug. Not the timing, not the algorithm. People don't share what they can't restate. Here's the one-sentence test, and the three places it usually breaks...",
      visual_prompt:
        "A clean, modern talking-head explainer for ai-founders. Visual style: minimal, high-contrast, on-screen captions. Scene reflects: most launches die on positioning legibility, not on the product.",
      elements: ["diagnostic_hook"],
      created_by: "content-generator",
    },
    score: {
      id: "rs_0002",
      concept_id: "cc_0002",
      generation_number: 2,
      harness_state_version: "v1",
      dimensions: {
        hook_strength: 0.84,
        trend_fit: 0.8,
        brand_fit: 0.74,
        novelty: 0.7,
        clarity: 0.79,
        cringe_risk: 0.15,
        policy_risk: 0.05,
        visual_feasibility: 0.82,
      },
      weighted_total: 0.76,
      predicted_win_prob: 0.59,
      policy_flag: false,
      judge_rationale:
        "Diagnostic 'why it flopped' framing lands harder than the baseline on clarity and trend fit, with low risk. A clear step up from generation 1.",
    },
    harness_state_version_before: "v1",
    harness_state_version_after: "v2",
    harness_diff: {
      id: "hd_0002",
      from_version: "v1",
      to_version: "v2",
      element_weight_changes: {
        diagnostic_hook: 0.1,
        data_drop: 0.05,
        generic_listicle: -0.05,
      },
      script_prompt_change:
        "Name the single sentence the audience should be able to repeat before giving the fix.",
      rationale:
        "Diagnostic framing beat the baseline on clarity and trend fit; reinforce diagnostic_hook, nudge data_drop, and trim the listicle bias further.",
      accepted: true,
    },
    lesson: {
      id: "ls_0002",
      generation_number: 2,
      observation:
        "Diagnostic 'why it flopped' hooks held attention better than celebratory framings for the founder audience.",
      rule: "Lead with a precise diagnosis the reader recognizes before offering the fix.",
      evidence:
        "Generation 2: diagnostic_hook scored 0.84 hook_strength and 0.79 clarity, weighted_total 0.76 (up from 0.71).",
      harness_change:
        "Raise diagnostic_hook (+0.10), nudge data_drop (+0.05), cut generic_listicle (-0.05).",
      expected_effect:
        "Hooks open with a sharper diagnosis; clarity and win probability keep climbing.",
    },
  },

  // ── Generation 3 — the refusal: policy_flag trips, diff REJECTED ─────────
  {
    id: "gr_0003",
    generation_number: 3,
    created_at: "2026-06-06T09:18:00.000Z",
    trend_context_id: "tc_0001",
    concept: {
      id: "cc_0003",
      generation_number: 3,
      trend_context_id: "tc_0001",
      harness_state_version: "v2",
      hook: "Leaked: a top AI lab quietly lost 40% of its enterprise pipeline last quarter, and it proves your distribution already beats their model.",
      format: "data_drop",
      angle: "Use a hard 'leaked' number to make distribution the hero.",
      script:
        "A number is going around: a top lab supposedly lost 40% of its enterprise pipeline last quarter. Whether or not that's exact, the lesson is the same - the model isn't the moat, the relationship is. Here's how to make your distribution the story...",
      visual_prompt:
        "A clean, modern talking-head explainer for ai-founders. Visual style: minimal, high-contrast, on-screen captions. Scene reflects: a leaked enterprise-pipeline number making distribution the hero.",
      elements: ["data_drop", "contrarian_hook"],
      created_by: "content-generator",
    },
    score: {
      id: "rs_0003",
      concept_id: "cc_0003",
      generation_number: 3,
      harness_state_version: "v2",
      dimensions: {
        hook_strength: 0.86,
        trend_fit: 0.72,
        brand_fit: 0.55,
        novelty: 0.66,
        clarity: 0.7,
        cringe_risk: 0.34,
        policy_risk: 0.62,
        visual_feasibility: 0.78,
      },
      weighted_total: 0.7,
      predicted_win_prob: 0.55,
      policy_flag: true,
      judge_rationale:
        "Hook strength is the highest of the run, but the concept asserts an unverifiable 40% figure about a named company, tripping policy_risk past threshold. The weighted total is penalized and the proposed harness change is rejected: the harness will not reward a claim it cannot stand behind.",
    },
    harness_state_version_before: "v2",
    harness_state_version_after: "v2",
    harness_diff: {
      id: "hd_0003",
      from_version: "v2",
      to_version: "v3",
      element_weight_changes: { data_drop: 0.15, generic_listicle: -0.05 },
      rationale:
        "data_drop produced the strongest hook of the run, but it did so through an unverifiable claim about a named company. Applying this weight change would teach the harness to reward policy-violating behavior, so the diff is rejected and no version is created.",
      accepted: false,
    },
    lesson: {
      id: "ls_0003",
      generation_number: 3,
      observation:
        "The highest-hook concept of the run reached its strength through an unverifiable claim about a named company.",
      rule: "Reject weight changes driven by policy-flagged generations, even when their raw hook scores are high.",
      evidence:
        "Generation 3: data_drop hook_strength 0.86 but policy_risk 0.62 (over threshold); weighted_total fell to 0.70 and the diff was rejected.",
      harness_change:
        "No change applied. data_drop weight held at v2 levels; policy_rules reaffirmed.",
      expected_effect:
        "The harness avoids learning a policy-violating shortcut; later generations recover score through compliant hooks.",
    },
  },

  // ── Generation 4 — clean recovery ────────────────────────────────────────
  {
    id: "gr_0004",
    generation_number: 4,
    created_at: "2026-06-06T09:22:00.000Z",
    trend_context_id: "tc_0001",
    concept: {
      id: "cc_0004",
      generation_number: 4,
      trend_context_id: "tc_0001",
      harness_state_version: "v2",
      hook: "Your competitor shipped the same feature this week. You still won. Here's the part the model can't copy.",
      format: "contrarian_hook",
      angle: "Taste and distribution compound; the model is the commodity.",
      script:
        "Same feature, same week, two different outcomes. The difference wasn't the model - it was the hundred small calls around it: who you shipped to first, the one line of copy, the follow-up nobody saw. That's the compounding asset. Here's how to make yours visible...",
      visual_prompt:
        "A clean, modern talking-head explainer for ai-founders. Visual style: minimal, high-contrast, on-screen captions. Scene reflects: taste and distribution compounding while the model stays a commodity.",
      elements: ["contrarian_hook", "founder_story"],
      created_by: "content-generator",
    },
    score: {
      id: "rs_0004",
      concept_id: "cc_0004",
      generation_number: 4,
      harness_state_version: "v2",
      dimensions: {
        hook_strength: 0.85,
        trend_fit: 0.82,
        brand_fit: 0.8,
        novelty: 0.74,
        clarity: 0.8,
        cringe_risk: 0.14,
        policy_risk: 0.06,
        visual_feasibility: 0.84,
      },
      weighted_total: 0.83,
      predicted_win_prob: 0.7,
      policy_flag: false,
      judge_rationale:
        "A strong contrarian hook grounded in a defensible claim; brand fit and clarity are both high and risk is low. The run recovers cleanly after the rejected generation.",
    },
    harness_state_version_before: "v2",
    harness_state_version_after: "v3",
    harness_diff: {
      id: "hd_0004",
      from_version: "v2",
      to_version: "v3",
      element_weight_changes: {
        contrarian_hook: 0.1,
        founder_story: 0.05,
        generic_listicle: -0.05,
      },
      script_prompt_change:
        "Pair the contrarian claim with one concrete founder-story detail.",
      rationale:
        "Compliant contrarian framing restored the climb; reinforce contrarian_hook, bring in founder_story, and retire the last of the listicle bias.",
      accepted: true,
    },
    lesson: {
      id: "ls_0004",
      generation_number: 4,
      observation:
        "A contrarian hook backed by a concrete, defensible detail recovered the score the rejected generation cost.",
      rule: "Ground contrarian claims in a specific, verifiable founder detail rather than a borrowed statistic.",
      evidence:
        "Generation 4: contrarian_hook + founder_story scored 0.85 hook_strength, 0.80 brand_fit, weighted_total 0.83.",
      harness_change:
        "Raise contrarian_hook (+0.10) and founder_story (+0.05); zero out generic_listicle.",
      expected_effect:
        "Hooks stay sharp and on-brand without policy risk; win probability climbs past 0.70.",
    },
  },

  // ── Generation 5 — peak ──────────────────────────────────────────────────
  {
    id: "gr_0005",
    generation_number: 5,
    created_at: "2026-06-06T09:26:00.000Z",
    trend_context_id: "tc_0002",
    concept: {
      id: "cc_0005",
      generation_number: 5,
      trend_context_id: "tc_0002",
      harness_state_version: "v3",
      hook: "Stop pitching the model. Start pitching the 50 product decisions nobody screenshots.",
      format: "diagnostic_hook",
      angle: "The defensible story is the accumulation of taste, shown not told.",
      script:
        "Your pitch keeps reaching for the model because it's the easy thing to point at. But the thing that actually wins is unscreenshottable: the 50 product decisions, the tone of your error states, who you said no to. Show three of them and the moat stops being abstract...",
      visual_prompt:
        "A clean, modern talking-head explainer for ai-founders. Visual style: minimal, high-contrast, on-screen captions. Scene reflects: an accumulation of small product decisions as the real moat.",
      elements: ["diagnostic_hook", "founder_story"],
      created_by: "content-generator",
    },
    score: {
      id: "rs_0005",
      concept_id: "cc_0005",
      generation_number: 5,
      harness_state_version: "v3",
      dimensions: {
        hook_strength: 0.88,
        trend_fit: 0.85,
        brand_fit: 0.83,
        novelty: 0.78,
        clarity: 0.84,
        cringe_risk: 0.12,
        policy_risk: 0.04,
        visual_feasibility: 0.86,
      },
      weighted_total: 0.88,
      predicted_win_prob: 0.81,
      policy_flag: false,
      judge_rationale:
        "Peak of the run: a sharp diagnostic hook with high clarity and brand fit and minimal risk. Win probability sits well above the 0.50 baseline.",
    },
    harness_state_version_before: "v3",
    harness_state_version_after: "v4",
    harness_diff: {
      id: "hd_0005",
      from_version: "v3",
      to_version: "v4",
      element_weight_changes: { diagnostic_hook: 0.1, founder_story: 0.05 },
      script_prompt_change:
        "Ask for three concrete, unscreenshottable product decisions as proof.",
      rationale:
        "Diagnostic framing paired with founder-story proof produced the run's best score; reinforce both.",
      accepted: true,
    },
    lesson: {
      id: "ls_0005",
      generation_number: 5,
      observation:
        "Diagnostic hooks that demand concrete proof-of-taste details outperformed every earlier framing.",
      rule: "Close the loop: pair the diagnosis with specific, shown evidence rather than a claim.",
      evidence:
        "Generation 5: diagnostic_hook + founder_story scored 0.88 hook_strength and 0.84 clarity, weighted_total 0.88, win probability 0.81.",
      harness_change:
        "Raise diagnostic_hook (+0.10) and founder_story (+0.05); request three concrete proof details in the script prompt.",
      expected_effect:
        "Generations converge on sharp, evidence-backed diagnostic hooks; the win probability holds above 0.80.",
    },
  },
];
