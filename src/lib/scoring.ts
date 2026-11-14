import { daysOutOfBand, sevenDay } from "@/lib/history";
import {
  type Band,
  type Baseline,
  type Crew,
  METRIC_KEYS,
  type MetricKey,
  type State,
} from "@/lib/schemas";

const RANK: Record<State, number> = { OK: 0, WATCH: 1, ALERT: 2 };

export function worst(states: State[]): State {
  return states.reduce<State>((a, b) => (RANK[b] > RANK[a] ? b : a), "OK");
}

export function bandFor(metric: MetricKey, baseline: Baseline): Band | null {
  switch (metric) {
    case "bp_sys":
      return baseline.bp[0];
    case "bp_dia":
      return baseline.bp[1];
    case "hr_rest":
    case "spo2":
    case "temp_c":
    case "resp":
    case "sleep_h":
      return baseline[metric];
    default:
      return null;
  }
}

export function metricValue(metric: MetricKey, crew: Crew): number {
  if (metric === "bp_sys") return crew.today.bp[0];
  if (metric === "bp_dia") return crew.today.bp[1];
  return crew.today[metric];
}

// NASA thresholds that alert on their own (thresholds.json).
function hardAlert(metric: MetricKey, value: number): boolean {
  return (
    (metric === "spo2" && value < 94) ||
    (metric === "temp_c" && value > 38.0) ||
    (metric === "dose_mSv_day" && value > 2)
  );
}

// WATCH conditions from thresholds.json, one per metric.
function outOfRange(metric: MetricKey, value: number, baseline: Baseline) {
  const band = bandFor(metric, baseline);
  const below = band !== null && value < band[0];
  const above = band !== null && value > band[1];
  switch (metric) {
    case "spo2":
      return below; // "below baseline band"
    case "temp_c":
      return above; // "above baseline band"
    case "resp":
      return value > 20; // "> 20 at rest"
    case "sleep_h":
      return below || value < 6.5;
    case "mood":
      return value <= 2;
    case "pvt_ms":
      return value > baseline.pvt_ms * 1.15;
    case "dose_mSv_day":
      return false; // only the 2 mSv hard limit applies
    default:
      return below || above; // heart rate and blood pressure: outside the band
  }
}

export function scoreMetric(
  metric: MetricKey,
  value: number,
  baseline: Baseline,
  ctx: { daysOutOfBand: number; hasSymptom: boolean },
): State {
  if (hardAlert(metric, value)) return "ALERT";
  if (!outOfRange(metric, value, baseline)) return "OK";
  return ctx.daysOutOfBand >= 3 || ctx.hasSymptom ? "ALERT" : "WATCH";
}

export function metricStates(crew: Crew): Record<MetricKey, State> {
  const hasSymptom = crew.today.symptoms.length > 0;
  const out = {} as Record<MetricKey, State>;
  for (const m of METRIC_KEYS) {
    const band = bandFor(m, crew.baseline);
    const days = band ? daysOutOfBand(sevenDay(crew, m), band) : 0;
    out[m] = scoreMetric(m, metricValue(m, crew), crew.baseline, {
      daysOutOfBand: days,
      hasSymptom,
    });
  }
  return out;
}

export function crewState(crew: Crew): State {
  return worst(Object.values(metricStates(crew)));
}
