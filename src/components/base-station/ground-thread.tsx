"use client";

import { useId, useState } from "react";
import { SimulatedTag } from "@/components/shared/simulated-tag";
import { Button } from "@/components/ui/button";
import { GROUND, getCrew } from "@/lib/crew";
import { clock } from "@/lib/format";
import { type Alert, useMission } from "@/lib/mission-store";
import { cn } from "@/lib/utils";

export function GroundThread({ alert }: { alert: Alert }) {
  const { state, dispatch, ship } = useMission();
  const thread = state.thread.filter(
    (m) => !m.alertId || m.alertId === alert.id,
  );
  const [text, setText] = useState("");
  const id = useId();
  const author = getCrew(alert.crewId)?.name ?? "Crew";

  return (
    <section
      aria-label="Thread with ground"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-semibold">
          Thread with ground
          {!ship && (
            <>
              {" "}
              · Flight surgeon on console: {GROUND.flight_surgeon} (backup{" "}
              {GROUND.backup_flight_surgeon})
            </>
          )}
        </h2>
        {!ship && (
          <SimulatedTag label="SIMULATED flight surgeon" className="ml-auto" />
        )}
      </div>

      <div aria-live="polite">
        {thread.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing sent yet. Send the alert to start the thread.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {thread.map((m) => (
              <li
                key={m.id}
                className={cn(
                  "max-w-[85%] break-words rounded-xl border px-4 py-3 text-sm leading-relaxed",
                  m.from === "crew"
                    ? "self-end border-border bg-border-soft"
                    : "self-start border-border bg-card",
                )}
              >
                <span className="mb-1 flex gap-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {m.author}
                  </span>
                  {clock(m.at)}
                  {m.status && m.status !== "delivered" && (
                    <span>
                      {m.status === "queued" ? "queued, no link" : "on its way"}
                    </span>
                  )}
                </span>
                {m.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          dispatch({
            type: "postMessage",
            text,
            author,
            at: new Date().toISOString(),
            alertId: alert.id,
          });
          setText("");
        }}
      >
        <label htmlFor={id} className="sr-only">
          Message the flight surgeon
        </label>
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message the flight surgeon"
          maxLength={500}
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="submit" className="min-h-11">
          Send
        </Button>
      </form>
    </section>
  );
}
