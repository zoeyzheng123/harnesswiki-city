/**
 * Compile-time validation that the JSON stubs in data/stubs/ conform to the
 * canonical contracts. This file emits no runtime code; it exists so that
 * `pnpm typecheck` fails if a stub drifts from the schema in ./index.ts.
 *
 * Why JsonShape<T>: TypeScript widens JSON string-literal unions (e.g.
 * `"stub" | "live"`) to `string` when importing a .json module, so a direct
 * `const x: TrendContext = stub` would report false errors on those fields.
 * JsonShape<T> structurally mirrors T but widens string-literal unions,
 * preserving every other check (required fields, primitive types, nesting).
 */
import type {
  TrendContext,
  HarnessState,
  GenerationRecord,
} from "./index";

import trendContexts from "../../data/stubs/trend-contexts.json";
import harnessStateInitial from "../../data/stubs/harness-state.initial.json";
import generationRecords from "../../data/stubs/generation-records.sample.json";

/** Structural mirror of T that tolerates JSON literal-union widening. */
type JsonShape<T> = T extends (infer U)[]
  ? JsonShape<U>[]
  : T extends string
    ? string
    : T extends object
      ? { [K in keyof T]: JsonShape<T[K]> }
      : T;

// Each assignment below fails typecheck if the stub is missing a required
// field or uses the wrong primitive type.
const _trends: JsonShape<TrendContext>[] = trendContexts;
const _harness: JsonShape<HarnessState> = harnessStateInitial;
const _records: JsonShape<GenerationRecord>[] = generationRecords;

void _trends;
void _harness;
void _records;
