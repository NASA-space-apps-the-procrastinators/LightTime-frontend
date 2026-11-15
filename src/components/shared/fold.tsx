import { Equal } from "lucide-react";
import type { ReactNode } from "react";
import { foldName } from "@/hooks/use-folded";
import type { State } from "@/lib/schemas";
import { STATE_BAR, STATE_BORDER } from "@/lib/state-styles";
import { cn } from "@/lib/utils";

/** The two-bar grip that folds a panel away, or opens it again. */
export function FoldButton({
  label,
  folded = false,
  onClick,
  className,
}: {
  label: string;
  folded?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${folded ? "Expand" : "Collapse"} ${label}`}
      aria-expanded={!folded}
      title={folded ? "Expand" : "Collapse"}
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground/50 transition-colors hover:bg-tile hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Equal aria-hidden className="size-4" />
    </button>
  );
}

// Static class strings so Tailwind sees them: from this breakpoint up, the bar stands upright.
const UPRIGHT = {
  lg: {
    bar: "lg:w-11 lg:flex-col lg:justify-start lg:px-0 lg:py-3",
    icon: "lg:rotate-90",
    label: "lg:h-0 lg:flex-1 lg:rotate-180 lg:[writing-mode:vertical-rl]",
    detail: "lg:hidden",
    dot: "",
  },
  xl: {
    bar: "xl:w-11 xl:flex-col xl:justify-start xl:px-0 xl:py-3",
    icon: "xl:rotate-90",
    label: "xl:h-0 xl:flex-1 xl:rotate-180 xl:[writing-mode:vertical-rl]",
    detail: "xl:hidden",
    dot: "xl:hidden",
  },
};

/**
 * A folded panel: a slim full-width bar. With `upright`, it stands as a thin vertical bar from
 * that breakpoint up, for panels whose neighbours sit beside it.
 */
export function FoldedBar({
  name,
  label,
  detail,
  state = "OK",
  ariaLabel,
  upright,
  className,
  onExpand,
}: {
  name: string;
  label: ReactNode;
  detail?: ReactNode;
  state?: State;
  ariaLabel: string;
  upright?: keyof typeof UPRIGHT;
  className?: string;
  onExpand: () => void;
}) {
  const u = upright ? UPRIGHT[upright] : undefined;
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={ariaLabel}
      aria-expanded={false}
      title="Expand"
      style={foldName(name)}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-xl border bg-card px-3.5 text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-tile hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        u?.bar,
        state === "OK" ? "border-border" : STATE_BORDER[state],
        className,
      )}
    >
      <Equal aria-hidden className={cn("size-4 shrink-0", u?.icon)} />
      <span className={cn("min-w-0 truncate", u?.label)}>{label}</span>
      {state !== "OK" && (
        <span
          aria-hidden
          // Upright at xl (the station strip), the border already carries the state: the dot would only cost height.
          className={cn(
            "size-2 shrink-0 rounded-full",
            STATE_BAR[state],
            u?.dot,
          )}
        />
      )}
      {detail && (
        <span
          className={cn(
            "ml-auto text-sm font-bold normal-case tracking-normal text-foreground tabular-nums",
            u?.detail,
          )}
        >
          {detail}
        </span>
      )}
    </button>
  );
}
