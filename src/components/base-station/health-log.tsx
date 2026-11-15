"use client";

import { useEffect, useState } from "react";
import { PacketTable } from "@/components/base-station/packet-table";
import { SimulatedTag } from "@/components/shared/simulated-tag";
import { StatePill } from "@/components/shared/state-pill";
import { clock } from "@/lib/format";
import { useMission } from "@/lib/mission-store";
import { allPackets, streamHealth } from "@/lib/packets";
import type { MetricKey, Packet } from "@/lib/schemas";
import { LIVE, shipLog } from "@/lib/ship-api";

// What "Send to flight surgeon" bundles (mission-store BUNDLE_TEXT): 7 days of these plus today's check-in.
const BUNDLE: MetricKey[] = [
  "hr_rest",
  "bp_sys",
  "bp_dia",
  "temp_c",
  "sleep_h",
  "mood",
  "pvt_ms",
];

export function HealthLog() {
  const { state, crew, online } = useMission();
  const [now] = useState(() => new Date());
  const [log, setLog] = useState<Awaited<ReturnType<typeof shipLog>> | null>(
    null,
  );
  useEffect(() => {
    if (!LIVE || !online) return;
    const load = () => shipLog().then(setLog, () => setLog(null));
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [online]);
  // The ship's packets when it is there. Otherwise the console's own, as before.
  const fromShip = LIVE && online ? log : null;
  // The generator stays pure; what the crew did (acknowledged, sent) is stamped on here.
  const builtIn: Packet[] = allPackets(now, crew).map((p) => {
    const alerts = state.alerts.filter((a) => a.crewId === p.crew_id);
    const ack =
      alerts.find((a) => a.metric === p.metric)?.acknowledgedAt ?? null;
    const sent =
      BUNDLE.includes(p.metric as MetricKey) && alerts.some((a) => a.sentAt);
    return { ...p, sent_to_ground: sent, ack };
  });
  const packets = fromShip ? fromShip.packets : builtIn;
  const toGround = state.thread.filter((m) => m.from === "crew");

  return (
    <div className="grid gap-6 px-4 py-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-label="Packets" className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-heading text-[17px] font-semibold">
            Health data log
          </h1>
          <span className="text-xs text-muted-foreground">
            {fromShip
              ? "one packet a minute for each suit sensor · newest first"
              : "every packet the suits sent to the dashboard · newest first"}
          </span>
          <SimulatedTag className="ml-auto" />
        </div>
        <PacketTable packets={packets} />
      </section>

      <aside className="flex min-w-0 flex-col gap-4">
        <section
          aria-label="Packet format"
          className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <h2 className="text-[15px] font-semibold">Packet format</h2>
          <p className="text-xs text-muted-foreground">
            What the suit sends; the dashboard adds baseline, rule and state on
            arrival.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-tile p-3 font-mono text-[11px] leading-relaxed">
            {JSON.stringify(
              packets.find((p) => p.metric === "hr_rest") ?? packets[0],
              null,
              2,
            )}
          </pre>
        </section>

        <section
          aria-label="Stream health"
          className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <h2 className="text-[15px] font-semibold">Stream health</h2>
          {(fromShip ? fromShip.health : streamHealth(packets)).map((s) => (
            <div
              key={s.source}
              className="flex items-center justify-between border-b border-border-soft py-1.5 text-[13px] last:border-0"
            >
              <span className="font-mono">{s.source}</span>
              <span className="flex items-center gap-2 text-muted-foreground">
                lowest {s.lowest.toFixed(2)}
                <StatePill state={s.state} />
              </span>
            </div>
          ))}
        </section>

        <section
          aria-label="Sent to ground today"
          className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <h2 className="text-[15px] font-semibold">
            Sent to ground today ·{" "}
            {fromShip ? fromShip.sentToday : toGround.length}
          </h2>
          {toGround.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing yet. WATCH readings stay on the ship and go in the daily
              summary.
            </p>
          ) : (
            toGround.map((m) => (
              <p key={m.id} className="break-words text-[13px]">
                <span className="font-mono text-muted-foreground">
                  {clock(m.at)}
                </span>{" "}
                {m.author} · {m.text}
              </p>
            ))
          )}
        </section>
      </aside>
    </div>
  );
}
