"use client";

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

export default function PipelineStepper({
  steps,
  currentStep,
  completedSteps,
}: PipelineStepperProps) {
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

          return (
            <Link
              key={step.key}
              href={step.href}
              className={`flex-1 flex flex-col items-center relative z-10 ${isPending ? "opacity-50" : ""}`}
            >
              {/* Circle */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={
                  isCompleted
                    ? {
                        background: "linear-gradient(135deg, #22C55E, #16A34A)",
                        color: "white",
                        boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
                      }
                    : isActive
                      ? {
                          background: "linear-gradient(135deg, #D4A843, #C49A38)",
                          color: "white",
                          animation: "pulse-gold 2s infinite",
                        }
                      : {
                          background: "#E5E7EB",
                          color: "var(--text-muted)",
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
                    : isCompleted
                      ? "text-[var(--success)]"
                      : "text-[var(--text-muted)]"
                }`}
              >
                {step.label}
              </span>
            </Link>
          );
        })}
      </div>

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
