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
  const [message, setMessage] = useState("Wait for green, then tap.");
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
      setMessage("Too early. Wait for green.");
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
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-heading text-xl font-semibold">
          Step 4 · Reaction test
        </h2>
        <span className="text-[13px] text-muted-foreground">
          The vigilance test NASA uses to track sleep loss · your baseline is{" "}
          {baselineMs} ms
        </span>
      </div>
      <button
        type="button"
        disabled={timeUp}
        aria-label={lit ? "Reaction target, tap now" : "Reaction target, wait"}
        onPointerDown={tap}
        // Keyboard and assistive tech fire a click with no pointer (detail 0); a mouse or touch already counted on pointerdown.
        onClick={(e) => e.detail === 0 && tap()}
        className={cn(
          "relative flex h-72 w-full touch-manipulation select-none flex-col items-center justify-center gap-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 sm:h-80",
          lit ? "bg-[#16a34a] text-white" : "bg-[#0b1220] text-slate-100",
        )}
      >
        <span className="absolute top-4 left-5 text-xs font-bold tracking-widest text-current/70">
          {timeUp ? "TIME IS UP" : `TAP ${Math.min(valid + 1, 3)} OF 3`}
        </span>
        {times.length > 0 && (
          <span className="absolute top-3.5 right-4 flex gap-2">
            {times.slice(-3).map((t, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: the last few taps, in order
                key={i}
                className={cn(
                  "border px-2.5 py-1 text-xs tabular-nums",
                  lit
                    ? "border-white/40 bg-white/15"
                    : "border-slate-700 bg-slate-900 text-slate-300",
                )}
              >
                {t} ms
              </span>
            ))}
          </span>
        )}
        <span
          aria-hidden="true"
          className={cn(
            "flex size-32 items-center justify-center rounded-full border-[3px]",
            lit ? "border-white bg-white/20" : "border-slate-700",
          )}
        >
          <span
            className={cn(
              "size-4 rounded-full",
              lit ? "bg-white" : "bg-slate-600",
            )}
          />
        </span>
        <span className="font-heading text-3xl font-semibold">
          {lit ? "Tap!" : "Wait for green…"}
        </span>
        <span className="text-sm text-current/70">
          Tap anywhere in this area the moment it turns green, or press Space.
        </span>
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
          className="min-h-11 px-5"
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
              setMessage("Wait for green, then tap.");
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
