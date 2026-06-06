import type { RewardScore } from "../lib/contracts";
import { DIMENSION_LABELS, DIMENSION_ORDER, RISK_DIMENSIONS, dec, pct } from "../lib/format";
import { Badge, MetricLabel } from "./primitives";

function DimRow({ dimKey, value }: { dimKey: keyof RewardScore["dimensions"]; value: number }) {
  const risk = RISK_DIMENSIONS.has(dimKey);
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-32 items-center gap-1.5 text-xs text-muted">
        {DIMENSION_LABELS[dimKey]}
        {risk && <span className="font-mono text-[0.625rem] text-negative">risk</span>}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-1">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(value * 100)}%`,
            backgroundColor: risk ? "var(--color-negative)" : "var(--color-positive)",
            opacity: risk ? 0.85 : 1,
          }}
        />
      </div>
      <span
        className={`w-9 text-right font-mono text-xs tabular-nums ${risk ? "text-negative" : "text-ink"}`}
      >
        {dec(value)}
      </span>
    </div>
  );
}

export function ScoreDimensions({ score }: { score: RewardScore }) {
  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <MetricLabel>Weighted total</MetricLabel>
          <div className="mt-0.5 font-mono text-2xl text-accent tabular-nums">{dec(score.weighted_total)}</div>
        </div>
        <div>
          <MetricLabel>Win probability</MetricLabel>
          <div className="mt-0.5 font-mono text-2xl text-primary-bright tabular-nums">
            {pct(score.predicted_win_prob ?? 0.5)}
          </div>
        </div>
        {score.policy_flag && (
          <div className="ml-auto">
            <Badge tone="flag">policy flag</Badge>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {DIMENSION_ORDER.map((k) => (
          <DimRow key={k} dimKey={k} value={score.dimensions[k]} />
        ))}
      </div>

      <p className="mt-4 border-t border-line/70 pt-3 text-sm leading-relaxed text-muted">
        {score.judge_rationale}
      </p>
    </div>
  );
}
