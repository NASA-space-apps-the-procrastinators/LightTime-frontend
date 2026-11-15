"use client";

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

export function CheckinMood({
  crew,
  onDone,
}: {
  crew: Crew;
  onDone: (c: Checkin) => void;
}) {
  const id = useId();
  const [mood, setMood] = useState<number | null>(null);
  const [sleep, setSleep] = useState(String(crew.today.sleep_h));
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [none, setNone] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const toggle = (s: string) => {
    setNone(false);
    setSymptoms((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );
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
      <h2 className="font-heading text-lg font-semibold">
        Step 3 · How are you doing?
      </h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">Mood right now</legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((v) => (
            <label
              key={v}
              className={cn(
                "flex size-11 cursor-pointer items-center justify-center rounded-full border text-sm font-semibold has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                mood === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-strong bg-card",
              )}
            >
              <input
                type="radio"
                name={`${id}-mood`}
                value={v}
                checked={mood === v}
                onChange={() => {
                  setMood(v);
                  setErrors(({ mood: _, ...rest }) => rest);
                }}
                className="sr-only"
                aria-describedby={errors.mood ? `${id}-mood-err` : undefined}
              />
              {v}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          1 = very low · 5 = great
        </p>
        {err("mood")}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-sleep`} className="text-sm font-semibold">
          Sleep last night (hours)
        </label>
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
          className="h-11 w-32 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-alert"
        />
        <p id={`${id}-sleep-hint`} className="text-xs text-muted-foreground">
          Suit actigraphy says {crew.today.sleep_h} h. Change it if that is
          wrong.
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
                  "min-h-11 rounded-full border px-3.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on
                    ? "border-primary bg-border-soft"
                    : "border-border-strong bg-card",
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
              "min-h-11 rounded-full border px-3.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              none
                ? "border-primary bg-border-soft"
                : "border-border-strong bg-card",
            )}
          >
            None
          </button>
        </div>
      </fieldset>

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

      <div>
        <Button type="submit" className="min-h-11">
          Continue
        </Button>
      </div>
    </form>
  );
}
