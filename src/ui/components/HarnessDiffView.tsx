import type { HarnessDiff } from "../lib/contracts";
import { elementLabel } from "../lib/format";
import { Badge, DeltaPill, MetricLabel } from "./primitives";

function ChangeLine({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="font-mono text-xs text-faint">{label}: </span>
      <span className="text-muted">{value}</span>
    </div>
  );
}

export function HarnessDiffView({ diff }: { diff: HarnessDiff }) {
  const weightEntries = Object.entries(diff.element_weight_changes);
  return (
    <div style={{ opacity: diff.accepted ? 1 : 0.92 }}>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm text-ink tabular-nums">
          {diff.from_version} <span className="text-faint">→</span> {diff.to_version}
        </span>
        <Badge tone={diff.accepted ? "positive" : "flag"}>
          {diff.accepted ? "accepted" : "rejected"}
        </Badge>
      </div>

      {weightEntries.length > 0 && (
        <div className="mt-3">
          <MetricLabel>Weight changes{diff.accepted ? "" : " (not applied)"}</MetricLabel>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {weightEntries.map(([key, delta]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-1/60 px-2 py-1"
                style={diff.accepted ? undefined : { textDecoration: "line-through", opacity: 0.7 }}
              >
                <span className="text-xs text-muted">{elementLabel(key)}</span>
                <DeltaPill value={delta} />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1">
        <ChangeLine label="script prompt" value={diff.script_prompt_change} />
        <ChangeLine label="seedance template" value={diff.seedance_prompt_template_change} />
        <ChangeLine label="judge rubric" value={diff.judge_rubric_change} />
        {diff.policy_rule_changes && diff.policy_rule_changes.length > 0 && (
          <ChangeLine label="policy rules" value={diff.policy_rule_changes.join("; ")} />
        )}
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{diff.rationale}</p>
    </div>
  );
}
