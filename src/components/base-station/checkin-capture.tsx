"use client";

import {
  Droplet,
  Gauge,
  HeartPulse,
  type LucideIcon,
  Thermometer,
  Wind,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Formula } from "@/components/shared/formula";
import { StatePill } from "@/components/shared/state-pill";
import { Button } from "@/components/ui/button";
import { metricLabel, metricUnit } from "@/lib/format";
import type { Crew, MetricKey } from "@/lib/schemas";
import { bandFor, metricStates, metricValue, worst } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Tone = {
  tint: string; // captured: soft tile, coloured icon
  solid: string; // being read: filled tile, white icon
  border: string;
  track: string;
  bar: string;
  text: string;
};

// Each vital in the colour a monitor usually gives it. Pink and orange, not the
// red and amber that mean ALERT and WATCH; the state is always the pill's word.
const TONE: Record<string, Tone> = {
  heart: {
    tint: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
    solid: "bg-pink-600 text-white",
    border: "border-pink-600",
    track: "bg-pink-600/15",
    bar: "bg-pink-600",
    text: "text-pink-700 dark:text-pink-300",
  },
  oxygen: {
    tint: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    solid: "bg-sky-600 text-white",
    border: "border-sky-600",
    track: "bg-sky-600/15",
    bar: "bg-sky-600",
    text: "text-sky-700 dark:text-sky-300",
  },
  pressure: {
    tint: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    solid: "bg-violet-600 text-white",
    border: "border-violet-600",
    track: "bg-violet-600/15",
    bar: "bg-violet-600",
    text: "text-violet-700 dark:text-violet-300",
  },
  temperature: {
    tint: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    solid: "bg-orange-600 text-white",
    border: "border-orange-600",
    track: "bg-orange-600/15",
    bar: "bg-orange-600",
    text: "text-orange-700 dark:text-orange-300",
  },
  breathing: {
    tint: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    solid: "bg-teal-600 text-white",
    border: "border-teal-600",
    track: "bg-teal-600/15",
    bar: "bg-teal-600",
    text: "text-teal-700 dark:text-teal-300",
  },
};

const ROWS: {
  key: MetricKey | "bp";
  label: string;
  icon: LucideIcon;
  tone: Tone;
}[] = [
  {
    key: "hr_rest",
    label: metricLabel("hr_rest"),
    icon: HeartPulse,
    tone: TONE.heart,
  },
  { key: "spo2", label: metricLabel("spo2"), icon: Droplet, tone: TONE.oxygen },
  { key: "bp", label: "Blood pressure", icon: Gauge, tone: TONE.pressure },
  {
    key: "temp_c",
    label: metricLabel("temp_c"),
    icon: Thermometer,
    tone: TONE.temperature,
  },
  { key: "resp", label: metricLabel("resp"), icon: Wind, tone: TONE.breathing },
];

const RING = 2 * Math.PI * 100;
const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The suit reads the crewmember for durationMs; each vital lands in turn, in an even share of it.
 * The wait is real: "Skip the wait" ends it at once, for a demo.
 */
