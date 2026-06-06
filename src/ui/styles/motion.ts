import type { Transition, Variants } from "motion/react";

/**
 * Shared motion language. Durations mirror the CSS custom properties in
 * theme.css; the reduced-motion CSS block collapses those, and components also
 * branch on `useReducedMotion()` for JS-driven motion. Easing is ease-out only.
 */
export const DURATION = {
  fast: 0.18,
  settle: 0.46,
  climb: 0.64,
} as const;

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_OUT_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const springSoft: Transition = {
  type: "spring",
  stiffness: 210,
  damping: 30,
  mass: 0.9,
};

/** Fade + rise, the default entrance for panels and cards. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.settle, ease: EASE_OUT_EXPO },
  },
};

/** A staggered container; pair with `fadeRise` children. */
export function staggerContainer(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
}
