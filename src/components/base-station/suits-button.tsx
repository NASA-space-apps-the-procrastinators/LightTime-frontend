"use client";

import { Activity } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ship } from "@/lib/ship-api";

/**
 * Demo control: the suits send each crew member's vitals on a timer, to the ship at once and to
 * Earth one light time later. The feed lives on the backend, so this only starts, stops and reads it.
 */
export function SuitsButton() {
  const [feed, setFeed] = useState<{
    running: boolean;
    interval_s: number;
  } | null>(null);
  const read = useCallback(() => {
    ship.feed().then(setFeed, () => setFeed(null));
  }, []);

  useEffect(() => {
    read();
    // Another console (or a reset) may start or stop it too.
    const id = setInterval(read, 5000);
    return () => clearInterval(id);
  }, [read]);

  if (!feed) return null;
  const minutes = Math.round(feed.interval_s / 60);
  return (
    <Button
      variant="outline"
      size="sm"
      className="min-h-11 shrink-0 md:min-h-9"
      aria-pressed={feed.running}
      title="Simulated: each suit sends heart rate, blood oxygen and skin temperature on a timer"
      onClick={() =>
        ship
          .post(feed.running ? "/api/earth/feed/stop" : "/api/earth/feed/start")
          .then(read, read)
      }
    >
      <Activity aria-hidden />
      {feed.running
        ? `Suits on · every ${minutes > 0 ? `${minutes} min` : `${feed.interval_s} s`} · Stop`
        : "Start suits"}
    </Button>
  );
}
