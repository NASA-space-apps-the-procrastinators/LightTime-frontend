# Console Wiring: Every Screen on the Real Ship

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read `AGENTS.md` first: this Next.js version differs from older ones, so read the guide it points to before touching a page, a layout or a route.

**Goal:** The console's alert loop runs through the ship's delayed link, the header carries the dial, LIGHTTIME is seen and heard, a second page is the Earth console, and the crew cards, the station strip and the log read the ship. With no ship address set, the console behaves exactly as it does today.

**Architecture:** The store stays the single thing components read. In live mode (`NEXT_PUBLIC_API_URL` set) the store's alerts, thread, reminders and streak come from polling the ship once a second, and an action is a request to the ship followed by a refresh. From Task 8 the crew, who has checked in and the cabin come the same way, and the console stops scoring: it shows the ship's states. In seed mode nothing changes. One new file holds every shape and call (`src/lib/ship-api.ts`). Components change only where they need a field the store never had.

**Tech Stack:** Next.js 16, React 19, TypeScript, zod 4, Tailwind, Biome, Vitest, pnpm.

**Spec:** in the backend repo, `docs/specs/2026-11-15-demo-day-design.md` (sections 4 to 10, requirements R1 to R10) and `docs/specs/2026-11-14-console-data-design.md` (shapes). Words: the backend repo's `CONTEXT.md`.

**Status of this plan:** written Saturday at 22:30 by reading `main` at `10ffb32` and the backend at `039607f` (the same code as `5c5eff3`, where its `main` is merged in). **None of this code has been run or type-checked.** Treat each block as a careful draft. Tasks 3, 4, 5 and 8 read fields that arrive with Task 1 of the backend's plan (`now`, `raised_by`, `week`), and Task 9 needs its Task 3 (the log routes). Do those backend tasks first: without `raised_by` the LIGHTTIME card never shows.

## Rules

1. One task at a time. After each: `pnpm typecheck`, `pnpm lint`, `pnpm test`, then look at the page in the browser, then commit.
2. Seed mode must keep working after every task: unset `NEXT_PUBLIC_API_URL`, restart `pnpm dev`, click through the alert loop.
3. Do not restyle anything. New pieces use the classes already on the page next to them.
4. Order is by where the delay shows. Stop after any task: each one leaves a working console.
5. No team member's name in code, comments or commit messages.
6. The app's own words never say "machine learning", "trained", "validated" or "predicts illness". LIGHTTIME is rules and statistics, and a person decides.
7. `main` deploys by itself: every merge rebuilds the hosted console. The hosted console is built with no ship address, so what it runs is seed mode. That is one more reason Rule 2 is checked after every task, and why the pull request is opened only after it passes.

## File map

| File | New or changed | What it holds |
|---|---|---|
| `src/lib/ship-api.ts` | new | The ship's shapes (zod), adapters into the store's shapes, the calls, `span()` |
| `src/lib/ship-api.test.ts` | new | Tests for the adapters and `span()` |
| `src/lib/mission-store.tsx` | changed | Three optional fields; live polling; live actions; `ship`, `online`, `refresh` on the context, then `crew`, `checkedIn`, `station` |
| `src/lib/format.ts` | changed | `clock()` prints UTC in live mode; `at()` reads a ship time in any browser |
| `src/components/base-station/dial.tsx` | new | The four stops |
| `src/components/base-station/app-header.tsx` | changed | Live mission day, link line, dial, story button |
| `src/components/base-station/alert-summary.tsx`, `alert-actions.tsx`, `ground-thread.tsx` | changed | Read the live alert where there is one |
| `src/components/base-station/lighttime-card.tsx` | new | LIGHTTIME's sentence, time left, reasons, checklist |
| `src/components/base-station/console-effects.tsx` | changed | Speaks LIGHTTIME's sentence once |
| `src/app/command-center/page.tsx`, `src/components/command-center/earth-console.tsx` | new | The Earth console |
| `src/app/layout.tsx`, `src/app/base-station/layout.tsx` | changed | The store wraps the ship's console only, so the Earth console never asks the ship's own routes |
| `src/lib/schemas.ts`, `src/lib/scoring.ts`, `src/lib/history.ts` | changed | A crew member may carry what the ship worked out, and the console's own scoring steps aside for it |
| `src/lib/station.ts`, `src/lib/packets.ts` | changed | The station strip and the built-in packets take their numbers as arguments |
| `src/components/base-station/crew-board.tsx` | new | The overview's crew cards, read from the store |
| `src/app/base-station/page.tsx`, `crew-card.tsx`, `alerts-rail.tsx`, `astronaut-detail.tsx`, `checkin-flow.tsx`, `checkin-done.tsx`, `station-strip.tsx` | changed | Read the crew, who has checked in and the cabin from the store |
| `src/components/base-station/health-log.tsx` | changed | Follows the ship's crew, then reads the ship's packets |
| `Dockerfile` | changed | The image can be given the ship's address when it is built |

---

### Task 0: Branch, ship address, baseline

- [ ] **Step 1:** `git switch -c feat/live-ship`. `pnpm install`. `pnpm typecheck`, `pnpm lint`, `pnpm test`: all pass. If not, stop: fix the baseline first.
- [ ] **Step 2:** Start the ship in the backend repo: `python app.py` with `LIGHTTIME_MORNING=1` in its `.env`. Check `http://localhost:5000/api/base/state` in a browser: `"stop": "mars"`, `"mission_day": 158`.
- [ ] **Step 3:** Create `.env.local` (git-ignored) with `NEXT_PUBLIC_API_URL=http://localhost:5000`. If the console runs on another machine, it is the ship machine's address in place of `localhost`. `pnpm dev` must be restarted after changing it.

---

### Task 1: The ship's shapes, adapters and calls

**Files:** new `src/lib/ship-api.ts`, new `src/lib/ship-api.test.ts`; `src/lib/mission-store.tsx` (schema fields only).

- [ ] **Step 1:** In `src/lib/mission-store.tsx`, three optional fields, so a live alert can carry what the ship said and a message can name its alert. Import the ship's alert schema at the top (`import { shipAlertSchema } from "@/lib/ship-api";`) and change the three schemas:

```ts
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
```

and add `alertId?: string` to the `postMessage` action:

```ts
  | { type: "postMessage"; text: string; author: string; at: string; alertId?: string }
```

`ship-api.ts` imports only types from the store, so the two files do not form a runtime cycle.

- [ ] **Step 2: Write the failing tests.** Create `src/lib/ship-api.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMission, type ShipAlert, shipAddress, span, toAlert, toThreadMessage } from "@/lib/ship-api";

const A1: ShipAlert = {
  id: "A1", crew_id: "C1", crew: "Okafor", metric: "hr_rest", state: "ALERT", level: "warning",
  stage: "raised", value: 84, unit: "bpm", reason: "Resting heart rate 84 bpm, 3rd day over baseline",
  rule: "resting HR > baseline + 20 bpm for 3 consecutive days", source: "OCHMO Exercise Overview brief (TB-031)",
  symptoms: ["headache"], steps: ["Go to the crew member"], steps_done: [], next_step: "Go to the crew member",
  why: ["What was seen: ..."], speak: null, lookahead: null, raised_by: "console",
  timeline: {
    raised_at: "2026-11-14T06:12:00Z", acknowledged_at: null, sent_at: null, earth_eta_s: null, earth_at: null,
    earliest_reply_at: null, reply_at: null, resolved_at: null,
  },
};

describe("ship adapters", () => {
  it("turns the ship's alert into the store's, and keeps the original", () => {
    const alert = toAlert(A1);
    expect(alert).toMatchObject({ id: "A1", crewId: "C1", metric: "hr_rest", stage: "raised",
      raisedAt: "2026-11-14T06:12:00Z", acknowledgedAt: null, symptoms: ["headache"] });
    expect(alert?.live?.reason).toContain("84 bpm");
  });

  it("leaves out alerts this console has no card for", () => {
    expect(toAlert({ ...A1, id: "A9", metric: "signal", state: "RECHECK" })).toBeNull();
    expect(toAlert({ ...A1, id: "A10", metric: "manual", state: "SOS" })).toBeNull();
  });

  it("gives a message the time it left, and remembers its alert and status", () => {
    const message = toThreadMessage({ id: "M83", alert_id: "A1", from: "ground", author: "Dr. Adeyemi",
      text: "Temperature every 4 hours.", kind: "reply", sent_at: "2026-11-14T06:40:00Z",
      arrived_at: null, status: "in_flight" });
    expect(message).toEqual({ id: "M83", from: "ground", author: "Dr. Adeyemi", text: "Temperature every 4 hours.",
      at: "2026-11-14T06:40:00Z", alertId: "A1", status: "in_flight" });
  });

  it("reads the ship's address: none, this page's own, or another machine's", () => {
    expect(shipAddress(undefined)).toEqual({ live: false, base: "" });
    expect(shipAddress("/")).toEqual({ live: true, base: "" });
    expect(shipAddress("http://localhost:5000/")).toEqual({ live: true, base: "http://localhost:5000" });
  });

  it("writes a delay the way a person says it", () => {
    expect(span(0.25)).toBe("0.25 s");
    expect(span(1.3)).toBe("1.3 s");
    expect(span(660.86)).toBe("11 min 1 s");
    expect(span(1321.72)).toBe("22 min 2 s");
  });

  it("builds the store's state from what the ship returned", () => {
    const old = { ...A1, id: "A2", stage: "resolved" as const,
      timeline: { ...A1.timeline, raised_at: "2026-11-02T12:00:00Z", resolved_at: "2026-11-02T13:00:00Z" } };
    const mission = buildMission({ now: "2026-11-14T06:31:00Z", alerts: [A1, old], threads: [], reminders: [
      { id: "R5", crew_id: "C1", text: "Take temperature", due_at: "2026-11-14T10:31:00Z", done_at: null }],
      streak: 12 });
    expect(mission.alerts.map((a) => a.id)).toEqual(["A1"]);     // an alert resolved on an earlier day is history
    expect(mission.reminders).toEqual([{ id: "R5", text: "Take temperature", dueAt: "2026-11-14T10:31:00Z" }]);
    expect(mission.streak).toBe(12);
  });
});
```

