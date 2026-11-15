"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { THEME_KEY } from "@/lib/theme";

/** "Dark mode" / "Light mode" in the header's More menu. */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);
  // Read after mount: the server cannot know which theme the head script chose.
  useEffect(
    () => setDark(document.documentElement.classList.contains("dark")),
    [],
  );
  if (dark === null) return null;

  return (
    <Button
      variant="ghost"
      className={className}
      onClick={() => {
        const next = !dark;
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem(THEME_KEY, next ? "dark" : "light");
        } catch {
          // storage blocked: the theme still changes, for this visit only
        }
        setDark(next);
      }}
    >
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
      {dark ? "Light mode" : "Dark mode"}
    </Button>
  );
}
