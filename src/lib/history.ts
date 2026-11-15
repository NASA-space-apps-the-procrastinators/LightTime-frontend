import type { Band, Crew, MetricKey } from "@/lib/schemas";
import { bandFor, metricValue } from "@/lib/scoring";

// Fixed day-to-day wobble as a fraction of the band's half-width: stable, no randomness.
const WOBBLE = [0, 0.15, -0.1, 0.1, -0.15, 0.05];

// TJ's week is the demo's story: resting HR climbs out of band for the last 3 days.
const PINNED: Record<string, Partial<Record<MetricKey, number[]>>> = {
  C1: { hr_rest: [60, 61, 59, 62, 80, 82, 84] },
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Seven daily values, oldest first; the last one is today's reading. */
export function sevenDay(crew: Crew, metric: MetricKey): number[] {
  const fromShip = crew.live?.week[metric];
  if (fromShip) return [...fromShip];
  const pinned = PINNED[crew.id]?.[metric];
  if (pinned) return [...pinned];
  const today = metricValue(metric, crew);
  const band = bandFor(metric, crew.baseline);
  if (!band) return Array(7).fill(today);
  const mid = (band[0] + band[1]) / 2;
  const step = Math.min(1, (band[1] - band[0]) / 2);
  return [...WOBBLE.map((w) => round1(mid + w * step)), today];
}

/** Consecutive out-of-band days, counted back from today. */
export function daysOutOfBand(series: number[], band: Band): number {
  let n = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] >= band[0] && series[i] <= band[1]) break;
    n++;
  }
  return n;
}
