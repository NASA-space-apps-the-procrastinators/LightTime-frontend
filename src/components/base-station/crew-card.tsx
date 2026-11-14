"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { StatePill } from "@/components/shared/state-pill";
import { buttonVariants } from "@/components/ui/button";
import { clock } from "@/lib/format";
import { useMission } from "@/lib/mission-store";
import type { Crew, State } from "@/lib/schemas";
import { crewState, metricStates, worst } from "@/lib/scoring";
import { STATE_BAR, STATE_BORDER, TILE_TINT } from "@/lib/state-styles";
import { cn } from "@/lib/utils";

function Tile({
  id,
  label,
  value,
  unit,
  state,
}: {
  id: string;
  label: string;
  value: string;
  unit?: string;
  state: State;
}) {
  return (
    <div
      data-testid={`tile-${id}`}
      data-state={state}
      className={cn("rounded-lg border px-2.5 py-2", TILE_TINT[state])}
    >
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        {label}
        {state !== "OK" && (
          <span
            className={cn(
              "font-bold tracking-wide",
              state === "ALERT" ? "text-alert" : "text-watch",
            )}
          >
            {state}
          </span>
        )}
      </div>
      <div className="text-[15px] font-semibold">
        <span>{value}</span>
        {unit && (
          <span className="ml-0.5 text-[10px] text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function CrewCard({ crew }: { crew: Crew }) {
  const { state } = useMission();
  const s = metricStates(crew);
  const overall = crewState(crew);
  // shortcut: suits send one packet a minute, so the last one is this minute; read it from packets once the log exists.
  const lastPacket = clock(new Date().toISOString());
  const t = crew.today;
  const checkedIn = Boolean(state.checkins[crew.id]);
  const needsCheckin = crew.id === "C1" && !checkedIn;
  const pulsing = state.alerts.some(
    (a) => a.crewId === crew.id && a.stage === "raised",
  );

  return (
    <article
      data-pulsing={pulsing}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border bg-card",
        STATE_BORDER[overall],
        pulsing && "alert-pulse",
      )}
    >
      <div aria-hidden className={cn("h-1.5", STATE_BAR[overall])} />
      <div className="flex flex-col gap-2.5 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div
            aria-hidden
            className="flex size-10 items-center justify-center rounded-full bg-border-soft text-sm font-bold text-link"
          >
            {crew.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/base-station/crew/${crew.id}`}
              className="text-[15px] font-bold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
            >
              {crew.name}
            </Link>
            <div className="truncate text-[11px] text-muted-foreground">
              {crew.role} · suit {crew.suit_id} · last packet {lastPacket}
            </div>
          </div>
          <StatePill state={overall} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Tile
            id="hr"
            label="HR"
            value={String(t.hr_rest)}
            unit="bpm"
            state={s.hr_rest}
          />
          <Tile
            id="bp"
            label="BP"
            value={`${t.bp[0]}/${t.bp[1]}`}
            state={worst([s.bp_sys, s.bp_dia])}
          />
          <Tile
            id="spo2"
            label="SpO2"
            value={String(t.spo2)}
            unit="%"
            state={s.spo2}
          />
          <Tile
            id="temp"
            label="Temp"
            value={String(t.temp_c)}
            unit="°C"
            state={s.temp_c}
          />
          <Tile
            id="sleep"
            label="Sleep"
            value={String(t.sleep_h)}
            unit="h"
            state={s.sleep_h}
          />
          <Tile
            id="mood"
            label="Mood"
            value={String(t.mood)}
            unit="/5"
            state={s.mood}
          />
        </div>

        <p className="text-xs text-muted-foreground">{crew.note}</p>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>Mission dose {t.dose_mSv_mission} mSv</span>
          {needsCheckin ? (
            <Link
              href={`/base-station/crew/${crew.id}/check-in`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "relative z-10 ml-auto min-h-9",
              )}
            >
              Start check-in
              <ArrowRight aria-hidden />
            </Link>
          ) : (
            <span aria-hidden className="ml-auto text-link">
              Open →
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
