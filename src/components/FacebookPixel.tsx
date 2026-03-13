"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function FacebookPixel() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  // Track PageView only on SPA route *changes* (skip initial mount — handled by base script)
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
