"use client";

import { getTrialNotificationMessage } from "@/lib/trial-utils";

interface TrialBannerProps {
  daysLeft: number;
  onUpgrade: () => void;
}

export default function TrialBanner({ daysLeft, onUpgrade }: TrialBannerProps) {
  const message = getTrialNotificationMessage(daysLeft);
  const isUrgent = daysLeft === 1;

  return (
    <div
      className="mb-4 p-3 rounded-xl text-sm text-center font-medium flex items-center justify-center gap-3 flex-wrap"
      style={{
        background: isUrgent
          ? "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)"
          : "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)",
        border: isUrgent
          ? "1px solid rgba(239, 68, 68, 0.3)"
          : "1px solid rgba(245, 158, 11, 0.3)",
        color: isUrgent ? "#EF4444" : "#F59E0B",
      }}
      dir="rtl"
    >
      <span>{message}</span>
      <button
        onClick={onUpgrade}
        className="px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all hover:opacity-90"
        style={{
          background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
          color: "#0F1117",
          boxShadow: "0 2px 8px rgba(212, 168, 67, 0.3)",
        }}
      >
        שדרג עכשיו
      </button>
    </div>
  );
}
