"use client";

import { useEffect, useState, useRef } from "react";

interface StepProgressProps {
  /** Ordered list of step labels, e.g. ["מנתח תשובות", "בונה מסמך", "מסיים"] */
  steps: string[];
  /** Total estimated seconds (for auto-advancing steps proportionally) */
  estimatedSeconds?: number;
}

export default function StepProgress({ steps, estimatedSeconds = 20 }: StepProgressProps) {
  const [activeStep, setActiveStep] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now();
    setActiveStep(0); // eslint-disable-line react-hooks/set-state-in-effect

    const stepDuration = (estimatedSeconds * 1000) / steps.length;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const step = Math.min(Math.floor(elapsed / stepDuration), steps.length - 1);
      setActiveStep(step);
    }, 500);

    return () => clearInterval(interval);
  }, [steps.length, estimatedSeconds]);

  const progress = Math.min(((activeStep + 1) / steps.length) * 100, 100);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Progress bar */}
      <div className="w-full max-w-xs h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--gold) 0%, #E8C36A 100%)",
          }}
        />
      </div>

      {/* Step labels */}
      <div className="flex flex-col items-center gap-2">
        {steps.map((label, i) => {
          const isActive = i === activeStep;
          const isDone = i < activeStep;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm transition-all duration-300 ${
                isActive
                  ? "text-[var(--gold)] font-semibold"
                  : isDone
                    ? "text-[var(--success)] line-through opacity-60"
                    : "text-[var(--text-muted)] opacity-40"
              }`}
            >
              {isDone ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : isActive ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--gold)] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse" />
                </span>
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
              )}
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
