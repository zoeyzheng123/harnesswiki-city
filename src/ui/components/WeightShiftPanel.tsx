import { motion, useReducedMotion } from "motion/react";
import type { HarnessState } from "../lib/contracts";
import { dec, elementLabel, signedDelta } from "../lib/format";
import { Badge, MetricLabel, Panel } from "./primitives";
import { springSoft } from "../styles/motion";

const TICKS = [100, 75, 50, 25, 0];

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 100)));
}

function FaderChannel({
  label,
  value,
  delta,
  rejected,
  reduce,
}: {
  label: string;
  value: number;
  delta: number | undefined;
  rejected: number | undefined;
  reduce: boolean;
}) {
  const valuePct = clampPct(value);
  const rejectedPct = rejected === undefined ? null : clampPct(Math.max(0, value + rejected));
  const transition = reduce ? { duration: 0 } : springSoft;

  return (
    <div className="relative overflow-hidden rounded-lg p-1">
      <div className="flex min-h-12 items-start justify-between gap-3">
        <div className="min-w-0">
          <MetricLabel>fader</MetricLabel>
          <h3 className="mt-1 text-sm leading-tight text-ink">{label}</h3>
        </div>
        <span className="text-right">
          <span className="block font-mono text-sm text-ink tabular-nums">{dec(value)}</span>
          {rejected !== undefined && (
            <span className="block font-mono text-xs text-flag/80 line-through">{signedDelta(rejected)}</span>
          )}
          {delta !== undefined && (
            <span className={`block font-mono text-xs tabular-nums ${delta >= 0 ? "text-positive" : "text-negative"}`}>
              {signedDelta(delta)}
            </span>
          )}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[3rem_1fr] gap-3">
        <div
          role="meter"
          aria-label={`${label} harness weight`}
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={Number(value.toFixed(2))}
          aria-valuetext={dec(value)}
          className="fader-rail relative mx-auto h-36 w-9 rounded-full border border-line/80"
        >
          {TICKS.map((tick) => (
            <span
              key={tick}
              className="absolute left-1/2 h-px w-5 -translate-x-1/2 bg-line/80"
              style={{ bottom: `${tick}%` }}
              aria-hidden="true"
            />
          ))}
          <motion.span
            className="absolute inset-x-2 bottom-0 rounded-full"
            style={{
              background: "linear-gradient(180deg, var(--color-primary-bright), var(--color-primary))",
              boxShadow: "0 0 16px color-mix(in oklch, var(--color-primary) 55%, transparent)",
            }}
            initial={false}
            animate={{ height: `${valuePct}%` }}
            transition={transition}
            aria-hidden="true"
          />
          {rejectedPct !== null && (
            <span
              className="absolute left-1/2 h-0.5 w-8 -translate-x-1/2 bg-flag"
              style={{ bottom: `calc(${rejectedPct}% - 1px)`, boxShadow: "0 0 10px var(--color-flag)" }}
              aria-hidden="true"
            />
          )}
          <motion.span
            className="absolute left-1/2 h-4 w-11 -translate-x-1/2 rounded-md border border-white/20 bg-ink"
            style={{
              boxShadow: "0 4px 16px -8px oklch(0 0 0 / 0.8), 0 0 0 1px color-mix(in oklch, var(--color-primary) 30%, transparent)",
            }}
            initial={false}
            animate={{ bottom: `calc(${valuePct}% - 0.5rem)` }}
            transition={transition}
            aria-hidden="true"
          />
        </div>

        <div className="flex flex-col justify-between py-0.5 font-mono text-[0.625rem] text-faint tabular-nums">
          <span>1.00</span>
          <span>0.75</span>
          <span>0.50</span>
          <span>0.25</span>
          <span>0.00</span>
        </div>
      </div>

      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-2">
        {delta !== undefined && <Badge tone={delta >= 0 ? "positive" : "negative"}>{signedDelta(delta)} applied</Badge>}
        {rejected !== undefined && <Badge tone="flag">{signedDelta(rejected)} refused</Badge>}
        {delta === undefined && rejected === undefined && <span className="font-mono text-xs text-faint">holding position</span>}
      </div>
    </div>
  );
}

export function WeightShiftPanel({
  state,
  keys,
  appliedChanges,
  rejectedChanges,
}: {
  state: HarnessState;
  keys: string[];
  appliedChanges: Record<string, number> | null;
  rejectedChanges: Record<string, number> | null;
}) {
  const reduce = useReducedMotion();

  return (
    <Panel
      title="Element weights"
      subtitle="Read-only faders the harness moves between generations"
      action={
        rejectedChanges ? (
          <Badge tone="flag">change refused</Badge>
        ) : appliedChanges ? (
          <Badge tone="positive">{state.version} applied</Badge>
        ) : (
          <Badge tone="neutral">{state.version}</Badge>
        )
      }
      bodyClassName="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {keys.map((key) => (
        <FaderChannel
          key={key}
          label={elementLabel(key)}
          value={state.element_weights[key] ?? 0}
          delta={appliedChanges?.[key]}
          rejected={rejectedChanges?.[key]}
          reduce={Boolean(reduce)}
        />
      ))}
    </Panel>
  );
}
