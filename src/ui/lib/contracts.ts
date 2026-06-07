/**
 * The dashboard's single source of truth for data shapes is the canonical
 * contracts file — `src/contracts/index.ts`. This module only RE-EXPORTS those
 * types so UI code imports from one place and never redefines a schema
 * (AGENTS.md single-source-of-truth; DECISIONS.md D2). `src/contracts/` sits
 * outside the `src/ui` subtree the root tsconfig excludes, so this type-only
 * import stays clean on both typecheck projects.
 */
export type {
  TrendSignal,
  TrendContext,
  ContentConcept,
  RewardScore,
  HarnessState,
  HarnessDiff,
  Lesson,
  GenerationRecord,
} from "../../contracts";
