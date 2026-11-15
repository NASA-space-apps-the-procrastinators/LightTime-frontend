import { cn } from "@/lib/utils";

/**
 * The Light Time mark and wordmark: one source for the crew console and mission control.
 * The hand and the name take the text colour, so it reads on a light or a dark page.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle
          cx="13"
          cy="13"
          r="11"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
        />
        <path
          d="M13 5v8l5 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-heading text-lg font-bold tracking-wide">
        Light Time
      </span>
    </span>
  );
}
