export type InspectTarget = "score" | "diff" | "lesson" | "lineage";

const BUTTONS: { target: InspectTarget; label: string }[] = [
  { target: "score", label: "Why score moved" },
  { target: "diff", label: "Show diff" },
  { target: "lesson", label: "Show lesson" },
  { target: "lineage", label: "Show lineage" },
];

/**
 * The bottom rail: deterministic inspect actions. Four focus the matching
 * region of the open artifact; "Video receipt" drops into the source
 * generation detail, which hosts the rendered clip.
 */
export function QuickInspectRail({
  onInspect,
  onVideo,
  disabled = false,
}: {
  onInspect: (target: InspectTarget) => void;
  onVideo: () => void;
  disabled?: boolean;
}) {
  const cls =
    "rounded-md border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-memory hover:text-memory disabled:cursor-default disabled:opacity-50 disabled:hover:border-line disabled:hover:text-muted";
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick inspect">
      {BUTTONS.map(({ target, label }) => (
        <button key={target} type="button" onClick={() => onInspect(target)} disabled={disabled} className={cls}>
          {label}
        </button>
      ))}
      <button type="button" onClick={onVideo} disabled={disabled} className={cls}>
        Video receipt
      </button>
    </div>
  );
}
