import type { Lesson } from "../lib/contracts";
import { MetricLabel } from "./primitives";

function Field({ label, value, tone }: { label: string; value: string; tone?: "positive" }) {
  return (
    <div>
      <MetricLabel>{label}</MetricLabel>
      <p
        className={`mt-0.5 text-sm leading-relaxed ${tone === "positive" ? "text-positive" : "text-muted"}`}
      >
        {value}
      </p>
    </div>
  );
}

export function LessonCard({ lesson, showGen = false }: { lesson: Lesson; showGen?: boolean }) {
  return (
    <article className="rounded-lg border border-line/70 bg-surface-1/40 p-4">
      {showGen && (
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-xs text-faint">g{lesson.generation_number}</span>
          <span className="h-px flex-1 bg-line/70" />
          <span className="font-display text-xs text-muted">living memory</span>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <Field label="Observation" value={lesson.observation} />
        <Field label="Rule" value={lesson.rule} />
        <Field label="Evidence" value={lesson.evidence} />
        <Field label="Harness change" value={lesson.harness_change} tone="positive" />
        <Field label="Expected effect" value={lesson.expected_effect} />
      </div>
    </article>
  );
}
