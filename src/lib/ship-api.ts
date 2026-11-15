import { z } from "zod";
import { CREW } from "@/lib/crew";
import type {
  Alert,
  MissionState,
  Reminder,
  ThreadMessage,
} from "@/lib/mission-store";
import {
  type Crew,
  crewSchema,
  METRIC_KEYS,
  type MetricKey,
  type State,
  stateSchema,
} from "@/lib/schemas";
import type { StationInput } from "@/lib/station";

/** The ship's address, as it was given when the console was built.
 *  Empty: seed mode, the console runs on its own demo data.
 *  "/": the ship answers at the same address this page came from (a hosted copy behind one load balancer).
 *  Anything else: that address, such as http://localhost:5000. */
export function shipAddress(raw: string | undefined): {
  live: boolean;
  base: string;
} {
  const value = (raw ?? "").trim();
  return {
    live: value !== "",
    base: value === "/" ? "" : value.replace(/\/+$/, ""),
  };
}

const address = shipAddress(process.env.NEXT_PUBLIC_API_URL);
export const API_URL = address.base;
export const LIVE = address.live;

const STAGES = [
  "raised",
  "acknowledged",
  "sent",
  "replied",
  "resolved",
] as const;

const timelineSchema = z.object({
  raised_at: z.string(),
  acknowledged_at: z.string().nullable(),
  sent_at: z.string().nullable(),
  earth_eta_s: z.number().nullable(),
  earth_at: z.string().nullable(),
  earliest_reply_at: z.string().nullable(),
  reply_at: z.string().nullable(),
  resolved_at: z.string().nullable(),
});

/** LIGHTTIME's time-left verdict, as it stood when the report left the ship. */
const lookaheadSchema = z.object({
  now: z.number(),
  per_min: z.number(),
  eta_s: z.number(),
  red_line: z.number(),
  reply_s: z.number().nullable(),
  earth_in_time: z.boolean(),
});

export const shipAlertSchema = z.object({
  id: z.string(),
  crew_id: z.string(),
  crew: z.string(),
  metric: z.string(),
  state: z.enum(["OK", "WATCH", "ALERT", "RECHECK", "SOS"]),
  level: z.string(),
  stage: z.enum(STAGES),
  value: z.number().nullable(),
  unit: z.string().nullable(),
  reason: z.string(),
  rule: z.string().nullable(),
  source: z.string().nullable(),
  symptoms: z.array(z.string()),
  steps: z.array(z.string()),
  steps_done: z.array(z.number()),
  next_step: z.string().nullable(),
  why: z.array(z.string()),
  speak: z.string().nullable(),
  lookahead: lookaheadSchema.nullable(),
  raised_by: z.enum(["console", "lighttime", "crew"]).optional(),
  timeline: timelineSchema,
});
export type ShipAlert = z.infer<typeof shipAlertSchema>;

const shipMessageSchema = z.object({
  id: z.string(),
  alert_id: z.string(),
  from: z.enum(["crew", "ground"]),
  author: z.string(),
  text: z.string(),
  kind: z.string(),
  sent_at: z.string().nullable(),
  arrived_at: z.string().nullable(),
  status: z.enum(["queued", "in_flight", "delivered"]),
});
export type ShipMessage = z.infer<typeof shipMessageSchema>;

const shipReminderSchema = z.object({
  id: z.string(),
  crew_id: z.string(),
  text: z.string(),
  due_at: z.string(),
  done_at: z.string().nullable(),
});
export type ShipReminder = z.infer<typeof shipReminderSchema>;

const stopSchema = z.object({
  stop: z.enum(["station", "moon", "mars", "sun"]),
  label: z.string(),
  link_up: z.boolean(),
  delay_s: z.number(),
  mode: z.string(),
  who_decides: z.string(),
  ship_ai_role: z.string(),
  light_time_source: z.string(),
  path_km: z.number(),
  round_trip_s: z.number(),
  plays_as_s: z.number(),
});
export const shipStateSchema = stopSchema.extend({
  speedup: z.number(),
  mission_day: z.number(),
  platform: z.string(),
  now: z.string().optional(),
  stops: z.array(stopSchema),
  ship_ai: z.object({ name: z.string(), line: z.string() }),
});
export type ShipState = z.infer<typeof shipStateSchema>;

