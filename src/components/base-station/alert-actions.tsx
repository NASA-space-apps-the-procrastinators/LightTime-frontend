"use client";

import { Check, Send, ThumbsUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GROUND, MISSION } from "@/lib/crew";
import { type Alert, type AlertStage, useMission } from "@/lib/mission-store";

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
  const { dispatch } = useMission();
  const status = useRef<HTMLOutputElement>(null);
  const acted = useRef(false);
  const now = () => new Date().toISOString();

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
    <div className="flex flex-col gap-3">
      <output
        ref={status}
        tabIndex={-1}
        className="block rounded-xl border border-border bg-card px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {STATUS[alert.stage]}
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
