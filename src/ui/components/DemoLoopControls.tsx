import type { DemoLoop } from "../lib/useDemoLoop";

const PRIMARY =
  "rounded-md px-3.5 py-1.5 font-mono text-xs font-semibold tracking-wide uppercase text-ink transition-colors";
const GHOST =
  "rounded-md border border-line px-3 py-1.5 font-mono text-xs font-medium tracking-wide uppercase text-muted transition-colors hover:border-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-line disabled:hover:text-muted";

export function DemoLoopControls({ loop, version }: { loop: DemoLoop; version: string }) {
  const { step, total, isPlaying, atStart, atEnd, toggle, stepForward, reset } = loop;
  const playLabel = isPlaying ? "Pause" : atEnd ? "Replay loop" : atStart ? "Run loop" : "Resume";

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
      <div className="flex items-center gap-3 font-mono text-xs tracking-wide text-muted uppercase">
        <span className="tabular-nums">
          gen <span className="text-ink">{step}</span>/{total}
        </span>
        <span className="tabular-nums">
          harness <span className="text-accent">{version}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full"
            style={{
              backgroundColor: isPlaying ? "var(--color-positive)" : "var(--color-faint)",
              boxShadow: isPlaying ? "0 0 8px var(--color-positive)" : "none",
            }}
          />
          {isPlaying ? "live" : "idle"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          className={PRIMARY}
          style={{ backgroundColor: "var(--color-primary)", boxShadow: "0 6px 22px -8px var(--color-primary)" }}
        >
          {playLabel}
        </button>
        <button type="button" onClick={stepForward} disabled={atEnd} className={GHOST}>
          Step
        </button>
        <button type="button" onClick={reset} disabled={atStart} className={GHOST}>
          Reset
        </button>
      </div>
    </div>
  );
}
