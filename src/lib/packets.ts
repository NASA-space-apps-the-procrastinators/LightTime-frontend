import { CREW, MISSION } from "@/lib/crew";
import { metricUnit } from "@/lib/format";
import {
  type Crew,
  METRIC_KEYS,
  type MetricKey,
  type Packet,
} from "@/lib/schemas";
import { bandFor, metricStates, metricValue } from "@/lib/scoring";
import { ruleFor } from "@/lib/thresholds";

const SOURCE: Record<MetricKey, Packet["source"]> = {
  hr_rest: "ecg",
  bp_sys: "cuff",
  bp_dia: "cuff",
  spo2: "ppg",
  temp_c: "thermistor",
  resp: "chest_band",
  sleep_h: "imu",
  mood: "checkin",
  pvt_ms: "pvt",
  dose_mSv_day: "dosimeter",
};

// Under 0.6 a reading is RECHECK and never trips an ALERT (packet-schema.json).
const RECHECK_BELOW = 0.6;
// One weak sensor in the seed, so stream health has something to show.
const WEAK: Record<string, Partial<Record<MetricKey, number>>> = {
  C2: { resp: 0.52 },
};

/** One packet per metric for today, a minute apart, the last one at `now`. */
export function packetsFor(crew: Crew, now: Date): Packet[] {
  const states = metricStates(crew);
  return METRIC_KEYS.map((metric, i) => {
    const signal_quality = WEAK[crew.id]?.[metric] ?? 0.93;
    const band = bandFor(metric, crew.baseline);
    return {
      crew_id: crew.id,
      suit_id: crew.suit_id,
      ts: new Date(
        now.getTime() - (METRIC_KEYS.length - 1 - i) * 60_000,
      ).toISOString(),
      mission_day: MISSION.mission_day,
      location: MISSION.platform,
      source: SOURCE[metric],
      metric,
      value: metricValue(metric, crew),
      unit: metricUnit(metric),
      signal_quality,
      window_s: 60,
      ...(band ? { baseline: band } : {}),
      rule: ruleFor(metric).alert,
      state: signal_quality < RECHECK_BELOW ? "RECHECK" : states[metric],
      sent_to_ground: false,
      ack: null,
    };
  });
}

/** Every crewmember's packets, newest first. */
export function allPackets(now: Date): Packet[] {
  return CREW.flatMap((c) => packetsFor(c, now)).sort((a, b) =>
    b.ts.localeCompare(a.ts),
  );
}

/** Lowest signal quality per sensor. */
export function streamHealth(packets: Packet[]) {
  const lowest = new Map<string, number>();
  for (const p of packets)
    lowest.set(p.source, Math.min(lowest.get(p.source) ?? 1, p.signal_quality));
  return [...lowest].map(([source, q]) => ({
    source,
    lowest: q,
    state: q < RECHECK_BELOW ? ("RECHECK" as const) : ("OK" as const),
  }));
}
