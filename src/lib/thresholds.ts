import thresholds from "@/data/thresholds.json";
import type { MetricKey } from "@/lib/schemas";

const INDICATOR: Record<MetricKey, keyof typeof thresholds.indicators> = {
  hr_rest: "heart_rate_rest",
  bp_sys: "blood_pressure",
  bp_dia: "blood_pressure",
  spo2: "spo2",
  temp_c: "core_temperature",
  resp: "respiratory_rate",
  sleep_h: "sleep_hours",
  mood: "mood",
  pvt_ms: "reaction_time_pvt",
  dose_mSv_day: "radiation_daily_dose",
};

/** The WATCH / ALERT wording and NASA source for a metric, from thresholds.json. */
export function ruleFor(metric: MetricKey): {
  watch: string;
  alert: string;
  source: string;
} {
  const i = thresholds.indicators[INDICATOR[metric]];
  return {
    watch: i.watch,
    alert: i.alert,
    // NASA lists V1 3004 as "In-Mission Medical Care"; thresholds.json still has the old wording.
    source: i.source.replace(
      "V1 3004 vital-sign trending",
      "V1 3004 In-Mission Medical Care",
    ),
  };
}
