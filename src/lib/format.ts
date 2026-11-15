import type { MetricKey } from "@/lib/schemas";
import { LIVE } from "@/lib/ship-api";

const LABELS: Record<MetricKey, string> = {
  hr_rest: "Resting heart rate",
  bp_sys: "Systolic pressure",
  bp_dia: "Diastolic pressure",
  spo2: "SpO2",
  temp_c: "Temperature",
  resp: "Breathing rate",
  sleep_h: "Sleep",
  mood: "Mood",
  pvt_ms: "Reaction time",
  dose_mSv_day: "Radiation dose today",
};

const UNITS: Record<MetricKey, string> = {
  hr_rest: "bpm",
  bp_sys: "mmHg",
  bp_dia: "mmHg",
  spo2: "%",
  temp_c: "°C",
  resp: "/min",
  sleep_h: "h",
  mood: "/ 5",
  pvt_ms: "ms",
  dose_mSv_day: "mSv",
};

export const metricLabel = (m: MetricKey) => LABELS[m];
export const metricUnit = (m: MetricKey) => UNITS[m];

/** The metric name mid-sentence: lowercase, except formulas such as SpO2 keep their capitals. */
export const inSentence = (m: MetricKey) =>
  /O2/.test(LABELS[m]) ? LABELS[m] : LABELS[m].toLowerCase();

/** A time as milliseconds. The ship writes microseconds, which not every browser reads, so they are cut. */
export function at(iso: string): number {
  return Date.parse(`${iso.slice(0, 19)}Z`);
}

/** 24-hour HH:MM. The ship's clock is UTC; the built-in demo uses the browser's zone. */
export function clock(iso: string): string {
  if (!iso) return "";
  return new Date(at(iso)).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: LIVE ? "UTC" : undefined,
  });
}
