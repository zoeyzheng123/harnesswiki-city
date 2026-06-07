# Design

Visual system for the HarnessWiki City dashboard. PRODUCT.md owns the strategy
(who/what/why); this file owns how it looks. Tokens are authored in
`src/ui/styles/theme.css` as a Tailwind v4 `@theme` block; the values below are
canonical and that file mirrors them.

## Theme

A dark control room with sensory instrumentation. The physical scene is a dim
demo room with a glowing instrument panel: the surface recedes to near-black so
the signal lights (the cobalt score curve, the cyan accents, the city role hues,
the video evidence) carry every emotion. Strategy is **full-palette on a
dark environmental base** — the dark IS the brand, the saturated roles are
deliberate and few.

The interface should feel like a living instrument, not a wall of analytics:
the loop is spatial, the harness weights behave like faders, and each generation
reads as an evidence artifact with receipts on demand.

The Town-inspired rule: borrow ambient state grammar, not the skin. Buildings
hold process state, windows encode recent generations, bubbles mark attention,
and rooms expose receipts. Do not copy pixel art, western motifs, or game UI.

Mood anchor (impeccable brand seed `seed-077`): *"pre-dawn signal tower — cold
blue solitude, instruments glowing against the dark."*

## Color

All values OKLCH. Body text clears 7:1 against `--bg`; muted clears 3.5:1.

### Surfaces & text
| Token | OKLCH | Role |
|---|---|---|
| `--bg` | `oklch(0.13 0.018 250)` | App background, the dark room |
| `--surface-0` | `oklch(0.16 0.020 250)` | Panels, the hero card |
| `--surface-1` | `oklch(0.20 0.022 250)` | Raised rows, hover, the drawer |
| `--line` | `oklch(0.28 0.020 250)` | Hairline borders, grid lines |
| `--ink` | `oklch(0.96 0.008 240)` | Primary text |
| `--muted` | `oklch(0.72 0.015 240)` | Secondary text, axis labels |

### Brand signals
| Token | OKLCH | Role |
|---|---|---|
| `--primary` | `oklch(0.64 0.150 242)` | Cobalt. The hero `total_score` curve (stroked via `--color-primary-bright`), primary actions |
| `--accent` | `oklch(0.82 0.130 200)` | Frost cyan. Reserved for the Stage-3 relative series (Bradley-Terry win-prob), not live yet; secondary indicator |

`--primary` vs `--accent` differ in both hue (242 vs 200) and lightness
(0.64 vs 0.82); when the relative line lands, that gap is what keeps the two
curve series from reading as one. Today the hero is a single series, so the
contrast is held in reserve. Text on either fill is near-white (`--ink`), per the
saturated-fill rule.

### City role hues
| Token | OKLCH | Role |
|---|---|---|
| `--scout` | `oklch(0.80 0.13 195)` | Trend Scout (scan / signal) |
| `--generator` | `oklch(0.70 0.15 285)` | Content Generator (creative) |
| `--critic` | `oklch(0.80 0.14 85)` | Reward Critic (judging) |
| `--meta` | `oklch(0.72 0.17 330)` | Meta-Agent (mutation / rewrite) |
| `--memory` | `oklch(0.78 0.12 170)` | Memory Archive (wiki / lessons) |

Distinct hues at matched lightness so they read as siblings in one city. Each
holds near-white text on a filled chip.

### Semantics (never hue-only — always paired with sign or direction)
| Token | OKLCH | Role |
|---|---|---|
| `--positive` | `oklch(0.80 0.17 150)` | Weight up, score climb, accepted diff |
| `--negative` | `oklch(0.68 0.16 25)` | Weight down |
| `--flag` | `oklch(0.72 0.19 35)` | `policy_flag`, rejected diff alarm |

Risk dimensions (`cringe_risk`, `policy_risk`) render in `--negative` / `--flag`
with a penalty treatment so they never look like a "good" high score.

## Typography

Three families on a contrast axis (display grotesk vs neutral sans vs mono),
loaded from Google Fonts / Fontsource.

