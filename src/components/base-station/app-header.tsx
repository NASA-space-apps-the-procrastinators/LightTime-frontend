"use client";

import {
  ClipboardCheck,
  Ellipsis,
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
import { useId, useRef } from "react";
import { Dial } from "@/components/base-station/dial";
import { NotifyButton } from "@/components/base-station/notify-button";
import { SuitsButton } from "@/components/base-station/suits-button";
import { ThemeToggle } from "@/components/base-station/theme-toggle";
import { Logo } from "@/components/shared/logo";
import { SimulatedTag } from "@/components/shared/simulated-tag";
import { useTour } from "@/components/shared/tour";
import { Button, buttonVariants } from "@/components/ui/button";
import { clearNotifications } from "@/hooks/use-notifications";
import { MISSION } from "@/lib/crew";
import { useMission } from "@/lib/mission-store";
import { LIVE, span } from "@/lib/ship-api";
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
  const { state, dispatch, ship, online } = useMission();
  const tour = useTour();
  const [lo, hi] = MISSION.mars_light_time_min;
  const audioAvailable = typeof globalThis.AudioContext === "function";
  const soundOn = audioAvailable && state.soundOn;
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const restart = () => {
    clearNotifications();
    dispatch({ type: "reset" });
    router.push("/base-station");
  };
  // Earth is always reachable: without a ship address its page says how to connect one.
  // Phones keep it out of the tab bar (five tabs fit) and show it as a button at the top right.
  const nav = [
    ...NAV,
    { label: "Earth", href: "/command-center", icon: Globe },
  ];

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-soft bg-tile px-4 py-3 md:px-8 dark:bg-background/90 dark:backdrop-blur-md">
      <Link href="/base-station" className="flex min-h-11 items-center">
        {/* Nudged down so the logo's pulse line sits on the menu's text baseline; transform only, no reflow. */}
        <Logo className="md:translate-y-[5px]" />
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
                "flex min-h-14 flex-col items-center justify-center gap-0.5 whitespace-nowrap text-[11px] font-medium md:min-h-0 md:flex-row md:py-1.5 md:text-sm",
                // Active: the text takes the active colour; never a filled or rounded button.
                active
                  ? "font-bold text-active"
                  : "text-muted-foreground hover:text-foreground",
                item.href === "/command-center" && "max-md:hidden",
              )}
            >
              <item.icon aria-hidden className="size-5 md:hidden" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Phones: the buttons stay on the logo's row and this info drops to its own line. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted-foreground max-md:order-1 max-md:w-full md:ml-auto">
        {LIVE && !online && (
          <span className="font-semibold text-alert">
            Ship unreachable: built-in demo
          </span>
        )}
        {!ship && (
          <>
            <span className="hidden md:inline">
              {MISSION.platform} · Mission day{" "}
              <strong className="text-foreground">{MISSION.mission_day}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1">
              <span aria-hidden className="size-1.5 rounded-full bg-ok" />
              Ground link {MISSION.one_way_light_time_s} s one-way
              <span className="hidden xl:inline">
                {" "}
                (Mars: {lo} to {hi} min)
              </span>
            </span>
          </>
        )}
        <SimulatedTag />
      </div>

      <div className="flex items-center gap-3 max-md:ml-auto">
        <Link
          href="/command-center"
          title="Earth console"
          className={cn(
            // no colour variant: black with white text, set here
            buttonVariants({ variant: null, size: "sm" }),
            "min-h-11 bg-foreground text-background hover:bg-foreground/85 md:hidden",
          )}
        >
          Go to Earth
        </Link>
        <Button
          variant="outline"
          size="icon"
          disabled={!audioAvailable}
          aria-label="Alert sound"
          aria-pressed={soundOn}
          title={
            audioAvailable
              ? `Alert beep on the console: ${soundOn ? "on" : "off"}`
              : "Sound is not available in this browser"
          }
          onClick={() => dispatch({ type: "toggleSound" })}
          className="size-11 md:size-9"
        >
          {soundOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="More"
          popoverTarget={menuId}
          // Phones keep the top row to Earth and sound.
          className="size-11 max-md:hidden md:size-9"
        >
          <Ellipsis aria-hidden />
        </Button>
        {/* Native popover: light dismiss and Escape for free; pinned under the header's right edge. */}
        <div
          id={menuId}
          ref={menu}
          popover="auto"
          className="fixed inset-auto top-16 right-4 m-0 w-60 rounded-xl border border-border bg-card p-1.5 text-sm text-foreground shadow-lg md:right-8"
        >
          <NotifyButton variant="ghost" className="h-11 w-full justify-start" />
          <ThemeToggle className="h-11 w-full justify-start" />
          <Button
            variant="ghost"
            onClick={() => {
              menu.current?.hidePopover?.();
              restart();
            }}
            className="h-11 w-full justify-start"
          >
            <RotateCcw aria-hidden />
            Restart demo
          </Button>
        </div>
      </div>

      {ship && (
        // Live: the link gets its own row, so the dial and the story never squeeze the nav.
        // Phones: one line that scrolls sideways, so the pinned header stays short.
        <div
          data-tour="ship-row"
          className="order-last -mx-4 flex w-[calc(100%+2rem)] items-center gap-x-4 gap-y-2 overflow-x-auto border-t border-border-soft px-4 pt-2.5 text-[13px] text-muted-foreground md:mx-0 md:w-full md:flex-wrap md:overflow-visible md:px-0"
        >
          <span className="hidden md:inline">
            {ship.platform} · Mission day{" "}
            <strong className="text-foreground">{ship.mission_day}</strong>
          </span>
          <span
            data-tour="earth"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1",
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
            <span className="hidden lg:inline"> · {ship.who_decides}</span>
            {ship.link_up && ship.delay_s >= 60 && (
              <span className="hidden text-[11px] lg:inline">
                {" "}
                (plays as {span(ship.plays_as_s)})
              </span>
            )}
          </span>
          <Dial />
          <SuitsButton />
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 shrink-0 md:ml-auto md:min-h-9"
            data-stat="Start story"
            title="A click-through tour of the console, ending with a live emergency at Mars distance"
            onClick={tour.start}
          >
            Start story
          </Button>
        </div>
      )}
    </header>
  );
}
