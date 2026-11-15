"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { FoldButton, FoldedBar } from "@/components/shared/fold";
import { Formula } from "@/components/shared/formula";
import { SimulatedTag } from "@/components/shared/simulated-tag";
import { StationGauge } from "@/components/shared/station-gauge";
import { useCountUp } from "@/hooks/use-count-up";
import { foldName, useFolded } from "@/hooks/use-folded";
import { useMission } from "@/lib/mission-store";
import { STATE_BORDER } from "@/lib/state-styles";
import { type StationReading, stationReadings } from "@/lib/station";
import { cn } from "@/lib/utils";

// What a folded bar says: short enough to stand upright, and plain text, because a
// subscript does not turn with vertical writing. The full name stays in its aria-label.
const FOLDED_LABEL: Record<StationReading["id"], string> = {
  co2: "CO2",
  ppo2: "ppO2",
  pressure: "Pressure",
  temp: "Temp / RH",
  dose: "Radiation",
  "space-weather": "Weather",
};

export function StationStrip() {
  const { station } = useMission();
  const [collapsed, toggle] = useFolded("lighttime.station.collapsed");
  const readings = stationReadings(station ?? undefined);
  // At most all but one fold: a saved state with every tile folded keeps the first one open.
  const folded = readings.every((t) => collapsed.includes(t.id))
    ? collapsed.filter((id) => id !== readings[0]?.id)
    : collapsed;
  const open = readings.filter((t) => !folded.includes(t.id));
  const shut = readings.filter((t) => folded.includes(t.id));
  const anyShut = shut.length > 0;

  // While anything is folded, an invisible copy of all six open tiles gives the height the
  // row has with everything open, at this width; the row keeps that height (xl, side by side).
  const ghost = useRef<HTMLDivElement>(null);
  const [openHeight, setOpenHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = ghost.current;
    if (!anyShut || !el || typeof ResizeObserver === "undefined") {
      setOpenHeight(null);
      return;
    }
    const watch = new ResizeObserver(() =>
      setOpenHeight(el.getBoundingClientRect().height),
    );
    watch.observe(el);
    return () => watch.disconnect();
  }, [anyShut]);
  return (
    <section
      aria-label="Station environment"
      title={station?.source}
      className="border-b border-border-soft px-4 py-4 md:px-8"
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Station
      </h2>
      <div
        className="relative flex flex-col gap-3 xl:min-h-(--open-height) xl:flex-row"
        style={
          openHeight
            ? ({ "--open-height": `${openHeight}px` } as CSSProperties)
            : undefined
        }
      >
        {anyShut && (
          <div
            ref={ghost}
            aria-hidden="true"
            inert
            className="pointer-events-none invisible absolute inset-x-0 top-0 hidden gap-3 xl:grid xl:grid-cols-6"
          >
            {readings.map((t) => (
              <StationTile key={t.id} t={t} live={!!station} measure />
            ))}
          </div>
        )}
        {open.length > 0 && (
          <div
            className="grid flex-1 grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-(--cols)"
            style={
              {
                "--cols": `repeat(${open.length}, minmax(0, 1fr))`,
              } as CSSProperties
            }
          >
            {open.map((t) => (
              <StationTile
                key={t.id}
                t={t}
                live={!!station}
                // The last open tile cannot fold away.
                onCollapse={open.length > 1 ? () => toggle(t.id) : undefined}
              />
            ))}
          </div>
        )}
        {anyShut && (
          <div className="flex flex-col gap-2 xl:flex-row">
            {shut.map((t) => (
              <FoldedBar
                key={t.id}
                name={`station-${t.id}`}
                label={FOLDED_LABEL[t.id]}
                detail={
                  <>
                    {t.display}
                    {t.unit && (
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        {t.unit}
                      </span>
                    )}
                  </>
                }
                state={t.state}
                ariaLabel={`Expand ${t.label}: ${t.display}${t.unit ? ` ${t.unit}` : ""}, ${t.state}`}
                upright="xl"
                onExpand={() => toggle(t.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// "22.4°" → digits after the point and what follows the number, so the count keeps its format.
const NUMBER = /^(-?\d+)(?:\.(\d+))?(.*)$/;

function StationTile({
  t,
  live,
  onCollapse,
  measure = false,
}: {
  t: StationReading;
  live: boolean;
  /** Absent: this tile cannot fold (it is the last one open), so it has no fold button. */
  onCollapse?: () => void;
  /** The invisible copy that only measures height: no test id, title or transition name to clash. */
  measure?: boolean;
}) {
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
      data-testid={measure ? undefined : `tile-${t.id}`}
      title={measure ? undefined : `Source: ${t.source}`}
      style={measure ? undefined : foldName(`station-${t.id}`)}
      className={cn(
        "group relative flex items-center gap-2 rounded-xl border bg-card px-3.5 py-3",
        t.state === "OK" ? "border-border" : STATE_BORDER[t.state],
      )}
    >
      {onCollapse && (
        <FoldButton
          label={t.label}
          onClick={onCollapse}
          className="absolute top-1 right-1"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate pr-6 text-[11px] uppercase tracking-widest text-muted-foreground">
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
          {/* Live: each value says whether it is NASA's cabin record or simulated. */}
          {live &&
            (t.real ? (
              <span className="font-semibold text-foreground">NASA record</span>
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
            needleValue={t.gauge.min + sweep * (t.gauge.max - t.gauge.min)}
            unit={t.id === "temp" ? "°C" : (t.unit ?? "")}
            gauge={t.gauge}
          />
        </div>
      )}
    </div>
  );
}
