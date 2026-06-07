import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { GenerationRecord, HarnessState, TrendContext } from "./lib/contracts";
import { loadGenerations, loadInitialState, loadTrendContexts } from "./lib/data";
import {
  curvePoints,
  elementKeys,
  indexTrends,
  lessonsThrough,
  lineageThroughGeneration,
  stateAtGeneration,
} from "./lib/selectors";
import { useDemoLoop } from "./lib/useDemoLoop";
import { dec, pct } from "./lib/format";
import { staggerContainer } from "./styles/motion";
import { DistrictsHeader } from "./components/DistrictsHeader";
import { HeroCurve } from "./components/HeroCurve";
import { WeightShiftPanel } from "./components/WeightShiftPanel";
import { HarnessStatePanel } from "./components/HarnessStatePanel";
import { GenerationTable } from "./components/GenerationTable";
import { LessonsPanel } from "./components/LessonsPanel";
import { GenerationDetail } from "./components/GenerationDetail";
import { DemoLoopControls } from "./components/DemoLoopControls";
import { OutputCompare } from "./components/OutputCompare";

export function App() {
  const [records, setRecords] = useState<GenerationRecord[] | null>(null);
  const [initial, setInitial] = useState<HarnessState | null>(null);
  const [trendList, setTrendList] = useState<TrendContext[]>([]);
  const [selected, setSelected] = useState<GenerationRecord | null>(null);

  useEffect(() => {
    let alive = true;
    void loadGenerations().then((recs) => {
      if (!alive) return;
      setRecords(recs);
      setInitial(loadInitialState());
      setTrendList(loadTrendContexts());
    });
    return () => {
      alive = false;
    };
  }, []);

  const total = records?.length ?? 0;
  const loop = useDemoLoop(total);
  const { step } = loop;

  const trends = useMemo(() => indexTrends(trendList), [trendList]);

  // Clear an open drawer when the loop is reset to the empty state.
  useEffect(() => {
    if (step === 0) setSelected(null);
  }, [step]);

  // Keyboard shortcuts so the demo can be driven and scrubbed without the mouse.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected) return; // drawer open: its own Escape handler owns the keyboard
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? "";
      if (t?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      switch (e.key) {
        case " ":
          if (tag === "BUTTON" || tag === "A") return; // let a focused control handle Space natively
          e.preventDefault();
          loop.toggle();
          break;
        case "ArrowRight":
          e.preventDefault();
          loop.stepForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          loop.stepBack();
          break;
        case "End":
          e.preventDefault();
          loop.skipToEnd();
          break;
        case "r":
        case "R":
          loop.reset();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loop, selected]);

  if (!records || !initial) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="animate-pulse font-mono text-sm tracking-widest text-muted uppercase">
          booting control room…
        </p>
      </main>
    );
  }

  const currentRecord = step > 0 ? (records[step - 1] ?? null) : null;
  const currentTrend = currentRecord ? trends.get(currentRecord.trend_context_id) : undefined;
  const currentDiff = currentRecord?.harness_diff ?? null;

  const state = stateAtGeneration(initial, records, step);
  const lineage = lineageThroughGeneration(initial, records, step);
  const lessons = lessonsThrough(records, step);
  const curve = curvePoints(records);
  const keys = elementKeys(initial);
  const refusedCount = records
    .slice(0, step)
    .filter((r) => r.harness_diff && !r.harness_diff.accepted).length;
  const baseline = records.find((r) => r.generation_number === 1);
  const best = records.find((r) => r.generation_number === 5);

  // Announced to assistive tech on each generation (the visual update is silent otherwise).
  const liveMessage = currentRecord
    ? `Generation ${currentRecord.generation_number} of ${total}. ` +
      `Weighted total ${dec(currentRecord.score.weighted_total)}, win probability ${pct(currentRecord.score.predicted_win_prob ?? 0.5)}. ` +
      (currentRecord.score.policy_flag
        ? "Policy flag raised; the proposed harness change was refused."
        : `Harness updated to ${state.version}.`)
    : "Idle. Run the loop to generate the first concept.";

  return (
    <div className="min-h-dvh">
      <div role="status" aria-live="polite" className="sr-only">
        {liveMessage}
      </div>
      <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Top bar */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
              Shortform <span className="text-primary-bright">City</span>
            </h1>
            <p className="mt-1 font-mono text-xs tracking-wide text-muted">
              control room · a content harness that rewrites itself each generation
            </p>
          </div>
          <DemoLoopControls loop={loop} version={state.version} />
        </header>

        <main>
        {/* Districts */}
        <div className="mt-5">
          <DistrictsHeader record={currentRecord} trend={currentTrend} />
        </div>

        {/* Hero curve */}
        <div className="mt-4">
          <HeroCurve points={curve} revealed={step} total={total} />
        </div>

        {/* Output: baseline vs best video */}
        {baseline && best && (
          <div className="mt-4">
            <OutputCompare baseline={baseline} best={best} bestUnlocked={step >= best.generation_number} />
          </div>
        )}

        {/* State row */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer(0.08)}
          className="mt-4 grid gap-4 lg:grid-cols-2"
        >
          <WeightShiftPanel
            state={state}
            keys={keys}
            appliedChanges={currentDiff?.accepted ? currentDiff.element_weight_changes : null}
            rejectedChanges={currentDiff && !currentDiff.accepted ? currentDiff.element_weight_changes : null}
          />
          <HarnessStatePanel lineage={lineage} current={state} refusedCount={refusedCount} />
        </motion.div>

        {/* History + memory */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer(0.08)}
          className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]"
        >
          <GenerationTable
            records={records.slice(0, step)}
            trends={trends}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
          <LessonsPanel lessons={lessons} />
        </motion.div>
        </main>

        <footer className="mt-8 border-t border-line/60 pt-4 font-mono text-xs text-faint">
          Every generation, reward score, and harness rewrite is traced in W&amp;B Weave.
        </footer>
      </div>

      <GenerationDetail
        record={selected}
        trend={selected ? trends.get(selected.trend_context_id) : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
