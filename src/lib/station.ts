import { CREW, STATION } from "@/lib/crew";
import type { State } from "@/lib/schemas";
import { worst } from "@/lib/scoring";

export type Gauge = {
  min: number;
  max: number;
  /** NASA range the value should sit in. */
  band: [number, number];
  /** Threshold ticks drawn on the dial. */
  marks: { at: number; state: Exclude<State, "OK"> }[];
};

export type StationReading = {
  id: "co2" | "ppo2" | "pressure" | "temp" | "dose" | "space-weather";
  label: string;
  value: number | null;
  display: string;
  unit?: string;
  note: string;
  state: State;
  gauge: Gauge | null;
  source: string;
};

type Rule = "co2" | "ppo2" | "pressure" | "temp" | "rh" | "dose";

// Ranges from NASA-STD-3001 Vol 2 Rev D as summarised in OCHMO-TB-002 Rev B (14 Nov 2023),
// and from thresholds.json for CO2 and dose.
export function stationState(rule: Rule, v: number): State {
  switch (rule) {
    case "co2": // OCHMO CO2 brief: headaches from 2.8, fatigue from 4.5
      return v >= 4.5 ? "ALERT" : v >= 2.8 ? "WATCH" : "OK";
    case "ppo2": // V2 6003 normoxia target 145-155 mmHg
      return v < 145 || v > 155 ? "WATCH" : "OK";
    case "pressure": // V2 6006 indefinite exposure 34.5 < p <= 103 kPa
      return v <= 34.5 || v > 103 ? "ALERT" : "OK";
    case "temp": // V2 6013 performance zone 20-25 °C; V2 6012 health limits 18-27 °C
      return v < 18 || v > 27 ? "ALERT" : v < 20 || v > 25 ? "WATCH" : "OK";
    case "rh": // V2 6013 performance zone 30-60 %
      return v < 30 || v > 60 ? "WATCH" : "OK";
    case "dose": // thresholds.json: over 2 mSv in a day
      return v > 2 ? "ALERT" : "OK";
  }
}

export function stationReadings(): StationReading[] {
  const dose = Math.max(...CREW.map((c) => c.today.dose_mSv_day));
  return [
    {
      id: "co2",
      label: "Cabin CO2",
      value: STATION.co2_mmHg,
      display: String(STATION.co2_mmHg),
      unit: "mmHg",
      note: "WATCH from 2.8",
      state: stationState("co2", STATION.co2_mmHg),
      gauge: {
        min: 0,
        max: 5,
        band: [0, 2.8],
        marks: [
          { at: 2.8, state: "WATCH" },
          { at: 4.5, state: "ALERT" },
        ],
      },
      source: "OCHMO CO2 brief (TB-004); NASA-STD-3001 V2 6004",
    },
    {
      id: "ppo2",
      label: "Cabin ppO2",
      value: STATION.ppo2_mmHg,
      display: String(STATION.ppo2_mmHg),
      unit: "mmHg",
      note: "Target 145–155",
      state: stationState("ppo2", STATION.ppo2_mmHg),
      gauge: { min: 135, max: 165, band: [145, 155], marks: [] },
      source: "NASA-STD-3001 V2 6003 (OCHMO-TB-002)",
    },
    {
      id: "pressure",
      label: "Pressure",
      value: STATION.pressure_kPa,
      display: String(STATION.pressure_kPa),
      unit: "kPa",
      note: "Limit 34.5–103",
      state: stationState("pressure", STATION.pressure_kPa),
      gauge: { min: 30, max: 110, band: [34.5, 103], marks: [] },
      source: "NASA-STD-3001 V2 6006 (OCHMO-TB-002)",
    },
    {
      id: "temp",
      label: "Temp / RH",
      value: STATION.temp_c,
      display: `${STATION.temp_c}°`,
      unit: `/ ${STATION.rh_pct}%`,
      note: "Zone 20–25 °C",
      state: worst([
        stationState("temp", STATION.temp_c),
        stationState("rh", STATION.rh_pct),
      ]),
      gauge: {
        min: 15,
        max: 30,
        band: [20, 25],
        marks: [
          { at: 18, state: "ALERT" },
          { at: 27, state: "ALERT" },
        ],
      },
      source: "NASA-STD-3001 V2 6013, V2 6012 (OCHMO-TB-002)",
    },
    {
      id: "dose",
      label: "Radiation today",
      value: dose,
      display: dose.toFixed(2),
      unit: "mSv",
      note: "ALERT over 2",
      state: stationState("dose", dose),
      gauge: {
        min: 0,
        max: 2.5,
        band: [0, 2],
        marks: [{ at: 2, state: "ALERT" }],
      },
      source:
        "thresholds.json (NASA-STD-3001; OCHMO Radiation Protection brief)",
    },
    {
      id: "space-weather",
      label: "Space weather",
      value: null,
      display: "SEP event",
      note: "Shelter advisory",
      state: "WATCH",
      gauge: null,
      source: "Simulated solar particle event",
    },
  ];
}
