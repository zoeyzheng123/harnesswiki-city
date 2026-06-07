# Product

## Register

product

## Users

The dashboard has two audiences in one room. **Hackathon judges** watch a live
3-minute demo on a projector or laptop in a dim room; they have seconds to
decide whether the central claim is real. The **demo narrator** (Eng 4) drives
the dashboard live and needs a "Run loop" affordance that paces the story.
Secondarily, the **content-ops team** inspects individual generations to
understand why a concept scored the way it did.

The job to be done: in a glance, believe that the harness *improves itself every
generation*, then be able to drill into the receipts that prove it.

## Product Purpose

HarnessWiki City is a self-improving content-ops harness. Most AI content tools
generate one-off assets; this one learns the creative operating system behind
them (prompts, element weights, policy) and gets better each generation. The
dashboard is the **proof artifact**: it makes that improvement legible and
credible. Success is a judge who, within the first thirty seconds of the loop
running, understands that the score curve climbs and the element weights shift
because the system rewrote its own harness, and who can then open any generation
to see the score, the rationale, the diff, and the lesson that drove the change.

## Brand Personality

Mission control for a living content city. Three words: confident, kinetic,
characterful. The voice is precise and declarative, the way a telemetry readout
is. It carries personality through the city conceit (named agent districts that
light up as work flows through them) without tipping into a toy. It never hypes;
the numbers and the motion do the persuading.

## Anti-references

- Generic SaaS analytics dashboards (the Mixpanel / Amplitude sea of identical
  charts and gray cards).
- The cream / sand / warm-beige "AI default" surface.
- Gradient-display text and the big-number hero-metric template.
- Endless identical icon + heading + paragraph card grids.
- Navy-and-blue fintech-SaaS sameness.
- A literal SimCity game. The city is a metaphor for the pipeline, not a toy to
  play with.

## Design Principles

1. **Show the climb, not the claim.** Improvement is proven in motion and data,
   never asserted in marketing copy. If a judge has to read a sentence to
   believe the system improves, the chart failed.
2. **Two vocabularies, never blurred.** Rubric dimensions (how we *score*) and
   element weights (generation *biases*) are different lists. They never share a
   component, a color role, or a label map. (Enforces DECISIONS.md D3.)
3. **Receipts on demand.** Every score links to its judge rationale, the harness
   diff it produced, and the lesson distilled from it. Credibility comes from
   drill-down, not from a headline figure.
4. **Instrument, not decoration.** Every glowing element encodes real data.
   Motion exists to make a state change comprehensible, not to ornament.
5. **The harness can say no.** When the meta-agent rejects a risky diff because
   `policy_flag` tripped, that is a feature to surface proudly, not an error to
   hide. A system with judgment is more trustworthy than one that only climbs.
6. **City outside, wiki inside.** The city is a spatial model of the loop; the
   wiki is the readable memory inside it.

## Accessibility & Inclusion

- WCAG AA on the dark control-room surface; body text and the curve / delta
  colors are contrast-verified against their backgrounds.
- A complete `prefers-reduced-motion` path. The loop still *advances* state, so
  the climb stays legible as discrete steps; nothing animates.
- The generation table and detail drawer are keyboard navigable (open a row,
  trap focus in the drawer, escape to close).
- Up and down are never encoded by hue alone. Every positive or negative delta
  pairs color with a sign (`+` / `−`) and direction, so the story survives color
  blindness.