/** 660.86 -> "11 min 1 s". Mission time, never the sped-up demo time. */
export function span(seconds: number): string {
  if (seconds < 60) return `${Number(seconds.toFixed(2))} s`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)} min ${whole % 60} s`;
}

/** The ship's alert as the store's. Null for alerts this console has no card for yet (sensor checks, manual SOS). */
export function toAlert(a: ShipAlert): Alert | null {
  const metric = METRIC_KEYS.find((key) => key === a.metric);
  if (!metric) return null;
  return {
    id: a.id,
    crewId: a.crew_id,
    metric,
    stage: a.stage,
    raisedAt: a.timeline.raised_at,
    acknowledgedAt: a.timeline.acknowledged_at,
    sentAt: a.timeline.sent_at,
    replyAt: a.timeline.reply_at,
    resolvedAt: a.timeline.resolved_at,
    symptoms: a.symptoms,
    live: a,
  };
}

export function toThreadMessage(m: ShipMessage): ThreadMessage {
  return {
    id: m.id,
    from: m.from,
    author: m.author,
    text: m.text,
    at: m.sent_at ?? "",
    alertId: m.alert_id,
    status: m.status,
  };
}

export function toReminder(r: ShipReminder): Reminder {
  return { id: r.id, text: r.text, dueAt: r.due_at };
}

/** Everything the store shows that the ship owns. Sound and this session's check-ins stay local. */
export function buildMission(input: {
  now?: string;
  alerts: ShipAlert[];
  threads: ShipMessage[][];
  reminders: ShipReminder[];
  streak: number;
}): Pick<MissionState, "alerts" | "thread" | "reminders" | "streak"> {
  const today = (input.now ?? "").slice(0, 10);
  const alerts = input.alerts
    .map(toAlert)
    .filter((a): a is Alert => a !== null)
    // An alert resolved on an earlier day is history, not this morning's work.
    .filter(
      (a) =>
        a.stage !== "resolved" || !today || a.raisedAt.slice(0, 10) === today,
    );
  return {
    alerts,
    thread: input.threads.flat().map(toThreadMessage),
    reminders: input.reminders.map(toReminder),
    streak: input.streak,
  };
}

const readingSchema = z.object({
  at: z.string(),
  heart_rate: z.number().nullable(),
  spo2: z.number().nullable(),
  skin_temp: z.number().nullable(),
  signal_ok: z.boolean(),
});

/** A crew member as the ship sends it: the console's Crew, plus the ship's own scoring and the week. */
const shipCrewSchema = crewSchema.extend({
  metric_states: z.record(z.string(), stateSchema.nullable()),
  week: z.record(z.string(), z.array(z.number().nullable())).optional(),
  last_packet_at: z.string().nullable(),
  latest: readingSchema.nullable(),
});
export type ShipCrew = z.infer<typeof shipCrewSchema>;

const cabinValue = z.object({ value: z.number(), simulated: z.boolean() });
const shipStationSchema = z.object({
  co2_mmHg: cabinValue,
  ppo2_mmHg: cabinValue,
  pressure_kPa: cabinValue,
  temp_c: cabinValue,
  rh_pct: cabinValue,
  dose_mSv_today: z.object({ value: z.number().nullable() }),
  source: z.string(),
});
export type ShipStation = z.infer<typeof shipStationSchema>;

const shipWeatherSchema = z.object({
  state: stateSchema,
  headline: z.string(),
  advisory: z.string().nullable(),
  event_at: z.string().nullable(),
  source: z.string(),
});
export type ShipWeather = z.infer<typeof shipWeatherSchema>;

/** A day with no value takes the day before's. Null when no day has one. */
function filled(days: (number | null)[]): number[] | null {
  let last = days.find((value) => value !== null) ?? null;
  if (last === null) return null;
  const out: number[] = [];
  for (const value of days) {
    last = value ?? last;
    out.push(last);
  }
  return out;
}

/** The ship's crew member as the console's, with what the ship worked out kept beside it. */
export function toCrew(c: ShipCrew): Crew {
  const { metric_states, week, last_packet_at, latest, ...person } = c;
  const metricStates = Object.fromEntries(
    METRIC_KEYS.map((key) => [key, metric_states[key] ?? "OK"]),
  ) as Record<MetricKey, State>;
  const days: Partial<Record<MetricKey, number[]>> = {};
  for (const key of METRIC_KEYS) {
    const series = filled(week?.[key] ?? []);
    if (series) days[key] = series;
  }
  return {
    ...person,
    live: {
      state: c.state,
      metricStates,
      week: days,
      lastPacketAt: last_packet_at,
      latest: latest && {
        at: latest.at,
        heartRate: latest.heart_rate,
        spo2: latest.spo2,
        skinTemp: latest.skin_temp,
        signalOk: latest.signal_ok,
      },
    },
  };
}

const CABIN = [
  "co2_mmHg",
  "ppo2_mmHg",
  "pressure_kPa",
  "temp_c",
  "rh_pct",
] as const;

/** The ship's cabin record as the station strip's input. Which values are a real NASA record is kept. */
export function toStation(
  s: ShipStation,
  w: ShipWeather,
  crew: Crew[],
): StationInput {
  return {
    values: {
      co2_mmHg: s.co2_mmHg.value,
      ppo2_mmHg: s.ppo2_mmHg.value,
      pressure_kPa: s.pressure_kPa.value,
      temp_c: s.temp_c.value,
      rh_pct: s.rh_pct.value,
    },
    dose:
      s.dose_mSv_today.value ??
      Math.max(...crew.map((c) => c.today.dose_mSv_day)),
    weather: {
      display: w.event_at ? "SEP event" : "Quiet",
      note: w.advisory ? w.advisory.split(":")[0] : w.headline,
      state: w.state,
      source: w.source,
    },
    real: CABIN.filter((key) => !s[key].simulated),
    source: s.source,
  };
}

/** One object that must fit the shape, or null. */
function one<T>(schema: z.ZodType<T>, data: unknown): T | null {
  const parsed = schema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    // Only a request with a body names its type. A plain read then skips the browser's preflight
    // request when the ship is at another address, which halves what the ship is asked.
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

/** Keep the items that fit the shape. One odd alert must not blank the whole list. */
function each<T>(schema: z.ZodType<T>, data: unknown): T[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export const ship = {
  state: async () => shipStateSchema.parse(await request("/api/base/state")),
  alerts: async () => each(shipAlertSchema, await request("/api/base/alerts")),
  thread: async (alertId: string) => {
    const data = (await request(`/api/base/alerts/${alertId}/thread`)) as {
      messages?: unknown;
    };
    return each(shipMessageSchema, data.messages);
  },
  reminders: async () =>
    each(shipReminderSchema, await request("/api/base/reminders?open=1")),
  today: async () =>
    z
      .object({ streak: z.number(), done: z.array(z.string()) })
      .parse(await request("/api/base/checkins/today")),
  crew: async () => each(shipCrewSchema, await request("/api/base/crew")),
  station: async () =>
    one(shipStationSchema, await request("/api/base/station")),
  weather: async () =>
    one(shipWeatherSchema, await request("/api/base/space-weather")),
  post: (path: string, body?: unknown) =>
    request(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
};

/** Everything the console needs from the ship, in one go. */
export async function pull(): Promise<{
  state: ShipState;
  mission: Pick<MissionState, "alerts" | "thread" | "reminders" | "streak">;
  crew: Crew[];
  checkedIn: string[];
  station: StationInput | null;
}> {
  const [state, alerts, reminders, today, shipCrew, station, weather] =
    await Promise.all([
      ship.state(),
      ship.alerts(),
      ship.reminders(),
      ship.today(),
      ship.crew(),
      ship.station(),
      ship.weather(),
    ]);
  const open = alerts.filter(
    (a) =>
      a.stage !== "resolved" && METRIC_KEYS.some((key) => key === a.metric),
  );
  const threads = await Promise.all(open.map((a) => ship.thread(a.id)));
  const live = shipCrew.map(toCrew);
  // Anyone the ship's answer does not cover keeps their built-in card, so nobody drops off the board.
  const crew = [
    ...CREW.map((seed) => live.find((c) => c.id === seed.id) ?? seed),
    ...live.filter((c) => !CREW.some((seed) => seed.id === c.id)),
  ];
  return {
    state,
    mission: buildMission({
      now: state.now,
      alerts,
      threads,
      reminders,
      streak: today.streak,
    }),
    crew,
    checkedIn: today.done,
    station: station && weather ? toStation(station, weather, crew) : null,
  };
}
