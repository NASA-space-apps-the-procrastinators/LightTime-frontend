"use client";

import { Formula } from "@/components/shared/formula";
import { StationGauge } from "@/components/shared/station-gauge";
import { useCountUp } from "@/hooks/use-count-up";
import { STATE_BORDER } from "@/lib/state-styles";
import { type StationReading, stationReadings } from "@/lib/station";
import { cn } from "@/lib/utils";

export function StationStrip() {
  return (
    <section
      aria-label="Station environment"
      className="border-b border-border-soft px-4 py-4 md:px-8"
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Station
      </h2>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {stationReadings().map((t) => (
          <StationTile key={t.id} t={t} />
        ))}
      </div>
    </section>
  );
}

// "22.4°" → digits after the point and what follows the number, so the count keeps its format.
const NUMBER = /^(-?\d+)(?:\.(\d+))?(.*)$/;

function StationTile({ t }: { t: StationReading }) {
  // Same duration and easing for both: the number counts from 0 while the needle sweeps
  // its own dial from the left end (a dial can start above 0, e.g. ppO2 at 135).
  const shown = useCountUp(t.value ?? 0);
  const g = t.gauge;
  const sweep = useCountUp(
    g && t.value !== null ? (t.value - g.min) / (g.max - g.min) : 0,
  );
  const m = t.value === null ? null : NUMBER.exec(t.display);
  const display = m ? `${shown.toFixed(m[2]?.length ?? 0)}${m[3]}` : t.display;
  return (
    <div
      data-testid={`tile-${t.id}`}
      title={`Source: ${t.source}`}
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-card px-3.5 py-3",
        t.state === "OK" ? "border-border" : STATE_BORDER[t.state],
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] uppercase tracking-widest text-muted-foreground">
          <Formula>{t.label}</Formula>
        </div>
        <div className="mt-0.5 text-2xl font-bold tabular-nums">
          {display}{" "}
          {t.unit && (
            <span className="text-xs font-medium text-muted-foreground">
              {t.unit}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span>{t.note}</span>
          {/* No pill: OK stays quiet; anything else is still spelled out, never colour alone. */}
          {t.state !== "OK" && (
            <span
              className={cn(
                "font-bold tracking-wider",
                t.state === "ALERT" ? "text-alert" : "text-watch",
              )}
            >
              {t.state}
            </span>
          )}
        </div>
      </div>
      {t.gauge && t.value !== null && (
        <div className="w-16 shrink-0 xl:w-14 2xl:w-16">
          <StationGauge
            label={t.label}
            value={t.value}
            needleValue={t.gauge.min + sweep * (t.gauge.max - t.gauge.min)}
            unit={t.id === "temp" ? "°C" : (t.unit ?? "")}
            gauge={t.gauge}
          />
        </div>
      )}
    </div>
  );
}
