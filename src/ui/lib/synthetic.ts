import type { GenerationRecord, HarnessState, TrendContext } from "./contracts";

/**
 * Synthetic demo data — a believable 5-generation arc of AI-generated YouTube
 * Shorts dance videos, scored by ACOE-YT-SHORTS-v2.0. Drives the dashboard while
 * the real loop is unbuilt; keep the `GenerationRecord[]` seam.
 *
 * The arc: total_score 48 → 64 → 0 (AF-01 standing-start crater) → 79 → 90.
 * Under v2 the two climb levers are a rising / early-adopter sound (audio_alignment,
 * now 15 pts) and delayed resolution (retention_and_loop, RL-04); overt engagement
 * bait is capped at 10. Gen 1 picks a saturated sound; gen 2 nails the rising sound
 * but resolves too early; gen 3 adds delayed resolution yet a held opening pose
 * craters on AF-01; gens 4–5 clear the gate (peak motion) and the rising-sound +
 * delayed-payoff formula carries the run from seed_jail to viral.
 */

export const INITIAL_HARNESS_STATE: HarnessState = {
  id: "hs_0001",
  version: "v0",
  element_weights: {
    peak_motion_frame1: 0.4,
    seamless_loop: 0.35,
    delayed_resolution: 0.25,
    typed_question: 0.3,
    trending_audio: 0.45,
    reflective_outfit: 0.2,
    generic_choreo: 0.3,
  },
  script_prompt:
    "Generate a 13–15s vertical dance Short for YouTube Shorts. Open on peak motion in frame 1 (no build-up), ride a rising / early-lifecycle trending sound (never a saturated one), promise a payoff in the first 2 seconds via a typed question and withhold it until the final beats (delayed resolution), then make the final frame loop seamlessly back to the first.",
  seedance_prompt_template:
    "A {{dance_style}} dance for {{audience}}, vertical 9:16, high-contrast set, dancer isolated, reflective outfit, clean 4K render with no AI artifacts. Frame 1 at peak motion. Scene reflects: {{angle}}.",
  judge_rubric:
    "ACOE-YT-SHORTS-v2.0: score hook_quality (30), retention_and_loop (25), engagement_bait (10), visual_production (15), audio_alignment (15), metadata (5) out of 100; map to a distribution tier (viral 85+, growing 65+, seed_jail <65); apply hard auto-fails AF-01..05. See data/policies/ACOE-YT-SHORTS-v2.0.json.",
  policy_rules: [
    "AF-01: frame 1 must be peak motion, never a static or held pose.",
    "AF-02: on-screen text must appear within the first 2 seconds.",
    "AF-03: total duration must be 13–20 seconds.",
    "AF-04: audio must come from the approved trending pool.",
    "AF-05: no brand-safety violations (explicit or unsafe content); total overridden to 0.",
  ],
  rubric_version: "ACOE-YT-SHORTS-v2.0",
};

export const TREND_CONTEXTS: TrendContext[] = [
  {
    id: "tc_0001",
    captured_at: "2026-06-07T09:00:00.000Z",
    platform: "youtube",
    audience: "dance-creators",
    trend_summary:
      "Dances that ride a rising afrobeats edit before it saturates — opening mid-spin on a high-contrast set — are over-indexing on swipe-past rate; saturated sounds get buried.",
    signals: [
      { label: "sound: rising afrobeats edit (early-adopter)", strength: 0.86, note: "saturated sounds get buried" },
      { label: "open: peak motion, no build-up", strength: 0.82, note: "static frame 1 is auto-failed" },
      { label: "format: typed on-screen question", strength: 0.62, note: "overt bait now capped" },
    ],
    source: "stub",
  },
  {
    id: "tc_0002",
    captured_at: "2026-06-07T09:05:00.000Z",
    platform: "youtube",
    audience: "dance-creators",
    trend_summary:
      "Delayed-resolution dances — promise a payoff up front, withhold it until the final beat, then snap the last frame back to the first — are driving rewatches and crossing into the viral tier.",
    signals: [
      { label: "structure: delayed resolution (payoff withheld to ~0:12)", strength: 0.8 },
      { label: "structure: seamless final-to-first loop", strength: 0.74 },
      { label: "comment-bait: divisive typed question", strength: 0.62, note: "overt bait now capped" },
    ],
    source: "stub",
  },
];