- **Display** — *Space Grotesk*. Section titles, the hero label, district names.
  Characterful and technical. Letter-spacing ≥ -0.02em; clamp max ≤ 3.5rem.
- **Body / UI** — *Inter*. Labels, prose, table text. Cap measure at 70ch.
- **Data / mono** — *JetBrains Mono*. Every number: metrics, weights, deltas,
  win probabilities, version tags. The mono is what sells the instrument feel;
  use `font-variant-numeric: tabular-nums` so digits don't jitter on count-up.

Hierarchy by scale + weight, ratio ≥ 1.25 between steps. No all-caps body; short
mono labels (≤ 4 words) may use tracked small caps for the telemetry register.
`text-wrap: balance` on h1–h3.

## Components

- **City Wiki control deck** — first major dashboard section: a spatial city map
  plus a readable Memory Archive. It is the high-level index for the loop.
- **City building node** — abstract instrument architecture for Trend Tower,
  Concept Studio, Critic Court, Meta Workshop, and Memory Archive. Each building
  has state windows and optional attention bubbles.
- **State window** — a small illuminated slot representing recent generations or
  lineage positions. States: standby, active, OK, review, flag, refused.
- **Attention bubble** — a compact, clickable state callout (`!`, `↯`, `?`, `OK`,
  `+`) for flags, refused diffs, review-worthy lessons, stored lessons, and new
  concepts. Bubbles open receipts; they are not chat.
- **Wiki lesson artifact** — a readable archive card with score stamp, tier,
  lint/refusal/review badge, wikilink element chips, evidence, harness change,
  expected effect, and a deterministic inspect action.
- **Hero curve** — a single dark card holding a single `total_score` (0–100) SVG
  line plus tier bands, with dashed growing (65) and viral (85) threshold lines on
  the 0–100 axis (not a 0..1 baseline) and the headline score count-up. The
  signature object. A second RELATIVE series (Bradley-Terry win-prob) is a deferred
  Stage-3 add, not shipped today. That deferred series ties to DECISIONS D18
  (absolute 0–100 = display vs preference = learning) and
  `docs/DASHBOARD_MIGRATION.md` "Display-layer viz upgrades"; mind the dual-axis
  caution: a 0..1 line plotted on the 0–100 axis is misleading, so prefer a
  separate track (or a candidate-batch relative encoding), NOT a second hero line.
- **Weight fader** — a read-only vertical rail with tick marks, a tactile knob,
  a mono value, and accepted/refused delta treatments. The harness is visually
  "moving its own controls"; users do not edit weights in the MVP.
- **Generation artifact / table** — compact evidence rows with a score stamp,
  hook, critic signal, rewrite state, and delta. Opens the detail drawer.
- **Video evidence** — baseline/current/best generated clips are promoted as the
  human proof layer, with score delta and tier movement between them.
- **Detail drawer** — right-side panel: concept, the six ACOE v2 categories
  (`category_breakdown`), the diff with an ACCEPTED / REJECTED badge, the five-part lesson.
- **Lesson card** — five labeled fields (observation, rule, evidence, change,
  expected effect), the change field tinted `--positive`.
