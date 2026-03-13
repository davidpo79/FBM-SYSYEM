"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Tracks PageView on initial load AND on SPA route changes.
 * The pixel base script is loaded in layout.tsx <head> as a raw inline
 * script, so window.fbq (the queue function) is guaranteed to exist
 * by the time this component mounts.
 */
export default function FacebookPixel() {
  const pathname = usePathname();
  const prevPathname = useRef<string | null>(null);

  useEffect(() => {
    // Fire on first mount (initial page load) and on every route change.
    // The base script in <head> already fires one PageView for the very
    // first server-rendered page, so we only fire here for SPA navigations.
    if (prevPathname.current !== null && prevPathname.current !== pathname) {
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "PageView");
      }
    }
    prevPathname.current = pathname;
  }, [pathname]);

  return null;
}
