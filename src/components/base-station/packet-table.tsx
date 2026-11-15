"use client";

import { useState } from "react";
import { StatePill } from "@/components/shared/state-pill";
import { CREW, getCrew } from "@/lib/crew";
import { clock } from "@/lib/format";
import type { Packet } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const STATES = ["OK", "WATCH", "ALERT", "RECHECK"] as const;

function Chip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border px-3.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        on ? "border-active bg-border-soft" : "border-border-strong bg-card",
      )}
    >
      {label}
    </button>
  );
}

export function PacketTable({ packets }: { packets: Packet[] }) {
  const [crew, setCrew] = useState<string | null>(null);
  const [state, setState] = useState<Packet["state"] | null>(null);
  const shown = packets.filter(
    (p) => (!crew || p.crew_id === crew) && (!state || p.state === state),
  );

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Filter by crew</legend>
        <Chip label="All crew" on={!crew} onClick={() => setCrew(null)} />
        {CREW.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            on={crew === c.id}
            onClick={() => setCrew(c.id)}
          />
        ))}
      </fieldset>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Filter by state</legend>
        <Chip label="All states" on={!state} onClick={() => setState(null)} />
        {STATES.map((s) => (
          <Chip
            key={s}
            label={s}
            on={state === s}
            onClick={() => setState(s)}
          />
        ))}
      </fieldset>

      {/* The table scrolls inside its own box on a phone; the page never scrolls sideways. */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-border-soft text-muted-foreground">
            <tr>
              {[
                "Time",
                "Crew",
                "Source",
                "Metric",
                "Value",
                "Baseline band",
                "State",
                "Ground",
              ].map((h) => (
                <th key={h} scope="col" className="px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr
                key={`${p.crew_id}-${p.metric}-${p.ts}`}
                className="border-b border-border-soft last:border-0"
              >
                <td className="px-3 py-2 font-mono">{clock(p.ts)}</td>
                <td className="px-3 py-2">{getCrew(p.crew_id)?.name}</td>
                <td className="px-3 py-2 font-mono">{p.source}</td>
                <td className="px-3 py-2 font-mono">{p.metric}</td>
                <td className="px-3 py-2 font-semibold">
                  {String(p.value)}{" "}
                  <span className="font-normal text-muted-foreground">
                    {p.unit}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {p.baseline ? `${p.baseline[0]} to ${p.baseline[1]}` : "none"}
                </td>
                <td className="px-3 py-2">
                  {p.state && <StatePill state={p.state} />}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {p.sent_to_ground ? "Sent" : "On ship"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No packets match these filters.
          </p>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Showing {shown.length} packets · continuous streams are summarised to
        one packet per minute; check-in entries and cuff readings are logged as
        sent.
      </p>
    </div>
  );
}
