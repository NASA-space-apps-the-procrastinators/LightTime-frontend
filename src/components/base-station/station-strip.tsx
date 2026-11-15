"use client";

import { SimulatedTag } from "@/components/shared/simulated-tag";
import { StatePill } from "@/components/shared/state-pill";
import { StationGauge } from "@/components/shared/station-gauge";
import { useMission } from "@/lib/mission-store";
import { STATE_BORDER } from "@/lib/state-styles";
import { stationReadings } from "@/lib/station";
import { cn } from "@/lib/utils";

export function StationStrip() {
  const { station } = useMission();
  return (
    <section
      aria-label="Station environment"
      title={station?.source}
      className="border-b border-border-soft px-4 py-4 md:px-8"
    >
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Station
        </h2>
        {!station && <SimulatedTag />}
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        {stationReadings(station ?? undefined).map((t) => (
          <div
            key={t.id}
            data-testid={`tile-${t.id}`}
            title={`Source: ${t.source}`}
            className={cn(
              "flex items-center gap-2 rounded-xl border bg-card px-3.5 py-3",
              t.state === "OK" ? "border-border" : STATE_BORDER[t.state],
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] uppercase tracking-widest text-muted-foreground">
                {t.label}
              </div>
              <div className="mt-0.5 text-2xl font-bold">
                {t.display}{" "}
                {t.unit && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {t.unit}
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                <span>{t.note}</span>
                <StatePill state={t.state} />
                {station &&
                  (t.real ? (
                    <span className="font-semibold text-foreground">
                      NASA record
                    </span>
                  ) : (
                    <SimulatedTag />
                  ))}
              </div>
            </div>
            {t.gauge && t.value !== null && (
              <div className="w-16 shrink-0 xl:w-14 2xl:w-16">
                <StationGauge
                  label={t.label}
                  value={t.value}
                  unit={t.id === "temp" ? "°C" : (t.unit ?? "")}
                  gauge={t.gauge}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
