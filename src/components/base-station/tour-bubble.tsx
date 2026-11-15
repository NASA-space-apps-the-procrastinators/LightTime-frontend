"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { API_URL, LIVE } from "@/lib/ship-api";
import { cn } from "@/lib/utils";

type Bubble = {
  running: boolean;
  step: number;
  of: number;
  id: string | null;
  title: string | null;
  text: string | null;
  anchor: string | null;
};

type Tail = "left" | "right" | "top" | null;

const WIDTH = 320;
const GAP = 16;

/** Where the bubble goes: beside its anchor, never on top of it. Under 768 px, or with no anchor
 *  on screen, it sits at the bottom, clear of the phone tab bar. */
function place(box: DOMRect | null): { style: CSSProperties; tail: Tail } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < 768 || !box) {
    return {
      style:
        vw < 768
          ? {
              left: GAP,
              right: GAP,
              bottom: `calc(4.5rem + env(safe-area-inset-bottom))`,
            }
          : { right: GAP, bottom: GAP, width: WIDTH },
      tail: null,
    };
  }
  const top = Math.max(GAP, Math.min(box.top, vh - 240));
  if (box.left >= WIDTH + 2 * GAP) {
    return {
      style: { top, left: box.left - WIDTH - GAP, width: WIDTH },
      tail: "right",
    };
  }
  if (vw - box.right >= WIDTH + 2 * GAP) {
    return {
      style: { top, left: box.right + GAP, width: WIDTH },
      tail: "left",
    };
  }
  return {
    style: {
      top: Math.min(box.bottom + GAP, vh - 240),
      left: Math.max(GAP, Math.min(box.left, vw - WIDTH - GAP)),
      width: WIDTH,
    },
    tail: "top",
  };
}

const TAIL: Record<Exclude<Tail, null>, string> = {
  right: "top-6 -right-[9px] border-t-2 border-r-2",
  left: "top-6 -left-[9px] border-b-2 border-l-2",
  top: "-top-[9px] left-6 border-t-2 border-l-2",
};

/** The guided tour: asks the ship once a second which bubble to show, and draws it beside its anchor. */
export function TourBubble() {
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [box, setBox] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!LIVE) return;
    const ask = () =>
      fetch(`${API_URL}/api/base/tour`)
        .then((r) => (r.ok ? r.json() : null))
        .then(setBubble, () => setBubble(null));
    ask();
    const timer = setInterval(ask, 1000);
    return () => clearInterval(timer);
  }, []);

  const anchor = bubble?.running ? bubble.anchor : null;

  // A new step: bring its anchor into view.
  useEffect(() => {
    if (!anchor) return;
    document
      .querySelector(`[data-tour="${anchor}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [anchor]);

  // Measure the anchor on every answer and whenever the page moves, so the bubble follows it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: bubble is the once-a-second tick that re-measures
  useEffect(() => {
    const measure = () => {
      const rect = anchor
        ? document
            .querySelector(`[data-tour="${anchor}"]`)
            ?.getBoundingClientRect()
        : undefined;
      setBox(rect && rect.width > 0 ? rect : null); // a hidden anchor has no size
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [anchor, bubble]);

  if (!bubble?.running || !bubble.text) return null;
  const { style, tail } = place(box);

  return (
    // biome-ignore lint/a11y/useSemanticElements: a live region over the page, not a form result, so a div with role="status"
    <div
      role="status"
      aria-live="polite"
      className="fixed z-50 border-2 border-foreground bg-background p-4 text-foreground shadow-[6px_6px_0_0_currentColor]"
      style={style}
    >
      {tail && (
        <span
          aria-hidden
          className={cn(
            "absolute size-4 rotate-45 border-foreground bg-background",
            TAIL[tail],
          )}
        />
      )}
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="bg-primary px-1.5 py-0.5 font-bold text-primary-foreground">
          Tour {bubble.step} of {bubble.of}
        </span>
        Simulated story
      </p>
      <p className="mt-2 text-base font-semibold">{bubble.title}</p>
      <p className="mt-1 text-sm leading-snug">{bubble.text}</p>
    </div>
  );
}
