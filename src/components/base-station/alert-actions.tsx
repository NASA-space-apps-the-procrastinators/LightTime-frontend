"use client";

import { Check, Send, ThumbsUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GROUND, MISSION } from "@/lib/crew";
import { clock } from "@/lib/format";
import { type Alert, type AlertStage, useMission } from "@/lib/mission-store";
import { span } from "@/lib/ship-api";

const [LO, HI] = MISSION.mars_light_time_min;

const STATUS: Record<AlertStage, string> = {
  raised: "Alert raised. Acknowledge to silence the console beep.",
  acknowledged:
    "Acknowledged. Send the 7-day bundle (heart rate, blood pressure, temperature, sleep, today's check-in) to the flight surgeon.",
  sent: `Sent. Waiting for the flight surgeon. One-way light time ${MISSION.one_way_light_time_s} s (${LO} to ${HI} min from Mars).`,
  replied: `${GROUND.flight_surgeon} replied. Read the plan in the thread, then accept it.`,
  resolved: "Resolved. Temperature reminders are scheduled.",
};

export function AlertActions({ alert }: { alert: Alert }) {
  const { dispatch, ship } = useMission();
  const status = useRef<HTMLOutputElement>(null);
  const acted = useRef(false);
  const now = () => new Date().toISOString();

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

  const primary = {
    raised: { label: "Acknowledge", icon: Check, type: "acknowledge" },
    acknowledged: {
      label: "Send to flight surgeon",
      icon: Send,
      type: "sendToGround",
    },
    replied: {
      label: "Accept plan, mark resolved",
      icon: ThumbsUp,
      type: "acceptPlan",
    },
  } as const;
  const p =
    alert.stage in primary
      ? primary[alert.stage as keyof typeof primary]
      : null;

  // The button the user pressed may disappear (sent, resolved): keep their place on the status line.
  useEffect(() => {
    if (acted.current && !p) status.current?.focus();
    acted.current = false;
  }, [p]);

  return (
    <div data-tour="alert-actions" className="flex flex-col gap-3">
      <output
        ref={status}
        tabIndex={-1}
        className="block rounded-xl border border-border bg-card px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {statusLine()}
      </output>
      {p && (
        <div>
          <Button
            className="min-h-11"
            onClick={(e) => {
              // The same spot becomes the next step's button: a double-click must not press it too.
              if (e.detail > 1) return;
              acted.current = true;
              dispatch({ type: p.type, alertId: alert.id, at: now() });
            }}
          >
            <p.icon aria-hidden />
            {p.label}
          </Button>
        </div>
      )}
    </div>
  );
}
