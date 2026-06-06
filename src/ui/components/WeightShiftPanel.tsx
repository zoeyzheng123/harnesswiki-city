import { motion } from "motion/react";
import type { HarnessState } from "../lib/contracts";
import { dec, elementLabel, signedDelta } from "../lib/format";
import { Badge, DeltaPill, Panel } from "./primitives";
import { springSoft } from "../styles/motion";

function WeightBar({
  label,
  value,
  delta,
  rejected,
}: {
  label: string;
  value: number;
  delta: number | undefined;
  rejected: number | undefined;
}) {
  const widthPct = Math.min(100, Math.round(value * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-ink">{label}</span>
        <span className="flex items-center gap-2.5">
          {rejected !== undefined && (
            <span className="font-mono text-xs text-flag/80 line-through">{signedDelta(rejected)}</span>
          )}
          {delta !== undefined && <DeltaPill value={delta} />}
          <span className="w-9 text-right font-mono text-xs text-muted tabular-nums">{dec(value)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-1">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--color-primary), var(--color-primary-bright))",
          }}
          initial={false}
          animate={{ width: `${widthPct}%` }}
          transition={springSoft}
        />
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
  return (
    <Panel
      title="Element weights"
      subtitle="Generation biases the harness tunes over time"
      action={
        rejectedChanges ? (
          <Badge tone="flag">change refused</Badge>
        ) : appliedChanges ? (
          <Badge tone="positive">{state.version} applied</Badge>
        ) : (
          <Badge tone="neutral">{state.version}</Badge>
        )
      }
      bodyClassName="flex flex-col gap-3.5"
    >
      {keys.map((key) => (
        <WeightBar
          key={key}
          label={elementLabel(key)}
          value={state.element_weights[key] ?? 0}
          delta={appliedChanges?.[key]}
          rejected={rejectedChanges?.[key]}
        />
      ))}
    </Panel>
  );
}
