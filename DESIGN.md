# Design

Visual system for the HarnessWiki City dashboard. PRODUCT.md owns the strategy
(who/what/why); this file owns how it looks. Tokens are authored in
`src/ui/styles/theme.css` as a Tailwind v4 `@theme` block; the values below are
canonical and that file mirrors them.

## Theme

A dark control room. The physical scene is a dim demo room with a glowing
instrument panel: the surface recedes to near-black so the signal lights (the
cobalt win curve, the cyan total line, the four district hues) carry every
emotion. Strategy is **full-palette on a dark environmental base** — the dark IS
the brand, the saturated roles are deliberate and few.

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
| `--primary` | `oklch(0.64 0.150 242)` | Cobalt. `predicted_win_prob` line, primary actions |
| `--accent` | `oklch(0.82 0.130 200)` | Frost cyan. `weighted_total` line, secondary indicator |

`--primary` vs `--accent` differ in both hue (242 vs 200) and lightness
(0.64 vs 0.82), so the two curve series never read as one. Text on either fill is
near-white (`--ink`), per the saturated-fill rule.

### District hues (the city's four agents)
| Token | OKLCH | District |
|---|---|---|
| `--scout` | `oklch(0.80 0.13 195)` | Trend Scout (scan / signal) |
| `--generator` | `oklch(0.70 0.15 285)` | Content Generator (creative) |
| `--critic` | `oklch(0.80 0.14 85)` | Reward Critic (judging) |
| `--meta` | `oklch(0.72 0.17 330)` | Meta-Agent (mutation / rewrite) |

Four distinct hues at matched lightness so they read as siblings in one city.
Each holds near-white text on a filled chip.

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

- **District chip** — a labeled tile per agent, accent-keyed, with idle / active
  / done / rejected states. Active = a soft pulse glow in the district hue.
- **Hero curve** — a single dark card holding the two-series SVG line chart, the
  dashed 0.50 baseline, and the headline win-prob count-up. The signature object.
- **Weight bar** — a horizontal track (`--surface-1`) with a fill in `--primary`,
  a mono value, and a `+.NN` / `−.NN` delta pill in `--positive` / `--negative`.
- **Generation row / table** — mono-aligned numeric columns, a `policy_flag`
  badge, a hover lift to `--surface-1`. Opens the detail drawer.
- **Detail drawer** — right-side panel: concept, the eight dimensions (risk dims
  as penalties), the diff with an ACCEPTED / REJECTED badge, the five-part lesson.
- **Lesson card** — five labeled fields (observation, rule, evidence, change,
  expected effect), the change field tinted `--positive`.
- **Stat** — a mono count-up number with a small label; the atomic readout.

Borders are hairline `--line`; elevation is surface-lightness + a faint inner
glow, not heavy drop shadows. No card-in-card nesting.

## Layout

Single dark shell, max content ~1280px, generous gutters.

```
┌ Districts header (4 chips + Run-loop controls) ────────────┐
├ Hero curve (full width)  ──────────────────────────────────┤
├ Weight shift ──────────────────┬ Current harness state ────┤
├ Generation history table ──────┴───────────────────────────┤
└ (Detail drawer slides over from the right; Lessons panel)  ┘
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
- **Weight bars** — animate `width` on a spring as versions fold v0→v5.
- **District pulse** — within a generation, the four districts pulse in pipeline
  order (Scout → Generator → Critic → Meta), mirroring the loop steps.
- **Reveals** — `AnimatePresence` staggers new table rows and lesson cards in;
  the drawer slides + fades.
- **Count-ups** — a shared `useCountUp` (Motion `useMotionValue`) for every Stat.

**Reduced motion is mandatory.** Two layers: a `@media (prefers-reduced-motion:
reduce)` block zeroes the duration tokens, and `useReducedMotion()` snaps the
curve to full length, count-ups to their final value, and pulses to a static
active state. The demo's stepping still advances, so the climb remains legible as
discrete jumps. Reveals must enhance already-visible content; nothing is gated
behind a transition that could leave a section blank.
