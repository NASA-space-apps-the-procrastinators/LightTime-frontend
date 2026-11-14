import type { MetricKey } from "@/lib/schemas";

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

/** Local 24-hour HH:MM. */
export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
