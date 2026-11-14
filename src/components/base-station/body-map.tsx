"use client";

import {
  REGION_IDS,
  REGIONS,
  type RegionId,
  regionState,
} from "@/data/regions";
import type { Crew, State } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const TAG: Record<Exclude<State, "OK">, string> = {
  WATCH: "bg-watch",
  ALERT: "bg-alert",
};

const RING: Record<State, string> = {
  OK: "border-ok",
  WATCH: "border-watch",
  ALERT: "border-alert",
};

export function BodyMap({
  crew,
  selected,
  onSelect,
}: {
  crew: Crew;
  selected: RegionId;
  onSelect: (r: RegionId) => void;
}) {
  return (
    <div className="relative mx-auto h-[560px] w-[200px]">
      <svg viewBox="0 0 200 560" width="200" height="560" aria-hidden="true">
        <g
          fill="var(--color-tile)"
          stroke="var(--color-border-strong)"
          strokeWidth="2"
        >
          <circle cx="100" cy="42" r="30" />
          <path d="M80 74 L120 74 L128 92 L150 100 L178 190 L164 196 L140 120 L136 300 L146 420 L140 540 L116 540 L112 420 L100 300 L88 420 L84 540 L60 540 L54 420 L64 300 L60 120 L36 196 L22 190 L50 100 L72 92 Z" />
        </g>
      </svg>
      {REGION_IDS.map((id) => {
        const r = REGIONS[id];
        const state = regionState(id, crew);
        const isSel = id === selected;
        return (
          <button
            key={id}
            type="button"
            aria-label={`${r.label}, ${state}`}
            aria-pressed={isSel}
            onClick={() => onSelect(id)}
            style={{ left: r.pos.x, top: r.pos.y }}
            className={cn(
              "absolute flex size-11 items-center justify-center rounded-full border-[3px] bg-tile text-[10px] font-bold text-foreground transition-shadow focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              RING[state],
              isSel &&
                "bg-card shadow-[0_0_0_3px_var(--color-card),0_0_0_5px_var(--color-primary)]",
            )}
          >
            {r.short}
            {state !== "OK" && (
              // State in words, so the map never relies on ring colour alone.
              <span
                aria-hidden
                className={cn(
                  "absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[9px] leading-4 font-bold tracking-wide text-white",
                  TAG[state],
                )}
              >
                {state}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
