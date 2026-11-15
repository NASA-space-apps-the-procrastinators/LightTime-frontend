"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { GROUND, getCrew } from "@/lib/crew";
import { type Checkin, checkinSchema, METRIC_KEYS } from "@/lib/schemas";
import {
  LIVE,
  pull,
  type ShipState,
  ship,
  shipAlertSchema,
} from "@/lib/ship-api";

const STAGES = [
  "raised",
  "acknowledged",
  "sent",
  "replied",
  "resolved",
] as const;

const iso = z.string();
const alertSchema = z.object({
  id: z.string(),
  crewId: z.string(),
  metric: z.enum(METRIC_KEYS),
  stage: z.enum(STAGES),
  raisedAt: iso,
  acknowledgedAt: iso.nullable(),
  sentAt: iso.nullable(),
  replyAt: iso.nullable(),
  resolvedAt: iso.nullable(),
  symptoms: z.array(z.string()),
  /** The alert exactly as the ship sent it. Only in live mode. */
  live: shipAlertSchema.optional(),
});
const threadMessageSchema = z.object({
  id: z.string(),
  from: z.enum(["crew", "ground"]),
  author: z.string(),
  text: z.string(),
  at: iso,
  /** Only in live mode: which alert it belongs to, and where it is on the link. */
  alertId: z.string().optional(),
  status: z.enum(["queued", "in_flight", "delivered"]).optional(),
});
const reminderSchema = z.object({
  id: z.string(),
  text: z.string(),
  dueAt: iso,
});
const checkinRecordSchema = checkinSchema.extend({
  pvt_ms: z.number(),
  completedAt: iso,
});
const missionStateSchema = z.object({
  soundOn: z.boolean(),
  alerts: z.array(alertSchema),
  thread: z.array(threadMessageSchema),
  checkins: z.record(z.string(), checkinRecordSchema),
  reminders: z.array(reminderSchema),
  streak: z.number().int(),
});

export type AlertStage = (typeof STAGES)[number];
export type Alert = z.infer<typeof alertSchema>;
export type ThreadMessage = z.infer<typeof threadMessageSchema>;
export type Reminder = z.infer<typeof reminderSchema>;
export type CheckinRecord = z.infer<typeof checkinRecordSchema>;
export type MissionState = z.infer<typeof missionStateSchema>;

export type Action =
  | { type: "toggleSound" }
  | {
      type: "completeCheckin";
      crewId: string;
      checkin: Checkin;
      pvt_ms: number;
      at: string;
    }
  | { type: "acknowledge"; alertId: string; at: string }
  | { type: "sendToGround"; alertId: string; at: string }
  | { type: "receiveReply"; alertId: string; at: string }
  | { type: "acceptPlan"; alertId: string; at: string }
  | {
      type: "postMessage";
      text: string;
      author: string;
      at: string;
      alertId?: string;
    }
  | { type: "reset" };

export const STORAGE_KEY = "light-time:mission:v1";

export const BUNDLE_TEXT =
  "Alert bundle: 7 days of heart rate, blood pressure, temperature and sleep, plus today's check-in.";
export const REPLY_TEXT =
  "Temperature every 4 hours. 500 mL more fluids today. Protected 8 h sleep window tonight. If resting heart rate passes 100 bpm or temperature passes 38 °C, call immediately. CBC added to the day-160 draw.";

const HOUR_MS = 3_600_000;

export function createInitialMission(now: Date): MissionState {
  const raised = new Date(now);
  raised.setHours(6, 12, 0, 0);
  return {
    soundOn: false,
    alerts: [
      {
        id: "A1",
        crewId: "C1",
        metric: "hr_rest",
        stage: "raised",
        raisedAt: raised.toISOString(),
        acknowledgedAt: null,
        sentAt: null,
        replyAt: null,
        resolvedAt: null,
        symptoms: [],
      },
    ],
    thread: [],
    checkins: {},
    reminders: [],
    streak: 12,
  };
}

