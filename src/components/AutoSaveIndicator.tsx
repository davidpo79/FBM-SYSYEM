"use client";

import { useEffect, useState } from "react";

interface AutoSaveIndicatorProps {
  /** Triggers a new "saved" pulse whenever this value changes */
  trigger: unknown;
  /** Whether data is currently being saved */
  saving?: boolean;
}

export default function AutoSaveIndicator({ trigger, saving = false }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    // Debounce: show "saved" after a brief delay
    const timer = setTimeout(() => {
      setShowSaved(true);
      setKey((k) => k + 1);
    }, 600);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (saving) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "var(--warning)", animation: "blink 1s infinite" }}
        />
        <span>שומר...</span>
      </div>
    );
  }

  if (!showSaved) return null;

  return (
    <div key={key} className="flex items-center gap-1.5 text-xs auto-save-pulse" style={{ color: "var(--success)" }}>
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--success)" }} />
      <span>נשמר</span>
    </div>
  );
}
