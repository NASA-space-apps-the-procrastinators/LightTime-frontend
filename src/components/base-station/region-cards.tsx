"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Formula } from "@/components/shared/formula";
import { REGIONS, type RegionId } from "@/data/regions";
import type { State } from "@/lib/schemas";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(true);
  const panel = useId();
  const r = REGIONS[region];
  const text = (key: (typeof CARDS)[number]["key"]) =>
    key === "action" && state === "OK" ? OK_ACTION : r[key];

  return (
    <section className="flex flex-col">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panel}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full items-center gap-2 border border-border bg-card px-4 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          What it means and what to do
          <ChevronDown
            aria-hidden
            className={cn(
              "ml-auto size-4 text-link transition-transform duration-500 ease-spring motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
      </h3>
      {/* 0fr→1fr rows animates height to auto; inert + aria-hidden replace `hidden` so it can animate */}
      <div
        id={panel}
        inert={!open}
        aria-hidden={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-600 ease-spring motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "grid gap-3 pt-3 transition-transform duration-600 ease-spring motion-reduce:transition-none sm:grid-cols-2",
              !open && "-translate-y-3 scale-[0.98]",
            )}
          >
            {CARDS.map((c) => (
              <section
                key={c.key}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
              >
                <h4 className="text-sm font-semibold">{c.title}</h4>
                <p className="text-sm leading-relaxed text-secondary-foreground">
                  <Formula>{text(c.key)}</Formula>
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
