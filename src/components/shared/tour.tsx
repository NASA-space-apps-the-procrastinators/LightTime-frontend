"use client";

import {
  ArrowLeft,
  ArrowRight,
  MousePointerClick,
  Play,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  type CSSProperties,
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { GROUND, MISSION } from "@/lib/crew";
import { ship } from "@/lib/ship-api";
import { cn } from "@/lib/utils";

export type TourStep = {
  route: string;
  /** CSS selectors; the spotlight covers all of them together. */
  targets: string[];
  title: string;
  text: string;
  /** What to press at this stop, if anything. */
  action?: string;
};

const [LO, HI] = MISSION.mars_light_time_min;
const SHIP_ROW = '[data-tour="ship-row"]';

// Two threads run through every stop: how to use the console, and why the delay to Earth matters.
export const STEPS: TourStep[] = [
  {
    route: "/base-station",
    targets: [SHIP_ROW],
    title: "How far away is Earth?",
    text: `Radio travels at the speed of light. From Mars that's ${LO} to ${HI} minutes each way, so any question to Earth waits twice as long for an answer. This row shows the delay right now.`,
    action:
      "Press Space station, Moon or Mars and watch the delay to Earth change.",
  },
  {
    route: "/base-station",
    targets: ['section[aria-label="Crew"]'],
    title: "The crew at a glance",
    text: "Each card compares one crew member with their own normal readings, not with an average person. Green is OK, yellow is WATCH, red is ALERT. The station gauges above check the cabin the same way.",
  },
  {
    route: "/base-station",
    targets: [
      'section[aria-label="Alerts"]',
      'section[aria-label="Check-ins due"]',
    ],
    title: "What needs you now",
    text: "Alerts keep beeping until someone acknowledges them. Check-ins due lists who still has the morning routine to do.",
  },
  {
    route: "/base-station/crew/C1",
    targets: [
      'section[aria-label="Body map"]',
      'section[aria-label="Indicator detail"]',
    ],
    title: "One person, head to toe",
    text: "Each body region takes the colour of its worst reading. The chart shows the last 7 days against this person's normal range.",
    action: "Tap a region on the body to see what's behind its colour.",
  },
  {
    route: "/base-station/crew/C1/check-in",
    targets: ['[data-tour="checkin"]'],
    title: "The morning check-in",
    text: "About two minutes: blood pressure from the cuff, mood and sleep, then a reaction test NASA uses to spot sleep loss.",
    action:
      "Press “Cuff is on, start capture”. “Skip the wait (demo)” jumps ahead.",
  },
  {
    route: "/base-station/alerts/A1",
    targets: [
      'section[aria-label="Round trip"]',
      '[data-tour="alert-actions"]',
    ],
    title: "An alert's round trip",
    text: "Raised, acknowledged, sent to Earth, answered, resolved. Each trip to Earth and back costs the light delay, so the ship does all it can before it asks.",
    action: "Press Acknowledge, then “Send to flight surgeon”.",
  },
  {
    route: "/base-station/alerts/A1",
    targets: ['section[aria-label="Thread with ground"]'],
    title: "Talking to Earth",
    text: `${GROUND.flight_surgeon}, the flight surgeon, answers here. Until the answer arrives, the crew are on their own. The ship has already sent 7 days of readings, so Earth never has to ask for them.`,
  },
  {
    route: "/base-station/log",
    targets: ['section[aria-label="Packets"]'],
    title: "Every reading, logged",
    text: "Each reading is a packet. The ship stamps it with the time and queues it for Earth. Filter by crew member or by state.",
  },
  {
    route: "/command-center",
    targets: ['section[aria-label="Link to the ship"]'],
    title: "Mission control, on Earth",
    text: "The big number is how old the light from the ship is. Everything Earth sees already happened that long ago.",
  },
  {
    route: "/command-center",
    targets: ['article:has([placeholder="Reply to the ship"])'],
    title: "The flight surgeon's side",
    text: "The report that crossed the gap. The flight surgeon opens the handoff and checklist, then replies. The Send button says when the reply will reach the ship.",
    action: "Type a reply and press Send.",
  },
  {
    route: "/base-station",
    targets: [SHIP_ROW],
    title: "Now see why it matters",
    text: "Watch a medical emergency at Mars distance, start to finish, in about 30 seconds. You don't need to press anything.",
  },
];

/** The ship's live-story anchors, as places on this console. */
function anchorSelector(anchor: string | null): string | null {
  if (!anchor) return null;
  if (anchor.startsWith("crew:"))
    return `article:has(a[href="/base-station/crew/${anchor.slice(5)}"])`;
  return (
    { alerts: 'section[aria-label="Alerts"]', earth: '[data-tour="earth"]' }[
      anchor
    ] ?? null
  );
}

type Bubble = {
  step: number;
  of: number;
  title: string | null;
  text: string | null;
  anchor: string | null;
};
type Tour =
  | { mode: "off" }
  | { mode: "steps"; i: number }
  | { mode: "live"; bubble: Bubble | null; failed?: boolean };

const TourContext = createContext<{ start: () => void }>({ start: () => {} });

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [tour, setTour] = useState<Tour>({ mode: "off" });
  return (
    <TourContext value={{ start: () => setTour({ mode: "steps", i: 0 }) }}>
      {children}
      {tour.mode !== "off" && <TourOverlay tour={tour} setTour={setTour} />}
    </TourContext>
  );
}