// Each step of the round trip, the stage it needs, the stage it moves to, and what it stamps.
const STEPS = {
  acknowledge: { from: "raised", to: "acknowledged", stamp: "acknowledgedAt" },
  sendToGround: { from: "acknowledged", to: "sent", stamp: "sentAt" },
  receiveReply: { from: "sent", to: "replied", stamp: "replyAt" },
  acceptPlan: { from: "replied", to: "resolved", stamp: "resolvedAt" },
} as const;

function message(
  state: MissionState,
  from: ThreadMessage["from"],
  author: string,
  text: string,
  at: string,
): ThreadMessage {
  return { id: `M${state.thread.length + 1}`, from, author, text, at };
}

function advance(
  state: MissionState,
  action: Extract<Action, { type: keyof typeof STEPS }>,
): MissionState {
  const step = STEPS[action.type];
  const alert = state.alerts.find((a) => a.id === action.alertId);
  if (!alert || alert.stage !== step.from) return state;
  const updated: Alert = { ...alert, stage: step.to, [step.stamp]: action.at };
  const next: MissionState = {
    ...state,
    alerts: state.alerts.map((a) => (a.id === alert.id ? updated : a)),
  };
  if (action.type === "sendToGround") {
    const author = getCrew(alert.crewId)?.name ?? "Crew";
    next.thread = [
      ...state.thread,
      message(state, "crew", author, BUNDLE_TEXT, action.at),
    ];
  }
  if (action.type === "receiveReply") {
    next.thread = [
      ...state.thread,
      message(state, "ground", GROUND.flight_surgeon, REPLY_TEXT, action.at),
    ];
  }
  if (action.type === "acceptPlan") {
    const start = Date.parse(action.at);
    next.reminders = [1, 2, 3, 4].map((k) => ({
      id: `R${k}`,
      text: "Take temperature",
      dueAt: new Date(start + 4 * k * HOUR_MS).toISOString(),
    }));
  }
  return next;
}

export function missionReducer(
  state: MissionState,
  action: Action,
): MissionState {
  switch (action.type) {
    case "toggleSound":
      return { ...state, soundOn: !state.soundOn };
    case "completeCheckin": {
      // The streak is the crew's: it rises with the first check-in of the day.
      const first = Object.keys(state.checkins).length === 0;
      return {
        ...state,
        streak: first ? state.streak + 1 : state.streak,
        checkins: {
          ...state.checkins,
          [action.crewId]: {
            ...action.checkin,
            pvt_ms: action.pvt_ms,
            completedAt: action.at,
          },
        },
        alerts: state.alerts.map((a) =>
          a.crewId === action.crewId && a.stage !== "resolved"
            ? { ...a, symptoms: action.checkin.symptoms }
            : a,
        ),
      };
    }
    case "acknowledge":
    case "sendToGround":
    case "receiveReply":
    case "acceptPlan":
      return advance(state, action);
    case "postMessage": {
      const text = action.text.trim();
      if (!text) return state;
      return {
        ...state,
        thread: [
          ...state.thread,
          message(state, "crew", action.author, text, action.at),
        ],
      };
    }
    case "reset":
      return { ...createInitialMission(new Date()), soundOn: state.soundOn };
  }
}

/** Saved state from localStorage, or a fresh demo if it is missing, corrupt or from an older build. */
export function loadMission(raw: string | null, now: Date): MissionState {
  if (raw) {
    try {
      const parsed = missionStateSchema.safeParse(JSON.parse(raw));
      // Browsers block audio until a click, so every load starts muted.
      if (parsed.success) return { ...parsed.data, soundOn: false };
    } catch {
      // not JSON: fall through to a fresh demo
    }
  }
  return createInitialMission(now);
}

const MissionContext = createContext<{
  state: MissionState;
  dispatch: Dispatch<Action>;
  /** The ship's state: stop, light time, who decides. Null in seed mode or while the ship is unreachable. */
  ship: ShipState | null;
  /** False in live mode when the ship cannot be reached: the console is then on its seed. */
  online: boolean;
  refresh: () => void;
} | null>(null);

