"use client";

import { useState } from "react";
import Link from "next/link";

interface Step {
  key: string;
  label: string;
  href: string;
}

interface PipelineStepperProps {
  steps: Step[];
  currentStep: string;
  completedSteps: string[];
}

const STEP_PREREQS: Record<string, string> = {
  niches: "אסטרטגיה",
  pains: "נישות",
  scripts: "ניתוח כאבים",
  creative: "תסריטים",
  "video-creator": "קריאייטיב",
  copy: "קריאייטיב",
  album: "קופי",
};

export default function PipelineStepper({
  steps,
  currentStep,
  completedSteps,
}: PipelineStepperProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleLockedClick = (stepKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const prereq = STEP_PREREQS[stepKey];
    setTooltip(prereq ? `סיים קודם את שלב ה${prereq}` : "שלב זה עדיין לא זמין");
    setTimeout(() => setTooltip(null), 2500);
  };

  return (
    <div className="mb-8" dir="rtl">
      {/* Steps row */}
      <div className="relative flex items-start justify-between mb-3">
        {/* Connecting lines layer — rendered behind circles */}
        <div className="absolute top-[18px] right-0 left-0 flex z-0 px-[calc(100%/12)]">
          {steps.slice(0, -1).map((_, i) => {
            const segDone = completedSteps.includes(steps[i].key);
            const nextDone = completedSteps.includes(steps[i + 1].key);
            return (
              <div key={i} className="flex-1 h-[2px] mx-0.5">
                <div className="w-full h-full bg-gray-200 rounded-full overflow-hidden">
                  {segDone && (
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: nextDone ? "100%" : "50%",
                        background: "linear-gradient(90deg, #22C55E 0%, #D4A843 100%)",
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step circles + labels */}
        {steps.map((step, i) => {
          const isCompleted = completedSteps.includes(step.key);
          const isActive = step.key === currentStep;
          const isPending = !isCompleted && !isActive;

          // Locked steps show lock icon and tooltip on click
          if (isPending) {
            return (
              <button
                key={step.key}
                type="button"
                onClick={(e) => handleLockedClick(step.key, e)}
                className="flex-1 flex flex-col items-center relative z-10 cursor-pointer"
                style={{ opacity: 0.4 }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:opacity-70"
                  style={{ background: "#E5E7EB", color: "var(--text-muted)" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="text-xs mt-1.5 font-medium text-[var(--text-muted)]">
                  {step.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={step.key}
              href={step.href}
              className="flex-1 flex flex-col items-center relative z-10"
            >
              {/* Circle */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={
                  isCompleted
                    ? {
                        background: "linear-gradient(135deg, #22C55E, #16A34A)",
                        color: "white",
                        boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
                      }
                    : {
                        background: "linear-gradient(135deg, #D4A843, #C49A38)",
                        color: "white",
                        animation: "pulse-gold 2s infinite",
                      }
                }
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs mt-1.5 font-medium ${
                  isActive
                    ? "text-[var(--gold)]"
                    : "text-[var(--success)]"
                }`}
              >
                {step.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Tooltip for locked steps */}
      {tooltip && (
        <div
          className="text-center text-xs font-medium py-1.5 px-4 rounded-lg mb-2 animate-in"
          style={{
            backgroundColor: "rgba(249, 115, 22, 0.1)",
            color: "#EA580C",
            border: "1px solid rgba(249, 115, 22, 0.2)",
          }}
        >
          {tooltip}
        </div>
      )}

      {/* Progress bar with shimmer */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(
              5,
              ((completedSteps.length + (completedSteps.includes(currentStep) ? 0 : 0.5)) / steps.length) * 100
            )}%`,
            background: "linear-gradient(90deg, #22C55E 0%, #D4A843 50%, #C49A38 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s infinite",
            transition: "width 0.7s ease",
          }}
        />
      </div>
    </div>
  );
}