type Box = { top: number; left: number; bottom: number; right: number };

/** Where the targets are on screen, together; null while none is on the page. */
function useSpot(selectors: string[]): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  const key = selectors.join("\n");
  useEffect(() => {
    let scrolled = false;
    const measure = () => {
      const els = key
        .split("\n")
        .filter(Boolean)
        .map((s) => document.querySelector(s))
        .filter((e): e is Element => e !== null);
      if (els.length === 0) return setBox(null);
      if (!scrolled) {
        scrolled = true;
        const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
        els[0].scrollIntoView({
          block: "center",
          behavior: smooth ? "smooth" : "auto",
        });
      }
      const rs = els.map((e) => e.getBoundingClientRect());
      const next = {
        top: Math.min(...rs.map((r) => r.top)),
        left: Math.min(...rs.map((r) => r.left)),
        bottom: Math.max(...rs.map((r) => r.bottom)),
        right: Math.max(...rs.map((r) => r.right)),
      };
      setBox((b) =>
        b &&
        b.top === next.top &&
        b.left === next.left &&
        b.bottom === next.bottom &&
        b.right === next.right
          ? b
          : next,
      );
    };
    measure();
    // Pages load their data after navigation, so keep looking until the target turns up.
    const timer = setInterval(measure, 200);
    addEventListener("scroll", measure, true);
    addEventListener("resize", measure);
    return () => {
      clearInterval(timer);
      removeEventListener("scroll", measure, true);
      removeEventListener("resize", measure);
    };
  }, [key]);
  return box;
}

const PAD = 8;
const CARD_W = 352;

function cardPosition(box: Box | null): CSSProperties {
  // Phones, or nothing to point at: the card sits at the bottom, clear of the tab bar.
  if (typeof window === "undefined" || window.innerWidth < 768 || !box)
    return {
      left: 16,
      right: 16,
      bottom: "calc(4.75rem + env(safe-area-inset-bottom))",
      margin: "0 auto",
    };
  const left = Math.min(
    Math.max(box.left, 16),
    window.innerWidth - CARD_W - 16,
  );
  if (window.innerHeight - box.bottom > 280)
    return { left, top: box.bottom + PAD + 12 };
  if (box.top > 280)
    return { left, bottom: window.innerHeight - box.top + PAD + 12 };
  return { right: 24, bottom: 24 };
}

