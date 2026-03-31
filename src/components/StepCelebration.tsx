"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

interface StepCelebrationProps {
  stepLabel: string;
  subtitle: string;
  nextStepLabel: string;
  onContinue: () => void;
  autoAdvanceMs?: number;
  /** Optional summary of what was achieved, e.g. "מסמך אסטרטגיה עם 450 מילים" */
  summary?: string;
}

const CONFETTI_COLORS = ["#D4A843", "#22C55E", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6"];

function ConfettiPiece({ delay, color, left }: { delay: number; color: string; left: number }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full"
      style={{
        backgroundColor: color,
        left: `${left}%`,
        top: "-10px",
        animation: `confettiDrop 1.2s ${delay}s ease-out forwards`,
        opacity: 0,
      }}
    />
  );
}

export default function StepCelebration({
  stepLabel,
  subtitle,
  nextStepLabel,
  onContinue,
  autoAdvanceMs = 5000,
  summary,
}: StepCelebrationProps) {
  const [show, setShow] = useState(true);
  const [countdown, setCountdown] = useState(Math.ceil(autoAdvanceMs / 1000));

  useEffect(() => {
    if (autoAdvanceMs <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShow(false);
          setTimeout(onContinue, 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoAdvanceMs, onContinue]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}>
      <div
        className="celebrate-in relative bg-white rounded-3xl p-10 text-center max-w-md mx-4 overflow-hidden"
        style={{ boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)" }}
      >
        {/* Confetti */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <ConfettiPiece
              key={i}
              delay={(i * 0.025)}
              color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
              left={(i * 5) % 100}
            />
          ))}
        </div>

        {/* Checkmark */}
        <div
          className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #22C55E, #16A34A)",
            boxShadow: "0 8px 24px rgba(34, 197, 94, 0.3)",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          {stepLabel} הושלם!
        </h2>
        <p className="text-[var(--text-secondary)] mb-2">
          {subtitle}
        </p>

        {/* Summary */}
        {summary && (
          <p className="text-xs text-[var(--text-muted)] bg-gray-50 rounded-lg py-2 px-4 mb-5 inline-block">
            {summary}
          </p>
        )}

        {!summary && <div className="mb-4" />}

        <Button variant="primary" size="lg" onClick={() => { setShow(false); setTimeout(onContinue, 100); }}>
          {nextStepLabel}
        </Button>

        {autoAdvanceMs > 0 && countdown > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-3">
            ממשיך אוטומטית בעוד {countdown} שניות...
          </p>
        )}
      </div>
    </div>
  );
}
