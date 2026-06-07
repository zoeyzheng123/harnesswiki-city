import type { RewardScore } from "../lib/contracts";
import {
  CATEGORY_LABELS,
  CATEGORY_MAX,
  CATEGORY_ORDER,
  TIER_COLOR,
  autoFailLabel,
  pct,
  pts,
  tierFor,
  type CategoryKey,
  type Tier,
} from "../lib/format";
import { Badge, MetricLabel, TierBadge } from "./primitives";

function CategoryRow({
  catKey,
  earned,
  isLowest,
}: {
  catKey: CategoryKey;
  earned: number;
  isLowest: boolean;
}) {
  const max = CATEGORY_MAX[catKey];
  const ratio = max > 0 ? earned / max : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-36 items-center gap-1.5 text-xs text-muted">
        {CATEGORY_LABELS[catKey]}
        {isLowest && <span className="font-mono text-[0.625rem] text-flag">fix first</span>}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-1">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.round(ratio * 100)}%`,
            backgroundColor: isLowest ? "var(--color-flag)" : "var(--color-positive)",
          }}
        />
      </div>
      <span className="w-12 text-right font-mono text-xs text-ink tabular-nums">
        {pts(earned)}
        <span className="text-faint">/{max}</span>
      </span>
    </div>
  );
}

export function ScoreDimensions({ score }: { score: RewardScore }) {
  const total = score.total_score ?? Math.round((score.weighted_total ?? 0) * 100);
  const tier = (score.distribution_tier as Tier | undefined) ?? tierFor(total);
  const breakdown = score.category_breakdown ?? {};
  const autoFails = score.auto_fails_triggered ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <MetricLabel>Total score</MetricLabel>
          <div className="mt-0.5 font-mono text-2xl tabular-nums" style={{ color: TIER_COLOR[tier] }}>
            {pts(total)}
            <span className="text-base text-faint">/100</span>
          </div>
        </div>
        <div>
          <MetricLabel>Tier</MetricLabel>
          <div className="mt-1.5">
            <TierBadge tier={tier} />
          </div>
        </div>
        {score.confidence !== undefined && (
          <div>
            <MetricLabel>Confidence</MetricLabel>
            <div className="mt-0.5 font-mono text-2xl text-muted tabular-nums">{pct(score.confidence)}</div>
          </div>
        )}
        {autoFails.length > 0 && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            {autoFails.map((af) => (
              <Badge key={af} tone="flag">
                {af}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {autoFails.length > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-flag/90">{autoFailLabel(autoFails[0] ?? "")}</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {CATEGORY_ORDER.map((k) => (
          <CategoryRow key={k} catKey={k} earned={breakdown[k] ?? 0} isLowest={k === score.lowest_scoring_category} />
        ))}
      </div>

      {score.recommended_fix_priority && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <span className="font-mono text-xs text-faint">fix priority: </span>
          {score.recommended_fix_priority}
        </p>
      )}
      <p className="mt-3 border-t border-line/70 pt-3 text-sm leading-relaxed text-muted">
        {score.judge_rationale}
      </p>
    </div>
  );
}
