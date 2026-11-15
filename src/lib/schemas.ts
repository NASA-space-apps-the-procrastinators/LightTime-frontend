import { z } from "zod";

export const stateSchema = z.enum(["OK", "WATCH", "ALERT"]);
export type State = z.infer<typeof stateSchema>;

export const METRIC_KEYS = [
  "hr_rest",
  "bp_sys",
  "bp_dia",
  "spo2",
  "temp_c",
  "resp",
  "sleep_h",
  "mood",
  "pvt_ms",
  "dose_mSv_day",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

const band = z.tuple([z.number(), z.number()]);
export type Band = z.infer<typeof band>;

export const baselineSchema = z.object({
  hr_rest: band,
  bp: z.tuple([band, band]),
  spo2: band,
  temp_c: band,
  resp: band,
  sleep_h: band,
  pvt_ms: z.number(),
  vo2max_ml_min_kg: z.number(),
});
export type Baseline = z.infer<typeof baselineSchema>;

export const crewSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  suit_id: z.string(),
  state: stateSchema,
  note: z.string(),
  baseline: baselineSchema,
  today: z.object({
    hr_rest: z.number(),
    bp: band,
    spo2: z.number(),
    temp_c: z.number(),
    resp: z.number(),
    sleep_h: z.number(),
    mood: z.number(),
    pvt_ms: z.number(),
    symptoms: z.array(z.string()),
    dose_mSv_day: z.number(),
    dose_mSv_mission: z.number(),
  }),
});
/** What the ship worked out for a crew member. Only present in live mode. */
export type LiveCrew = {
  state: State;
  metricStates: Record<MetricKey, State>;
  /** Seven daily values for a metric, oldest first, where the ship has them. */
  week: Partial<Record<MetricKey, number[]>>;
  lastPacketAt: string | null;
  /** The newest one-a-second reading from the suit, if there is one. */
  latest: {
    at: string;
    heartRate: number | null;
    spo2: number | null;
    skinTemp: number | null;
    signalOk: boolean;
  } | null;
};
export type Crew = z.infer<typeof crewSchema> & { live?: LiveCrew };

export const packetSchema = z.object({
  crew_id: z.string(),
  suit_id: z.string(),
  ts: z.iso.datetime(),
  mission_day: z.number().int(),
  location: z.string().optional(),
  source: z.enum([
    "ecg",
    "ppg",
    "cuff",
    "thermistor",
    "chest_band",
    "imu",
    "dosimeter",
    "checkin",
    "pvt",
    "lab",
    "station",
    "donki",
    "radlab",
  ]),
  metric: z.string(),
  value: z.union([z.number(), z.string(), z.array(z.number())]),
  unit: z.string(),
  signal_quality: z.number().min(0).max(1),
  window_s: z.number().int().optional(),
  baseline: band.optional(),
  rule: z.string().optional(),
  state: z.enum(["OK", "WATCH", "ALERT", "RECHECK"]).optional(),
  sent_to_ground: z.boolean().optional(),
  ack: z.iso.datetime().nullable().optional(),
});
export type Packet = z.infer<typeof packetSchema>;

export const checkinSchema = z.object({
  mood: z
    .number({ error: "Choose a mood from 1 to 5." })
    .int("Choose a mood from 1 to 5.")
    .min(1, "Choose a mood from 1 to 5.")
    .max(5, "Choose a mood from 1 to 5."),
  sleep_h: z
    .number({ error: "Sleep must be between 0 and 24 hours." })
    .min(0, "Sleep must be between 0 and 24 hours.")
    .max(24, "Sleep must be between 0 and 24 hours."),
  symptoms: z.array(z.string()),
  note: z.string().max(500, "Keep the note under 500 characters.").optional(),
});
export type Checkin = z.infer<typeof checkinSchema>;
