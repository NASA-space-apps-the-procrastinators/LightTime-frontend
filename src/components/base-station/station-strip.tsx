import { SimulatedTag } from "@/components/shared/simulated-tag";
import { StatePill } from "@/components/shared/state-pill";
import { CREW, STATION } from "@/lib/crew";
import type { State } from "@/lib/schemas";
import { STATE_BORDER } from "@/lib/state-styles";
import { cn } from "@/lib/utils";

type Tile = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  note?: string;
  state: State;
};

// CO2 bands from thresholds.json: WATCH at 2.8 mmHg, ALERT at 4.5.
const co2State = (v: number): State =>
  v >= 4.5 ? "ALERT" : v >= 2.8 ? "WATCH" : "OK";

export function StationStrip() {
  const dose = Math.max(...CREW.map((c) => c.today.dose_mSv_day));
  const tiles: Tile[] = [
    {
      id: "co2",
      label: "Cabin CO2",
      value: String(STATION.co2_mmHg),
      unit: "mmHg",
      note: "WATCH from 2.8",
      state: co2State(STATION.co2_mmHg),
    },
    {
      id: "ppo2",
      label: "ppO2",
      value: String(STATION.ppo2_mmHg),
      unit: "mmHg",
      state: "OK",
    },
    {
      id: "pressure",
      label: "Pressure",
      value: String(STATION.pressure_kPa),
      unit: "kPa",
      state: "OK",
    },
    {
      id: "temp",
      label: "Temp / RH",
      value: `${STATION.temp_c}°`,
      unit: `/ ${STATION.rh_pct}%`,
      state: "OK",
    },
    {
      id: "dose",
      label: "Radiation today",
      value: dose.toFixed(2),
      unit: "mSv",
      note: "ALERT over 2",
      state: dose > 2 ? "ALERT" : "OK",
    },
    {
      id: "space-weather",
      label: "Space weather",
      value: "SEP event",
      note: "Shelter advisory",
      state: "WATCH",
    },
  ];

  return (
    <section
      aria-label="Station environment"
      className="border-b border-border-soft px-4 py-4 md:px-8"
    >
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Station
        </h2>
        <SimulatedTag />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <div
            key={t.id}
            data-testid={`tile-${t.id}`}
            className={cn(
              "rounded-xl border bg-card px-3.5 py-3",
              t.state === "OK" ? "border-border" : STATE_BORDER[t.state],
            )}
          >
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {t.label}
            </div>
            <div className="mt-0.5 text-2xl font-bold">
              {t.value}{" "}
              {t.unit && (
                <span className="text-xs font-medium text-muted-foreground">
                  {t.unit}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              {t.note && <span>{t.note}</span>}
              <StatePill state={t.state} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
