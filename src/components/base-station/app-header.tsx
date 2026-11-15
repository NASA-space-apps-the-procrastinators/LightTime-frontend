"use client";

import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dial } from "@/components/base-station/dial";
import { SimulatedTag } from "@/components/shared/simulated-tag";
import { Button } from "@/components/ui/button";
import { MISSION } from "@/lib/crew";
import { useMission } from "@/lib/mission-store";
import { LIVE, ship as shipApi, span } from "@/lib/ship-api";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Crew", href: "/base-station" },
  { label: "Astronaut", href: "/base-station/crew/C1" },
  { label: "Check-in", href: "/base-station/crew/C1/check-in" },
  { label: "Alerts", href: "/base-station/alerts/A1" },
  { label: "Log", href: "/base-station/log" },
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

  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-soft bg-tile px-4 py-3 md:px-8">
      <Link href="/base-station" className="flex items-center gap-2.5">
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
        className="order-last -mx-1 flex w-full gap-5 overflow-x-auto px-1 text-sm lg:order-none lg:w-auto"
      >
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap border-b-2 py-1.5",
                active
                  ? "border-primary font-semibold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
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
            className="min-h-9"
            title="Play the scripted emergency: blood oxygen falls for the commander"
            onClick={() =>
              shipApi
                .post("/api/base/scenario/start", { name: "stage" })
                .then(refresh, refresh)
            }
          >
            Start story
          </Button>
        )}
        <SimulatedTag />
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
          className="min-h-9"
        >
          {soundOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
          {soundOn ? "Sound on" : "Sound off"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            dispatch({ type: "reset" });
            router.push("/base-station");
          }}
          className="min-h-9"
        >
          <RotateCcw aria-hidden />
          Restart demo
        </Button>
      </div>
    </header>
  );
}
