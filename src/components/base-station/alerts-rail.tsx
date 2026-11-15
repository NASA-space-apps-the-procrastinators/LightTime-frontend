"use client";

import { ArrowRight, BellRing } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { FoldButton, FoldedBar } from "@/components/shared/fold";
import { Formula } from "@/components/shared/formula";
import { StatePill } from "@/components/shared/state-pill";
import { buttonVariants } from "@/components/ui/button";
import { foldName, useFolded } from "@/hooks/use-folded";
import { at, clock, inSentence, metricUnit } from "@/lib/format";
import { type AlertStage, useMission } from "@/lib/mission-store";
import { allPackets } from "@/lib/packets";
import { METRIC_KEYS, type State } from "@/lib/schemas";
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
  const { state, crew, checkedIn, station, ship } = useMission();
  const open = state.alerts.filter((a) => a.stage !== "resolved");
  const watches = crew.flatMap((c) => {
    const s = metricStates(c);
    return METRIC_KEYS.filter((m) => s[m] === "WATCH").map((m) => ({
      key: `${c.id}-${m}`,
      title: `${c.name} · ${inSentence(m)} ${metricValue(m, c)} ${metricUnit(m)}`,
    }));
  });
  const done = crew.filter((c) => checkedIn.includes(c.id));
  const due = crew.find((c) => !done.includes(c));

  const [folded, toggle] = useFolded("lighttime.rail.collapsed");
  const panels: {
    id: string;
    label: string;
    detail?: string;
    state?: State;
    node: ReactNode;
  }[] = [
    {
      id: "alerts",
      label: "Alerts",
      detail: `${open.length} open`,
      state: open.length ? "ALERT" : watches.length ? "WATCH" : "OK",
      node: (
        <section
          style={foldName("rail-alerts")}
          aria-label="Alerts"
          className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Alerts</h2>
            <FoldButton label="Alerts" onClick={() => toggle("alerts")} />
          </div>
          {open.map((a) => {
            const person = crew.find((c) => c.id === a.crewId);
            if (!person) return null;
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
                  <StatePill
                    state={a.live?.state === "WATCH" ? "WATCH" : "ALERT"}
                    label={a.live?.state === "SOS" ? "SOS" : undefined}
                  />
                  <strong className="text-[13px]">
                    {person.name} · <Formula>{inSentence(a.metric)}</Formula>{" "}
                    {a.live?.value ?? metricValue(a.metric, person)}{" "}
                    {metricUnit(a.metric)}
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
                <strong className="text-[13px]">
                  <Formula>{w.title}</Formula>
                </strong>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                Outside baseline once · silent, in the daily summary
              </div>
            </div>
          ))}
          {stationReadings(station ?? undefined)
            .filter((r) => r.id === "ppo2" && r.state === "WATCH")
            .map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-watch/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <StatePill state="WATCH" />
                  <strong className="text-[13px]">
                    <Formula>{r.label}</Formula> {r.display} {r.unit}
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
      ),
    },
    {
      id: "checkins",
      label: "Check-ins due",
      detail: `${done.length} / ${crew.length} done`,
      node: (
        <section
          style={foldName("rail-checkins")}
          aria-label="Check-ins due"
          className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <div className="flex items-center gap-2.5">
            <h2 className="text-[15px] font-semibold">Check-ins due today</h2>
            {due && (
              <Link
                href={`/base-station/crew/${due.id}/check-in`}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "ml-auto min-h-11",
                )}
              >
                Start check-in <ArrowRight aria-hidden />
              </Link>
            )}
            <FoldButton
              label="Check-ins due"
              onClick={() => toggle("checkins")}
              className={due ? undefined : "ml-auto"}
            />
          </div>
          <div className="flex justify-between border-b border-border-soft py-1.5 text-[13px]">
            <span>Morning vitals + mood</span>
            <span className="text-muted-foreground">
              {done.length} / {crew.length} done
            </span>
          </div>
          {due && (
            <div className="text-[13px] text-muted-foreground">
              Due:{" "}
              {crew
                .filter((c) => !done.includes(c))
                .map((c) => c.name)
                .join(", ")}
            </div>
          )}
          <div className="flex justify-between py-1.5 text-[13px]">
            <span>Weekly strength test</span>
            <span className="text-muted-foreground">due Fri</span>
          </div>
        </section>
      ),
    },
    ...(state.reminders.length > 0
      ? [
          {
            id: "reminders",
            label: "Reminders",
            detail: String(state.reminders.length),
            node: (
              <section
                style={foldName("rail-reminders")}
                aria-label="Reminders"
                className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
              >
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                    <BellRing aria-hidden className="size-4 text-primary" />
                    Reminders
                  </h2>
                  <FoldButton
                    label="Reminders"
                    onClick={() => toggle("reminders")}
                  />
                </div>
                {state.reminders.map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between border-b border-border-soft py-1.5 text-[13px] last:border-0"
                  >
                    <span>{r.text}</span>
                    <span className="text-muted-foreground">
                      {clock(r.dueAt)}
                    </span>
                  </div>
                ))}
              </section>
            ),
          },
        ]
      : []),
    {
      id: "packets",
      label: "Recent packets",
      node: (
        <section
          style={foldName("rail-packets")}
          aria-label="Recent packets"
          className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <div className="flex items-center">
            <h2 className="text-[15px] font-semibold">Recent packets</h2>
            <Link
              href="/base-station/log"
              className="ml-auto inline-flex min-h-11 items-center text-xs text-link md:min-h-0"
            >
              Full log →
            </Link>
            <FoldButton
              label="Recent packets"
              onClick={() => toggle("packets")}
            />
          </div>
          <ul className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            {allPackets(ship?.now ? new Date(at(ship.now)) : new Date(), crew)
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
      ),
    },
  ];

  const shut = panels.filter((p) => folded.includes(p.id));
  const opened = panels.filter((p) => !folded.includes(p.id));
  // Wide screens: open panels keep the rail's column; folded ones stand as slivers beside it,
  // so with everything folded the crew board takes the room.
  return (
    <aside className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
      {opened.length > 0 && (
        <div className="flex min-w-0 flex-col gap-4 lg:w-[340px]">
          {opened.map((p) => (
            <Fragment key={p.id}>{p.node}</Fragment>
          ))}
        </div>
      )}
      {shut.length > 0 && (
        <div className="flex flex-col gap-2 lg:flex-row">
          {shut.map((p) => (
            <FoldedBar
              key={p.id}
              name={`rail-${p.id}`}
              label={p.label}
              detail={p.detail}
              state={p.state}
              ariaLabel={`Expand ${p.label}${p.detail ? `: ${p.detail}` : ""}`}
              upright="lg"
              className="lg:h-48"
              onExpand={() => toggle(p.id)}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
