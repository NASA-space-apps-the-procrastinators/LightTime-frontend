import { REGIONS, type RegionId } from "@/data/regions";
import type { State } from "@/lib/schemas";

// The design copy is written for a region that needs attention.
const OK_ACTION = "Nothing to do now. Keep your usual schedule.";

const CARDS = [
  { key: "why", title: "Why this matters" },
  { key: "how", title: "How to measure it" },
  { key: "worry", title: "When to worry" },
  { key: "action", title: "What to do now" },
] as const;

export function RegionCards({
  region,
  state,
}: {
  region: RegionId;
  state: State;
}) {
  const r = REGIONS[region];
  const text = (key: (typeof CARDS)[number]["key"]) =>
    key === "action" && state === "OK" ? OK_ACTION : r[key];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CARDS.map((c) => (
        <section
          key={c.key}
          className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <h3 className="text-sm font-semibold">{c.title}</h3>
          <p className="text-sm leading-relaxed text-secondary-foreground">
            {text(c.key)}
          </p>
          <p className="mt-auto text-[11px] text-muted-foreground">
            Source: {r.source}
          </p>
        </section>
      ))}
    </div>
  );
}
