import {
  AUTO_FAIL_LABELS,
  CATEGORY_LABELS,
  CATEGORY_MAX,
  CATEGORY_ORDER,
  GROWING_AT,
  TIER_COLOR,
  VIRAL_AT,
  type Tier,
} from "../lib/format";
import { MetricLabel } from "./primitives";

const POPOVER_ID = "acoe-rubric-help";

const TIER_ROWS: { tier: Tier; label: string }[] = [
  { tier: "viral", label: `viral: ${VIRAL_AT}+` },
  { tier: "growing", label: `growing: ${GROWING_AT}+` },
  { tier: "seed_jail", label: `seed jail: below ${GROWING_AT}` },
];

/**
 * A "?" popover glossing the ACOE rubric so a first-time viewer does not have to
 * reverse-engineer the scoring. Native popover (top layer) so it escapes the
 * drawer's overflow; light-dismiss and Escape come for free.
 */
export function RubricHelp() {
  return (
    <>
      <button
        type="button"
        popoverTarget={POPOVER_ID}
        aria-label="What the ACOE rubric measures"
        className="grid size-4 shrink-0 place-items-center rounded-full border border-line font-mono text-[0.625rem] text-muted transition-colors hover:border-muted hover:text-ink"
      >
        ?
      </button>
      <div
        id={POPOVER_ID}
        popover="auto"
        className="fixed top-1/2 left-1/2 max-h-[85vh] max-w-[22rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-surface-1 p-5 text-ink backdrop:bg-bg/60"
        style={{ boxShadow: "0 24px 60px -20px oklch(0 0 0 / 0.8)" }}
      >
        <h3 className="font-display text-base text-ink">ACOE-YT-SHORTS-v2.0</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          A Short scores out of 100, maps to a distribution tier, and is voided by hard auto-fails.
        </p>

        <div className="mt-4">
          <MetricLabel>Tiers</MetricLabel>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm">
            {TIER_ROWS.map(({ tier, label }) => (
              <li key={tier} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: TIER_COLOR[tier] }} />
                <span className="text-ink">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <MetricLabel>Categories (out of 100)</MetricLabel>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm">
            {CATEGORY_ORDER.map((k) => (
              <li key={k} className="flex items-center justify-between gap-3">
                <span className="text-muted">{CATEGORY_LABELS[k]}</span>
                <span className="font-mono text-xs text-faint tabular-nums">/{CATEGORY_MAX[k]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4">
          <MetricLabel>Auto-fails</MetricLabel>
          <ul className="mt-1.5 flex flex-col gap-1.5 text-sm">
            {Object.entries(AUTO_FAIL_LABELS).map(([code, desc]) => (
              <li key={code} className="flex gap-2 leading-relaxed">
                <span className="shrink-0 font-mono text-xs text-flag">{code}</span>
                <span className="text-muted">{desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
