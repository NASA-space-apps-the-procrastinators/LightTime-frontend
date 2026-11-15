"use client";

import Link from "next/link";
import { AlertActions } from "@/components/base-station/alert-actions";
import { AlertSummary } from "@/components/base-station/alert-summary";
import { GroundThread } from "@/components/base-station/ground-thread";
import { LightTimeCard } from "@/components/base-station/lighttime-card";
import { RoundTrip } from "@/components/base-station/round-trip";
import { NotFoundMessage } from "@/components/shared/not-found-message";
import { StatePill } from "@/components/shared/state-pill";
import { getCrew } from "@/lib/crew";
import { clock, metricLabel } from "@/lib/format";
import { useMission } from "@/lib/mission-store";
import { cn } from "@/lib/utils";

const LEGEND = [
  { state: "OK", text: "inside the crewmember's own baseline band" },
  { state: "WATCH", text: "outside the band once; silent, yellow card" },
  {
    state: "ALERT",
    text: "outside the band 3 days running, past a NASA threshold, or with a symptom; red card, beeps until acknowledged",
  },
] as const;

export function AlertDetail({ alertId }: { alertId: string }) {
  const { state } = useMission();
  const alert = state.alerts.find((a) => a.id === alertId);
  if (!alert) return <NotFoundMessage title="Alert not found" />;

  return (
    <div className="grid gap-6 px-4 py-6 md:px-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex min-w-0 flex-col gap-4">
        <section
          aria-label="Alerts"
          className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <h2 className="text-[15px] font-semibold">Alerts</h2>
          {state.alerts.map((a) => (
            <Link
              key={a.id}
              href={`/base-station/alerts/${a.id}`}
              aria-current={a.id === alertId ? "page" : undefined}
              className={cn(
                "block rounded-lg border px-3 py-2 text-[13px]",
                a.id === alertId
                  ? "border-alert bg-alert-bg/40"
                  : "border-border",
              )}
            >
              <strong>
                {getCrew(a.crewId)?.name} ·{" "}
                {metricLabel(a.metric).toLowerCase()}
              </strong>
              <span className="block text-[11px] text-muted-foreground">
                Raised {clock(a.raisedAt)} · {a.stage}
              </span>
            </Link>
          ))}
        </section>
        <section
          aria-label="How states are decided"
          className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <h2 className="text-[15px] font-semibold">How states are decided</h2>
          {LEGEND.map((l) => (
            <div key={l.state} className="flex items-start gap-2 text-[13px]">
              <StatePill state={l.state} className="shrink-0" />
              <span>{l.text}</span>
            </div>
          ))}
        </section>
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        <AlertSummary alert={alert} />
        <LightTimeCard alert={alert} />
        <RoundTrip alert={alert} />
        <AlertActions alert={alert} />
        <GroundThread alert={alert} />
      </div>
    </div>
  );
}
