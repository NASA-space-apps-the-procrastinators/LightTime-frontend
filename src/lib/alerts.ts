import { metricLabel, metricUnit } from "@/lib/format";
import { daysOutOfBand, sevenDay } from "@/lib/history";
import type { Crew, MetricKey } from "@/lib/schemas";
import { bandFor, metricValue } from "@/lib/scoring";

const ORDINAL = ["", "1st", "2nd", "3rd"];

/** "Resting heart rate 84 bpm, 3rd day over baseline": one wording for the alert page and the notification. */
export function alertHeadline(crew: Crew, m: MetricKey): string {
  const band = bandFor(m, crew.baseline);
  const days = band ? daysOutOfBand(sevenDay(crew, m), band) : 0;
  return `${metricLabel(m)} ${metricValue(m, crew)} ${metricUnit(m)}, ${
    days > 0
      ? `${ORDINAL[days] ?? `${days}th`} day over baseline`
      : "outside baseline"
  }`;
}
