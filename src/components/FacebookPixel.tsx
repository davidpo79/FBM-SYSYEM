"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Tracks PageView on SPA route changes.
 * The pixel script itself is loaded in layout.tsx <head> for immediate availability.
 */
export default function FacebookPixel() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "PageView");
      }
    }
  }, [pathname]);

  return null;
}
