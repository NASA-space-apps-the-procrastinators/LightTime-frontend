"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_MS, MIN_MS, meanReaction } from "@/lib/reaction";
import { cn } from "@/lib/utils";

const TEST_MS = 180_000;

export function ReactionTest({
  baselineMs,
  onDone,
}: {
  baselineMs: number;
  onDone: (ms: number) => void;
}) {
  const [lit, setLit] = useState(false);
  const [times, setTimes] = useState<number[]>([]);
  const [message, setMessage] = useState(
    "Wait for the square to turn blue, then tap it.",
  );
  const [timeUp, setTimeUp] = useState(false);
  const litAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mean = meanReaction(times);
  const valid = times.filter((t) => t >= MIN_MS && t <= MAX_MS).length;

  const arm = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setLit(false);
    // A random 2 to 6 s wait, so the tap cannot be anticipated.
    timer.current = setTimeout(
      () => {
        litAt.current = performance.now();
        setLit(true);
      },
      2000 + Math.random() * 4000,
    );
  }, []);

  useEffect(() => {
    arm();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [arm]);

  // The test ends by itself after 3 minutes, as NASA's PVT does.
  const latest = useRef({ times, onDone });
  latest.current = { times, onDone };
  useEffect(() => {
    const id = setTimeout(() => {
      const m = meanReaction(latest.current.times);
      if (m !== null) latest.current.onDone(m);
      else {
        if (timer.current) clearTimeout(timer.current);
        setLit(false);
        setTimeUp(true);
      }
    }, TEST_MS);
    return () => clearTimeout(id);
  }, []);

  const tap = () => {
    if (timeUp) return;
    if (!lit) {
      setMessage("Too early. Wait for blue.");
      arm(); // restart the wait, so blind tapping cannot score
      return;
    }
    const ms = Math.round(performance.now() - litAt.current);
    setTimes((t) => [...t, ms]);
    setMessage(ms > MAX_MS ? `Too slow (${ms} ms), not counted.` : `${ms} ms`);
    arm();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-semibold">
        Step 4 · 3-minute reaction test
      </h2>
      <p className="text-sm text-secondary-foreground">
        Tap the square the moment it turns blue. This is the vigilance test NASA
        uses to track sleep loss. Your baseline is {baselineMs} ms.
      </p>
      <button
        type="button"
        disabled={timeUp}
        aria-label={lit ? "Reaction target, tap now" : "Reaction target, wait"}
        onPointerDown={tap}
        // Keyboard and assistive tech fire a click with no pointer (detail 0); a mouse or touch already counted on pointerdown.
        onClick={(e) => e.detail === 0 && tap()}
        className={cn(
          "flex h-48 w-full touch-manipulation select-none items-center justify-center rounded-xl border-2 text-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 sm:h-56",
          lit
            ? "border-primary bg-primary text-primary-foreground"
            : "border-dashed border-border-strong bg-tile text-muted-foreground",
        )}
      >
        {lit ? "Tap!" : "Wait…"}
      </button>
      <p aria-live="polite" className="text-sm font-medium">
        {timeUp
          ? "Time is up with fewer than 3 valid taps. Restart the test to try again."
          : message}
      </p>
      <p className="text-xs text-muted-foreground">
        Valid taps: {valid} (3 needed)
        {mean !== null && ` · mean so far ${mean} ms`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={mean === null}
          onClick={() => mean !== null && onDone(mean)}
          className="min-h-11"
        >
          Finish test
        </Button>
        {timeUp && (
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => {
              setTimes([]);
              setTimeUp(false);
              setMessage("Wait for the square to turn blue, then tap it.");
              arm();
            }}
          >
            Restart test
          </Button>
        )}
      </div>
    </div>
  );
}