export const SYNTHETIC_GENERATIONS: GenerationRecord[] = [
  // ── Generation 1 — seed jail (saturated sound, early payoff) ──────────────
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
      hook: "A dancer eases into a slow two-step as a familiar afrobeats edit plays under it.",
      format: "generic_choreo",
      angle: "Ride a known sound with a clean, safe two-step.",
      script:
        "0:00 dancer enters mid-step, 0:02 'wait for it' caption, 0:04 the two-step peaks early, 0:12 fades out on the last bar. The best move lands early and there is no loop.",
      visual_prompt:
        "A two-step dance for dance-creators, vertical 9:16, plain studio, dancer centered, soft lighting. Scene reflects: a clean but safe two-step on a familiar sound.",
      elements: ["generic_choreo", "trending_audio"],
      created_by: "shorts-generator",
      dance_style: "two-step",
      audio: { name: "Afrobeats Edit 142", bpm: 108, sound_recency: "established", is_rising_sound: false },
      cut_frequency: 0.3,
      execution: { hashtag_set: ["#dance", "#fyp", "#afrobeats"] },
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
      weighted_total: 0.48,
      policy_flag: false,
      judge_rationale:
        "On-screen text clears AF-02 and the two-step is clean, but the sound is already saturated — past its rising window — so audio_alignment, now the biggest lever, stalls at 5/15. The best move also lands early with no payoff withheld, capping retention. Seed jail at 48.",
      total_score: 48,
      distribution_tier: "seed_jail",
      auto_fails_triggered: [],
      category_breakdown: {
        hook_quality: 14,
        retention_and_loop: 10,
        engagement_bait: 5,
        visual_production: 11,
        audio_alignment: 5,
        metadata: 3,
      },
      lowest_scoring_category: "audio_alignment",
      recommended_fix_priority: "Pick a rising / early-adopter sound before it saturates — audio alignment is the top v2 lever.",
      confidence: 0.62,
    },
    harness_state_version_before: "v0",
    harness_state_version_after: "v1",
    harness_diff: {
      id: "hd_0001",
      from_version: "v0",
      to_version: "v1",
      element_weight_changes: { trending_audio: 0.15, generic_choreo: -0.1 },
      script_prompt_change: "Require a rising / early-lifecycle sound, never an established or saturated one.",
      rationale:
        "audio_alignment is the weakest category and the biggest v2 lever; bias hard toward a rising sound.",
      accepted: true,
    },
    lesson: {
      id: "ls_0001",
      generation_number: 1,
      observation:
        "The clip used an established sound past its rising window, so audio_alignment stalled at 5/15.",
      rule: "Always ride a rising / early-adopter sound; a saturated sound caps distribution under v2.",
      evidence: "Generation 1: audio_alignment 5/15, total 48 (seed jail).",
      harness_change: "Raise trending_audio (+0.15), cut generic_choreo (-0.10).",
      expected_effect: "Later generations ride a rising sound, lifting audio_alignment and the total.",
    },
  },

  // ── Generation 2 — climbing, still seed jail (payoff too early) ───────────
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
      hook: "Mirror transition on a rising afrobeats edit: the dancer spins and the outfit swaps mid-spin.",
      format: "typed_question",
      angle: "Ride the rising sound and bait the comments with a divisive question.",
      script:
        "0:00 mid-spin, 0:01 'Is this harder than it looks?' caption, 0:03 the outfit-swap payoff lands immediately, 0:13 ends on a similar pose. The reveal comes too early and the final frame isn't matched.",
      visual_prompt:
        "A mirror-transition dance for dance-creators, vertical 9:16, high-contrast set, outfit swap mid-spin. Scene reflects: a mirror transition on a rising sound with a comment-bait question.",
      elements: ["typed_question", "trending_audio", "seamless_loop"],
      created_by: "shorts-generator",
      dance_style: "mirror transition",
      audio: { name: "Afrobeats Edit 142", bpm: 108, sound_recency: "rising", is_rising_sound: true },
      cut_frequency: 0.6,
      execution: { hashtag_set: ["#dance", "#dancechallenge", "#afrobeats", "#fyp"] },
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
      weighted_total: 0.64,
      policy_flag: false,
      judge_rationale:
        "The rising sound lands (audio 12/15) and the typed question helps, but the outfit-swap payoff arrives in the first seconds with nothing withheld, and the final frame isn't matched — so retention_and_loop lags at 11/25. One short of growing at 64.",
      total_score: 64,
      distribution_tier: "seed_jail",
      auto_fails_triggered: [],
      category_breakdown: {
        hook_quality: 18,
        retention_and_loop: 11,
        engagement_bait: 7,
        visual_production: 12,
        audio_alignment: 12,
        metadata: 4,
      },
      lowest_scoring_category: "retention_and_loop",
      recommended_fix_priority: "Withhold the payoff until the final ~15% (delayed resolution) so viewers stay to the end.",
      confidence: 0.68,
    },
    harness_state_version_before: "v1",
    harness_state_version_after: "v2",
    harness_diff: {
      id: "hd_0002",
      from_version: "v1",
      to_version: "v2",
      element_weight_changes: { delayed_resolution: 0.2, seamless_loop: 0.05, generic_choreo: -0.05 },
      script_prompt_change: "Promise the payoff in the first 2s but withhold it until the final beats (delayed resolution); frame-match the last shot to the first.",
      rationale:
        "retention_and_loop is the weakest category; bias delayed resolution so the payoff is withheld and viewers watch to the end.",
      accepted: true,
    },
    lesson: {
      id: "ls_0002",
      generation_number: 2,
      observation: "On a rising sound, but the payoff came too early and the loop wasn't matched, so retention stalled at 11/25.",
      rule: "Promise the payoff up front, then withhold it until the final ~15% (delayed resolution); match the last frame to the first.",
      evidence: "Generation 2: retention_and_loop 11/25, total 64 (one short of growing).",
      harness_change: "Raise delayed_resolution (+0.20), seamless_loop (+0.05); trim generic_choreo (-0.05).",
      expected_effect: "A withheld payoff drives rewatches, pushing retention into the growing tier.",
    },
  },

  // ── Generation 3 — AF-01 crater: held opening pose overrides total to 0 ───
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
      hook: "Holds a dramatic pose for a full second to build tension, then explodes into a hard combo on the drop — withholding the payoff.",
      format: "delayed_resolution",
      angle: "Build anticipation with a held pose, withhold the payoff to the drop.",
      script:
        "0:00 held pose (no motion), 0:01 beat drop, 0:01 'Which hits harder, the drop or the dancer?' caption, 0:02 fast combo, 0:13 the withheld payoff lands, 0:14 frame-matched loop.",
      visual_prompt:
        "A hard-combo dance for dance-creators, vertical 9:16, high-contrast set, held opening pose then explosive combo. Scene reflects: a tension-building hold before a withheld payoff.",
      elements: ["delayed_resolution", "seamless_loop", "trending_audio"],
      created_by: "shorts-generator",
      dance_style: "hard combo",
      audio: { name: "Afrobeats Edit 142", bpm: 108, sound_recency: "rising", is_rising_sound: true },
      cut_frequency: 0.8,
      execution: { hashtag_set: ["#dance", "#dancechallenge", "#afrobeats", "#fyp"] },
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
      weighted_total: 0,
      policy_flag: false,
      judge_rationale:
        "Frame 1 holds a static pose for ~1s to build tension before the withheld payoff. AF-01 (Standing Start) triggers and the total is overridden to 0, voiding every category. The rising sound and delayed resolution were exactly right, but a static frame 1 kills swipe-past rate, so the video never earns distribution. Regenerate opening on peak motion.",
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
      script_prompt_change: "Frame 1 must be peak motion. Forbid any held pose or build-up before the first beat — even to set up a delayed payoff.",
      rationale:
        "AF-01 zeroed an otherwise strong concept (rising sound + delayed resolution intact). Heavily bias peak_motion_frame1 so the opening never holds a static pose again.",
      accepted: true,
    },
    lesson: {
      id: "ls_0003",
      generation_number: 3,
      observation:
        "A 1-second held pose set up the delayed payoff but tripped AF-01, overriding the total to 0 and wasting a rising-sound + withheld-payoff concept.",
      rule: "Never open on a static or held frame; frame 1 must be peak motion — delay the payoff without holding the opening.",
      evidence: "Generation 3: AF-01 triggered, total 0 (seed jail), all categories voided.",
      harness_change: "Raise peak_motion_frame1 (+0.15) and cut generic_choreo (-0.05).",
      expected_effect: "The opening frame is always mid-motion, clearing AF-01 so the rubric can score the rising-sound + delayed-payoff formula.",
    },
  },

  // ── Generation 4 — recovery into growing (metadata laggard) ───────────────
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
      hook: "Frame 1 is already mid-spin at peak motion, no build-up; the payoff is withheld to the final beat and the combo lands on every cut.",
      format: "peak_motion_frame1",
      angle: "Open at peak motion on a rising sound, withhold the payoff, loop the last beat to the first.",
      script:
        "0:00 mid-spin (peak motion), 0:01 'Could you keep up past the 5-second mark?' caption, 0:02 combo, 0:13 the withheld payoff lands, 0:14 final frame matches frame 1.",
      visual_prompt:
        "A high-energy combo dance for dance-creators, vertical 9:16, high-contrast set, dancer isolated, opens mid-spin. Scene reflects: peak-motion open on a rising sound with a withheld payoff.",
      elements: ["peak_motion_frame1", "delayed_resolution", "typed_question", "seamless_loop", "trending_audio"],
      created_by: "shorts-generator",
      dance_style: "high-energy combo",
      audio: { name: "Afrobeats Edit 142", bpm: 112, sound_recency: "rising", is_rising_sound: true },
      cut_frequency: 1.1,
      execution: { hashtag_set: ["#dancechallenge", "#dance", "#afrobeats", "#shorts", "#fyp", "#viraldance"] },
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
      weighted_total: 0.79,
      policy_flag: false,
      judge_rationale:
        "Peak-motion frame 1 clears AF-01; the rising sound (audio 13/15) and the withheld payoff (retention 20/25) both land, and the keep-up question drives engagement to its v2 cap. Metadata is the laggard — the title does not mirror the on-screen hook. Recovers strongly into growing at 79.",
      total_score: 79,
      distribution_tier: "growing",
      auto_fails_triggered: [],
      category_breakdown: {
        hook_quality: 23,
        retention_and_loop: 20,
        engagement_bait: 8,
        visual_production: 12,
        audio_alignment: 13,
        metadata: 3,
      },
      lowest_scoring_category: "metadata",
      recommended_fix_priority: "Mirror the on-screen hook in the title; use a 3-niche / 4-broad / 3-audio hashtag mix.",
      confidence: 0.81,
      winning_elements: ["peak_motion_frame1", "delayed_resolution", "trending_audio"],
      weak_elements: ["generic_choreo"],
      suggested_policy_updates: { delayed_resolution: 0.05, trending_audio: 0.05, generic_choreo: -0.05 },
    },
    harness_state_version_before: "v3",
    harness_state_version_after: "v4",
    harness_diff: {
      id: "hd_0004",
      from_version: "v3",
      to_version: "v4",
      element_weight_changes: { delayed_resolution: 0.05, trending_audio: 0.05, generic_choreo: -0.05 },
      script_prompt_change: "Mirror the on-screen hook in the title and balance the hashtag mix (3 niche / 4 broad / 3 audio).",
      rationale: "Peak-motion open recovered the run; reinforce the rising sound and delayed payoff, and fix metadata next.",
      accepted: true,
    },
    lesson: {
      id: "ls_0004",
      generation_number: 4,
      observation: "Once the opening was peak motion, the rising sound + withheld payoff carried the same concept from 0 to growing; metadata lagged.",
      rule: "Peak-motion frame 1 is the gate; once it's cleared, the rising sound and delayed payoff do the scoring — then fix metadata.",
      evidence: "Generation 4: AF-01 cleared, total 79 (growing), metadata 3/5 the laggard.",
      harness_change: "Raise delayed_resolution (+0.05) and trending_audio (+0.05); trim generic_choreo (-0.05).",
      expected_effect: "Mirrored metadata plus the rising-sound + delayed-payoff formula pushes the total into viral.",
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
      hook: "Frame 1 explodes mid-air on a rising sound; the payoff is withheld to the last beat, and the final frame snaps back to it for a perfect, invisible loop.",
      format: "peak_motion_frame1",
      angle: "Peak-motion open on a rising sound, a withheld payoff, a question people argue about, a seamless loop, in a reflective outfit.",
      script:
        "0:00 aerial peak motion, 0:01 'Rewatching to learn it, or to win the argument?' caption, 0:02 combo with fast cuts, 0:13 the withheld payoff lands, 0:14 last frame == frame 1.",
      visual_prompt:
        "An aerial-combo dance for dance-creators, vertical 9:16, high-contrast set, dancer isolated, reflective outfit, clean 4K. Scene reflects: an explosive peak-motion open on a rising sound that withholds its payoff and loops invisibly.",
      elements: ["peak_motion_frame1", "delayed_resolution", "typed_question", "seamless_loop", "trending_audio", "reflective_outfit"],
      created_by: "shorts-generator",
      dance_style: "aerial combo",
      audio: { name: "Afrobeats Edit 142 (sped up)", bpm: 116, sound_recency: "rising", is_rising_sound: true },
      cut_frequency: 1.3,
      execution: { hashtag_set: ["#dancechallenge", "#aerialdance", "#afrobeats", "#shorts", "#fyp", "#viraldance", "#dance"] },
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
      weighted_total: 0.9,
      policy_flag: false,
      judge_rationale:
        "Peak-motion open, a maxed rising sound (audio 15/15), a withheld payoff that loops invisibly, a genuinely divisive question, and metadata that mirrors the hook. Every category is near-max. Clears viral at 90.",
      total_score: 90,
      distribution_tier: "viral",
      auto_fails_triggered: [],
      category_breakdown: {
        hook_quality: 27,
        retention_and_loop: 22,
        engagement_bait: 9,
        visual_production: 13,
        audio_alignment: 15,
        metadata: 4,
      },
      lowest_scoring_category: "metadata",
      recommended_fix_priority: "Marginal: tighten the description CTA to a single clear ask.",
      confidence: 0.9,
      winning_elements: ["peak_motion_frame1", "delayed_resolution", "trending_audio", "seamless_loop"],
      weak_elements: [],
      suggested_policy_updates: { peak_motion_frame1: 0.1, reflective_outfit: 0.05 },
    },
    harness_state_version_before: "v4",
    harness_state_version_after: "v5",
    harness_diff: {
      id: "hd_0005",
      from_version: "v4",
      to_version: "v5",
      element_weight_changes: { peak_motion_frame1: 0.1, delayed_resolution: 0.05, reflective_outfit: 0.05 },
      script_prompt_change: "Lock the peak-motion open and the withheld payoff; add a reflective outfit for visual-production points.",
      rationale: "The rising-sound + delayed-payoff + peak-motion formula went viral; reinforce the opening, the withheld payoff, and the outfit.",
      accepted: true,
    },
    lesson: {
      id: "ls_0005",
      generation_number: 5,
      observation: "Peak-motion open + rising sound + withheld payoff + invisible loop + a divisive question cleared the viral tier.",
      rule: "Stack the v2 formula: peak-motion frame 1, a rising sound, a delayed payoff withheld to the final beat, a seamless loop, one argument-starting question.",
      evidence: "Generation 5: total 90 (viral), audio 15/15, every category near-max, confidence 0.90.",
      harness_change: "Raise peak_motion_frame1 (+0.10), delayed_resolution (+0.05) and reflective_outfit (+0.05).",
      expected_effect: "Generations converge on the viral formula and hold the total above 85.",
    },
  },
];
