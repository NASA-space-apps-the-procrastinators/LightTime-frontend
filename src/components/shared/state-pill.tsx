import type { State } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const STYLES: Record<State | "RECHECK", string> = {
  OK: "text-ok bg-ok-bg border-ok/45",
  WATCH: "text-watch bg-watch-bg border-watch/45",
  ALERT: "text-alert bg-alert-bg border-alert/55",
  RECHECK: "text-muted-foreground bg-tile border-border-strong",
};

/** State is always spelled out, never colour alone. */
export function StatePill({
  state,
  label,
  className,
}: {
  state: State | "RECHECK";
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold leading-tight tracking-wider",
        STYLES[state],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label ?? state}
    </span>
  );
}
