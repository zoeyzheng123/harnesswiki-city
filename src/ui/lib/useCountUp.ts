import { useEffect } from "react";
import { animate, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { DURATION, EASE_OUT_EXPO } from "../styles/motion";

/**
 * Animate a number toward `target`, returning a MotionValue<string> formatted
 * for display. Render it inside a `motion` element: `<motion.span>{value}</…>`.
 * Honors reduced motion by snapping to the final value.
 */
export function useCountUp(target: number, format: (n: number) => string) {
  const reduce = useReducedMotion();
  const value = useMotionValue(target);
  const text = useTransform(value, (v) => format(v));

  useEffect(() => {
    if (reduce) {
      value.set(target);
      return;
    }
    const controls = animate(value, target, {
      duration: DURATION.climb,
      ease: EASE_OUT_EXPO,
    });
    return () => controls.stop();
  }, [target, reduce, value]);

  return text;
}
