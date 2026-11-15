"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { type Checkin, type Crew, checkinSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const SYMPTOMS = [
  "Headache",
  "Short sleep",
  "Congestion",
  "Nausea",
  "Blurred vision",
  "Back pain",
];

type Field = "mood" | "sleep_h" | "note";

const MOODS = ["Very low", "Low", "OK", "Good", "Great"];
// The mouth for moods 1 to 5, from a frown to a smile, in a 24-unit face.
const MOUTH = [
  "M8 16.5 Q12 12.5 16 16.5",
  "M8 15.5 Q12 13.5 16 15.5",
  "M8.5 15h7",
  "M8 14.5 Q12 16.5 16 14.5",
  "M8 14 Q12 18 16 14",
];
const SLEEP_STEP = 0.5;

export function CheckinMood({
  crew,
  initial,
  onDone,
  onBack,
}: {
  crew: Crew;
  /** What was entered before, when the crewmember comes back to this step. */
  initial?: Checkin | null;
  onDone: (c: Checkin) => void;
  onBack?: () => void;
}) {
  const id = useId();
  const [mood, setMood] = useState<number | null>(initial?.mood ?? null);
  const [sleep, setSleep] = useState(
    String(initial?.sleep_h ?? crew.today.sleep_h),
  );
  const [symptoms, setSymptoms] = useState<string[]>(initial?.symptoms ?? []);
  const [none, setNone] = useState(
    initial ? initial.symptoms.length === 0 : false,
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const toggle = (s: string) => {
    setNone(false);
    setSymptoms((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );
  };

  const nudge = (by: number) => {
    const now = Number(sleep);
    const next = Math.min(
      24,
      Math.max(0, (Number.isFinite(now) ? now : 0) + by),
    );
    setSleep(String(Math.round(next * 10) / 10));
    setErrors(({ sleep_h: _, ...rest }) => rest);
  };

  const submit = () => {
    const parsed = checkinSchema.safeParse({
      mood: mood ?? undefined,
      sleep_h: sleep.trim() === "" ? Number.NaN : Number(sleep),
      symptoms,
      note,
    });
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const f = issue.path[0] as Field;
        next[f] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onDone(parsed.data);
  };

  const err = (f: Field) =>
    errors[f] && (
      <p
        role="alert"
        id={`${id}-${f}-err`}
        className="text-xs font-medium text-alert"
      >
        {errors[f]}
      </p>
    );

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h2 className="font-heading text-xl font-semibold">
        Step 3 · How are you this morning?
      </h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Mood right now</legend>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {MOODS.map((word, i) => {
            const v = i + 1;
            const on = mood === v;
            return (
              <label
                key={word}
                className={cn(
                  "flex h-28 cursor-pointer flex-col items-center justify-center gap-1 border-[1.5px] text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 sm:h-32",
                  on
                    ? "border-active bg-primary/[0.07] text-active shadow-[0_8px_20px_-14px_var(--primary)]"
                    : "border-border bg-card text-secondary-foreground hover:border-border-strong",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-mood`}
                  value={v}
                  checked={on}
                  aria-label={String(v)}
                  onChange={() => {
                    setMood(v);
                    setErrors(({ mood: _, ...rest }) => rest);
                  }}
                  className="sr-only"
                  aria-describedby={
                    errors.mood ? `${id}-mood-err` : `${id}-mood-hint`
                  }
                />
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-8 sm:size-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d={MOUTH[i]} />
                  <path d="M9 9.5h.01M15 9.5h.01" strokeWidth="2.4" />
                </svg>
                <strong className="text-base sm:text-lg">{v}</strong>
                <span
                  className={cn(
                    "text-[11px] sm:text-xs",
                    !on && "text-muted-foreground",
                  )}
                >
                  {word}
                </span>
              </label>
            );
          })}
        </div>
        <p id={`${id}-mood-hint`} className="sr-only">
          1 is very low, 5 is great
        </p>
        {err("mood")}
      </fieldset>

      <div className="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-sleep`} className="text-sm font-semibold">
            Sleep last night (hours)
          </label>
          <div className="flex h-12 w-56 border border-input focus-within:ring-3 focus-within:ring-ring/50">
            <button
              type="button"
              aria-label="Less sleep"
              onClick={() => nudge(-SLEEP_STEP)}
              className="w-12 shrink-0 border-r border-input bg-tile text-xl hover:bg-muted"
            >
              −
            </button>
            <input
              id={`${id}-sleep`}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="24"
              value={sleep}
              onChange={(e) => {
                const v = e.target.value;
                // A night has at most 24 hours: anything typed above that snaps back to 24.
                setSleep(v !== "" && Number(v) > 24 ? "24" : v);
                setErrors(({ sleep_h: _, ...rest }) => rest);
              }}
              aria-invalid={Boolean(errors.sleep_h)}
              aria-describedby={
                errors.sleep_h ? `${id}-sleep_h-err` : `${id}-sleep-hint`
              }
              className="min-w-0 flex-1 bg-card text-center font-heading text-lg font-bold focus-visible:outline-none aria-invalid:text-alert [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              aria-label="More sleep"
              onClick={() => nudge(SLEEP_STEP)}
              className="w-12 shrink-0 border-l border-input bg-tile text-xl hover:bg-muted"
            >
              +
            </button>
          </div>
          <p id={`${id}-sleep-hint`} className="text-xs text-muted-foreground">
            Suit actigraphy says {crew.today.sleep_h} h · 0 to 24 h
          </p>
          {err("sleep_h")}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">
            Any symptoms?{" "}
            <span className="font-normal text-muted-foreground">
              tap all that apply
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => {
              const on = symptoms.includes(s.toLowerCase());
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(s.toLowerCase())}
                  className={cn(
                    "min-h-11 border px-4 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    on
                      ? "border-[1.5px] border-active bg-primary/[0.07] text-active"
                      : "border-border bg-card",
                  )}
                >
                  {s}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={none}
              onClick={() => {
                setSymptoms([]);
                setNone(true);
              }}
              className={cn(
                "min-h-11 border px-4 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                none
                  ? "border-[1.5px] border-active bg-primary/[0.07] text-active"
                  : "border-border bg-card",
              )}
            >
              None
            </button>
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-note`} className="text-sm font-semibold">
          Anything else for the flight surgeon?{" "}
          <span className="font-normal text-muted-foreground">optional</span>
        </label>
        <textarea
          id={`${id}-note`}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={errors.note ? `${id}-note-err` : undefined}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-alert"
        />
        <p className="text-xs text-muted-foreground">{note.length} / 500</p>
        {err("note")}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-11 px-5">
          Continue
          <ArrowRight aria-hidden />
        </Button>
        {onBack && (
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            onClick={onBack}
          >
            <ArrowLeft aria-hidden />
            Back to capture
          </Button>
        )}
      </div>
    </form>
  );
}