- [ ] **Step 3:** `pnpm test`. Expected: the new file fails to import `@/lib/ship-api`.
- [ ] **Step 4:** Create `src/lib/ship-api.ts`:

```ts
import { z } from "zod";
import type { Alert, MissionState, Reminder, ThreadMessage } from "@/lib/mission-store";
import { METRIC_KEYS } from "@/lib/schemas";

/** The ship's address, as it was given when the console was built.
 *  Empty: seed mode, the console runs on its own demo data.
 *  "/": the ship answers at the same address this page came from (a hosted copy behind one load balancer).
 *  Anything else: that address, such as http://localhost:5000. */
export function shipAddress(raw: string | undefined): { live: boolean; base: string } {
  const value = (raw ?? "").trim();
  return { live: value !== "", base: value === "/" ? "" : value.replace(/\/+$/, "") };
}

const address = shipAddress(process.env.NEXT_PUBLIC_API_URL);
export const API_URL = address.base;
export const LIVE = address.live;

const STAGES = ["raised", "acknowledged", "sent", "replied", "resolved"] as const;

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
    .filter((a) => a.stage !== "resolved" || !today || a.raisedAt.slice(0, 10) === today);
  return {
    alerts,
    thread: input.threads.flat().map(toThreadMessage),
    reminders: input.reminders.map(toReminder),
    streak: input.streak,
  };
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
    const data = (await request(`/api/base/alerts/${alertId}/thread`)) as { messages?: unknown };
    return each(shipMessageSchema, data.messages);
  },
  reminders: async () => each(shipReminderSchema, await request("/api/base/reminders?open=1")),
  streak: async () =>
    z.object({ streak: z.number() }).parse(await request("/api/base/checkins/today")).streak,
  post: (path: string, body?: unknown) =>
    request(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
};

/** Everything the console needs from the ship, in one go. */
export async function pull(): Promise<{
  state: ShipState;
  mission: Pick<MissionState, "alerts" | "thread" | "reminders" | "streak">;
}> {
  const [state, alerts, reminders, streak] = await Promise.all([
    ship.state(),
    ship.alerts(),
    ship.reminders(),
    ship.streak(),
  ]);
  const open = alerts.filter((a) => a.stage !== "resolved" && METRIC_KEYS.some((key) => key === a.metric));
  const threads = await Promise.all(open.map((a) => ship.thread(a.id)));
  return { state, mission: buildMission({ now: state.now, alerts, threads, reminders, streak }) };
}
```

- [ ] **Step 5:** `pnpm test`, `pnpm typecheck`, `pnpm lint`. Expected: all pass, 6 new tests. If `span(1.3)` prints `1.3 s` but `span(0.25)` does not print `0.25 s`, the rounding is the place to look. Commit: `feat: the ship's shapes, adapters and calls`.

---

### Task 2: The store reads the ship

Requirement R1. In live mode the store polls once a second and an action becomes a request. If the ship cannot be reached, the console runs on its seed and says so.

**Files:** `src/lib/mission-store.tsx`, `src/lib/format.ts`.

- [ ] **Step 1:** In `src/lib/mission-store.tsx`, add to the imports:

```ts
import { useRef } from "react";
import { LIVE, pull, ship, type ShipState } from "@/lib/ship-api";
```

(`useRef` joins the existing `react` import.)

- [ ] **Step 2:** Replace the context and the provider (from `const MissionContext` to the end of `MissionProvider`) with:

```tsx
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
function shipRequest(action: Action, state: MissionState): Promise<unknown> | null {
  const by = (alertId: string) => {
    const alert = state.alerts.find((a) => a.id === alertId);
    return (alert && getCrew(alert.crewId)?.name) ?? "Crew";
  };
  switch (action.type) {
    case "acknowledge":
      return ship.post(`/api/base/alerts/${action.alertId}/ack`, { by: by(action.alertId) });
    case "sendToGround":
      return ship.post(`/api/base/alerts/${action.alertId}/send`);
    case "acceptPlan":
      return ship.post(`/api/base/alerts/${action.alertId}/accept-plan`, { by: by(action.alertId) });
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
        setState((s) => ({ soundOn: s?.soundOn ?? false, checkins: s?.checkins ?? {}, ...mission }));
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
      const request = live && latest.current ? shipRequest(action, latest.current) : null;
      // With no request the action is local: everything in seed mode, sound in live mode.
      // A check-in is both: the summary screen reads it from the store, and the ship gets a copy.
      if (!request || action.type === "completeCheckin")
        setState((s) => s && missionReducer(s, action));
      // The ship reloads the morning on a restart, so this session's check-ins go with it.
      else if (action.type === "reset") setState((s) => s && { ...s, checkins: {} });
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
    <MissionContext.Provider value={{ state, dispatch, ship: shipState, online, refresh }}>
      {children}
    </MissionContext.Provider>
  );
}
```

Two things to check by reading, because they are easy to get wrong. In live mode the scripted reply in `use-ground-link.ts` still fires its `receiveReply` action eight seconds after a send: the early return in `dispatch` is what stops it faking a reply. And when the ship is unreachable, `online` is false, so every action falls back to the reducer and the console behaves as the built-in demo.

- [ ] **Step 3:** In `src/lib/format.ts`, the mission clock is UTC, and the ship writes its times with microseconds. Import `LIVE` from `@/lib/ship-api`, change `clock` and add `at`:

```ts
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
```

Both the ship's times and the built-in demo's are UTC and start with the same nineteen characters, so `at` reads either.

- [ ] **Step 4:** `pnpm typecheck`, `pnpm lint`, `pnpm test`. Then in the browser, with the ship running:
  - The Alerts page shows A1 raised at 06:12. Acknowledge. Send. The status line says Sent and **no reply appears after 8 seconds**.
  - In a terminal: `irm http://localhost:5000/api/base/alerts/A1 | select stage` prints `sent`. The ship has it.
  - Stop the ship (`Ctrl+C`), reload the page: the console still loads, on its seed.
- [ ] **Step 5:** Seed mode check (Rule 2). Commit: `feat: the store reads the ship in live mode`.

---

### Task 3: The header: mission day, the link line, the dial

Requirement R2. Spec section 5.

**Files:** new `src/components/base-station/dial.tsx`; `src/components/base-station/app-header.tsx`.

- [ ] **Step 1:** Create `src/components/base-station/dial.tsx`:

```tsx
"use client";

import { useMission } from "@/lib/mission-store";
import { ship as shipApi, span } from "@/lib/ship-api";
import { cn } from "@/lib/utils";

/** Where the ship is. Moving it changes the light time, who decides and what LIGHTTIME says. */
export function Dial() {
  const { ship, refresh } = useMission();
  if (!ship) return null;
  return (
    <fieldset className="flex flex-wrap items-center gap-1.5">
      <legend className="sr-only">Where the ship is</legend>
      {ship.stops.map((s) => {
        const here = s.stop === ship.stop;
        return (
          <button
            key={s.stop}
            type="button"
            aria-pressed={here}
            onClick={() => shipApi.post("/api/base/dial", { stop: s.stop }).then(refresh, refresh)}
            className={cn(
              "min-h-9 rounded-md border px-2.5 py-1 text-[13px]",
              here
                ? "border-primary font-semibold text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
            <span className="ml-1.5 text-[11px] text-muted-foreground">
              {s.link_up ? span(s.delay_s) : "no link"}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
```

- [ ] **Step 2:** In `src/components/base-station/app-header.tsx`:

Add the imports `import { Dial } from "@/components/base-station/dial";` and `import { ship as shipApi, span } from "@/lib/ship-api";`. Change the hook line to `const { state, dispatch, ship, online, refresh } = useMission();`.

Replace the platform line and the ground-link pill (the two `<span>` elements before `<SimulatedTag />`) with:

```tsx
        <span className="hidden md:inline">
          {ship?.platform ?? MISSION.platform} · Mission day{" "}
          <strong className="text-foreground">{ship?.mission_day ?? MISSION.mission_day}</strong>
        </span>
        {ship ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1",
              ship.link_up ? "border-border" : "border-alert text-alert",
            )}
          >
            <span aria-hidden className={cn("size-1.5 rounded-full", ship.link_up ? "bg-ok" : "bg-alert")} />
            {ship.link_up
              ? `Earth is ${span(ship.delay_s)} away · earliest reply ${span(ship.round_trip_s)}`
              : "No link to Earth"}
            <span className="hidden xl:inline"> · {ship.who_decides}</span>
            {ship.link_up && ship.delay_s >= 60 && (
              <span className="hidden text-[11px] xl:inline"> (plays as {span(ship.plays_as_s)})</span>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
            <span aria-hidden className="size-1.5 rounded-full bg-ok" />
            Ground link {MISSION.one_way_light_time_s} s one-way
            <span className="hidden xl:inline">
              {" "}
              (Mars: {lo} to {hi} min)
            </span>
          </span>
        )}
        <Dial />
        {ship && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-9"
            title="Play the scripted emergency: blood oxygen falls for the commander"
            onClick={() => shipApi.post("/api/base/scenario/start", { name: "stage" }).then(refresh, refresh)}
          >
            Start story
          </Button>
        )}
```

If `text-alert`, `border-alert` or `bg-alert` are not the class names this project uses for the alert colour, use the ones `alert-summary.tsx` uses. `LIVE && !online` deserves one more line, before the platform span:

```tsx
        {LIVE && !online && <span className="font-semibold text-alert">Ship unreachable: built-in demo</span>}
```

(import `LIVE` from `@/lib/ship-api`).

- [ ] **Step 3:** `pnpm typecheck`, `pnpm lint`. In the browser:
  - Header reads "ISS · Mission day 158" and "Earth is 11 min 1 s away · earliest reply 22 min 2 s".
  - Click "Moon": within two seconds the line reads 1.3 s and the who-decides text changes.
  - Click the Sun stop: "No link to Earth" in the alert colour, no delay shown. Click Mars again.
  - "Restart demo" still returns to the overview, and A1 is back at raised (the ship reloaded the morning).
- [ ] **Step 4:** Seed mode check: the header looks exactly as before. Commit: `feat: live header with the dial`.

---

### Task 4: The alert page on live data

Requirement R1. Three small edits so the page says what the ship said.

**Files:** `alert-summary.tsx`, `alert-actions.tsx`, `ground-thread.tsx` in `src/components/base-station/`.

- [ ] **Step 1: `alert-summary.tsx`.** A live alert carries its own words. After `const rule = ruleFor(m);` add:

```tsx
  const live = alert.live;
  const fromShipAi = live?.raised_by === "lighttime";
```

Then, in the JSX:
  - The headline: `{live ? live.reason : headline}`.
  - The state pill for an unresolved alert: `<StatePill state={live?.state === "WATCH" ? "WATCH" : "ALERT"} label={live?.state === "SOS" ? "SOS" : undefined} />`. A falling reading LIGHTTIME caught early is a WATCH, not an ALERT.
  - "Current": `{live?.value ?? value} {live?.unit ?? unit}`.
  - "Rule tripped": `{live?.rule ?? rule.alert}`.
  - The last line: `Source: {live?.source ?? rule.source}`.
  - The baseline tile, the "Also seen" tile and the `TrendChart` describe the person's week. Wrap the three in `{!fromShipAi && ( ... )}`: an alert LIGHTTIME raised is about the last minute, and the LIGHTTIME card (Task 5) takes their place.

- [ ] **Step 2: `alert-actions.tsx`.** The waiting line must carry the ship's numbers. Import `clock` from `@/lib/format` and `span` from `@/lib/ship-api`, read `const { dispatch, ship } = useMission();`, and replace `{STATUS[alert.stage]}` with `{statusLine()}` where:

```tsx
  function statusLine(): string {
    if (!ship || !alert.live) return STATUS[alert.stage];
    if (alert.stage === "sent") {
      const earliest = alert.live.timeline.earliest_reply_at;
      return ship.link_up
        ? `Sent. Earth is ${span(ship.delay_s)} away. Earliest possible reply: ${earliest ? clock(earliest) : `in ${span(ship.round_trip_s)}`}.`
        : "Sent. No link to Earth right now: any reply waits for the link.";
    }
    if (alert.stage === "acknowledged" && !ship.link_up)
      return "Acknowledged. No link to Earth: a report sent now is queued and leaves when the link returns.";
    return STATUS[alert.stage];
  }
```

- [ ] **Step 3: `ground-thread.tsx`.** One thread per alert, the message's place on the link, and an honest tag.
  - Read `const { state, dispatch, ship } = useMission();` and, below it, `const thread = state.thread.filter((m) => !m.alertId || m.alertId === alert.id);`. Use `thread` in place of `state.thread` in the two places it is read.
  - In the small line above each message, after `{clock(m.at)}`, add `{m.status && m.status !== "delivered" && <span>{m.status === "queued" ? "queued, no link" : "on its way"}</span>}`.
  - Show the simulated tag only in seed mode: `{!ship && <SimulatedTag label="SIMULATED flight surgeon" className="ml-auto" />}`. In the heading, print the surgeon's name only in seed mode: `Thread with ground{!ship && <> · Flight surgeon on console: {GROUND.flight_surgeon}</>}`.
  - In the form's `dispatch`, add `alertId: alert.id`.

- [ ] **Step 4:** `pnpm typecheck`, `pnpm lint`, `pnpm test`. In the browser, restart the demo, then: acknowledge, send. The status line names the earliest reply time. Reply as Earth from a terminal:

```powershell
$earth = "http://localhost:5000/api/earth"
$report = (irm "$earth/inbox").messages[0]
irm -Method Post "$earth/reply" -ContentType application/json -Body (@{message_id=$report.id; text="Temperature every 4 hours."; from="Dr. Adeyemi"} | ConvertTo-Json)
```

(Wait 12 seconds after sending before the first line, so the report has reached Earth.) Expected: about 11 seconds after the reply is sent it appears in the thread, the round-trip stepper moves to Replied, and "Accept plan" appears. Accept: four reminders show on the overview.
- [ ] **Step 5:** Seed mode check. Commit: `feat: the alert page shows what the ship said`.

---

### Task 5: LIGHTTIME, seen and heard

Requirement R3. Spec section 6.

**Files:** new `src/components/base-station/lighttime-card.tsx`; `alert-detail.tsx`; `console-effects.tsx`; `alerts-rail.tsx`.

- [ ] **Step 1:** Create `src/components/base-station/lighttime-card.tsx`:

```tsx
"use client";

import { type Alert, useMission } from "@/lib/mission-store";
import { ship as shipApi, span } from "@/lib/ship-api";
import { cn } from "@/lib/utils";

/** What the ship AI saw, how long is left, and what to do next. It suggests. A person decides. */
export function LightTimeCard({ alert }: { alert: Alert }) {
  const { ship, refresh } = useMission();
  const live = alert.live;
  if (!live || live.raised_by !== "lighttime") return null;
  const look = live.lookahead;
  return (
    <section
      aria-label="LIGHTTIME"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="font-heading text-[15px] font-semibold">LIGHTTIME</h2>
        {ship && <span className="text-xs text-muted-foreground">{ship.ship_ai_role}</span>}
      </div>
      {live.speak && <p className="text-base font-semibold leading-snug">{live.speak}</p>}
      {look && (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-border-soft px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">Time left to the red line</dt>
            <dd className="text-lg font-bold">{span(look.eta_s)}</dd>
          </div>
          <div className="rounded-lg border border-border-soft px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">Earliest reply from Earth</dt>
            <dd className="text-lg font-bold">{look.reply_s === null ? "No link" : span(look.reply_s)}</dd>
          </div>
          <div className="rounded-lg border border-border-soft px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">Can Earth answer in time?</dt>
            <dd className={cn("text-lg font-bold", !look.earth_in_time && "text-alert")}>
              {look.earth_in_time ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
      )}
      <ol className="flex flex-col gap-1.5 text-sm">
        {live.steps.map((step, index) => {
          const done = live.steps_done.includes(index);
          return (
            <li key={step} className="flex items-center gap-2">
              <button
                type="button"
                disabled={done}
                onClick={() =>
                  shipApi.post(`/api/base/alerts/${alert.id}/steps`, { index }).then(refresh, refresh)
                }
                className="min-h-9 rounded-md border border-border px-2.5 text-[13px] disabled:opacity-60"
              >
                {done ? "Done" : "Tick"}
              </button>
              <span className={cn(step === live.next_step && "font-semibold")}>{step}</span>
            </li>
          );
        })}
      </ol>
      <details className="text-xs text-muted-foreground">
        <summary>Why the ship says this</summary>
        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4">
          {live.why.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
      <p className="text-xs text-muted-foreground">Suggests. A person decides.</p>
    </section>
  );
}
```

- [ ] **Step 2:** In `alert-detail.tsx`, import it and put `<LightTimeCard alert={alert} />` between `<AlertSummary alert={alert} />` and `<RoundTrip alert={alert} />`.
- [ ] **Step 3:** In `console-effects.tsx`, speak each new sentence once. Add `useEffect` and `useRef` from `react`, and inside `ConsoleEffects`:

```tsx
  // LIGHTTIME's sentence, spoken once per alert and level. Browsers allow speech only after a click:
  // the "Sound on" button is that click.
  const said = useRef(new Set<string>());
  useEffect(() => {
    if (!state.soundOn || typeof window.speechSynthesis === "undefined") return;
    for (const alert of state.alerts) {
      const line = alert.live?.speak;
      const key = `${alert.id}:${alert.live?.level}`;
      if (!line || alert.stage === "resolved" || said.current.has(key)) continue;
      said.current.add(key);
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(line));
    }
  }, [state.alerts, state.soundOn]);
```