export function CheckinCapture({
  crew,
  onDone,
  durationMs = 120_000,
  startDone = false,
}: {
  crew: Crew;
  onDone: () => void;
  durationMs?: number;
  /** Already captured this session: show the results, not a fresh countdown. */
  startDone?: boolean;
}) {
  const [elapsed, setElapsed] = useState(startDone ? durationMs : 0);
  const finished = elapsed >= durationMs;

  useEffect(() => {
    if (finished) return;
    const id = setInterval(
      () => setElapsed((e) => Math.min(durationMs, e + 250)),
      250,
    );
    return () => clearInterval(id);
  }, [finished, durationMs]);

  const s = metricStates(crew);
  const b = crew.baseline;
  const slot = durationMs / ROWS.length;
  const captured = Math.min(ROWS.length, Math.floor(elapsed / slot));
  const left = durationMs - elapsed;

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative size-64">
          <svg
            viewBox="0 0 240 240"
            className="size-full -rotate-90"
            role="img"
            aria-label={
              finished
                ? "Capture complete"
                : `${mmss(left)} left of ${mmss(durationMs)}`
            }
          >
            <circle
              cx="120"
              cy="120"
              r="100"
              fill="none"
              strokeWidth="14"
              className="stroke-border"
            />
            <circle
              cx="120"
              cy="120"
              r="100"
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - elapsed / durationMs)}
              className={cn(
                "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300",
                finished ? "stroke-ok" : "stroke-active",
              )}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-5xl font-bold tabular-nums">
              {finished ? "Done" : mmss(left)}
            </span>
            <span className="mt-1 text-[13px] text-muted-foreground">
              {finished ? "all five captured" : `left of ${mmss(durationMs)}`}
            </span>
          </div>
        </div>
        <p className="text-center text-sm text-secondary-foreground">
          {finished
            ? "You can move now."
            : "Sit still, arm at heart level. The suit is reading you now."}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-2.5">
        <h2 className="mb-1 font-heading text-xl font-semibold">
          Step 2 · {finished ? "Vitals captured" : "Capturing your vitals"}
        </h2>
        {ROWS.map(({ key, label, icon: Icon, tone }, i) => {
          const state = key === "bp" ? worst([s.bp_sys, s.bp_dia]) : s[key];
          const value =
            key === "bp"
              ? `${crew.today.bp[0]}/${crew.today.bp[1]}`
              : String(metricValue(key, crew));
          const unit = key === "bp" ? "mmHg" : metricUnit(key);
          const band =
            key === "bp"
              ? `band ${b.bp[0][0]}–${b.bp[0][1]} / ${b.bp[1][0]}–${b.bp[1][1]}`
              : (() => {
                  const bd = bandFor(key, b);
                  return bd ? `band ${bd[0]}–${bd[1]}` : "";
                })();

          if (i < captured)
            return (
              <div
                key={key}
                data-testid={`capture-${key}`}
                className="flex items-center gap-3 border border-border-soft bg-card px-4 py-2.5"
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center",
                    tone.tint,
                  )}
                >
                  <Icon aria-hidden className="size-4.5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong className="text-sm">
                    <Formula>{label}</Formula>
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {state === "OK" ? "in " : "outside "}your {band}
                    {state !== "OK" && " · checked again later"}
                  </span>
                </span>
                <span className="font-heading text-xl font-bold whitespace-nowrap">
                  {value}{" "}
                  <span className="font-sans text-xs font-medium text-muted-foreground">
                    {unit}
                  </span>
                </span>
                <StatePill state={state === "OK" ? "OK" : "RECHECK"} />
              </div>
            );

          if (i === captured)
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-3 border-[1.5px] bg-card px-4 py-2.5",
                  tone.border,
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center",
                    tone.solid,
                  )}
                >
                  <Icon aria-hidden className="size-4.5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <strong className="text-sm">
                    <Formula>{label}</Formula>
                  </strong>
                  <span aria-hidden className={cn("h-1", tone.track)}>
                    <span
                      className={cn(
                        "block h-full motion-safe:transition-[width] motion-safe:duration-300",
                        tone.bar,
                      )}
                      style={{
                        width: `${Math.min(100, ((elapsed % slot) / slot) * 100)}%`,
                      }}
                    />
                  </span>
                </span>
                <span className={cn("text-[13px] font-bold", tone.text)}>
                  Reading…
                </span>
              </div>
            );

          return (
            <div
              key={key}
              className="flex items-center gap-3 border border-dashed border-border bg-tile px-4 py-2.5 text-muted-foreground"
            >
              <span className="flex size-9 shrink-0 items-center justify-center bg-muted">
                <Icon aria-hidden className="size-4.5" />
              </span>
              <strong className="flex-1 text-sm">
                <Formula>{label}</Formula>
              </strong>
              <span className="text-[13px]">waiting</span>
            </div>
          );
        })}

        <p aria-live="polite" className="sr-only">
          {captured} of {ROWS.length} captured
        </p>
        <p className="text-xs text-muted-foreground">
          Signal quality: ECG good · PPG good · cuff good · packets logged to
          the dashboard as they arrive.
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <Button
            onClick={onDone}
            disabled={!finished}
            className="min-h-11 px-5"
          >
            {finished
              ? "Looks right, continue"
              : `Capturing… ${mmss(left)} left`}
          </Button>
          {!finished && (
            <Button
              variant="ghost"
              className="min-h-11"
              onClick={() => setElapsed(durationMs)}
            >
              Skip the wait (demo)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
