import type {
  GenerationRecord,
  HarnessState,
  RewardDimensions,
  TrendContext,
} from "./contracts";

/**
 * Synthetic demo data — a believable 5-generation arc of AI-generated YouTube
 * Shorts dance videos, scored by ACOE-YT-SHORTS-v1.0. Drives the dashboard while
 * the real loop is unbuilt; keep the `GenerationRecord[]` seam.
 *
 * The arc: total_score 48 → 64 → 0 (AF-01 standing-start crater) → 79 → 90.
 * The auto-fail at gen 3 is the drama beat: a held opening pose hard-overrides
 * the total to 0; the meta-agent learns the fix (bias peak_motion_frame1) and
 * the run recovers from seed_jail to viral.
 *
 * The legacy 0..1 `dimensions` + `weighted_total` are still emitted (the
 * contract keeps them, transitional per DECISIONS.md D11) but NOTHING in the UI
 * reads them after the ACOE migration — they exist only so the types are happy.
 */

// Vestigial legacy dims (unread; present so RewardScore typechecks).
function legacyDims(total: number): RewardDimensions {
  const p = Math.max(0.1, total / 100);
  return {
    hook_strength: p,
    trend_fit: p,
    brand_fit: p,
    novelty: p * 0.9,
    clarity: p,
    cringe_risk: total === 0 ? 0.4 : 0.16,
    policy_risk: 0.05,
    visual_feasibility: total === 0 ? 0.6 : 0.82,
  };
}

export const INITIAL_HARNESS_STATE: HarnessState = {
  id: "hs_0001",
  version: "v0",
  element_weights: {
    peak_motion_frame1: 0.4,
    seamless_loop: 0.35,
    typed_question: 0.3,
    trending_audio: 0.45,
    reflective_outfit: 0.2,
    generic_choreo: 0.3,
  },
  script_prompt:
    "Generate a 13–15s vertical dance Short for YouTube Shorts. Open on peak motion in frame 1 (no build-up), pose one polarizing typed question on screen within 2 seconds, and make the final frame loop seamlessly back to the first. Use a rising trending sound.",
  seedance_prompt_template:
    "A {{dance_style}} dance for {{audience}}, vertical 9:16, high-contrast set, dancer isolated, reflective outfit, clean 4K render with no AI artifacts. Frame 1 at peak motion. Scene reflects: {{angle}}.",
  judge_rubric:
    "ACOE-YT-SHORTS-v1.0: score hook_quality (30), retention_and_loop (25), engagement_bait (20), visual_production (15), audio_alignment (5), metadata (5) out of 100; map to a distribution tier (viral 85+, growing 65+, seed_jail <65); apply hard auto-fails AF-01..04. See data/policies/ACOE-YT-SHORTS-v1.0.json.",
  policy_rules: [
    "AF-01: frame 1 must be peak motion, never a static or held pose.",
    "AF-02: on-screen text must appear within the first 2 seconds.",
    "AF-03: total duration must be 13–20 seconds.",
    "AF-04: audio must come from the approved trending pool.",
  ],
  rubric_version: "ACOE-YT-SHORTS-v1.0",
};

export const TREND_CONTEXTS: TrendContext[] = [
  {
    id: "tc_0001",
    captured_at: "2026-06-07T09:00:00.000Z",
    platform: "youtube",
    audience: "dance-creators",
    trend_summary:
      "Mirror-transition dances on a high-contrast set, opening mid-spin on a rising afrobeats edit, are over-indexing on swipe-past rate.",
    signals: [
      { label: "open: peak motion, no build-up", strength: 0.82, note: "static frame 1 is auto-failed" },
      { label: "sound: rising afrobeats edit", strength: 0.74 },
      { label: "format: typed on-screen question", strength: 0.66 },
    ],
    source: "stub",
  },
  {
    id: "tc_0002",
    captured_at: "2026-06-07T09:05:00.000Z",
    platform: "tiktok",
    audience: "dance-creators",
    trend_summary:
      "Loop-bait dances where the final frame snaps back to frame 1 are driving rewatches and crossing into the viral tier.",
    signals: [
      { label: "structure: seamless final-to-first loop", strength: 0.78 },
      { label: "comment-bait: divisive typed question", strength: 0.7 },
    ],
    source: "stub",
  },
];

