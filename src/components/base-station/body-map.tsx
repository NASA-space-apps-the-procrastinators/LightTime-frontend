import Image from "next/image";
import {
  REGION_IDS,
  REGIONS,
  type RegionId,
  regionState,
} from "@/data/regions";
import type { Crew, State } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const TAG: Record<Exclude<State, "OK">, string> = {
  // Yellow needs dark text; white on yellow is unreadable.
  WATCH: "bg-watch-mark text-foreground",
  ALERT: "bg-alert text-white",
};

const RING: Record<State, string> = {
  OK: "border-ok",
  WATCH: "border-watch-mark",
  ALERT: "border-alert",
};

const DOT: Record<State, string> = {
  OK: "bg-ok",
  WATCH: "bg-watch-mark",
  ALERT: "bg-alert",
};

// Selected hotspots fill with their state tint; the ring stays the state colour, no extra outline.
const FILL: Record<State, string> = {
  OK: "bg-ok-bg",
  WATCH: "bg-watch-bg",
  ALERT: "bg-alert-bg",
};

const STROKE: Record<State, string> = {
  OK: "var(--color-ok)",
  WATCH: "var(--color-watch-mark)",
  ALERT: "var(--color-alert)",
};

// Everything is laid out on a 340 × 560 box; the figure fills its height, centred.
const W = 340;
const H = 560;
const COL = { left: 36, right: W - 36 };

/** dot: the point on the figure. side / y: where its button sits, beside the figure. */
const SPOT: Record<
  RegionId,
  { dot: [number, number]; side: "left" | "right"; y: number }
> = {
  head: { dot: [166, 42], side: "left", y: 56 },
  heart: { dot: [173, 136], side: "right", y: 118 },
  lungs: { dot: [140, 148], side: "left", y: 156 },
  spine: { dot: [181, 197], side: "right", y: 214 },
  gut: { dot: [160, 220], side: "left", y: 258 },
  skin: { dot: [233, 244], side: "right", y: 310 },
  legs: { dot: [153, 395], side: "left", y: 400 },
};

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export function BodyMap({
  crew,
  selected,
  onSelect,
}: {
  crew: Crew;
  selected: RegionId;
  onSelect: (r: RegionId) => void;
}) {
  return (
    // Fixed aspect box: its size depends only on the card width, so nothing inside can shift the page.
    <div className="relative mx-auto aspect-[340/560] w-full max-w-[340px]">
      <div className="body-float absolute inset-0 hover:[animation-play-state:paused]">
        <div
          aria-hidden
          className="absolute inset-x-[15%] top-[8%] bottom-[4%] rounded-full bg-[radial-gradient(closest-side,rgb(103_232_249/0.22),transparent)]"
        />
        <div className="absolute inset-y-0 left-1/2 aspect-[337/1078] h-full -translate-x-1/2 overflow-hidden">
          <Image
            src="/images/body-scan.webp"
            alt=""
            width={337}
            height={1078}
            priority
            className="size-full select-none"
            draggable={false}
          />
          {/* Masked by the figure itself, so the scan lights the body and not the box. */}
          <div
            aria-hidden
            className="absolute inset-0 [mask-image:url(/images/body-scan.webp)] [mask-size:100%_100%]"
          >
            <div className="body-scan absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgb(34_211_238/0.18)_8%,rgb(34_211_238/0.55)_10%,transparent_11%)]" />
          </div>
        </div>

        <svg
          aria-hidden="true"
          viewBox={`0 0 ${W} ${H}`}
          className="pointer-events-none absolute inset-0 size-full"
        >
          {REGION_IDS.map((id) => {
            const { dot, side, y } = SPOT[id];
            const x = side === "left" ? COL.left + 22 : COL.right - 22;
            const isSel = id === selected;
            return (
              <polyline
                key={id}
                points={`${x},${y} ${x + (side === "left" ? 14 : -14)},${y} ${dot[0]},${dot[1]}`}
                fill="none"
                stroke={STROKE[regionState(id, crew)]}
                strokeWidth={isSel ? 2 : 1.25}
                strokeDasharray={isSel ? undefined : "3 3"}
                opacity={isSel ? 1 : 0.7}
              />
            );
          })}
        </svg>

        {REGION_IDS.map((id) => {
          const state = regionState(id, crew);
          const [dx, dy] = SPOT[id].dot;
          return (
            <span
              key={id}
              aria-hidden
              style={{ left: pct(dx, W), top: pct(dy, H) }}
              className="absolute size-2.5 -translate-1/2"
            >
              {state !== "OK" && (
                <span
                  className={cn(
                    "absolute inset-0 animate-ping rounded-full motion-reduce:animate-none",
                    DOT[state],
                  )}
                />
              )}
              <span
                className={cn(
                  "absolute inset-0 rounded-full ring-2 ring-white",
                  DOT[state],
                )}
              />
            </span>
          );
        })}

        {REGION_IDS.map((id) => {
          const r = REGIONS[id];
          const { side, y } = SPOT[id];
          const state = regionState(id, crew);
          const isSel = id === selected;
          return (
            <button
              key={id}
              type="button"
              aria-label={`${r.label}, ${state}`}
              aria-pressed={isSel}
              onClick={() => onSelect(id)}
              style={{ left: pct(COL[side], W), top: pct(y, H) }}
              className={cn(
                "absolute flex size-11 -translate-1/2 items-center justify-center rounded-full border-[3px] bg-tile text-[10px] font-bold text-foreground transition-shadow focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                RING[state],
                isSel && FILL[state],
              )}
            >
              {r.short}
              {state !== "OK" && (
                // State in words, so the map never relies on ring colour alone.
                <span
                  aria-hidden
                  className={cn(
                    "absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 text-[9px] leading-4 font-bold tracking-wide",
                    TAG[state],
                  )}
                >
                  {state}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