The beep (`useAlarm`) already sounds for any alert at stage `raised`. A live SOS is `sent` from the start, because the ship sends it by itself. Change the first argument of `useAlarm` to `state.alerts.some((a) => a.stage === "raised" || (a.live?.state === "SOS" && !a.acknowledgedAt))`.

- [ ] **Step 3b:** In `alerts-rail.tsx`, a live alert shows what the ship measured, not the morning's daily value. Inside `open.map`, `<StatePill state="ALERT" />` becomes `<StatePill state={a.live?.state === "WATCH" ? "WATCH" : "ALERT"} label={a.live?.state === "SOS" ? "SOS" : undefined} />`, and `{metricValue(a.metric, crew)}` becomes `{a.live?.value ?? metricValue(a.metric, crew)}`.
- [ ] **Step 4:** In the browser: restart the demo, press "Sound on", press "Start story", and watch the overview. Expected within about a minute: a second alert for Okafor in the alerts rail. Open it: the LIGHTTIME card shows the sentence, the time left, "No" under "Can Earth answer in time?", and the checklist. The sentence is spoken once, not once a second. Tick the oxygen step: within a few seconds the story's reading recovers.
- [ ] **Step 5:** Seed mode check. Commit: `feat: LIGHTTIME card and voice`.

---

### Task 6: The Earth console

Requirement R4. Spec section 7. One page for the flight surgeon. It reads only `/api/earth/*`. If the data owner's case routes are merged on the backend by now, read cases from them in place of `groupCases` and keep everything else.

**Files:** new `src/components/command-center/earth-console.tsx`, new `src/app/command-center/page.tsx`; `src/app/layout.tsx`, `src/app/base-station/layout.tsx`; `app-header.tsx`.

- [ ] **Step 0: The store wraps the ship's console only.** Today `MissionProvider` sits in the root layout, so every page gets it. On the Earth page it would ask the ship's own routes once a second, and Earth must only ever see what the link delivered. In `src/app/layout.tsx`, remove the `MissionProvider` import and the wrapper, leaving `<body className="min-h-full flex flex-col">{children}</body>`. `src/app/base-station/layout.tsx` becomes:

```tsx
import { AppHeader } from "@/components/base-station/app-header";
import { ConsoleEffects } from "@/components/base-station/console-effects";
import { MissionProvider } from "@/lib/mission-store";

export default function BaseStationLayout({
  children,
}: LayoutProps<"/base-station">) {
  return (
    <MissionProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <ConsoleEffects />
        <AppHeader />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </MissionProvider>
  );
}
```

`pnpm typecheck`, then click through the console in both modes: nothing looks different, because only `/base-station` pages read the store.

