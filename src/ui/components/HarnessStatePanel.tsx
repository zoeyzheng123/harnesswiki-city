import { Fragment } from "react";
import type { HarnessState } from "../lib/contracts";
import { truncate } from "../lib/format";
import { Badge, MetricLabel, Panel } from "./primitives";

function PromptBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <MetricLabel>{label}</MetricLabel>
      <p className="mt-1 max-w-[68ch] font-mono text-xs leading-relaxed text-muted">{truncate(value, 180)}</p>
    </div>
  );
}

export function HarnessStatePanel({
  lineage,
  current,
  refusedCount,
}: {
  lineage: HarnessState[];
  current: HarnessState;
  refusedCount: number;
}) {
  return (
    <Panel
      title="Harness state"
      subtitle="The operating system the loop rewrites"
      action={<Badge tone="accent">{current.version}</Badge>}
      bodyClassName="flex flex-col gap-5"
    >
      <div>
        <MetricLabel>Version lineage</MetricLabel>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {lineage.map((s, i) => {
            const isCurrent = i === lineage.length - 1;
            return (
              <Fragment key={s.version}>
                {i > 0 && <span className="font-mono text-xs text-faint">→</span>}
                <span
                  className="rounded-md border px-2 py-0.5 font-mono text-xs tabular-nums"
                  style={{
                    borderColor: isCurrent ? "var(--color-primary)" : "var(--color-line)",
                    color: isCurrent ? "var(--color-primary-bright)" : "var(--color-muted)",
                    backgroundColor: isCurrent ? "var(--color-surface-1)" : "transparent",
                  }}
                >
                  {s.version}
                </span>
              </Fragment>
            );
          })}
          {refusedCount > 0 && (
            <span className="ml-1">
              <Badge tone="flag">↯ {refusedCount} refused</Badge>
            </span>
          )}
        </div>
      </div>

      <PromptBlock label="Script prompt" value={current.script_prompt} />

      <div>
        <MetricLabel>Auto-fail rules</MetricLabel>
        <ul className="mt-1.5 flex flex-col gap-1">
          {current.policy_rules.map((rule, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-flag/70" />
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
