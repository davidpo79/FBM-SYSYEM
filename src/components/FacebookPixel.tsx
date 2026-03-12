"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function FacebookPixel() {
  const pathname = usePathname();

  // Track PageView on SPA route changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname]);

  return null;
}
