import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const CHECKIN_STEPS = ["Cuff", "Capture", "Mood", "Reaction", "Done"];

export function CheckinStepper({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {CHECKIN_STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li
            key={label}
            aria-current={current ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 text-[13px]",
              current ? "font-bold text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                done && "border-primary bg-primary text-primary-foreground",
                current && "border-primary text-primary",
                !done && !current && "border-border-strong",
              )}
            >
              {done ? <Check aria-hidden className="size-3.5" /> : n}
            </span>
            {label}
            {done && <span className="sr-only">(done)</span>}
          </li>
        );
      })}
    </ol>
  );
}
