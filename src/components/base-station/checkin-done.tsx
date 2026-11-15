"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { StatePill } from "@/components/shared/state-pill";
import { buttonVariants } from "@/components/ui/button";
import { regionForMetric } from "@/data/regions";
import { CREW, SEEDED_CHECKINS } from "@/lib/crew";
import { inSentence } from "@/lib/format";
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

export function CheckinDone({ crew }: { crew: Crew }) {
  const { state } = useMission();
  const record = state.checkins[crew.id];
  if (!record) return null;

  const crewDone = CREW.filter(
    (c) => SEEDED_CHECKINS.includes(c.id) || state.checkins[c.id],
  ).length;
  const delta = record.pvt_ms - crew.baseline.pvt_ms;
  const pvtState = scoreMetric("pvt_ms", record.pvt_ms, crew.baseline, {
    daysOutOfBand: 0,
    hasSymptom: record.symptoms.length > 0,
  });
  // Score with what was just entered, so this screen agrees with itself.
  const s = metricStates({
    ...crew,
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
    <div className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
        <CircleCheck aria-hidden className="size-5 text-ok" />
        Check-in logged
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border-soft bg-tile px-3 py-2.5">
          <div className="text-2xl font-bold">Streak {state.streak}</div>
          <div className="text-xs text-muted-foreground">
            days · badge at 14
          </div>
        </div>
        <div className="rounded-lg border border-border-soft bg-tile px-3 py-2.5">
          <div className="text-2xl font-bold">
            Crew {crewDone} of {CREW.length}
          </div>
          <div className="text-xs text-muted-foreground">checked in today</div>
        </div>
        <div className="rounded-lg border border-border-soft bg-tile px-3 py-2.5">
          <div className="text-2xl font-bold">{record.pvt_ms} ms</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            reaction · {delta >= 0 ? "+" : ""}
            {delta} vs baseline {crew.baseline.pvt_ms} ms
            <StatePill state={pvtState} />
          </div>
        </div>
      </div>

      {attention.length > 0 && (
        <p className="text-sm text-secondary-foreground">
          {attention.length === 1
            ? "1 reading needs attention"
            : `${attention.length} readings need attention`}
          : <Formula>{attention.join(", ")}</Formula>.
        </p>
      )}

      {alert ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-alert bg-alert-bg/40 px-4 py-3">
          <StatePill state="ALERT" />
          <p className="text-sm font-medium">
            An alert is open for the flight surgeon. You can review it now.
          </p>
          <Link
            href={`/base-station/crew/${crew.id}?region=${regionForMetric(alert.metric)}`}
            className={cn(buttonVariants(), "ml-auto min-h-11")}
          >
            Review alert
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No open alerts.</p>
      )}

      <div>
        <Link
          href="/base-station"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
        >
          Back to crew
        </Link>
      </div>
    </div>
  );
}
