"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";

/** Ids saved under `key`; a per-browser preference, so storage may be missing or junk. */
function load(key: string): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Which panels the viewer folded away, remembered per browser. Toggling morphs each panel into
 * its folded form (and back) with a view transition, matched by view-transition-name.
 * Call only under MissionProvider, which renders after mount, so reading storage cannot mismatch SSR.
 */
export function useFolded(key: string) {
  const [folded, setFolded] = useState(() => load(key));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(folded));
    } catch {
      // storage blocked: the layout just is not remembered
    }
  }, [key, folded]);

  const toggle = useCallback((id: string) => {
    const apply = () =>
      setFolded((f) =>
        f.includes(id) ? f.filter((x) => x !== id) : [...f, id],
      );
    if (!document.startViewTransition) return apply();
    document.startViewTransition(() => flushSync(apply));
  }, []);

  return [folded, toggle] as const;
}

/** Style that lets a panel morph between its open and folded forms. */
export const foldName = (name: string) => ({
  viewTransitionName: name,
  viewTransitionClass: "fold",
});
