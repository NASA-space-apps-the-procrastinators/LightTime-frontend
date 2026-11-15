"use client";

import { ChevronDown, Rocket, Send } from "lucide-react";
import { Doto } from "next/font/google";
import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Logo } from "@/components/shared/logo";
import { clock } from "@/lib/format";
import { API_URL, LIVE, span } from "@/lib/ship-api";
import { cn } from "@/lib/utils";

const doto = Doto({ subsets: ["latin"], weight: "800" });

const AGENCY = "Canadian Space Agency";
const MARS_FARTHEST_S = 22.3 * 60;

type Message = {
  id: number;
  kind: string;
  status: "queued" | "in_flight" | "delivered";
  eta_s: number | null;
  sent_at: string | null;
  deliver_at: string | null;
  payload: Record<string, unknown>;
};
type Inbox = {
  link_up: boolean;
  delay_s: number;
  mode: string;
  who_decides: string;
  messages: Message[];
};
type Network = {
  horizons_one_way_s: number;
  dsn_one_way_s: number | null;
  differ_s: number | null;
  source: string;
};
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

/** 660.86 -> "11:01", 0.25 -> "0.25 s": a countdown face (span() is for sentences). */
const face = (seconds: number) => {
  if (seconds < 60) return `${Number(Math.max(0, seconds).toFixed(2))} s`;
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** A live UTC clock. Empty until mounted, so the server and the browser render alike. */
function useUtcClock(): string {
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** The dark screen every state of this page sits on: night sky, Earth's glowing limb below. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#03060d] text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(1px_1px_at_12%_18%,#94a3b8_50%,transparent_51%),radial-gradient(1px_1px_at_68%_9%,#64748b_50%,transparent_51%),radial-gradient(1.5px_1.5px_at_41%_33%,#64748b_50%,transparent_51%),radial-gradient(1px_1px_at_87%_21%,#94a3b8_50%,transparent_51%),radial-gradient(1px_1px_at_23%_48%,#64748b_50%,transparent_51%)] [background-size:520px_520px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-20%] bottom-[-55vh] h-[90vh] rounded-[50%] bg-[radial-gradient(closest-side,#0b1d33_70%,#103a5c_88%,#38bdf8_95%,#f97316_98%,transparent_100%)] opacity-70"
      />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 md:px-8">
        {children}
      </div>
    </main>
  );
}

const glass =
  "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md";

