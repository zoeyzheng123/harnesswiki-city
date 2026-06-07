import type { GenerationRecord } from "../lib/contracts";
import { elementLabel, signedDelta } from "../lib/format";
import { MetricLabel } from "./primitives";

/**
 * The critic's confidence-gated learning signal: which elements it judged won or
 * lost this generation, and the bounded weight deltas it suggested. Showing it
 * next to what the harness actually applied is the bridge between the score and
 * the rewrite. When the signal is gated off (confidence < 0.70, DECISIONS.md
 * D13), it explains why nothing was proposed.
 */
export function CriticLearning({
  score,
  diff,
}: {
  score: GenerationRecord["score"];
  diff: GenerationRecord["harness_diff"];
}) {
  const winning = score.winning_elements ?? [];
  const weak = score.weak_elements ?? [];
  const suggested = score.suggested_policy_updates;
  const applied = diff?.element_weight_changes ?? {};
  const suggestedEntries = suggested ? Object.entries(suggested) : [];

  if (suggestedEntries.length === 0 && winning.length === 0 && weak.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        Learning gated: confidence{" "}
        <span className="font-mono text-ink tabular-nums">
          {score.confidence !== undefined ? score.confidence.toFixed(2) : "—"}
        </span>{" "}
        below the 0.70 policy-learning threshold, so the critic proposed no weight changes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {(winning.length > 0 || weak.length > 0) && (
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {winning.length > 0 && (
            <div>
              <MetricLabel>Winning elements</MetricLabel>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {winning.map((e) => (
                  <span
                    key={e}
                    className="rounded-md border border-positive/40 bg-positive/10 px-2 py-0.5 font-mono text-xs text-positive"
                  >
                    {elementLabel(e)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {weak.length > 0 && (
            <div>
              <MetricLabel>Weak elements</MetricLabel>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {weak.map((e) => (
                  <span
                    key={e}
                    className="rounded-md border border-negative/40 bg-negative/10 px-2 py-0.5 font-mono text-xs text-negative"
                  >
                    {elementLabel(e)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {suggestedEntries.length > 0 && (
        <div>
          <MetricLabel>Suggested → applied</MetricLabel>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {suggestedEntries.map(([key, delta]) => {
              const appliedDelta = applied[key];
              const diverged = appliedDelta !== undefined && appliedDelta !== delta;
              return (
                <div key={key} className="flex items-center gap-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-muted">{elementLabel(key)}</span>
                  <span
                    className={`w-12 text-right font-mono text-xs tabular-nums ${delta > 0 ? "text-positive" : delta < 0 ? "text-negative" : "text-faint"}`}
                  >
                    {signedDelta(delta)}
                  </span>
                  <span className="font-mono text-xs text-faint">→</span>
                  <span
                    className={`w-28 text-right font-mono text-xs tabular-nums ${appliedDelta === undefined ? "text-faint" : diverged ? "text-accent" : "text-positive"}`}
                  >
                    {appliedDelta === undefined
                      ? "not applied"
                      : `${signedDelta(appliedDelta)}${diverged ? " amplified" : ""}`}
                  </span>
                </div>
              );
            })}
          </div>
          {suggestedEntries.some(([k, d]) => applied[k] !== undefined && applied[k] !== d) && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              The meta-agent set its own magnitude where it amplified the critic's suggestion.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
