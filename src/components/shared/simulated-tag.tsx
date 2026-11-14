import { cn } from "@/lib/utils";

export function SimulatedTag({
  label = "SIMULATED",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-dashed border-border-strong px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
