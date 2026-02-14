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
      <div className="flex items-center justify-between mb-3">
        {steps.map((step, i) => {
          const isCompleted = completedSteps.includes(step.key);
          const isActive = step.key === currentStep;
          const isPending = !isCompleted && !isActive;

          const content = (
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCompleted
                    ? "bg-[var(--success)] text-white"
                    : isActive
                      ? "bg-[var(--gold)] text-white gold-glow"
                      : "bg-gray-200 text-[var(--text-muted)]"
                }`}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
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
            </div>
          );

          if (isCompleted) {
            return (
              <Link key={step.key} href={step.href} className="flex-1 group">
                {content}
              </Link>
            );
          }

          return (
            <div key={step.key} className={`flex-1 ${isPending ? "opacity-50" : ""}`}>
              {content}
            </div>
          );
        })}
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--gold)] transition-all duration-700 rounded-full"
          style={{
            width: `${Math.max(
              5,
              ((completedSteps.length + (completedSteps.includes(currentStep) ? 0 : 0.5)) / steps.length) * 100
            )}%`,
          }}
        />
      </div>
    </div>
  );
}
