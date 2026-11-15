"use client";

import { Formula } from "@/components/shared/formula";
import { StatePill } from "@/components/shared/state-pill";
import { REGIONS, type RegionId } from "@/data/regions";
import { metricLabel, metricUnit } from "@/lib/format";
import type { Crew, MetricKey, State } from "@/lib/schemas";
import { bandFor, metricStates, metricValue } from "@/lib/scoring";
import { TILE_TINT } from "@/lib/state-styles";
import { cn } from "@/lib/utils";

// The picked tile is outlined in its own state's colour, so selection never adds a clashing blue.
const ACTIVE_RING: Record<State, string> = {
  OK: "ring-2 ring-foreground/45",
  WATCH: "ring-2 ring-watch",
  ALERT: "ring-2 ring-alert",
};

function baselineText(metric: MetricKey, crew: Crew): string | null {
  const band = bandFor(metric, crew.baseline);
  if (band) return `Baseline ${band[0]} to ${band[1]}`;
  if (metric === "pvt_ms") return `Baseline ${crew.baseline.pvt_ms} ms`;
  return null;
}

export function MetricTiles({
  crew,
  region,
  active,
  onPick,
}: {
  crew: Crew;
  region: RegionId;
  active: MetricKey | null;
  onPick: (m: MetricKey) => void;
}) {
  const metrics = REGIONS[region].metrics;
  const states = metricStates(crew);

  if (metrics.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-border-strong bg-card px-4 py-5 text-sm text-muted-foreground">
        No reading today
        <span className="block text-xs">
          This region is measured weekly or monthly, not by the suit.
        </span>
      </div>
    );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {metrics.map((m) => {
        const base = baselineText(m, crew);
        return (
          <button
            key={m}
            type="button"
            aria-pressed={active === m}
            onClick={() => onPick(m)}
            className={cn(
              "flex min-h-11 flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              TILE_TINT[states[m]],
              active === m && ACTIVE_RING[states[m]],
            )}
          >
            <span className="text-[11px] text-muted-foreground">
              <Formula>{metricLabel(m)}</Formula>
            </span>
            <span className="text-2xl font-bold">
              {metricValue(m, crew)}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                {metricUnit(m)}
              </span>
            </span>
            <span className="flex w-full flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground">
              {base ?? "No baseline band"}
              <StatePill state={states[m]} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