export function EarthConsole() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [sent, setSent] = useState<Message[]>([]);
  const [network, setNetwork] = useState<Network | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [down, setDown] = useState(false);
  const utc = useUtcClock();

  const refresh = useCallback(() => {
    Promise.all([
      get<Inbox>("/api/earth/inbox"),
      get<Message[]>("/api/earth/outbox"),
    ])
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

  if (!LIVE)
    return (
      <Shell>
        <div
          className={cn(
            glass,
            "mx-auto mt-16 flex max-w-xl flex-col gap-3 p-8 text-sm",
          )}
        >
          <h1 className="font-heading text-xl font-semibold">Earth console</h1>
          <p>
            Set NEXT_PUBLIC_API_URL to the ship's address to open the Earth
            console.
          </p>
          <p className="text-slate-400">
            For a ship on this machine, put{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-slate-100">
              NEXT_PUBLIC_API_URL=http://localhost:5001
            </code>{" "}
            in <code className="font-mono text-xs">.env.local</code> and restart
            the console. The address is read when the console starts. Run the
            ship on port 5001: on a Mac, port 5000 belongs to AirPlay.
          </p>
          <Link
            href="/base-station"
            className="inline-flex min-h-11 items-center text-sky-300 hover:text-sky-200"
          >
            ← Back to the crew console
          </Link>
        </div>
      </Shell>
    );
  if (!inbox)
    return (
      <Shell>
        <p className="mt-16 text-center text-sm text-slate-400">
          {down ? "Cannot reach mission control's server." : "Loading…"}
        </p>
      </Shell>
    );

  const cases = groupCases(inbox.messages);
  const fresh = cases.filter((c) => !c.report.payload.simulated);
  const earlier = cases.filter((c) => c.report.payload.simulated);
  const waiting = sent.filter((m) => m.status !== "delivered");
  const flying = waiting.find(
    (m) => m.status === "in_flight" && m.eta_s !== null,
  );
  // What the big countdown shows: a reply on its way, or how old the light from the ship is.
  const shown = flying?.eta_s ?? inbox.delay_s;

  function reply(report: Message) {
    const body = (drafts[report.id] ?? "").trim();
    if (!body) return;
    fetch(`${API_URL}/api/earth/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_id: report.id,
        text: body,
        from: "Flight surgeon",
      }),
    }).then(() => {
      setDrafts((d) => ({ ...d, [report.id]: "" }));
      refresh();
    });
  }

  /** The handoff (SBAR), the week, the reasons and later updates of a case. */
  const extras = ({ report, updates }: Case) => {
    const p = report.payload;
    const sbar = (p.sbar ?? {}) as Record<string, string>;
    const why = Array.isArray(p.why) ? (p.why as string[]) : [];
    const week = (
      p.bundle as
        | { days?: Record<string, { date: string; value: number | null }[]> }
        | undefined
    )?.days;
    return (
      <>
        {p.sbar != null && (
          <dl className="grid gap-3 @lg:grid-cols-2">
            {(
              ["situation", "background", "assessment", "request"] as const
            ).map((part) => (
              <div key={part}>
                <dt className="text-[11px] uppercase tracking-wider text-slate-400">
                  {part}
                </dt>
                <dd className="text-slate-100">{sbar[part]}</dd>
              </div>
            ))}
          </dl>
        )}
        {week?.hr_rest && (
          <p className="text-slate-200">
            Resting heart rate, last 7 days:{" "}
            {week.hr_rest.map((d) => d.value ?? "no value").join(", ")} bpm
          </p>
        )}
        {why.length > 0 && (
          <ul className="list-disc pl-4 text-xs text-slate-300">
            {why.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        {updates.length > 0 && (
          <ul className="flex flex-col gap-1 border-t border-white/10 pt-2 text-slate-200">
            {updates.map((u) => (
              <li key={u.id}>
                {u.deliver_at ? clock(u.deliver_at) : ""} ·{" "}
                {text(u.payload.text) || text(u.payload.event) || u.kind}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  };

  /** Reply to the ship about a case. Stacked: input above a full-width button (narrow places). */
  const replyForm = (report: Message, stacked: boolean) => (
    <form
      className={cn("flex flex-col gap-2", !stacked && "sm:flex-row")}
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
        onChange={(e) =>
          setDrafts((d) => ({ ...d, [report.id]: e.target.value }))
        }
        placeholder="Reply to the ship"
        maxLength={500}
        className={cn(
          "h-11 min-w-0 shrink-0 rounded-full border border-white/15 bg-black/30 px-4 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime-300/50",
          !stacked && "sm:flex-1",
        )}
      />
      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-lime-300 px-5 text-sm font-bold text-slate-950 hover:bg-lime-200 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime-300/50"
      >
        <Send aria-hidden className="size-4" />
        Send, arrives in {inbox.link_up ? span(inbox.delay_s) : "no link"}
      </button>
    </form>
  );

  /** An earlier case as one row of the full-width log; open it for the details and a reply. */
  const row = (c: Case) => {
    const p = c.report.payload;
    const raised = clock(text(p.raised_at));
    const reached = c.report.deliver_at ? clock(c.report.deliver_at) : "";
    return (
      <details key={c.report.id} className="group border-t border-white/10">
        <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 py-3.5 hover:bg-white/[0.03] md:grid-cols-[4.5rem_11rem_minmax(0,1fr)_6.5rem_1rem] md:items-center [&::-webkit-details-marker]:hidden">
          <span className="text-xs text-slate-400 tabular-nums md:text-sm md:text-slate-300">
            {raised}
            <span className="md:hidden"> · {text(p.crew) || text(p.from)}</span>
          </span>
          <span className="hidden truncate text-sm text-slate-300 md:block">
            {text(p.crew) || text(p.from)}
          </span>
          <span className="col-span-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-100 group-open:line-clamp-none md:col-span-1">
            {text(p.reason) || text(p.text)}
          </span>
          <span className="hidden text-sm text-slate-400 tabular-nums md:block">
            {reached}
          </span>
          <ChevronDown
            aria-hidden
            className="col-start-2 row-start-1 size-4 text-slate-400 transition-transform group-open:rotate-180 md:col-start-auto md:row-start-auto"
          />
        </summary>
        <div className="@container grid gap-6 pb-5 text-sm md:grid-cols-[minmax(0,1fr)_20rem] md:pl-[4.5rem]">
          <div className="flex flex-col gap-3">
            <p className="text-[11px] text-slate-400">
              raised {raised} · reached Earth {reached} UTC
            </p>
            {extras(c)}
          </div>
          {replyForm(c.report, true)}
        </div>
      </details>
    );
  };

  // An arrow, not a function declaration: only an arrow keeps `inbox` narrowed to non-null.
  const card = ({ report, updates }: Case) => {
    const p = report.payload;
    const sbar = p.sbar;
    const look = p.lookahead as {
      eta_s: number;
      reply_s: number | null;
      earth_in_time: boolean;
    } | null;
    const why = Array.isArray(p.why) ? (p.why as string[]) : [];
    const week = (p.bundle as { days?: { hr_rest?: unknown } } | undefined)
      ?.days;
    return (
      <article
        key={report.id}
        className="flex flex-col gap-4 rounded-2xl border border-rose-400/30 bg-linear-to-br from-rose-950/90 via-rose-900/55 to-fuchsia-950/60 p-5"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {text(p.level) && (
            <span className="rounded-full bg-rose-500/20 px-2.5 py-1 font-bold uppercase tracking-wider text-rose-200">
              {text(p.level)}
            </span>
          )}
          <span className="text-slate-300">{text(p.crew) || text(p.from)}</span>
          <span className="ml-auto text-slate-400">
            raised {clock(text(p.raised_at))} · reached Earth{" "}
            {report.deliver_at ? clock(report.deliver_at) : ""} UTC
          </span>
        </div>
        <h2 className="font-heading text-xl font-semibold leading-snug sm:text-2xl">
          {text(p.reason) || text(p.text)}
        </h2>
        {look && (
          <p className="text-sm text-slate-200">
            When this left the ship: <strong>{span(look.eta_s)}</strong> to the
            red line, earliest reply{" "}
            <strong>
              {look.reply_s === null ? "none, no link" : span(look.reply_s)}
            </strong>
            .{" "}
            <span
              className={look.earth_in_time ? "text-lime-300" : "text-rose-200"}
            >
              {look.earth_in_time
                ? "Earth could answer in time."
                : "Earth could not answer in time."}
            </span>
          </p>
        )}

        {(sbar != null ||
          why.length > 0 ||
          week?.hr_rest ||
          updates.length > 0) && (
          <details className="group text-sm">
            <summary className="cursor-pointer select-none text-slate-300 hover:text-white">
              Handoff, reasons and updates
            </summary>
            <div className="@container mt-3 flex flex-col gap-3">
              {extras({ report, updates })}
            </div>
          </details>
        )}

        {replyForm(report, false)}
      </article>
    );
  };

  return (
    <Shell>
      {/* Hero: how old the light is, or when a reply lands */}
      <section
        aria-label="Link to the ship"
        // Full-bleed: the map runs edge to edge under the header and fades into the page.
        className="relative isolate -mt-5 mx-[calc(50%-50vw)] h-[40rem] w-screen overflow-hidden sm:h-[42rem]"
      >
        <MapLayer
          delay={inbox.delay_s}
          linkUp={inbox.link_up}
          replies={waiting}
        />
        <div className="pointer-events-none relative z-10 mx-auto flex max-w-7xl flex-col items-start gap-3 px-4 pt-5 md:px-8">
          {/* Header, over the map */}
          <header className="pointer-events-auto flex w-full flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <h1>
                  <Logo />
                </h1>
                <span className="text-xs text-slate-400">
                  Mission control · {AGENCY} · ground
                </span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold",
                  inbox.link_up
                    ? "bg-lime-300 text-slate-950"
                    : "bg-rose-500/25 text-rose-200",
                )}
              >
                {inbox.link_up ? "Link up" : "No link"}
              </span>
              <span
                className={cn(
                  glass,
                  "rounded-full px-4 py-2 text-sm tabular-nums",
                )}
              >
                UTC <strong className="ml-1 font-semibold">{utc}</strong>
              </span>
              <Link
                href="/base-station"
                aria-label="Ship console"
                title="Ship console"
                className={cn(
                  glass,
                  "grid size-11 place-items-center rounded-full hover:bg-white/10",
                )}
              >
                <Rocket aria-hidden className="size-5" />
              </Link>
            </div>
          </header>
          <p className="mt-6 text-sm text-slate-300 sm:mt-10">
            {!inbox.link_up
              ? "No link to the ship"
              : flying
                ? "Reply reaches the ship in"
                : "Light from the ship is"}
          </p>
          <p
            className={cn(
              doto.className,
              "text-7xl leading-none tracking-tight sm:text-8xl",
              !inbox.link_up && "text-rose-300",
            )}
          >
            {!inbox.link_up
              ? "--:--"
              : shown < 60
                ? // Under a minute: the number in dots, its unit in small type like "old".
                  Number(shown.toFixed(2))
                : face(shown)}
            {inbox.link_up && (shown < 60 || !flying) && (
              <span className="ml-3 align-middle font-sans text-base font-normal tracking-normal text-slate-400">
                {shown < 60 ? (flying ? "seconds" : "seconds old") : "old"}
              </span>
            )}
          </p>
          <span
            className={cn(
              glass,
              "rounded-full px-3 py-1.5 text-xs text-slate-200",
            )}
          >
            {inbox.link_up
              ? `One way ${span(inbox.delay_s)} · ${inbox.who_decides}`
              : "Replies are queued and leave when the link returns"}
          </span>
        </div>
      </section>

      <div className="relative grid gap-6 lg:-mt-44 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {waiting.length > 0 && (
            <section
              aria-label="Replies on their way"
              className={cn(glass, "p-5 text-sm")}
            >
              <h2 className="mb-2 font-heading text-base font-semibold">
                Replies on their way
              </h2>
              <ul className="flex flex-col gap-1.5 text-slate-200">
                {waiting.map((m) => (
                  <li key={m.id}>
                    <span className="text-slate-400">
                      {m.status === "queued"
                        ? "Queued, no link"
                        : `Arrives on the ship in ${span(m.eta_s ?? 0)}`}
                      :
                    </span>{" "}
                    {text(m.payload.text)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {fresh.length === 0 ? (
            <p className={cn(glass, "p-5 text-sm text-slate-400")}>
              Nothing new has reached Earth yet. Everything here left the ship
              at least {span(inbox.delay_s)} ago.
            </p>
          ) : (
            fresh.map((c) => card(c))
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          <MarsLink inbox={inbox} network={network} />
        </aside>
      </div>

      {earlier.length > 0 && (
        <section
          aria-labelledby="earlier-h"
          className={cn(glass, "px-5 pt-5 pb-1")}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3">
            <h2 id="earlier-h" className="font-heading text-lg font-semibold">
              Earlier cases
            </h2>
            <span className="text-xs text-slate-400">
              from the generated month · {earlier.length}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="hidden grid-cols-[4.5rem_11rem_minmax(0,1fr)_6.5rem_1rem] gap-x-4 pb-2 text-[11px] uppercase tracking-wider text-slate-500 md:grid"
          >
            <span>Raised</span>
            <span>From</span>
            <span>Case</span>
            <span>Reached Earth</span>
            <span />
          </div>
          {earlier.map(row)}
        </section>
      )}
    </Shell>
  );
}

/** The Earth end of the link. Night lights cropped so it sits at 55% across and 55% down. */
const GROUND = {
  name: AGENCY,
  site: "John H. Chapman Space Centre, Saint-Hubert, QC",
  coords: "45.52° N, 73.39° W",
};

/** The crop of NASA's Black Marble in /images/earth-night-csa.jpg, in degrees (equirectangular). */
const CROP = { west: -111.89, north: 66.42, width: 70, height: 38 };
/** Where a latitude and longitude falls on that image, as CSS percentages. */
const onMap = (lat: number, lon: number) => ({
  left: `${((lon - CROP.west) / CROP.width) * 100}%`,
  top: `${((CROP.north - lat) / CROP.height) * 100}%`,
});

/** Other places worth a label: each sits on its own city lights in the NASA image. */
const PLACES = [
  {
    id: "glenn",
    name: "NASA Glenn Research Center",
    sub: "Cleveland, OH",
    lat: 41.41,
    lon: -81.86,
  },
  {
    id: "nyc",
    name: "New York City",
    sub: "40.71° N, 74.01° W",
    lat: 40.71,
    lon: -74.01,
  },
  {
    id: "chicago",
    name: "Chicago",
    sub: "41.88° N, 87.63° W",
    lat: 41.88,
    lon: -87.63,
  },
] as const;
type Point = { x: number; y: number };

/**
 * NASA's night lights, tilted back like a view from orbit, with the agency pinned on them and the
 * link rising from the pin to the ship. The pin's place on screen is read from a marker on the
 * tilted map, so it stays on Saint-Hubert at any size.
 */
function MapLayer({
  delay,
  linkUp,
  replies,
}: {
  delay: number;
  linkUp: boolean;
  replies: Message[];
}) {
  const panel = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const placeMarkers = useRef<Record<string, HTMLSpanElement | null>>({});
  const [places, setPlaces] = useState<Record<string, Point>>({});
  const [box, setBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  useLayoutEffect(() => {
    const p = panel.current;
    const m = marker.current;
    if (!p || !m) return;
    const place = () => {
      const pr = p.getBoundingClientRect();
      const mr = m.getBoundingClientRect();
      setBox({
        x: mr.left - pr.left,
        y: mr.top - pr.top,
        w: pr.width,
        h: pr.height,
      });
      const next: Record<string, Point> = {};
      for (const [id, el] of Object.entries(placeMarkers.current)) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        next[id] = { x: r.left - pr.left, y: r.top - pr.top };
      }
      setPlaces(next);
    };
    place();
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(place);
    watch.observe(p);
    return () => watch.disconnect();
  }, []);

  // Where the pin's label fits: above-right, above-left, or (a phone) compact under the pin.
  const narrow = box ? box.w < 560 : false;
  const flip = box ? !narrow && box.x + 270 > box.w : false;
  // The link: up from the pin, then across to the ship at the top right of the page column
  // (max-w-7xl), so on a wide screen it does not drift to the window's edge.
  const gutter = box ? Math.max(0, (box.w - 1280) / 2) : 0;
  const end = box && { x: box.w - gutter - 150, y: 170 };
  const at = (t: number) =>
    box && end
      ? {
          x: (1 - t) ** 2 * box.x + 2 * (1 - t) * t * box.x + t ** 2 * end.x,
          y: (1 - t) ** 2 * box.y + 2 * (1 - t) * t * end.y + t ** 2 * end.y,
        }
      : { x: 0, y: 0 };
  const dots = replies
    .filter((m) => m.status === "in_flight" && m.eta_s !== null && delay > 0)
    .map((m) => ({
      id: m.id,
      ...at(Math.min(1, Math.max(0, 1 - (m.eta_s ?? 0) / delay))),
    }));

  return (
    <div ref={panel} className="absolute inset-0">
      {/* The ground, tilted away toward a horizon near the top. */}
      <div className="absolute inset-x-[-35%] bottom-0 h-[170%] origin-bottom [mask-image:linear-gradient(to_top,black_55%,transparent_88%)] [transform:perspective(900px)_rotateX(48deg)]">
        {/* biome-ignore lint/performance/noImgElement: a fixed background picture, no layout shift to optimise */}
        <img
          src="/images/earth-night-csa.jpg"
          alt=""
          className="size-full object-cover object-[55%_55%]"
        />
        <span
          ref={marker}
          aria-hidden="true"
          className="absolute top-[55%] left-[55%] size-0"
        />
        {PLACES.map((pl) => (
          <span
            key={pl.id}
            ref={(el) => {
              placeMarkers.current[pl.id] = el;
            }}
            aria-hidden="true"
            className="absolute size-0"
            style={onMap(pl.lat, pl.lon)}
          />
        ))}
      </div>

      {/* Atmosphere: the map fades into the sky with a thin blue-orange limb. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[34%] bg-linear-to-b from-[#03060d] via-[#03060d]/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[-10%] top-[28%] h-24 rounded-[50%] bg-[radial-gradient(closest-side,rgba(56,189,248,0.28),rgba(249,115,22,0.10)_60%,transparent)] blur-md"
      />

      {box && end && (
        <>
          <svg
            className="absolute inset-0 size-full"
            viewBox={`0 0 ${box.w} ${box.h}`}
            role="img"
            aria-label={
              dots.length
                ? `${dots.length} ${dots.length === 1 ? "reply" : "replies"} on the way from ${GROUND.name} to the ship`
                : `The link from ${GROUND.name} to the ship`
            }
          >
            <path
              d={`M${box.x},${box.y} Q${box.x},${end.y} ${end.x},${end.y}`}
              fill="none"
              stroke={linkUp ? "#e2e8f0" : "#fb7185"}
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeDasharray="3 6"
            />
            {dots.map((d) => (
              <g key={d.id}>
                <circle
                  cx={d.x}
                  cy={d.y}
                  r="12"
                  fill="#bef264"
                  fillOpacity="0.18"
                />
                <circle cx={d.x} cy={d.y} r="4.5" fill="#bef264" />
              </g>
            ))}
          </svg>

          {/* Other notable places, quieter than the agency's pin */}
          {PLACES.map((pl) => {
            const pt = places[pl.id];
            if (!pt) return null;
            return (
              <div
                key={pl.id}
                className="pointer-events-none absolute"
                style={{ left: pt.x, top: pt.y }}
              >
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -left-1 size-2 rounded-full bg-amber-100 shadow-[0_0_10px_3px_rgba(253,230,138,0.55)]"
                />
                {/* A phone has room for the agency's label only: the others are dots there. */}
                {!narrow && (
                  <span className="absolute top-0 left-3 w-max -translate-y-1/2 rounded-md bg-[#02040a]/60 px-1.5 py-0.5 backdrop-blur-sm">
                    <span className="block text-[11px] font-semibold text-slate-100">
                      {pl.name}
                    </span>
                    <span className="block text-[10px] text-slate-400 tabular-nums">
                      {pl.sub}
                    </span>
                  </span>
                )}
              </div>
            );
          })}

          {/* The pin on the agency */}
          <div
            className="pointer-events-none absolute"
            style={{ left: box.x, top: box.y }}
          >
            <span
              aria-hidden="true"
              className="absolute -top-5 -left-5 size-10 rounded-full border border-lime-300/70 motion-safe:animate-ping"
            />
            <span
              aria-hidden="true"
              className="absolute -top-2 -left-2 size-4 rounded-full border-2 border-[#02040a] bg-lime-300 shadow-[0_0_18px_4px_rgba(190,242,100,0.55)]"
            />
            <div
              className={cn(
                "absolute w-max max-w-64 rounded-xl border border-white/15 bg-[#02040a]/75 px-3 py-2 backdrop-blur-md",
                narrow
                  ? "top-5 left-0 -translate-x-1/2 text-center"
                  : flip
                    ? "right-4 bottom-3"
                    : "bottom-3 left-4",
              )}
            >
              <p className="text-[13px] font-semibold text-white">
                {GROUND.name}
              </p>
              {!narrow && (
                <p className="text-[11px] text-slate-300">{GROUND.site}</p>
              )}
              <p className="text-[11px] text-slate-400 tabular-nums">
                {GROUND.coords}
              </p>
            </div>
          </div>

          {/* The ship, at the far end of the link */}
          <div
            className="pointer-events-none absolute flex items-center gap-2 rounded-full border border-white/15 bg-[#02040a]/75 px-3 py-1.5 text-xs backdrop-blur-md"
            style={{ left: end.x + 10, top: end.y - 15 }}
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full bg-orange-500"
            />
            <span className="font-semibold text-white">Ship</span>
            <span className={linkUp ? "text-slate-300" : "text-rose-300"}>
              {linkUp ? span(delay) : "no link"}
            </span>
          </div>
        </>
      )}

      {/* No hard bottom edge: the ground sinks into the page. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-[#03060d] to-transparent"
      />
      {/* Credit: under the ship chip on a wide screen (the panels below cover the map's foot). */}
      <p
        className="absolute text-[10px] text-slate-400"
        style={
          box && !narrow
            ? { left: (end?.x ?? 0) + 14, top: (end?.y ?? 0) + 26 }
            : { right: 12, bottom: 8 }
        }
      >
        Night lights: NASA Black Marble 2016
      </p>
    </div>
  );
}

/** The light time as the dial stands, against Mars at its farthest; and NASA's two figures for Mars today. */
function MarsLink({
  inbox,
  network,
}: {
  inbox: Inbox;
  network: Network | null;
}) {
  const ring = 2 * Math.PI * 70;
  const share = Math.min(1, inbox.delay_s / MARS_FARTHEST_S);
  return (
    <section
      aria-labelledby="mars-link-h"
      className={cn(glass, "flex flex-col gap-5 p-5")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="mars-link-h" className="font-heading text-xl font-semibold">
            Link to the ship
          </h2>
          <p className="text-xs text-slate-400">as the dial stands now</p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            inbox.link_up
              ? "bg-lime-300 text-slate-950"
              : "bg-rose-500/25 text-rose-200",
          )}
        >
          {inbox.link_up ? "Link up" : "No link"}
        </span>
      </div>

      <div className="relative mx-auto size-44">
        <svg
          viewBox="0 0 160 160"
          className="size-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#ffffff1a"
            strokeWidth="8"
            strokeDasharray="2 4"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
            strokeDasharray={`${ring * share} ${ring}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-3xl font-semibold tabular-nums">
            {inbox.link_up ? face(inbox.delay_s) : "--:--"}
          </span>
          <span className="text-[11px] text-slate-400">one way</span>
        </div>
      </div>

      <p className="-mt-3 text-center text-[11px] text-slate-400">
        Full ring: Mars at its farthest, about 22 min
      </p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-slate-400">Round trip</dt>
          <dd className="font-semibold">{span(inbox.delay_s * 2)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Who decides</dt>
          <dd className="font-semibold">{inbox.who_decides}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Mars today · JPL Horizons</dt>
          <dd className="font-semibold">
            {network ? span(network.horizons_one_way_s) : "…"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">
            Mars today · Deep Space Network
          </dt>
          <dd className="font-semibold">
            {network?.dsn_one_way_s != null
              ? span(network.dsn_one_way_s)
              : "no reading"}
          </dd>
        </div>
      </dl>
      {network?.differ_s != null && (
        <p className="text-xs text-slate-400">
          The two NASA figures are {network.differ_s} s apart.
        </p>
      )}
    </section>
  );
}
