# Decisions

Lightweight ADR log. Newest first. Record a decision here when it would
otherwise get re-litigated or drift across files.

## 2026-06-06 — Dashboard stack

### D6. Dashboard: Vite + React (supersedes the framework note in D1)

The dashboard is a client-only proof artifact with no SSR, routing, or server
needs, so it is built with **Vite + React 19 + Tailwind v4 + Motion** under
`src/ui/`, type-isolated from the contracts typecheck by its own
`src/ui/tsconfig.json` (the root `tsconfig.json` excludes `src/ui`, and
`pnpm typecheck` stays green). This supersedes D1's "Next.js App Router on
Vercel" note: Vite is the leanest path here, and the static build still deploys
to Vercel. Data reaches every view through a single seam, `src/ui/lib/data.ts`,
returning the canonical `GenerationRecord[]` — synthetic demo data now, real
`runLoop` output later with no component changes.

## 2026-06-06 — Initial decisions

### D1. Stack: TypeScript + pnpm

The shared contracts and function shapes are expressed in TypeScript, so the
codebase is TS and the package manager is pnpm. The dashboard targets Next.js
App Router on Vercel when the UI is built (not scaffolded yet). _(The
dashboard-framework portion of this decision is superseded by D6: the UI ships
on Vite + React.)_

### D2. Contracts are canonical in code, mirrored in the doc

`src/contracts/index.ts` is the single, type-checked source of truth for the
schemas. `docs/DATA_CONTRACTS.md` explains and embeds a copy but defers to the
`.ts` file. This refines the general rule "DATA_CONTRACTS.md owns schemas": the
doc owns the *explanation*, the code owns the *definition*, and a typecheck of
`data/stubs/` keeps them honest. Both must change together.

### D3. Two distinct vocabularies

*Rubric dimensions* (`RewardScore.dimensions`, how we score) are kept separate
from *element weights* (`HarnessState.element_weights`, generation biases). They
are different lists and are documented as such to prevent conflation.

### D4. "Improvement" is defined once

The definition of an improved generation lives only in `docs/HARNESS_LOOP.md`,
expressed against `RewardScore` fields (`predicted_win_prob` up, or
`weighted_total` up, and `policy_risk` not above threshold).

### D5. Weave is the only tracing layer

All loop functions are Weave ops. The op-name list and required logged fields
are owned by `docs/WEAVE_TRACING.md`.
