"use client";

import { useEffect, useRef, useState } from "react";

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Animates a number from 0 to `target` on mount, and from wherever it is to
 * each new target after that, so readings feel live. Instant with reduced motion.
 */
export function useCountUp(target: number, ms = 1200): number {
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const reduce =
      typeof matchMedia !== "function" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof requestAnimationFrame !== "function") {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    let start: number | null = null;
    let id = requestAnimationFrame(function step(now) {
      start ??= now;
      const t = Math.min(1, (now - start) / ms);
      current.current = t === 1 ? target : from + (target - from) * easeOut(t);
      setValue(current.current);
      if (t < 1) id = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(id);
  }, [target, ms]);

  return value;
}
