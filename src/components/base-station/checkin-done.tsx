"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { StatePill } from "@/components/shared/state-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { regionForMetric } from "@/data/regions";
import { clock, inSentence } from "@/lib/format";
import { useMission } from "@/lib/mission-store";
import type { Crew, MetricKey } from "@/lib/schemas";

const SUIT_METRICS: MetricKey[] = [
  "hr_rest",
  "bp_sys",
  "bp_dia",
  "temp_c",
  "spo2",
  "resp",
];

import { Formula } from "@/components/shared/formula";
import { metricStates, scoreMetric } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function CheckinDone({
  crew,
  onRedo,
}: {
  crew: Crew;
  onRedo?: () => void;
}) {
  const { state, crew: all, checkedIn } = useMission();
  const record = state.checkins[crew.id];
  if (!record) return null;

  const crewDone = all.filter(
    (c) => checkedIn.includes(c.id) || state.checkins[c.id],
  ).length;
  const delta = record.pvt_ms - crew.baseline.pvt_ms;
  const pvtState = scoreMetric("pvt_ms", record.pvt_ms, crew.baseline, {
    daysOutOfBand: 0,
    hasSymptom: record.symptoms.length > 0,
  });
  // Score with what was just entered, so this screen agrees with itself.
  const s = metricStates({
    ...crew,
    live: undefined,
    today: {
      ...crew.today,
      mood: record.mood,
      sleep_h: record.sleep_h,
      pvt_ms: record.pvt_ms,
      symptoms: record.symptoms,
    },
  });
  // Suit readings only: the check-in values are already on this screen.
  const attention = [
    ...new Set(
      SUIT_METRICS.filter((m) => s[m] === "ALERT").map((m) =>
        m === "bp_sys" || m === "bp_dia" ? "blood pressure" : inSentence(m),
      ),
    ),
  ];
  const alert = state.alerts.find(
    (a) => a.crewId === crew.id && a.stage !== "resolved",
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-ok-bg text-ok">
          <Check aria-hidden className="size-7" strokeWidth={2.5} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-2xl font-semibold">
            Check-in logged
          </h2>
          <span className="text-sm text-muted-foreground">
            {clock(record.completedAt)} · saved to {crew.name}'s record
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 border border-border-soft bg-tile px-4 py-3.5">
          <span className="text-xs text-muted-foreground">Reaction</span>
          <span className="font-heading text-3xl font-bold">
            {record.pvt_ms} ms
          </span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-secondary-foreground">
            {delta >= 0 ? "+" : ""}
            {delta} vs baseline {crew.baseline.pvt_ms} ms
            <StatePill state={pvtState} />
          </span>
        </div>
        <div className="flex flex-col gap-1 border border-border-soft bg-tile px-4 py-3.5">
          <span className="text-xs text-muted-foreground">Sleep and mood</span>
          <span className="font-heading text-3xl font-bold">
            {record.sleep_h} h · {record.mood}/5
          </span>
          <span className="text-xs text-secondary-foreground first-letter:uppercase">
            {record.symptoms.length
              ? record.symptoms.join(", ")
              : "no symptoms"}
          </span>
        </div>
        <div className="flex flex-col gap-1 border border-border-soft bg-tile px-4 py-3.5">
          <span className="text-xs text-muted-foreground">Crew</span>
          <span className="font-heading text-3xl font-bold">
            Crew {crewDone} of {all.length}
          </span>
          <span className="text-xs text-secondary-foreground">
            checked in today
          </span>
        </div>
      </div>

      {attention.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span id="attention-h" className="mr-1 text-sm font-semibold">
            {attention.length === 1
              ? "1 reading needs attention"
              : `${attention.length} readings need attention`}
          </span>
          <ul aria-labelledby="attention-h" className="flex flex-wrap gap-2">
            {attention.map((a) => (
              <li
                key={a}
                className="border border-alert/50 bg-alert-bg/50 px-3 py-1 text-[13px] font-semibold text-alert first-letter:uppercase"
              >
                <Formula>{a}</Formula>
              </li>
            ))}
          </ul>
        </div>
      )}

      {alert ? (
        <div className="flex flex-wrap items-center gap-3 border-[1.5px] border-alert/50 bg-alert-bg/30 px-4 py-3.5">
          <StatePill state="ALERT" />
          <p className="flex-1 text-sm font-medium">
            An alert is open for the flight surgeon. Your symptoms were added to
            it.
          </p>
          <Link
            href={`/base-station/crew/${crew.id}?region=${regionForMetric(alert.metric)}`}
            className={cn(buttonVariants(), "min-h-11")}
          >
            Review alert
            <ArrowRight aria-hidden />
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No open alerts.</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          href="/base-station"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "min-h-11 px-5",
          )}
        >
          Back to crew overview
        </Link>
        {onRedo && (
          <Button variant="ghost" className="min-h-11" onClick={onRedo}>
            Redo check-in
          </Button>
        )}
      </div>
    </div>
  );
}
