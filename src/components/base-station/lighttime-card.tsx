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
        {ship && (
          <span className="text-xs text-muted-foreground">
            {ship.ship_ai_role}
          </span>
        )}
      </div>
      {live.speak && (
        <p className="text-base font-semibold leading-snug">{live.speak}</p>
      )}
      {look && (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-border-soft px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">
              Time left to the red line
            </dt>
            <dd className="text-lg font-bold">{span(look.eta_s)}</dd>
          </div>
          <div className="rounded-lg border border-border-soft px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">
              Earliest reply from Earth
            </dt>
            <dd className="text-lg font-bold">
              {look.reply_s === null ? "No link" : span(look.reply_s)}
            </dd>
          </div>
          <div className="rounded-lg border border-border-soft px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">
              Can Earth answer in time?
            </dt>
            <dd
              className={cn(
                "text-lg font-bold",
                !look.earth_in_time && "text-alert",
              )}
            >
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
                  shipApi
                    .post(`/api/base/alerts/${alert.id}/steps`, { index })
                    .then(refresh, refresh)
                }
                className="min-h-9 rounded-md border border-border px-2.5 text-[13px] disabled:opacity-60"
              >
                {done ? "Done" : "Tick"}
              </button>
              <span className={cn(step === live.next_step && "font-semibold")}>
                {step}
              </span>
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
      <p className="text-xs text-muted-foreground">
        Suggests. A person decides.
      </p>
    </section>
  );
}
