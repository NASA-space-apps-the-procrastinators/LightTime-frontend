import { Check } from "lucide-react";
import { clock } from "@/lib/format";
import type { Alert } from "@/lib/mission-store";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Raised", at: (a: Alert) => a.raisedAt },
  { label: "Acknowledged", at: (a: Alert) => a.acknowledgedAt },
  { label: "Sent to ground", at: (a: Alert) => a.sentAt },
  { label: "Flight surgeon reply", at: (a: Alert) => a.replyAt },
  { label: "Resolved", at: (a: Alert) => a.resolvedAt },
];

export function RoundTrip({ alert }: { alert: Alert }) {
  // The first step without a time is the one in progress.
  const current = STEPS.findIndex((s) => !s.at(alert));

  return (
    <section
      aria-label="Round trip"
      className="rounded-xl border border-border bg-card px-5 py-4"
    >
      <h2 className="mb-4 text-[15px] font-semibold">Round trip</h2>
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {STEPS.map((s, i) => {
          const time = s.at(alert);
          const isCurrent = i === current;
          const last = i === STEPS.length - 1;
          // The dotted line to the next step is green once that step has happened.
          const nextDone = !last && Boolean(STEPS[i + 1].at(alert));
          return (
            <li
              key={s.label}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "relative flex items-start gap-3 sm:flex-col sm:items-center sm:text-center",
                // Phone: down from this circle to the next. sm+: across, circle edge to circle edge (gap-3 = 12px).
                !last &&
                  "after:absolute after:top-[34px] after:-bottom-1.5 after:left-[13px] after:border-l-2 after:border-dotted after:content-[''] sm:after:top-[13px] sm:after:bottom-auto sm:after:left-[calc(50%+20px)] sm:after:w-[calc(100%-28px)] sm:after:border-t-2 sm:after:border-l-0",
                nextDone ? "after:border-ok" : "after:border-border-strong",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                  time && "border-ok bg-ok text-white",
                  isCurrent && "border-active",
                  !time && !isCurrent && "border-border-strong",
                )}
              >
                {time && <Check className="size-4" />}
              </span>
              <span className="text-[13px]">
                <span className={cn("block", isCurrent && "font-bold")}>
                  {s.label}
                </span>
                <span className="block text-muted-foreground">
                  {time ? clock(time) : isCurrent ? "Next" : "Waiting"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
