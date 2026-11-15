import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const CHECKIN_STEPS = ["Cuff", "Capture", "Mood", "Reaction", "Done"];

/** A segmented bar. onSelect: finished steps become buttons that go back to that step. */
export function CheckinStepper({
  step,
  onSelect,
}: {
  step: number;
  onSelect?: (step: number) => void;
}) {
  const last = step === CHECKIN_STEPS.length;
  return (
    <div className="flex w-full max-w-xl min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-bold">
          Step {step} of {CHECKIN_STEPS.length} · {CHECKIN_STEPS[step - 1]}
        </span>
        {onSelect && step > 1 && (
          <span className="hidden text-muted-foreground sm:inline">
            Tap a finished step to go back
          </span>
        )}
      </div>
      <ol className="grid grid-cols-5 gap-1.5">
        {CHECKIN_STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          const inner = (
            <>
              <span
                aria-hidden
                className={cn(
                  "block h-1.5 w-full",
                  done && "bg-primary",
                  current && (last ? "bg-ok" : "bg-primary/35"),
                  !done && !current && "bg-border",
                )}
              />
              <span
                className={cn(
                  "flex items-center gap-1 truncate text-[11px]",
                  done && "text-link",
                  current &&
                    (last ? "font-bold text-ok" : "font-bold text-foreground"),
                  !done && !current && "text-muted-foreground",
                )}
              >
                {(done || (current && last)) && (
                  <Check aria-hidden className="size-3 shrink-0" />
                )}
                {label}
              </span>
            </>
          );
          return (
            <li
              key={label}
              aria-current={current ? "step" : undefined}
              className="min-w-0"
            >
              {done && onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(n)}
                  aria-label={`Back to ${label}`}
                  className="flex min-h-11 w-full flex-col justify-center gap-1 text-left hover:opacity-80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {inner}
                </button>
              ) : (
                <div className="flex min-h-11 flex-col justify-center gap-1">
                  {inner}
                  {done && <span className="sr-only">(done)</span>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
