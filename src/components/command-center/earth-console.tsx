"use client";

import Link from "next/link";
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

export function EarthConsole() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [sent, setSent] = useState<Message[]>([]);
  const [network, setNetwork] = useState<Network | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [down, setDown] = useState(false);

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
      <p className="p-8 text-sm">
        Set NEXT_PUBLIC_API_URL to the ship's address to open the Earth console.
      </p>
    );
  if (!inbox)
    return (
      <p className="p-8 text-sm text-muted-foreground">
        {down ? "Cannot reach mission control's server." : "Loading…"}
      </p>
    );

  const cases = groupCases(inbox.messages);
  const fresh = cases.filter((c) => !c.report.payload.simulated);
  const earlier = cases.filter((c) => c.report.payload.simulated);
  const waiting = sent.filter((m) => m.status !== "delivered");

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

  // An arrow, not a function declaration: only an arrow keeps `inbox` narrowed to non-null.
  const card = ({ report, updates }: Case) => {
    const p = report.payload;
    const sbar = (p.sbar ?? {}) as Record<string, string>;
    const look = p.lookahead as {
      eta_s: number;
      reply_s: number | null;
      earth_in_time: boolean;
    } | null;
    const why = Array.isArray(p.why) ? (p.why as string[]) : [];
    const week = (
      p.bundle as
        | {
            days?: Record<string, { date: string; value: number | null }[]>;
          }
        | undefined
    )?.days;
    return (
      <article
        key={report.id}
        className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4"
      >
        <h2 className="font-heading text-lg font-semibold">
          {text(p.crew) || text(p.from)}: {text(p.reason) || text(p.text)}
        </h2>
        <p className="text-xs text-muted-foreground">
          {text(p.level) && `Level ${text(p.level)} · `}raised{" "}
          {clock(text(p.raised_at))} UTC · reached Earth{" "}
          {report.deliver_at ? clock(report.deliver_at) : ""} UTC
        </p>
        {p.sbar != null && (
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            {(
              ["situation", "background", "assessment", "request"] as const
            ).map((part) => (
              <div key={part}>
                <dt className="text-[11px] uppercase text-muted-foreground">
                  {part}
                </dt>
                <dd>{sbar[part]}</dd>
              </div>
            ))}
          </dl>
        )}
        {look && (
          <p className="text-sm font-semibold">
            When this left: {span(look.eta_s)} to the red line, earliest reply{" "}
            {look.reply_s === null ? "none, no link" : span(look.reply_s)}.{" "}
            {look.earth_in_time
              ? "Earth could answer in time."
              : "Earth could not answer in time."}
          </p>
        )}
        {week?.hr_rest && (
          <p className="text-sm">
            Resting heart rate, last 7 days:{" "}
            {week.hr_rest.map((d) => d.value ?? "no value").join(", ")} bpm
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
                {u.deliver_at ? clock(u.deliver_at) : ""} ·{" "}
                {text(u.payload.text) || text(u.payload.event) || u.kind}
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
            onChange={(e) =>
              setDrafts((d) => ({ ...d, [report.id]: e.target.value }))
            }
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
  };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-xl font-bold">
          Light Time · Earth console
        </h1>
        <Link href="/base-station" className="text-[13px] text-link">
          Ship console
        </Link>
        <p
          className={cn(
            "text-sm",
            !inbox.link_up && "font-semibold text-alert",
          )}
        >
          {inbox.link_up
            ? `The ship is ${span(inbox.delay_s)} away. Everything on this screen left it at least that long ago. ${inbox.who_decides}.`
            : "No link to the ship. Replies are queued and leave when it returns."}
        </p>
        {network && (
          <p className="text-xs text-muted-foreground">
            Mars light time today: {span(network.horizons_one_way_s)} worked out
            by NASA JPL Horizons
            {network.dsn_one_way_s !== null &&
              `, ${span(network.dsn_one_way_s)} measured by NASA's Deep Space Network (${network.differ_s} s apart)`}
            .
          </p>
        )}
      </header>

      {waiting.length > 0 && (
        <section
          aria-label="Replies on their way"
          className="rounded-xl border border-border bg-card px-5 py-4 text-sm"
        >
          <h2 className="mb-2 text-[15px] font-semibold">
            Replies on their way
          </h2>
          <ul className="flex flex-col gap-1.5">
            {waiting.map((m) => (
              <li key={m.id}>
                {m.status === "queued"
                  ? "Queued, no link"
                  : `Arrives on the ship in ${span(m.eta_s ?? 0)}`}
                : {text(m.payload.text)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {fresh.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing new has reached Earth yet.
        </p>
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
    </main>
  );
}