- **Memory Archive room** — the canonical **building-room** pattern: a
  full-height right drawer (`min(920px, 92vw)`) opened from the Memory Archive
  building, its attention bubbles, or the deck's wiki teaser. It presents living
  memory spatially in four rails and is read-only, deterministic, and built only
  from existing contract fields (`memoryArchive()` in `lib/archive.ts`, the one
  home for the lesson vocabulary the deck teaser and the room both read). Other
  building rooms reuse this shell. Its parts:
  - **Archive windows** (left) — one illuminated slot per revealed generation
    (g1…revealed), toned by lint state (stored / review / flag / refused / empty);
    a vertical stack on desktop, a horizontal strip on narrow screens. Selecting
    a window swaps the belief in view.
  - **Wiki artifact** (center) — the selected belief as a stamped archival folder:
    score stamp, tier, lint state, the lesson **rule as the title**, `[[wikilink]]`
    element chips, and four inspect regions (evidence/score, harness change,
    lineage, expected effect). A **refused** belief headlines `Refused` (refused
    wins over the policy flag that caused it), surfaces the flag as the cause, and
    renders its proposed weights struck/dimmed as *proposed, not applied* —
    "held vX". Earlier beliefs stack below as compact folders.
  - **Element index** (right) — the elements the belief touches, the re-weighted
    ones marked by signed delta; rows cross-light with the artifact's wikilink
    chips.
  - **Belief graph** (right) — a quiet, fully deterministic schematic (no force
    sim): lesson → the element weights it moved → the targeted
    `lowest_scoring_category` + realized lift, drawn with thin `.belief-edge`
    lines. A refused belief's weight nodes are dashed and the outcome reads
    "held vX — score not chased".
  - **Quick inspect** (bottom) — deterministic buttons (Why score moved · Show
    diff · Show lesson · Show lineage · Video receipt) that focus the matching
    artifact region or drop into the source detail drawer.

  The room mirrors the detail drawer's focus contract (inert background, Tab
  trap, close-button focus on open, Escape to close) and is single-drawer-at-a-
  time with it: opening *inspect source* closes the room and opens the detail.
  A future **Archive Interpreter** (CopilotKit) may add controlled lens cards
  driven by typed props from the archive entry — **future-only and
  controlled-component-only**: no arbitrary generated UI, no open-ended chat; the
  authored archive stays the source of truth.
- **Stat** — a mono count-up number with a small label; the atomic readout.

Borders are hairline `--line`; elevation is surface-lightness + a faint inner
glow, not heavy drop shadows. No card-in-card nesting.

## Layout

Single dark shell, max content ~1280px, generous gutters.

```
┌ City Wiki control deck (buildings + Memory Archive) ───────┐
├ Hero curve (full width)  ──────────────────────────────────┤
├ Video evidence comparison ─────────────────────────────────┤
├ Why the line moved ────────────────────────────────────────┤
├ Fader board ───────────────────┬ Current harness state ────┤
├ Generation history table ──────────────────────────────────┤
└ (Detail drawer / Memory Archive room slide over from right) ┘
```

Flexbox for 1D rows (districts, controls), Grid for the 2D panel zone. Responsive
grids use `repeat(auto-fit, minmax(280px, 1fr))`. Collapses cleanly to a single
column on a narrow projector; the districts band wraps before it overflows.
Semantic z-index scale: `sticky → drawer-backdrop → drawer → toast`.

## Motion

Library: **Motion** (`motion/react`). Easing is ease-out (expo / quint); no
bounce, no elastic. Motion is part of the build, not a finish.

- **Curve draw-on** — `motion.path` animating `pathLength` 0→1, advanced one
  generation per demo step. The newest point pops and its win-prob counts up.
- **Weight faders** — animate handle position on a spring as versions fold v0→v5.
- **City signal** — within a generation, the five buildings pulse in pipeline
  order (Trend → Concept → Score → Rewrite → Memory). The connected signal track
  fills as the generation advances.
- **Attention bubbles** — appear only when their triggering state exists:
  auto-fail/policy flag, refused diff, review-worthy lesson, stored lesson, or
  new concept.
- **Reveals** — `AnimatePresence` staggers new table rows and lesson cards in;
  the drawer slides + fades.
- **Count-ups** — a shared `useCountUp` (Motion `useMotionValue`) for every Stat.
- **Optional sensory cues** — user-initiated loop controls may trigger subtle
  chimes / haptics only when explicitly enabled for a local demo.

**Reduced motion is mandatory.** Two layers: a `@media (prefers-reduced-motion:
reduce)` block zeroes the duration tokens, and `useReducedMotion()` snaps the
curve to full length, count-ups to their final value, and pulses to a static
active state. The demo's stepping still advances, so the climb remains legible as
discrete jumps. Reveals must enhance already-visible content; nothing is gated
behind a transition that could leave a section blank.
