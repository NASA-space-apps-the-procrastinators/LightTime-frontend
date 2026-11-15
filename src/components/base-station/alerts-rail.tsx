"use client";

import { ArrowRight, BellRing } from "lucide-react";
import Link from "next/link";
import { StatePill } from "@/components/shared/state-pill";
import { buttonVariants } from "@/components/ui/button";
import { CREW, getCrew, SEEDED_CHECKINS } from "@/lib/crew";
import { clock, metricLabel, metricUnit } from "@/lib/format";
import { type AlertStage, useMission } from "@/lib/mission-store";
import { allPackets } from "@/lib/packets";
import { METRIC_KEYS } from "@/lib/schemas";
import { metricStates, metricValue } from "@/lib/scoring";
import { stationReadings } from "@/lib/station";
import { cn } from "@/lib/utils";

const STAGE_TEXT: Record<AlertStage, string> = {
  raised: "not acknowledged",
  acknowledged: "acknowledged · not sent to ground",
  sent: "sent to ground · waiting for reply",
  replied: "flight surgeon replied",
  resolved: "resolved",
};

export function AlertsRail() {
  const { state } = useMission();
  const open = state.alerts.filter((a) => a.stage !== "resolved");
  const watches = CREW.flatMap((c) => {
    const s = metricStates(c);
    return METRIC_KEYS.filter((m) => s[m] === "WATCH").map((m) => ({
      key: `${c.id}-${m}`,
      title: `${c.name} · ${metricLabel(m).toLowerCase()} ${metricValue(m, c)} ${metricUnit(m)}`,
    }));
  });
  const done = CREW.filter(
    (c) => SEEDED_CHECKINS.includes(c.id) || state.checkins[c.id],
  );
  const due = CREW.find((c) => !done.includes(c));

  return (
    <aside className="flex min-w-0 flex-col gap-4">
      <section
        aria-label="Alerts"
        className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5"
      >
        <h2 className="text-[15px] font-semibold">Alerts</h2>
        {open.map((a) => {
          const crew = getCrew(a.crewId);
          if (!crew) return null;
          return (
            <Link
              key={a.id}
              href={`/base-station/alerts/${a.id}`}
              className={cn(
                "block rounded-xl border px-3 py-2.5",
                a.stage === "raised"
                  ? "border-alert bg-alert-bg/40"
                  : "border-border",
              )}
            >
              <span className="flex items-center gap-2">
                <StatePill state="ALERT" />
                <strong className="text-[13px]">
                  {crew.name} · {metricLabel(a.metric).toLowerCase()}{" "}
                  {metricValue(a.metric, crew)} {metricUnit(a.metric)}
                </strong>
              </span>
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Raised {clock(a.raisedAt)} · {STAGE_TEXT[a.stage]}
              </span>
            </Link>
          );
        })}
        {watches.map((w) => (
          <div
            key={w.key}
            className="rounded-xl border border-watch/60 px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <StatePill state="WATCH" />
              <strong className="text-[13px]">{w.title}</strong>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Outside baseline once · silent, in the daily summary
            </div>
          </div>
        ))}
        {stationReadings()
          .filter((r) => r.id === "ppo2" && r.state === "WATCH")
          .map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-watch/60 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <StatePill state="WATCH" />
                <strong className="text-[13px]">
                  {r.label} {r.display} {r.unit}
                </strong>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Slightly above NASA target 145 to 155 mmHg · silent, in the
                daily summary
              </div>
            </div>
          ))}
        <div className="rounded-xl border border-watch/60 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <StatePill state="WATCH" />
            <strong className="text-[13px]">
              SEP event · shelter advisory
            </strong>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Dosimeters sampling every 60 s
          </div>
        </div>
        {open.length === 0 && (
          <p className="text-xs text-muted-foreground">No open alerts.</p>
        )}
      </section>

      <section
        aria-label="Check-ins due"
        className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
      >
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold">Check-ins due today</h2>
          {due && (
            <Link
              href={`/base-station/crew/${due.id}/check-in`}
              className={cn(buttonVariants({ size: "sm" }), "ml-auto min-h-10")}
            >
              Start check-in <ArrowRight aria-hidden />
            </Link>
          )}
        </div>
        <div className="flex justify-between border-b border-border-soft py-1.5 text-[13px]">
          <span>Morning vitals + mood</span>
          <span className="text-muted-foreground">
            {done.length} / {CREW.length} done
          </span>
        </div>
        {due && (
          <div className="text-[13px] text-muted-foreground">
            Due:{" "}
            {CREW.filter((c) => !done.includes(c))
              .map((c) => c.name)
              .join(", ")}
          </div>
        )}
        <div className="flex justify-between py-1.5 text-[13px]">
          <span>Weekly strength test</span>
          <span className="text-muted-foreground">due Fri</span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          Crew streak {state.streak} days · badge at 14
        </div>
      </section>

      {state.reminders.length > 0 && (
        <section
          aria-label="Reminders"
          className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <BellRing aria-hidden className="size-4 text-primary" />
            Reminders
          </h2>
          {state.reminders.map((r) => (
            <div
              key={r.id}
              className="flex justify-between border-b border-border-soft py-1.5 text-[13px] last:border-0"
            >
              <span>{r.text}</span>
              <span className="text-muted-foreground">{clock(r.dueAt)}</span>
            </div>
          ))}
        </section>
      )}
      <section
        aria-label="Recent packets"
        className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
      >
        <div className="flex items-center">
          <h2 className="text-[15px] font-semibold">Recent packets</h2>
          <Link href="/base-station/log" className="ml-auto text-xs text-link">
            Full log →
          </Link>
        </div>
        <ul className="font-mono text-[11px] leading-relaxed text-muted-foreground">
          {allPackets(new Date())
            .slice(0, 5)
            .map((p) => (
              <li key={`${p.crew_id}-${p.metric}`} className="flex gap-2">
                <span>{clock(p.ts)}</span>
                <span className="text-foreground">{p.suit_id}</span>
                <span className="truncate">
                  {p.metric} {String(p.value)}
                </span>
                <span className="ml-auto">{p.state}</span>
              </li>
            ))}
        </ul>
      </section>
    </aside>
  );
}