- [ ] **Step 1:** Create `src/components/command-center/earth-console.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { clock } from "@/lib/format";
import { API_URL, LIVE, span } from "@/lib/ship-api";
import { cn } from "@/lib/utils";

type Message = {
  id: number;
  kind: string;
  status: "queued" | "in_flight" | "delivered";
  eta_s: number | null;
  sent_at: string | null;
  deliver_at: string | null;
  payload: Record<string, unknown>;
};
type Inbox = { link_up: boolean; delay_s: number; mode: string; who_decides: string; messages: Message[] };
type Network = { horizons_one_way_s: number; dsn_one_way_s: number | null; differ_s: number | null; source: string };
type Case = { report: Message; updates: Message[] };

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

/** One case per alert that has reached Earth: its report, then every later message about it. */
function groupCases(messages: Message[]): Case[] {
  const oldestFirst = [...messages].reverse();
  const cases: Case[] = [];
  for (const m of oldestFirst) {
    const alertId = m.payload.alert_id;
    if (alertId == null) continue;
    const found = cases.find((c) => c.report.payload.alert_id === alertId);
    if (found) found.updates.push(m);
    else if (m.kind === "report") cases.push({ report: m, updates: [] });
  }
  return cases.reverse();
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

export function EarthConsole() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [sent, setSent] = useState<Message[]>([]);
  const [network, setNetwork] = useState<Network | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [down, setDown] = useState(false);

  const refresh = useCallback(() => {
    Promise.all([get<Inbox>("/api/earth/inbox"), get<Message[]>("/api/earth/outbox")])
      .then(([i, o]) => {
        setInbox(i);
        setSent(o);
        setDown(false);
      })
      .catch(() => setDown(true));
  }, []);

  useEffect(() => {
    if (!LIVE) return;
    refresh();
    get<Network>("/api/earth/network").then(setNetwork, () => {});
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  if (!LIVE) return <p className="p-8 text-sm">Set NEXT_PUBLIC_API_URL to the ship's address to open the Earth console.</p>;
  if (!inbox) return <p className="p-8 text-sm text-muted-foreground">{down ? "Cannot reach mission control's server." : "Loading…"}</p>;

  const cases = groupCases(inbox.messages);
  const waiting = sent.filter((m) => m.status !== "delivered");

  function reply(report: Message) {
    const body = (drafts[report.id] ?? "").trim();
    if (!body) return;
    fetch(`${API_URL}/api/earth/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: report.id, text: body, from: "Flight surgeon" }),
    }).then(() => {
      setDrafts((d) => ({ ...d, [report.id]: "" }));
      refresh();
    });
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-bold">Light Time · Earth console</h1>
        <p className={cn("text-sm", !inbox.link_up && "font-semibold text-alert")}>
          {inbox.link_up
            ? `The ship is ${span(inbox.delay_s)} away. Everything on this screen left it at least that long ago. ${inbox.who_decides}.`
            : "No link to the ship. Replies are queued and leave when it returns."}
        </p>
        {network && (
          <p className="text-xs text-muted-foreground">
            Mars light time today: {span(network.horizons_one_way_s)} worked out by NASA JPL Horizons
            {network.dsn_one_way_s !== null &&
              `, ${span(network.dsn_one_way_s)} measured by NASA's Deep Space Network (${network.differ_s} s apart)`}
            .
          </p>
        )}
      </header>

      {waiting.length > 0 && (
        <section aria-label="Replies on their way" className="rounded-xl border border-border bg-card px-5 py-4 text-sm">
          <h2 className="mb-2 text-[15px] font-semibold">Replies on their way</h2>
          <ul className="flex flex-col gap-1.5">
            {waiting.map((m) => (
              <li key={m.id}>
                {m.status === "queued" ? "Queued, no link" : `Arrives on the ship in ${span(m.eta_s ?? 0)}`}:{" "}
                {text(m.payload.text)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {cases.length === 0 && <p className="text-sm text-muted-foreground">Nothing has reached Earth yet.</p>}

      {cases.map(({ report, updates }) => {
        const p = report.payload;
        const sbar = (p.sbar ?? {}) as Record<string, string>;
        const look = p.lookahead as { eta_s: number; reply_s: number | null; earth_in_time: boolean } | null;
        const why = Array.isArray(p.why) ? (p.why as string[]) : [];
        const week = (p.bundle as { days?: Record<string, { date: string; value: number | null }[]> } | undefined)?.days;
        return (
          <article key={report.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4">
            <h2 className="font-heading text-lg font-semibold">
              {text(p.crew) || text(p.from)}: {text(p.reason) || text(p.text)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {text(p.level) && `Level ${text(p.level)} · `}raised {clock(text(p.raised_at))} UTC · reached Earth{" "}
              {report.deliver_at ? clock(report.deliver_at) : ""} UTC
            </p>
            {p.sbar != null && (
              <dl className="grid gap-2 text-sm md:grid-cols-2">
                {(["situation", "background", "assessment", "request"] as const).map((part) => (
                  <div key={part}>
                    <dt className="text-[11px] uppercase text-muted-foreground">{part}</dt>
                    <dd>{sbar[part]}</dd>
                  </div>
                ))}
              </dl>
            )}
            {look && (
              <p className="text-sm font-semibold">
                When this left: {span(look.eta_s)} to the red line, earliest reply{" "}
                {look.reply_s === null ? "none, no link" : span(look.reply_s)}.{" "}
                {look.earth_in_time ? "Earth could answer in time." : "Earth could not answer in time."}
              </p>
            )}
            {week?.hr_rest && (
              <p className="text-sm">
                Resting heart rate, last 7 days: {week.hr_rest.map((d) => d.value ?? "no value").join(", ")} bpm
              </p>
            )}
            {why.length > 0 && (
              <ul className="list-disc pl-4 text-xs text-muted-foreground">
                {why.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            {updates.length > 0 && (
              <ul className="flex flex-col gap-1 border-t border-border-soft pt-2 text-sm">
                {updates.map((u) => (
                  <li key={u.id}>
                    {u.deliver_at ? clock(u.deliver_at) : ""} · {text(u.payload.text) || text(u.payload.event) || u.kind}
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                reply(report);
              }}
            >
              <label htmlFor={`reply-${report.id}`} className="sr-only">
                Reply to the ship
              </label>
              <input
                id={`reply-${report.id}`}
                value={drafts[report.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [report.id]: e.target.value }))}
                placeholder="Reply to the ship"
                maxLength={500}
                className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm"
              />
              <Button type="submit" className="min-h-11">
                Send, arrives in {inbox.link_up ? span(inbox.delay_s) : "no link"}
              </Button>
            </form>
          </article>
        );
      })}
    </main>
  );
}
```

- [ ] **Step 2:** Create `src/app/command-center/page.tsx`. Read the routing guide `AGENTS.md` points to first: this project uses typed route props, and `next.config.ts` turns on `cacheComponents`.

```tsx
import { EarthConsole } from "@/components/command-center/earth-console";

export default function CommandCenterPage() {
  return <EarthConsole />;
}
```

- [ ] **Step 3:** `pnpm typecheck`, `pnpm lint`. Open `/command-center` in a second window beside the console. Restart the demo. On the console: acknowledge and send A1. On the Earth console: nothing new for about 11 seconds, then the case, with "raised 06:12 UTC". Type a reply and send: "Replies on their way" counts down from about 11 minutes of mission time, and the console's thread shows the reply when it lands. Then turn the dial to the Sun and reply again: it shows as queued.
- [ ] **Step 4: Earlier cases go below.** The demo morning loads four old reports from the generated month, and they would sit above the one that matters. Their payload says `simulated`. In `earth-console.tsx`, move the callback given to `cases.map` into a function inside the component, unchanged: `function card({ report, updates }: Case) { ... }`. Below `const cases = ...` add:

```tsx
  const fresh = cases.filter((c) => !c.report.payload.simulated);
  const earlier = cases.filter((c) => c.report.payload.simulated);
```

and replace the "Nothing has reached Earth yet" line and the `cases.map(...)` block with:

```tsx
      {fresh.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing new has reached Earth yet.</p>
      )}
      {fresh.map(card)}
      {earlier.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            Earlier cases, from the generated month · {earlier.length}
          </summary>
          <div className="mt-3 flex flex-col gap-5">{earlier.map(card)}</div>
        </details>
      )}
```

Check: after a restart the page says nothing new has reached Earth, with four earlier cases folded away.
- [ ] **Step 5: A way across.** In `app-header.tsx`, add `const nav = LIVE ? [...NAV, { label: "Earth", href: "/command-center" }] : NAV;` inside the component and map over `nav` in place of `NAV`. In `earth-console.tsx`, import `Link` from `next/link` and put `<Link href="/base-station" className="text-[13px] text-link">Ship console</Link>` under the `<h1>`.
- [ ] **Step 6:** Commit: `feat: the Earth console`. Push the branch and open the pull request for the frontend owner. Later tasks add to the same pull request.

---

### Task 7: The check-in reaches the ship

Requirement R5. Task 2 already posts a completed check-in. This task proves it and settles the two things that could go wrong.

- [ ] **Step 1:** Restart the demo. Complete Okafor's check-in: mood 2, sleep 5.1, headache, then the reaction test. In a terminal:

```powershell
$api = "http://localhost:5000/api/base"
(irm "$api/checkins/today") | select due, streak          # due is empty, streak 13
(irm "$api/alerts/A1").symptoms                           # headache
(irm "$api/crew/C1").today | select mood, sleep_h, pvt_ms # 2, 5.1 and the reaction time just measured
```

- [ ] **Step 2:** If the ship answered 400, read its `field`. `symptoms` means the console sent a word the ship does not know: the ship's list is headache, short sleep, congestion, nausea, blurred vision, back pain, in lower case, which is what `checkin-mood.tsx` sends today. `pvt_ms` means the reaction time was not a whole number from 100 to 3000: `meanReaction` already returns one, and the `Math.round` in `shipRequest` guards it.
- [ ] **Step 3:** "Restart demo", then open Okafor's check-in page again: it starts at step 1, not at the summary. That is the restart clearing this session's check-ins (Task 2). Nothing to commit unless Step 2 needed a fix.

The cuff reading is not sent: nothing on the console enters one, so the ship keeps the last cuff reading on record. That is in "Not in this plan".

---

### Task 8: The crew, the station strip and the suit's live reading read the ship

Requirements R6 and R7, spec section 8. **Needs Task 1 of the backend's plan** (`week`, `simulated`, the red card during a live alert).

In live mode the console stops scoring. A crew member from the ship carries the ship's states and the real week, and the three scoring entry points (`metricStates`, `crewState`, `sevenDay`) return those when they are there. Components then only change where they read `CREW` or `getCrew` for values. Names can stay on the seed: the four names and ids are the same on the ship.

**Files:** `src/lib/schemas.ts`, `src/lib/scoring.ts`, `src/lib/history.ts`, `src/lib/station.ts`, `src/lib/packets.ts`, `src/lib/ship-api.ts`, `src/lib/ship-api.test.ts`, `src/lib/mission-store.tsx`; new `src/components/base-station/crew-board.tsx`; `src/app/base-station/page.tsx`; `crew-card.tsx`, `alerts-rail.tsx`, `astronaut-detail.tsx`, `alert-summary.tsx`, `checkin-flow.tsx`, `checkin-done.tsx`, `station-strip.tsx`, `health-log.tsx` in `src/components/base-station/`.

- [ ] **Step 1: Write the failing tests.** Add to `src/lib/ship-api.test.ts`. Extend the import from `@/lib/ship-api` with `type ShipCrew, toCrew, toStation`, and add these imports and tests:

```ts
import { CREW } from "@/lib/crew";
import { sevenDay } from "@/lib/history";
import { crewState, metricStates } from "@/lib/scoring";
import { stationReadings } from "@/lib/station";

const OKAFOR: ShipCrew = {
  ...CREW[0],
  state: "ALERT",
  metric_states: { hr_rest: "ALERT", sleep_h: "ALERT", spo2: "OK", dose_mSv_day: null },
  week: {
    hr_rest: [60, 59, 58, 59, 80, 82, 84],
    bp_sys: [113, null, 117, 116, 112, 110, 110],
    mood: [null, null],
  },
  last_packet_at: "2026-11-14T06:29:00Z",
  latest: { at: "2026-11-14T06:31:07.250000Z", heart_rate: 88, spo2: 93, skin_temp: null, signal_ok: true },
};

describe("the crew and the cabin from the ship", () => {
  it("lets the ship's scoring and week stand in for the console's own", () => {
    const okafor = toCrew(OKAFOR);
    expect(crewState(okafor)).toBe("ALERT");
    expect(metricStates(okafor)).toMatchObject({ hr_rest: "ALERT", spo2: "OK", mood: "OK", dose_mSv_day: "OK" });
    expect(sevenDay(okafor, "hr_rest")).toEqual([60, 59, 58, 59, 80, 82, 84]);
    // A day with no cuff reading takes the day before's.
    expect(sevenDay(okafor, "bp_sys")).toEqual([113, 113, 117, 116, 112, 110, 110]);
    // No value on any day: no series from the ship.
    expect(okafor.live?.week.mood).toBeUndefined();
    expect(okafor.live?.latest).toMatchObject({ spo2: 93, heartRate: 88, signalOk: true });
  });

  it("leaves the built-in crew scored by the console", () => {
    expect(CREW[0].live).toBeUndefined();
    expect(sevenDay(CREW[0], "hr_rest")).toEqual([60, 61, 59, 62, 80, 82, 84]);
  });

  it("feeds the station strip the ship's numbers and says which are real", () => {
    const station = toStation(
      {
        co2_mmHg: { value: 2.99, simulated: false },
        ppo2_mmHg: { value: 156.5, simulated: true },
        pressure_kPa: { value: 101.39, simulated: true },
        temp_c: { value: 22.9, simulated: false },
        rh_pct: { value: 50, simulated: false },
        dose_mSv_today: { value: 0.51 },
        source: "NASA OSDR Environmental Data App",
      },
      {
        state: "WATCH",
        headline: "SEP event in progress",
        advisory: "Shelter advisory: stay in the shielded module",
        event_at: "2026-11-14T05:58:00Z",
        source: "Simulated event",
      },
      CREW,
    );
    const tiles = Object.fromEntries(stationReadings(station).map((tile) => [tile.id, tile]));
    expect(tiles.co2).toMatchObject({ value: 2.99, state: "WATCH", real: true });
    expect(tiles.ppo2).toMatchObject({ value: 156.5, state: "WATCH", real: false });
    expect(tiles.temp).toMatchObject({ state: "OK", real: true });
    expect(tiles.dose).toMatchObject({ value: 0.51, state: "OK", real: false });
    expect(tiles["space-weather"]).toMatchObject({ display: "SEP event", note: "Shelter advisory", state: "WATCH" });
    // The built-in demo is unchanged.
    expect(stationReadings().find((tile) => tile.id === "co2")?.value).toBe(2.6);
  });
});
```

- [ ] **Step 2:** `pnpm test`. Expected: the file fails to import `toCrew` and `toStation`.
- [ ] **Step 3: `src/lib/schemas.ts`.** Replace `export type Crew = z.infer<typeof crewSchema>;` with:

```ts
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
```

- [ ] **Step 4: `src/lib/scoring.ts` and `src/lib/history.ts`.** One line at the top of each of the three functions:

```ts
export function metricStates(crew: Crew): Record<MetricKey, State> {
  if (crew.live) return crew.live.metricStates; // the ship scored it, on the real week
```

```ts
export function crewState(crew: Crew): State {
  if (crew.live) return crew.live.state; // the ship's answer, which also knows a live emergency
```

```ts
export function sevenDay(crew: Crew, metric: MetricKey): number[] {
  const fromShip = crew.live?.week[metric];
  if (fromShip) return [...fromShip];
```

- [ ] **Step 5: `src/lib/station.ts`.** The strip takes its numbers as an argument. Add `real?: boolean;` to the `StationReading` type, and above `stationReadings` add:

```ts
export type StationValues = {
  co2_mmHg: number;
  ppo2_mmHg: number;
  pressure_kPa: number;
  temp_c: number;
  rh_pct: number;
};

export type StationInput = {
  values: StationValues;
  /** Today's dose in mSv. */
  dose: number;
  weather: { display: string; note: string; state: State; source: string };
  /** The values that are a real record, not simulated. Empty in the built-in demo. */
  real: (keyof StationValues)[];
  /** Where the real values come from, in the ship's words. */
  source?: string;
};

/** The built-in demo's cabin: the seed's numbers and its scripted solar event. */
export function seedStation(): StationInput {
  return {
    values: STATION,
    dose: Math.max(...CREW.map((c) => c.today.dose_mSv_day)),
    weather: {
      display: "SEP event",
      note: "Shelter advisory",
      state: "WATCH",
      source: "Simulated solar particle event",
    },
    real: [],
  };
}
```

Then change `stationReadings` itself:
  - The signature and its first lines become:

```ts
export function stationReadings(input: StationInput = seedStation()): StationReading[] {
  const s = input.values;
  const dose = input.dose;
  const real = (...keys: (keyof StationValues)[]) => keys.every((key) => input.real.includes(key));
```

  - Inside the function, every `STATION.` becomes `s.` (ten places). The old `const dose = Math.max(...)` line goes.
  - Each tile gains a `real` entry: `real: real("co2_mmHg")` on the CO2 tile, `real: real("ppo2_mmHg")` on ppO2, `real: real("pressure_kPa")` on pressure, `real: real("temp_c", "rh_pct")` on temperature and humidity, `real: false` on the dose and on space weather.
  - The space weather tile reads the input: `display: input.weather.display`, `note: input.weather.note`, `state: input.weather.state`, `source: input.weather.source`.

- [ ] **Step 6: `src/lib/packets.ts`.** The built-in packets follow whichever crew they are given, so the log and the rail agree with the cards:

```ts
/** Every crewmember's packets, newest first. */
export function allPackets(now: Date, crew: Crew[] = CREW): Packet[] {
  return crew.flatMap((c) => packetsFor(c, now)).sort((a, b) =>
    b.ts.localeCompare(a.ts),
  );
}
```

- [ ] **Step 7: `src/lib/ship-api.ts`.** Add to the imports: `import { CREW } from "@/lib/crew";`, `import type { StationInput } from "@/lib/station";`, and from `@/lib/schemas` also `type Crew, crewSchema, type MetricKey, type State, stateSchema`. Then add, above `request`:

```ts
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

const CABIN = ["co2_mmHg", "ppo2_mmHg", "pressure_kPa", "temp_c", "rh_pct"] as const;

/** The ship's cabin record as the station strip's input. Which values are a real NASA record is kept. */
export function toStation(s: ShipStation, w: ShipWeather, crew: Crew[]): StationInput {
  return {
    values: {
      co2_mmHg: s.co2_mmHg.value,
      ppo2_mmHg: s.ppo2_mmHg.value,
      pressure_kPa: s.pressure_kPa.value,
      temp_c: s.temp_c.value,
      rh_pct: s.rh_pct.value,
    },
    dose: s.dose_mSv_today.value ?? Math.max(...crew.map((c) => c.today.dose_mSv_day)),
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
```

In the `ship` object, replace the `streak` entry with these four:

```ts
  today: async () =>
    z
      .object({ streak: z.number(), done: z.array(z.string()) })
      .parse(await request("/api/base/checkins/today")),
  crew: async () => each(shipCrewSchema, await request("/api/base/crew")),
  station: async () => one(shipStationSchema, await request("/api/base/station")),
  weather: async () => one(shipWeatherSchema, await request("/api/base/space-weather")),
```

and replace `pull` with:

```ts
/** Everything the console needs from the ship, in one go. */
export async function pull(): Promise<{
  state: ShipState;
  mission: Pick<MissionState, "alerts" | "thread" | "reminders" | "streak">;
  crew: Crew[];
  checkedIn: string[];
  station: StationInput | null;
}> {
  const [state, alerts, reminders, today, shipCrew, station, weather] = await Promise.all([
    ship.state(),
    ship.alerts(),
    ship.reminders(),
    ship.today(),
    ship.crew(),
    ship.station(),
    ship.weather(),
  ]);
  const open = alerts.filter((a) => a.stage !== "resolved" && METRIC_KEYS.some((key) => key === a.metric));
  const threads = await Promise.all(open.map((a) => ship.thread(a.id)));
  const live = shipCrew.map(toCrew);
  // Anyone the ship's answer does not cover keeps their built-in card, so nobody drops off the board.
  const crew = [
    ...CREW.map((seed) => live.find((c) => c.id === seed.id) ?? seed),
    ...live.filter((c) => !CREW.some((seed) => seed.id === c.id)),
  ];
  return {
    state,
    mission: buildMission({ now: state.now, alerts, threads, reminders, streak: today.streak }),
    crew,
    checkedIn: today.done,
    station: station && weather ? toStation(station, weather, crew) : null,
  };
}
```

A crew member whose `today` holds a null does not fit `crewSchema` and keeps the built-in card. On the demo morning all four fit: every daily value is there, because what a person typed at the last check-in stands until the next one.

- [ ] **Step 8:** `pnpm test`. Expected: 9 passed. `pnpm typecheck` will fail until the store hands these on: that is the next step.
- [ ] **Step 9: `src/lib/mission-store.tsx`.** The store hands the crew, who has checked in and the cabin to every component.
  - Imports: `import { CREW, GROUND, getCrew, SEEDED_CHECKINS } from "@/lib/crew";`, add `type Crew` to the import from `@/lib/schemas`, and add `import type { StationInput } from "@/lib/station";`.
  - The context's type gains three fields, after `refresh`:

```tsx
  /** The crew: from the ship in live mode, the built-in four otherwise. */
  crew: Crew[];
  /** Who has checked in today. */
  checkedIn: string[];
  /** The cabin, from the ship. Null in the built-in demo. */
  station: StationInput | null;
```

  - In `MissionProvider`, one more piece of state beside `shipState`:

```tsx
  const [board, setBoard] = useState<{
    crew: Crew[];
    checkedIn: string[];
    station: StationInput | null;
  } | null>(null);
```

  - In `refresh`, the success branch takes the three new values and keeps them, and the failure branch drops them:

```tsx
      .then(({ state: fromShip, mission, crew, checkedIn, station }) => {
        setShipState(fromShip);
        setBoard({ crew, checkedIn, station });
        setOnline(true);
        // Sound and this session's check-ins are the browser's. Everything else is the ship's.
        setState((s) => ({ soundOn: s?.soundOn ?? false, checkins: s?.checkins ?? {}, ...mission }));
      })
      .catch(() => {
        setOnline(false);
        setShipState(null);
        setBoard(null);
        // First load with no ship: fall back to the built-in demo so the console is never blank.
        setState((s) => s ?? createInitialMission(new Date()));
      })
```

  - The end of the provider, from the `return` that renders `MissionContext.Provider`:

```tsx
  const crew = board?.crew ?? CREW;
  const checkedIn = board?.checkedIn ?? [...SEEDED_CHECKINS, ...Object.keys(state.checkins)];

  return (
    <MissionContext.Provider
      value={{
        state,
        dispatch,
        ship: shipState,
        online,
        refresh,
        crew,
        checkedIn,
        station: board?.station ?? null,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
```

- [ ] **Step 10: The overview.** Create `src/components/base-station/crew-board.tsx`. Its JSX is the `<section aria-label="Crew">` block that is in `src/app/base-station/page.tsx` today, moved here unchanged except that `CREW` becomes `crew`:

```tsx
"use client";

import { CrewCard } from "@/components/base-station/crew-card";
import { StatePill } from "@/components/shared/state-pill";
import { useMission } from "@/lib/mission-store";

/** The overview's crew cards: the ship's crew in live mode, the built-in four otherwise. */
export function CrewBoard() {
  const { crew } = useMission();
  return (
    <section aria-label="Crew" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-heading text-[17px] font-semibold">
          Crew · {crew.length} aboard
        </h1>
        <span className="text-xs text-muted-foreground">
          Scored against each crewmember's own baseline
        </span>
        <span className="ml-auto inline-flex gap-2">
          <StatePill state="OK" />
          <StatePill state="WATCH" />
          <StatePill state="ALERT" label="ALERT · beeps" />
        </span>
      </div>
      <div className="grid gap-3.5 md:grid-cols-2">
        {crew.map((c) => (
          <CrewCard key={c.id} crew={c} />
        ))}
      </div>
    </section>
  );
}
```

and `src/app/base-station/page.tsx` becomes:

```tsx
import { AlertsRail } from "@/components/base-station/alerts-rail";
import { CrewBoard } from "@/components/base-station/crew-board";
import { StationStrip } from "@/components/base-station/station-strip";

export default function CrewOverviewPage() {
  return (
    <>
      <StationStrip />
      <div className="grid gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <CrewBoard />
        <AlertsRail />
      </div>
    </>
  );
}
```

- [ ] **Step 11: `crew-card.tsx`.** Who needs a check-in comes from the store, the last packet time from the ship, and the suit's newest reading gets one line.
  - The import from `@/lib/format` becomes `import { at, clock } from "@/lib/format";`.
  - `const { state } = useMission();` becomes `const { state, checkedIn: done, ship } = useMission();`.
  - `const lastPacket = clock(packets[packets.length - 1].ts);` becomes `const lastPacket = clock(crew.live?.lastPacketAt ?? packets[packets.length - 1].ts);`.
  - The two lines `const checkedIn = ...` and `const needsCheckin = ...` become one: `const needsCheckin = !done.includes(crew.id);`. In the built-in demo that is the same answer as before, because the other three are in the seeded list.
  - Above `CrewCard`, add:

```tsx
/** The newest one-a-second reading from the suit: what LIGHTTIME is judging right now. */
function SuitNow({ crew, now }: { crew: Crew; now?: string }) {
  const reading = crew.live?.latest;
  if (!reading) return null;
  const fresh = now ? at(now) - at(reading.at) <= 30_000 : true;
  const values = [
    reading.heartRate !== null && `${Math.round(reading.heartRate)} bpm`,
    reading.spo2 !== null && `SpO2 ${Math.round(reading.spo2)} %`,
    reading.skinTemp !== null && `skin ${reading.skinTemp.toFixed(1)} °C`,
  ].filter(Boolean);
  return (
    <p data-testid="suit-now" className="text-xs">
      <span className="font-semibold">{fresh ? "Suit now" : "Last suit reading"}</span>{" "}
      {reading.signalOk ? values.join(" · ") : "no clean signal: check the sensor"}
      <span className="text-muted-foreground"> · {reading.at.slice(11, 19)} UTC</span>
    </p>
  );
}
```

  - In the card's JSX, directly above `<p className="text-xs text-muted-foreground">{crew.note}</p>`, add `<SuitNow crew={crew} now={ship?.now} />`.

- [ ] **Step 12: `alerts-rail.tsx`.**
  - Delete the import of `CREW, getCrew, SEEDED_CHECKINS`. The import from `@/lib/format` gains `at`.
  - `const { state } = useMission();` becomes `const { state, crew, checkedIn, station, ship } = useMission();`.
  - `CREW.flatMap` becomes `crew.flatMap`.
  - The two lines that build `done` become `const done = crew.filter((c) => checkedIn.includes(c.id));` and `due` reads `crew.find((c) => !done.includes(c))`.
  - Inside `open.map`, the local `const crew = getCrew(a.crewId); if (!crew) return null;` becomes `const person = crew.find((c) => c.id === a.crewId); if (!person) return null;`, and the two `crew` uses inside that link become `person`.
  - `stationReadings()` becomes `stationReadings(station ?? undefined)`.
  - `CREW.length` becomes `crew.length`, and `CREW.filter` becomes `crew.filter`.
  - `allPackets(new Date())` becomes `allPackets(ship?.now ? new Date(at(ship.now)) : new Date(), crew)`.

- [ ] **Step 13: The astronaut page, the alert page and the check-in.** Each reads its crew member from the store.
  - `astronaut-detail.tsx`: the two lines `const crew = getCrew(crewId);` and `const { state } = useMission();` become `const { state, crew: all, ship } = useMission();` and `const crew = all.find((c) => c.id === crewId);`. The import from `@/lib/crew` keeps only `MISSION`. `{MISSION.mission_day} days in flight` becomes `{ship?.mission_day ?? MISSION.mission_day} days in flight`.
  - `alert-summary.tsx`: add `"use client";` as the first line. `const crew = getCrew(alert.crewId);` becomes `const crew = useMission().crew.find((c) => c.id === alert.crewId);`. Drop the `getCrew` import, and the import from the store becomes `import { type Alert, useMission } from "@/lib/mission-store";`.
  - `checkin-flow.tsx`: `const crew = getCrew(crewId);` and `const { state, dispatch } = useMission();` become `const { state, dispatch, crew: all, ship } = useMission();` and `const crew = all.find((c) => c.id === crewId);`. The import from `@/lib/crew` keeps only `MISSION`. `day {MISSION.mission_day}` becomes `day {ship?.mission_day ?? MISSION.mission_day}`.
  - `checkin-done.tsx`: delete the import of `CREW, SEEDED_CHECKINS`. `const { state } = useMission();` becomes `const { state, crew: all, checkedIn } = useMission();`. `crewDone` becomes `all.filter((c) => checkedIn.includes(c.id) || state.checkins[c.id]).length`, and `CREW.length` becomes `all.length`. In the call that scores what was just entered, add `live: undefined` after `...crew`, so this one screen scores the new values itself until the ship's answer arrives:

```tsx
  const s = metricStates({
    ...crew,
    live: undefined,
    today: {
```

- [ ] **Step 14: `station-strip.tsx`.** Add `"use client";` as the first line and `import { useMission } from "@/lib/mission-store";`. Inside the component: `const { station } = useMission();`. Then:
  - `stationReadings()` becomes `stationReadings(station ?? undefined)`.
  - The `<section>` gains `title={station?.source}`.
  - The heading's `<SimulatedTag />` becomes `{!station && <SimulatedTag />}`: in live mode each tile says for itself whether it is real.
  - In each tile, after `<StatePill state={t.state} />`, add:

```tsx
                {station &&
                  (t.real ? (
                    <span className="font-semibold text-foreground">NASA record</span>
                  ) : (
                    <SimulatedTag />
                  ))}
```

- [ ] **Step 15: `health-log.tsx`.** `const { state } = useMission();` becomes `const { state, crew } = useMission();` and `allPackets(now)` becomes `allPackets(now, crew)`. The log now follows the same crew as the cards, even before Task 9.
- [ ] **Step 16:** `pnpm typecheck`, `pnpm lint`, `pnpm test`. Biome will name any import left unused: remove it. Then in the browser, with the ship running on the morning:
  - The overview shows four cards with the ship's values. Okafor is red: resting heart rate 84, blood pressure 110/71 (yesterday's cuff, in band), sleep 5.1. Lindqvist is WATCH on sleep. Mensah's card is red on sleep with no alert in the list: that is the generated month, and the backend plan's Task 7 is the fix. It is not a bug in this task.
  - The station strip shows CO2 2.99 mmHg in WATCH, marked "NASA record", with oxygen and pressure marked SIMULATED.
  - Open Okafor's page: the heart chart's last three days are 80, 82, 84, and the header says 158 days in flight.
  - Post one reading for the fourth suit from a terminal, then look at Mensah's card within two seconds: "Suit now 76 bpm · SpO2 98 % · skin 33.9 °C".

```powershell
irm -Method Post "http://localhost:5000/api/base/readings" -ContentType application/json -Body '{"astronaut_id":"LT-04","heart_rate_bpm":76,"spo2_percent":98,"skin_temp_c":33.9}'
```

  - Post it again with `"signal_ok":false` added: the line says to check the sensor.
  - Press "Start story": Okafor's card shows "Suit now" with the blood oxygen falling a point at a time, before LIGHTTIME speaks.
  - Complete Okafor's check-in: the overview's check-in box says 4 / 4 done within two seconds, and his blood pressure tile still reads 110/71.
- [ ] **Step 17:** Seed mode check (Rule 2): every screen looks exactly as it did before this task, including three seeded check-ins and CO2 at 2.6. Commit: `feat: crew, station and the suit's live reading from the ship`.

---

### Task 9: The log page reads the ship's packets

Requirement R9, spec section 9. **Needs Task 3 of the backend's plan** (`GET /api/base/packets`, `GET /api/base/stream-health`). Until that is merged, skip this task: after Task 8 the log already follows the ship's crew, with the console's own once-a-minute packets and its SIMULATED tag.

**Files:** `src/lib/ship-api.ts`, `src/lib/ship-api.test.ts`, `src/components/base-station/health-log.tsx`.

- [ ] **Step 1: Write the failing test.** Add to `src/lib/ship-api.test.ts`: `shipLog` in the import from `@/lib/ship-api`, `vi` in the import from `vitest`, and:

```ts
const PACKET = {
  crew_id: "C1", suit_id: "LT-01", ts: "2026-11-14T06:29:00.350Z", mission_day: 158, location: "ISS",
  source: "ppg", metric: "spo2", value: 96.7, unit: "%", signal_quality: 0.96, window_s: 60,
  baseline: [96, 99], rule: "< 94", state: "OK", sent_to_ground: false, ack: null,
};

describe("the health log from the ship", () => {
  it("keeps the packets that fit and reads what went to Earth today", async () => {
    vi.stubGlobal("fetch", async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes("stream-health")
          ? { sensors: [{ source: "ecg", lowest_signal_quality: 0.93, state: "OK" }], window_minutes: 60 }
          : { packets: [PACKET, { ...PACKET, source: "pulse_ox" }], transmitted_to_ground_today: 2 },
    }));
    const log = await shipLog();
    vi.unstubAllGlobals();
    // A packet from a sensor the console has no name for is left out, not fatal.
    expect(log.packets).toHaveLength(1);
    expect(log.packets[0]).toMatchObject({ metric: "spo2", state: "OK", baseline: [96, 99] });
    expect(log.sentToday).toBe(2);
    expect(log.health).toEqual([{ source: "ecg", lowest: 0.93, state: "OK" }]);
  });
});
```

- [ ] **Step 2:** `pnpm test`. Expected: the file fails to import `shipLog`.
- [ ] **Step 3:** In `src/lib/ship-api.ts`, add `type Packet, packetSchema` to the import from `@/lib/schemas`, and at the end of the file:

```ts
const healthSchema = z.object({
  sensors: z.array(
    z.object({
      source: z.string(),
      lowest_signal_quality: z.number(),
      state: z.enum(["OK", "RECHECK"]),
    }),
  ),
});

/** The health log from the ship: the suits' minute packets, each sensor's lowest signal, and what went to Earth today. */
export async function shipLog(): Promise<{
  packets: Packet[];
  sentToday: number;
  health: { source: string; lowest: number; state: "OK" | "RECHECK" }[];
}> {
  const [log, health] = await Promise.all([
    request("/api/base/packets?limit=200"),
    request("/api/base/stream-health"),
  ]);
  const parsed = z
    .object({ packets: z.array(z.unknown()), transmitted_to_ground_today: z.number() })
    .parse(log);
  return {
    packets: each(packetSchema, parsed.packets),
    sentToday: parsed.transmitted_to_ground_today,
    health: healthSchema.parse(health).sensors.map((sensor) => ({
      source: sensor.source,
      lowest: sensor.lowest_signal_quality,
      state: sensor.state,
    })),
  };
}
```

- [ ] **Step 4:** `pnpm test`. Expected: 10 passed.
- [ ] **Step 5: `health-log.tsx`.** In live mode the page asks the ship every five seconds. Add `useEffect` to the import from `react`, `import { LIVE, shipLog } from "@/lib/ship-api";`, and read `online` from the store: `const { state, crew, online } = useMission();`. Below `const [now] = ...` add:

```tsx
  const [log, setLog] = useState<Awaited<ReturnType<typeof shipLog>> | null>(null);
  useEffect(() => {
    if (!LIVE || !online) return;
    const load = () => shipLog().then(setLog, () => setLog(null));
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [online]);
  // The ship's packets when it is there. Otherwise the console's own, as before.
  const fromShip = LIVE && online ? log : null;
```

Then five small changes:
  - Rename the existing `const packets: Packet[] = allPackets(now, crew).map(...)` to `const builtIn: Packet[] = ...`, and below it add `const packets = fromShip ? fromShip.packets : builtIn;`.
  - The line under the heading: `{fromShip ? "one packet a minute for each suit sensor · newest first" : "every packet the suits sent to the dashboard · newest first"}`.
  - The sample in "Packet format": `packets.find((p) => p.metric === "hr_rest") ?? packets[0]`.
  - Stream health: `(fromShip ? fromShip.health : streamHealth(packets)).map(...)`.
  - The count in "Sent to ground today": `{fromShip ? fromShip.sentToday : toGround.length}`.

  The SIMULATED tag on the page stays: the minute stream is the generated month.
- [ ] **Step 6:** `pnpm typecheck`, `pnpm lint`. In the browser, on the Log page with the ship on the morning: the newest rows are stamped 06:29, six rows a minute for each crew member, blood oxygen and temperature rows carry a state and the others do not. Filter to RECHECK: nothing in the newest 200, which is right, because the last poor signal was during yesterday's exercise. In a terminal, `(irm "http://localhost:5000/api/base/packets?crew=C1&state=RECHECK").packets | select ts, metric, signal_quality` shows them. Send A1 to the flight surgeon: within five seconds "Sent to ground today" reads 1.
- [ ] **Step 7:** Seed mode check. Commit: `feat: the log page reads the ship's packets`.

---

### Task 10: The end-to-end run-through

One machine, two browser windows side by side: `/base-station` and `/command-center`. The ship is running on the morning. Do this after Task 6, and again after each later task.

- [ ] **Step 1: Slow trouble across the link.** "Restart demo". The overview shows mission day 158, "Earth is 11 min 1 s away", and A1 raised at 06:12. Open A1, acknowledge, send. The status line names the earliest reply time. The Earth console stays as it was for about 11 seconds, then shows the case, raised 06:12. Reply from the Earth console. About 11 seconds later the reply is in A1's thread and "Accept plan" appears. Accept: four reminders on the overview.
- [ ] **Step 2: Fast trouble.** Press "Sound on", then "Start story". Write down the seconds until LIGHTTIME speaks and until the SOS is raised, and compare them with the two numbers from the backend plan's Task 5. The card says Earth cannot answer in time. Tick the oxygen step. The Earth console shows the report arriving late, with the reasons.
- [ ] **Step 3: No link.** Move the dial to the Sun: the header says "No link to Earth" within two seconds. Send a message in a thread: "queued, no link". Reply from the Earth console: queued. Move the dial back to Mars: both leave.
- [ ] **Step 4: After Task 8.** The overview's cards and the station strip show the ship's values, and a reading posted for `LT-04` shows on the fourth card.
- [ ] **Step 5: Restart.** "Restart demo": A1 is back at raised, the reminders are gone, Okafor needs a check-in again, and the Earth console's newest case is gone. Do Steps 1 and 2 once more from here: the second run must match the first.
- [ ] **Step 6:** Stop the ship and reload the console: it says the ship is unreachable and runs its built-in demo. Start the ship again and reload.

---

### Task 11: The hosted build can be given the ship's address

Spec decision D15, requirement R10. The hosted console is built from this repo's `Dockerfile` on every merge to `main`. `NEXT_PUBLIC_API_URL` is read when the console is built. The `Dockerfile` gives the build no way to receive it, and `.dockerignore` keeps every `.env` file out. So the hosted console is the built-in demo whatever is set on the running service. That is the right state until the ship can be reached from a browser. This task only makes the switch possible.

**Files:** `Dockerfile`.

- [ ] **Step 1:** In `Dockerfile`, in the `builder` stage, between `COPY . .` and `RUN pnpm build`, add:

```dockerfile
# The ship's address is read when the console is built, not when it runs.
# Empty: the built-in demo. "/": the ship answers at this site's own address. Or a full address.
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

- [ ] **Step 2:** If Docker is installed, check both ways. `docker build -t console-seed .` builds as before. `docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:5000 -t console-live .`, then `docker run --rm -p 8080:8080 console-live`: with the ship running locally, `http://localhost:8080/base-station` shows the ship's light time in the header. If Docker is not installed, skip this step: the two lines change nothing unless the argument is passed.
- [ ] **Step 3:** Commit: `build: the console's image can be given the ship's address`. Tell the deployment owner the one line the build needs once the ship can be reached from a browser: `--build-arg NEXT_PUBLIC_API_URL=/` when the load balancer sends `/api/*` to the backend, or the backend's own public address if it gets one (backend plan, Task 4, Step 2).

## Not in this plan

- Sensor checks and a manual SOS as alerts on the console. The adapter leaves them out. A poor signal still shows on the crew card's "Suit now" line.
- A cuff reading at check-in. Nothing on the console enters one, so the ship keeps the last cuff reading on record.
- One-a-second readings in the log. They show on the crew card.
- Turning the hosted console live. That is five settings on the host (backend plan, Task 4) and one build argument. This plan only makes the image accept it (Task 11).
- Push notifications, and any change to the seed, the scoring rules or the styling.

## Self-review

- Spec coverage: R1 is Tasks 1, 2 and 4; R2 is Task 3; R3 is Task 5; R4 is Task 6; R5 is Task 7; R6's screen and R7 are Task 8; R9's screen is Task 9; R10's console half is Task 11. R8 is the backend's.
- Names used across tasks: `LIVE`, `API_URL`, `shipAddress`, `ship`, `pull`, `span`, `toAlert`, `toThreadMessage`, `toReminder`, `buildMission`, `toCrew`, `toStation`, `shipLog`, `shipAlertSchema`, `ShipState`, `ShipAlert`, `ShipCrew` (ship-api); `at`, `clock` (format); `LiveCrew`, `Crew` (schemas); `StationInput`, `seedStation`, `stationReadings` (station); `ship`, `online`, `refresh`, `crew`, `checkedIn`, `station` on `useMission()`; `Dial`, `LightTimeCard`, `EarthConsole`, `CrewBoard`, `SuitNow`.
- Checked by reading, not by running: the four crew ids and names are the same in the console's seed and on the ship; the ship's crew object carries every field `crewSchema` asks for, with no null on the demo morning; `packetSchema` accepts a packet as the backend plan's Task 3 builds it; the symptom words and the reaction time the console sends are ones the ship accepts; the repo has no tests today, so the counts in this plan are the whole suite.
- Known weak points, because nothing was run: the import between `mission-store.tsx` and `ship-api.ts` (a type-only import one way, a value import the other: if the bundler complains, move `shipAlertSchema` and its parts into `src/lib/ship-schemas.ts` and import it from both); `Number(seconds.toFixed(2))` in `span`; the page file under this Next.js version's rules; whether Biome accepts the spread with `live: undefined` in `checkin-done.tsx`; `vi.stubGlobal("fetch", ...)` with a plain object standing in for a response.
