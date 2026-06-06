import { AnimatePresence, motion } from "motion/react";
import type { LessonEntry } from "../lib/selectors";
import { Badge, Panel } from "./primitives";
import { LessonCard } from "./LessonCard";
import { fadeRise } from "../styles/motion";

export function LessonsPanel({ lessons }: { lessons: LessonEntry[] }) {
  const ordered = [...lessons].reverse(); // newest first
  return (
    <Panel
      title="Living memory"
      subtitle="What the harness learned, distilled to a rule"
      action={<Badge tone={ordered.length ? "accent" : "neutral"}>{ordered.length} lessons</Badge>}
    >
      {ordered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Lessons appear here as the loop runs — one rule per generation.
        </p>
      ) : (
        <motion.div layout className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {ordered.map((entry) => (
              <motion.div
                key={entry.lesson.id}
                layout
                variants={fadeRise}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0 }}
              >
                <LessonCard lesson={entry.lesson} showGen />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Panel>
  );
}
