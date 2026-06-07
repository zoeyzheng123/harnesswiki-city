import type { MemoryArchiveEntry } from "../../lib/archive";
import { elementLabel, signedDelta } from "../../lib/format";
import { MetricLabel } from "../primitives";

/**
 * The right-rail element index: every element this belief touches, with the
 * ones the harness re-weighted marked by their signed delta. Rows cross-light
 * with the artifact's wikilink chips (shared `highlightedElement`).
 */
export function ElementIndex({
  entry,
  highlightedElement,
  onToggleElement,
}: {
  entry: MemoryArchiveEntry;
  highlightedElement: string | null;
  onToggleElement: (key: string | null) => void;
}) {
  const refused = entry.status === "refused";
  return (
    <section aria-label="Element index">
      <div className="flex items-center justify-between gap-2">
        <MetricLabel>Element index</MetricLabel>
        <span className="font-mono text-[0.625rem] text-faint">{entry.elementKeys.length} linked</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {entry.elementKeys.map((key) => {
          const delta = entry.changedWeights[key];
          const changed = delta !== undefined;
          const active = highlightedElement === key;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onToggleElement(active ? null : key)}
                aria-pressed={active}
                className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1 text-left font-mono text-xs transition-colors ${
                  active ? "border-memory bg-memory/15 text-memory" : "border-line/60 text-muted hover:border-memory/50"
                }`}
              >
                <span className="truncate">{elementLabel(key)}</span>
                {changed && (
                  <span
                    className={`shrink-0 tabular-nums ${
                      refused ? "text-faint line-through" : delta >= 0 ? "text-positive" : "text-negative"
                    }`}
                    title={refused ? "proposed, not applied" : "applied weight change"}
                  >
                    {signedDelta(delta)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