function TourOverlay({
  tour,
  setTour,
}: {
  tour: Exclude<Tour, { mode: "off" }>;
  setTour: Dispatch<SetStateAction<Tour>>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const titleId = useId();
  const card = useRef<HTMLDivElement>(null);
  const step = tour.mode === "steps" ? STEPS[tour.i] : null;
  const route = step?.route ?? "/base-station";
  const live = tour.mode === "live" ? tour : null;
  const selectors = step
    ? step.targets
    : [anchorSelector(live?.bubble?.anchor ?? null)].filter(
        (s): s is string => s !== null,
      );
  const box = useSpot(selectors);
  const close = () => setTour({ mode: "off" });
  const go = (i: number) => setTour({ mode: "steps", i });

  // Go to the stop's page when the stop changes, never because the viewer wandered off to try something.
  const index = tour.mode === "steps" ? tour.i : -1;
  const here = useRef(pathname);
  here.current = pathname;
  // biome-ignore lint/correctness/useExhaustiveDependencies: index re-runs it when the stop changes on the same page
  useEffect(() => {
    if (here.current !== route) router.push(route);
  }, [index, route, router]);

  useEffect(() => card.current?.focus(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTour({ mode: "off" });
      if (tour.mode !== "steps") return;
      if (e.key === "ArrowRight" && tour.i < STEPS.length - 1)
        setTour({ mode: "steps", i: tour.i + 1 });
      if (e.key === "ArrowLeft" && tour.i > 0)
        setTour({ mode: "steps", i: tour.i - 1 });
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [tour, setTour]);

  // Live: the ship says where its story is, once a second. The last bubble stays up until closed.
  const isLive = tour.mode === "live";
  useEffect(() => {
    if (!isLive) return;
    let stopped = false;
    const poll = () =>
      ship.tour().then(
        (b) => {
          if (stopped || !b.running) return;
          setTour((t) => (t.mode === "live" ? { mode: "live", bubble: b } : t));
        },
        () => {},
      );
    poll();
    const timer = setInterval(poll, 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [isLive, setTour]);

  const watch = () => {
    setTour({ mode: "live", bubble: null });
    ship
      .post("/api/base/demo/start", { name: "tour" })
      .catch(() => setTour({ mode: "live", bubble: null, failed: true }));
  };

  const last = tour.mode === "steps" && tour.i === STEPS.length - 1;
  const label = step
    ? `Step ${index + 1} of ${STEPS.length}`
    : live?.bubble
      ? `Live · ${live.bubble.step} of ${live.bubble.of}`
      : "Live";
  const title = step
    ? step.title
    : live?.failed
      ? "The story didn't start"
      : (live?.bubble?.title ?? "Starting the story");
  const text = step
    ? step.text
    : live?.failed
      ? "The ship didn't answer. Check the link to the ship, then try again."
      : (live?.bubble?.text ??
        "The dial goes to Mars and the suits start streaming. The first bubble is on its way.");
  const done = live?.bubble && live.bubble.step === live.bubble.of;

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed z-50 rounded-xl motion-safe:transition-all motion-safe:duration-300",
          box ? "ring-2 ring-ring" : "inset-0",
        )}
        style={
          box
            ? {
                top: box.top - PAD,
                left: box.left - PAD,
                width: box.right - box.left + PAD * 2,
                height: box.bottom - box.top + PAD * 2,
                boxShadow: "0 0 0 200vmax rgb(7 12 24 / 0.55)",
              }
            : { background: "rgb(7 12 24 / 0.35)" }
        }
      />
      <div
        ref={card}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed z-50 w-88 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-xl outline-none"
        style={cardPosition(box)}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{label}</span>
          <button
            type="button"
            aria-label="Close tour"
            onClick={close}
            className="-mr-2 ml-auto grid size-9 place-items-center rounded-md hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <h2 id={titleId} className="font-heading text-base font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {text}
        </p>
        {step?.action && (
          <p className="mt-3 flex gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <MousePointerClick
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-active"
            />
            <span>
              <strong>Try it:</strong> {step.action}
            </span>
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          {tour.mode === "steps" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="min-h-9"
                disabled={tour.i === 0}
                onClick={() => go(tour.i - 1)}
              >
                <ArrowLeft aria-hidden />
                Back
              </Button>
              {last ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto min-h-9"
                    onClick={close}
                  >
                    Finish
                  </Button>
                  <Button size="sm" className="min-h-9" onClick={watch}>
                    <Play aria-hidden />
                    Watch it live
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="ml-auto min-h-9"
                  onClick={() => go(tour.i + 1)}
                >
                  Next
                  <ArrowRight aria-hidden />
                </Button>
              )}
            </>
          )}
          {live && (live.failed || done) && (
            <Button
              size="sm"
              className="ml-auto min-h-9"
              onClick={live.failed ? watch : close}
            >
              {live.failed ? "Try again" : "Done"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