export const SYNTHETIC_GENERATIONS: GenerationRecord[] = [
  // ── Generation 1 — seed jail (weak engagement) ───────────────────────────
  {
    id: "gr_0001",
    generation_number: 1,
    created_at: "2026-06-07T09:10:00.000Z",
    trend_context_id: "tc_0001",
    concept: {
      id: "cc_0001",
      generation_number: 1,
      trend_context_id: "tc_0001",
      harness_state_version: "v0",
      hook: "A dancer walks in and eases into a slow two-step as the afrobeats edit builds.",
      format: "generic_choreo",
      angle: "Ride the rising sound with a clean, safe two-step.",
      script:
        "0:00 dancer enters frame, 0:02 'wait for it' caption, 0:04 two-step on the beat, 0:12 fades out on the last bar. No loop back to the top.",
      visual_prompt:
        "A two-step dance for dance-creators, vertical 9:16, plain studio, dancer centered, soft lighting. Scene reflects: a clean but safe two-step.",
      elements: ["generic_choreo", "trending_audio"],
      created_by: "shorts-generator",
      dance_style: "two-step",
      audio: { name: "Afrobeats Edit 142", bpm: 108, sound_recency: "rising", is_rising_sound: true },
      cut_frequency: 0.3,
      hashtag_set: ["#dance", "#fyp", "#afrobeats"],
      on_screen_text: "wait for it 👀",
      comment_bait_question: "",
      title: "trying this dance trend",
      description: "new dance ✨ #fyp",
    },
    score: {
      id: "rs_0001",
      concept_id: "cc_0001",
      generation_number: 1,
      harness_state_version: "v0",
      dimensions: legacyDims(48),
      weighted_total: 0.48,
      policy_flag: false,
      judge_rationale:
        "On-screen text is present (clears AF-02) but it is generic, not a polarizing question, so engagement_bait stalls at 8/20. The two-step is safe and there is no loop, capping retention. Lands in seed jail at 48.",
      total_score: 48,
      distribution_tier: "seed_jail",
      auto_fails_triggered: [],
      category_breakdown: {
        hook_quality: 12,
        retention_and_loop: 14,
        engagement_bait: 8,
        visual_production: 9,
        audio_alignment: 3,
        metadata: 2,
      },
      lowest_scoring_category: "engagement_bait",
      recommended_fix_priority: "Pose a polarizing typed question on screen to start a comment debate.",
      confidence: 0.62,
    },
    harness_state_version_before: "v0",
    harness_state_version_after: "v1",
    harness_diff: {
      id: "hd_0001",
      from_version: "v0",
      to_version: "v1",
      element_weight_changes: { typed_question: 0.1, generic_choreo: -0.1 },
      script_prompt_change: "Require one polarizing typed question on screen, not a generic caption.",
      rationale:
        "engagement_bait is the weakest category; bias toward a typed on-screen question and away from generic choreo.",
      accepted: true,
    },
    lesson: {
      id: "ls_0001",
      generation_number: 1,
      observation:
        "The clip had on-screen text but no polarizing question, so engagement_bait stalled at 8/20.",
      rule: "Always pose a divisive typed question the viewer wants to answer in the comments.",
      evidence: "Generation 1: engagement_bait 8/20, total 48 (seed jail).",
      harness_change: "Raise typed_question (+0.10), cut generic_choreo (-0.10).",
      expected_effect: "Later generations open a comment debate, lifting engagement_bait and the total.",
    },
  },

  // ── Generation 2 — climbing, still seed jail ─────────────────────────────
  {
    id: "gr_0002",
    generation_number: 2,
    created_at: "2026-06-07T09:14:00.000Z",
    trend_context_id: "tc_0001",
    concept: {
      id: "cc_0002",
      generation_number: 2,
      trend_context_id: "tc_0001",
      harness_state_version: "v1",
      hook: "Mirror transition: the dancer spins and the outfit swaps mid-spin.",
      format: "typed_question",
      angle: "Use a mirror transition and a divisive question to bait the comments.",
      script:
        "0:00 mid-spin, 0:01 'Is this harder than it looks?' caption, 0:03 mirror outfit swap, 0:13 ends on the same pose but not frame-matched.",
      visual_prompt:
        "A mirror-transition dance for dance-creators, vertical 9:16, high-contrast set, outfit swap mid-spin. Scene reflects: a mirror transition with a comment-bait question.",
      elements: ["typed_question", "trending_audio", "seamless_loop"],
      created_by: "shorts-generator",
      dance_style: "mirror transition",
      audio: { name: "Afrobeats Edit 142", bpm: 108, sound_recency: "rising", is_rising_sound: true },
      cut_frequency: 0.6,
      hashtag_set: ["#dance", "#dancechallenge", "#afrobeats", "#fyp"],
      on_screen_text: "Is this dance harder than it looks?",
      comment_bait_question: "Is this dance harder than it looks?",
      title: "is this dance harder than it looks?",
      description: "rate it 1-10 👇 #dancechallenge",
    },
    score: {
      id: "rs_0002",
      concept_id: "cc_0002",
      generation_number: 2,
      harness_state_version: "v1",
      dimensions: legacyDims(64),
      weighted_total: 0.64,
      policy_flag: false,
      judge_rationale:
        "The typed question lifts engagement and the mirror transition helps the hook, but the ending does not frame-match, so retention_and_loop lags at 15/25. One point short of growing at 64.",
      total_score: 64,
      distribution_tier: "seed_jail",
      auto_fails_triggered: [],
      category_breakdown: {
        hook_quality: 18,
        retention_and_loop: 15,
        engagement_bait: 13,
        visual_production: 11,
        audio_alignment: 4,
        metadata: 3,
      },
      lowest_scoring_category: "retention_and_loop",
      recommended_fix_priority: "Frame-match the final shot to frame 1 for a seamless loop and replays.",
      confidence: 0.68,
    },
    harness_state_version_before: "v1",
    harness_state_version_after: "v2",
    harness_diff: {
      id: "hd_0002",
      from_version: "v1",
      to_version: "v2",
      element_weight_changes: { seamless_loop: 0.1, trending_audio: 0.05, generic_choreo: -0.05 },
      script_prompt_change: "Make the final frame match frame 1 exactly so the clip loops.",
      rationale:
        "retention_and_loop is the weakest category; bias toward a seamless loop and reinforce the trending sound.",
      accepted: true,
    },
    lesson: {
      id: "ls_0002",
      generation_number: 2,
      observation: "The comment-bait question worked, but a non-matching final frame capped replays.",
      rule: "Match the last frame to the first so the Short loops without a visible seam.",
      evidence: "Generation 2: retention_and_loop 15/25, total 64 (one short of growing).",
      harness_change: "Raise seamless_loop (+0.10), trending_audio (+0.05); trim generic_choreo (-0.05).",
      expected_effect: "Seamless loops drive rewatches, pushing retention and the total into the growing tier.",
    },
  },

  // ── Generation 3 — AF-01 crater: standing start overrides total to 0 ─────
  {
    id: "gr_0003",
    generation_number: 3,
    created_at: "2026-06-07T09:18:00.000Z",
    trend_context_id: "tc_0002",
    concept: {
      id: "cc_0003",
      generation_number: 3,
      trend_context_id: "tc_0002",
      harness_state_version: "v2",
      hook: "Holds a dramatic pose for a full second to build tension, then explodes into a hard combo on the drop.",
      format: "seamless_loop",
      angle: "Build anticipation with a held pose, then pay it off on the beat drop.",
      script:
        "0:00 held pose (no motion), 0:01 beat drop, 0:01 'Which hits harder, the drop or the dancer?' caption, 0:02 fast combo, 0:14 frame-matched loop.",
      visual_prompt:
        "A hard-combo dance for dance-creators, vertical 9:16, high-contrast set, held opening pose then explosive combo. Scene reflects: a tension-building hold before the drop.",
      elements: ["seamless_loop", "trending_audio"],
      created_by: "shorts-generator",
      dance_style: "hard combo",
      audio: { name: "Afrobeats Edit 142", bpm: 108, sound_recency: "rising", is_rising_sound: true },
      cut_frequency: 0.8,
      hashtag_set: ["#dance", "#dancechallenge", "#afrobeats", "#fyp"],
      on_screen_text: "Which hits harder, the drop or the dancer?",
      comment_bait_question: "Which hits harder, the drop or the dancer?",
      title: "which hits harder?",
      description: "wait for the drop 🔥 #dancechallenge",
    },
    score: {
      id: "rs_0003",
      concept_id: "cc_0003",
      generation_number: 3,
      harness_state_version: "v2",
      dimensions: legacyDims(0),
      weighted_total: 0,
      policy_flag: false,
      judge_rationale:
        "Frame 1 holds a static pose for ~1s before any motion. AF-01 (Standing Start) triggers and the total is overridden to 0, voiding every category. The combo, loop, and audio were fine, but a static frame 1 kills swipe-past rate, so the video never earns distribution. Regenerate opening on peak motion.",
      total_score: 0,
      distribution_tier: "seed_jail",
      auto_fails_triggered: ["AF-01"],
      category_breakdown: {
        hook_quality: 0,
        retention_and_loop: 0,
        engagement_bait: 0,
        visual_production: 0,
        audio_alignment: 0,
        metadata: 0,
      },
      lowest_scoring_category: "hook_quality",
      recommended_fix_priority: "Open on peak motion in frame 1: no held poses, no build-up.",
      confidence: 0.95,
      winning_elements: [],
      weak_elements: [],
      suggested_policy_updates: { peak_motion_frame1: 0.1 },
    },
    harness_state_version_before: "v2",
    harness_state_version_after: "v3",
    harness_diff: {
      id: "hd_0003",
      from_version: "v2",
      to_version: "v3",
      element_weight_changes: { peak_motion_frame1: 0.15, generic_choreo: -0.05 },
      script_prompt_change: "Frame 1 must be peak motion. Forbid any held pose or build-up before the first beat.",
      rationale:
        "AF-01 zeroed an otherwise strong concept. Heavily bias peak_motion_frame1 so the opening never holds a static pose again.",
      accepted: true,
    },
    lesson: {
      id: "ls_0003",
      generation_number: 3,
      observation:
        "A 1-second held pose before the drop tripped AF-01 and overrode the total to 0, wasting an otherwise strong concept.",
      rule: "Never open on a static or held frame; frame 1 must be peak motion with no build-up.",
      evidence: "Generation 3: AF-01 triggered, total 0 (seed jail), all categories voided.",
      harness_change: "Raise peak_motion_frame1 (+0.15) and cut generic_choreo (-0.05).",
      expected_effect: "The opening frame is always mid-motion, clearing AF-01 so the rubric can score the video.",
    },
  },

  // ── Generation 4 — recovery into growing ─────────────────────────────────
  {
    id: "gr_0004",
    generation_number: 4,
    created_at: "2026-06-07T09:22:00.000Z",
    trend_context_id: "tc_0002",
    concept: {
      id: "cc_0004",
      generation_number: 4,
      trend_context_id: "tc_0002",
      harness_state_version: "v3",
      hook: "Frame 1 is already mid-spin at peak motion, no build-up; the combo lands on every beat.",
      format: "peak_motion_frame1",
      angle: "Open at peak motion, dare the viewer to keep up, loop the last beat to the first.",
      script:
        "0:00 mid-spin (peak motion), 0:01 'Could you keep up past the 5-second mark?' caption, 0:02 combo, 0:14 final frame matches frame 1.",
      visual_prompt:
        "A high-energy combo dance for dance-creators, vertical 9:16, high-contrast set, dancer isolated, opens mid-spin. Scene reflects: peak-motion open with a keep-up challenge.",
      elements: ["peak_motion_frame1", "typed_question", "seamless_loop", "trending_audio"],
      created_by: "shorts-generator",
      dance_style: "high-energy combo",
      audio: { name: "Afrobeats Edit 142", bpm: 112, sound_recency: "rising", is_rising_sound: true },
      cut_frequency: 1.1,
      hashtag_set: ["#dancechallenge", "#dance", "#afrobeats", "#shorts", "#fyp", "#viraldance"],
      on_screen_text: "Could you keep up past the 5-second mark?",
      comment_bait_question: "Could you keep up past the 5-second mark?",
      title: "could you keep up?",
      description: "try it and tag me 👇 #dancechallenge #afrobeats",
    },
    score: {
      id: "rs_0004",
      concept_id: "cc_0004",
      generation_number: 4,
      harness_state_version: "v3",
      dimensions: legacyDims(79),
      weighted_total: 0.79,
      policy_flag: false,
      judge_rationale:
        "Peak-motion frame 1 clears AF-01, the keep-up question drives engagement, and the loop is clean. Metadata is the laggard: the title does not mirror the on-screen question. Recovers strongly into growing at 79.",
      total_score: 79,
      distribution_tier: "growing",
      auto_fails_triggered: [],
      category_breakdown: {
        hook_quality: 24,
        retention_and_loop: 20,
        engagement_bait: 16,
        visual_production: 12,
        audio_alignment: 4,
        metadata: 3,
      },
      lowest_scoring_category: "metadata",
      recommended_fix_priority: "Mirror the on-screen question in the title; use a 3-niche / 4-broad / 3-audio hashtag mix.",
      confidence: 0.81,
      winning_elements: ["peak_motion_frame1", "typed_question"],
      weak_elements: ["generic_choreo"],
      suggested_policy_updates: { typed_question: 0.1, peak_motion_frame1: 0.05, generic_choreo: -0.05 },
    },
    harness_state_version_before: "v3",
    harness_state_version_after: "v4",
    harness_diff: {
      id: "hd_0004",
      from_version: "v3",
      to_version: "v4",
      element_weight_changes: { typed_question: 0.1, seamless_loop: 0.05, generic_choreo: -0.05 },
      script_prompt_change: "Mirror the on-screen question in the title and balance the hashtag mix.",
      rationale: "Peak-motion open recovered the run; reinforce the question and loop, and fix metadata next.",
      accepted: true,
    },
    lesson: {
      id: "ls_0004",
      generation_number: 4,
      observation: "Once the opening was peak motion, the same concept jumped from 0 to growing.",
      rule: "Peak-motion frame 1 is the gate; everything else only scores once AF-01 is cleared.",
      evidence: "Generation 4: AF-01 cleared, total 79 (growing), metadata 3/5 the laggard.",
      harness_change: "Raise typed_question (+0.10) and seamless_loop (+0.05); trim generic_choreo (-0.05).",
      expected_effect: "Stronger questions and loops, with metadata fixed next, push the total into viral.",
    },
  },

  // ── Generation 5 — viral peak ────────────────────────────────────────────
  {
    id: "gr_0005",
    generation_number: 5,
    created_at: "2026-06-07T09:26:00.000Z",
    trend_context_id: "tc_0002",
    concept: {
      id: "cc_0005",
      generation_number: 5,
      trend_context_id: "tc_0002",
      harness_state_version: "v4",
      hook: "Frame 1 explodes mid-air; the final frame snaps back to it for a perfect, invisible loop.",
      format: "peak_motion_frame1",
      angle: "Peak-motion open, a question people argue about, a seamless loop, in a reflective outfit.",
      script:
        "0:00 aerial peak motion, 0:01 'Rewatching to learn it, or to win the argument?' caption, 0:02 combo with fast cuts, 0:14 last frame == frame 1.",
      visual_prompt:
        "An aerial-combo dance for dance-creators, vertical 9:16, high-contrast set, dancer isolated, reflective outfit, clean 4K. Scene reflects: an explosive peak-motion open that loops invisibly.",
      elements: ["peak_motion_frame1", "typed_question", "seamless_loop", "trending_audio", "reflective_outfit"],
      created_by: "shorts-generator",
      dance_style: "aerial combo",
      audio: { name: "Afrobeats Edit 142 (sped up)", bpm: 116, sound_recency: "rising", is_rising_sound: true },
      cut_frequency: 1.3,
      hashtag_set: ["#dancechallenge", "#aerialdance", "#afrobeats", "#shorts", "#fyp", "#viraldance", "#dance"],
      on_screen_text: "Rewatching to learn it, or to win the argument?",
      comment_bait_question: "Rewatching to learn it, or to win the argument?",
      title: "rewatching to learn it or to win the argument?",
      description: "settle it in the comments 👇 #dancechallenge #afrobeats #shorts",
    },
    score: {
      id: "rs_0005",
      concept_id: "cc_0005",
      generation_number: 5,
      harness_state_version: "v4",
      dimensions: legacyDims(90),
      weighted_total: 0.9,
      policy_flag: false,
      judge_rationale:
        "Peak-motion open, an invisible loop, a genuinely divisive question, a reflective outfit on a clean 4K render, and metadata that mirrors the hook. Every category is near-max. Clears viral at 90.",
      total_score: 90,
      distribution_tier: "viral",
      auto_fails_triggered: [],
      category_breakdown: {
        hook_quality: 27,
        retention_and_loop: 22,
        engagement_bait: 18,
        visual_production: 14,
        audio_alignment: 5,
        metadata: 4,
      },
      lowest_scoring_category: "metadata",
      recommended_fix_priority: "Marginal: tighten the description CTA to a single clear ask.",
      confidence: 0.9,
      winning_elements: ["peak_motion_frame1", "typed_question", "seamless_loop"],
      weak_elements: [],
      suggested_policy_updates: { peak_motion_frame1: 0.1, reflective_outfit: 0.05 },
    },
    harness_state_version_before: "v4",
    harness_state_version_after: "v5",
    harness_diff: {
      id: "hd_0005",
      from_version: "v4",
      to_version: "v5",
      element_weight_changes: { peak_motion_frame1: 0.1, reflective_outfit: 0.05 },
      script_prompt_change: "Lock the peak-motion open and add a reflective outfit for visual production points.",
      rationale: "The peak-motion + loop + question formula went viral; reinforce the opening and the outfit.",
      accepted: true,
    },
    lesson: {
      id: "ls_0005",
      generation_number: 5,
      observation: "Peak-motion open + invisible loop + a divisive question + reflective outfit cleared the viral tier.",
      rule: "Stack the formula: peak-motion frame 1, a seamless loop, one argument-starting question, a reflective outfit.",
      evidence: "Generation 5: total 90 (viral), every category near-max, confidence 0.90.",
      harness_change: "Raise peak_motion_frame1 (+0.10) and reflective_outfit (+0.05).",
      expected_effect: "Generations converge on the viral formula and hold the total above 85.",
    },
  },
];
