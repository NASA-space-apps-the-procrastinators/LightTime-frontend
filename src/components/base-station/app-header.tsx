"use client";

import {
  ClipboardCheck,
  Globe,
  RotateCcw,
  ScrollText,
  TriangleAlert,
  UserRound,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dial } from "@/components/base-station/dial";
import { NotifyButton } from "@/components/base-station/notify-button";
import { SimulatedTag } from "@/components/shared/simulated-tag";
import { Button } from "@/components/ui/button";
import { MISSION } from "@/lib/crew";
import { useMission } from "@/lib/mission-store";
import { LIVE, ship as shipApi, span } from "@/lib/ship-api";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Crew", href: "/base-station", icon: Users },
  { label: "Astronaut", href: "/base-station/crew/C1", icon: UserRound },
  {
    label: "Check-in",
    href: "/base-station/crew/C1/check-in",
    icon: ClipboardCheck,
  },
  { label: "Alerts", href: "/base-station/alerts/A1", icon: TriangleAlert },
  { label: "Log", href: "/base-station/log", icon: ScrollText },
];

function isActive(pathname: string, href: string) {
  if (href === "/base-station") return pathname === href;
  if (href.endsWith("/check-in")) return pathname.endsWith("/check-in");
  if (href.startsWith("/base-station/crew/"))
    return (
      pathname.startsWith("/base-station/crew/") &&
      !pathname.endsWith("/check-in")
    );
  if (href.startsWith("/base-station/alerts/"))
    return pathname.startsWith("/base-station/alerts/");
  return pathname === href;
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, dispatch, ship, online, refresh } = useMission();
  const [lo, hi] = MISSION.mars_light_time_min;
  const audioAvailable = typeof globalThis.AudioContext === "function";
  const soundOn = audioAvailable && state.soundOn;
  const restart = () => {
    dispatch({ type: "reset" });
    router.push("/base-station");
  };
  const nav = LIVE
    ? [...NAV, { label: "Earth", href: "/command-center", icon: Globe }]
    : NAV;

  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-soft bg-tile px-4 py-3 md:px-8">
      <Link href="/base-station" className="flex min-h-11 items-center gap-2.5">
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
            stroke="var(--foreground)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="font-heading text-lg font-bold tracking-wide">
          Light Time
        </span>
      </Link>

      <nav
        aria-label="Main"
        // Phones: a fixed bottom tab bar. md and up: inline links in the header.
        className="fixed inset-x-0 bottom-0 z-40 grid auto-cols-fr grid-flow-col border-t border-border-soft bg-tile/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:order-last md:-mx-1 md:flex md:w-full md:gap-5 md:overflow-x-auto md:border-0 md:bg-transparent md:px-1 md:pb-0 md:text-sm md:backdrop-blur-none lg:order-none lg:w-auto"
      >
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 whitespace-nowrap border-t-2 text-[11px] font-medium md:min-h-0 md:flex-row md:border-t-0 md:border-b-2 md:py-1.5 md:text-sm md:font-normal",
                active
                  ? "border-primary text-primary md:font-semibold md:text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon aria-hidden className="size-5 md:hidden" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground md:ml-auto">
        {LIVE && !online && (
          <span className="font-semibold text-alert">
            Ship unreachable: built-in demo
          </span>
        )}
        <span className="hidden md:inline">
          {ship?.platform ?? MISSION.platform} · Mission day{" "}
          <strong className="text-foreground">
            {ship?.mission_day ?? MISSION.mission_day}
          </strong>
        </span>
        {ship ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1",
              ship.link_up ? "border-border" : "border-alert text-alert",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                ship.link_up ? "bg-ok" : "bg-alert",
              )}
            />
            {ship.link_up
              ? `Earth is ${span(ship.delay_s)} away · earliest reply ${span(ship.round_trip_s)}`
              : "No link to Earth"}
            <span className="hidden xl:inline"> · {ship.who_decides}</span>
            {ship.link_up && ship.delay_s >= 60 && (
              <span className="hidden text-[11px] xl:inline">
                {" "}
                (plays as {span(ship.plays_as_s)})
              </span>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
            <span aria-hidden className="size-1.5 rounded-full bg-ok" />
            Ground link {MISSION.one_way_light_time_s} s one-way
            <span className="hidden xl:inline">
              {" "}
              (Mars: {lo} to {hi} min)
            </span>
          </span>
        )}
        <Dial />
        {ship && (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 md:min-h-9"
            title="Play the scripted emergency: blood oxygen falls for the commander"
            // "full": the oxygen drifts down first, so LIGHTTIME's time-left warning comes before
            // the SOS. "stage" drops at once and gives no time left.
            onClick={() =>
              shipApi
                .post("/api/base/scenario/start", { name: "full" })
                .then(refresh, refresh)
            }
          >
            Start story
          </Button>
        )}
        <SimulatedTag />
        <NotifyButton />
        <Button
          variant="outline"
          size="sm"
          disabled={!audioAvailable}
          title={
            audioAvailable
              ? "Alert beep on the console"
              : "Sound is not available in this browser"
          }
          onClick={() => dispatch({ type: "toggleSound" })}
          className="min-h-11 md:min-h-9"
        >
          {soundOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
          {soundOn ? "Sound on" : "Sound off"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={restart}
          className="min-h-11 md:min-h-9"
        >
          <RotateCcw aria-hidden />
          Restart demo
        </Button>
      </div>
    </header>
  );
}
