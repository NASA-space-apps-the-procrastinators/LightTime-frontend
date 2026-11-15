"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { clickName, report, statPath } from "@/lib/stats";

/** Tells the ship's traffic stats which screens are opened and which buttons pressed. Draws nothing. */
export function StatsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    report("pageview", statPath(pathname));
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // The app ignores a double-click's second press (alert-actions.tsx), so this does too.
      if (e.detail > 1) return;
      const name = clickName(e.target);
      if (name) report("click", name);
    };
    // Capture: some buttons are gone from the page once React has handled their click.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