/** What an action asks of the ship. Null for actions that stay in the browser. */
function shipRequest(
  action: Action,
  state: MissionState,
): Promise<unknown> | null {
  const by = (alertId: string) => {
    const alert = state.alerts.find((a) => a.id === alertId);
    return (alert && getCrew(alert.crewId)?.name) ?? "Crew";
  };
  switch (action.type) {
    case "acknowledge":
      return ship.post(`/api/base/alerts/${action.alertId}/ack`, {
        by: by(action.alertId),
      });
    case "sendToGround":
      return ship.post(`/api/base/alerts/${action.alertId}/send`);
    case "acceptPlan":
      return ship.post(`/api/base/alerts/${action.alertId}/accept-plan`, {
        by: by(action.alertId),
      });
    case "postMessage":
      return ship.post("/api/base/messages", {
        text: action.text.trim(),
        from: action.author,
        alert_id: action.alertId,
      });
    case "completeCheckin":
      return ship.post(`/api/base/crew/${action.crewId}/checkins`, {
        ...action.checkin,
        pvt_ms: Math.round(action.pvt_ms),
      });
    case "reset":
      return ship.post("/api/base/reset");
    default:
      return null; // sound is local; a reply arrives through the link, never from a timer
  }
}

export function MissionProvider({ children }: { children: ReactNode }) {
  // Null until loaded in the browser: the demo's clock and saved state exist only there.
  const [state, setState] = useState<MissionState | null>(null);
  const [shipState, setShipState] = useState<ShipState | null>(null);
  const [online, setOnline] = useState(false);
  const latest = useRef<MissionState | null>(null);
  const busy = useRef(false);
  latest.current = state;

  const refresh = useCallback(() => {
    if (!LIVE || busy.current) return;
    busy.current = true;
    pull()
      .then(({ state: fromShip, mission }) => {
        setShipState(fromShip);
        setOnline(true);
        // Sound and this session's check-ins are the browser's. Everything else is the ship's.
        setState((s) => ({
          soundOn: s?.soundOn ?? false,
          checkins: s?.checkins ?? {},
          ...mission,
        }));
      })
      .catch(() => {
        setOnline(false);
        setShipState(null);
        // First load with no ship: fall back to the built-in demo so the console is never blank.
        setState((s) => s ?? createInitialMission(new Date()));
      })
      .finally(() => {
        busy.current = false;
      });
  }, []);

  const dispatch = useCallback<Dispatch<Action>>(
    (action) => {
      const live = LIVE && online && latest.current !== null;
      // A reply arrives through the link, never from the built-in demo's timer.
      if (live && action.type === "receiveReply") return;
      const request =
        live && latest.current ? shipRequest(action, latest.current) : null;
      // With no request the action is local: everything in seed mode, sound in live mode.
      // A check-in is both: the summary screen reads it from the store, and the ship gets a copy.
      if (!request || action.type === "completeCheckin")
        setState((s) => s && missionReducer(s, action));
      // The ship reloads the morning on a restart, so this session's check-ins go with it.
      else if (action.type === "reset")
        setState((s) => s && { ...s, checkins: {} });
      if (request) request.then(refresh, refresh);
    },
    [online, refresh],
  );

  useEffect(() => {
    if (LIVE) {
      refresh();
      const timer = setInterval(refresh, 1000);
      return () => clearInterval(timer);
    }
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage blocked (private mode): run without persistence
    }
    setState(loadMission(raw, new Date()));
  }, [refresh]);

  useEffect(() => {
    if (!state || LIVE) return; // in live mode the ship remembers, not the browser
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage full or blocked: the demo still runs in memory
    }
  }, [state]);

  if (!state)
    return (
      <p className="p-8 text-sm text-muted-foreground" aria-live="polite">
        Loading console…
      </p>
    );

  return (
    <MissionContext.Provider
      value={{ state, dispatch, ship: shipState, online, refresh }}
    >
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error("useMission must be used inside MissionProvider");
  return ctx;
}
