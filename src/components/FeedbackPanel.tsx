"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export interface FeedbackPanelProps {
  stepName: string;
  onApprove: () => void;
  onRefine: (feedback: string) => Promise<void>;
  isRefining?: boolean;
  isApproved?: boolean;
  approveLabel?: string;
  versionCount?: number;
  onRestoreVersion?: (versionIndex: number) => void;
  versionTimestamps?: string[];
}

const QUICK_SUGGESTIONS = [
  "שנה את הטון לקליל יותר",
  "קצר יותר ולעניין",
  "פורמלי ומקצועי יותר",
  "הוסף דוגמאות קונקרטיות",
];

export default function FeedbackPanel({
  onApprove,
  onRefine,
  isRefining = false,
  isApproved = false,
  approveLabel = "מדויק, אפשר להמשיך",
  versionCount = 0,
  onRestoreVersion,
  versionTimestamps = [],
}: FeedbackPanelProps) {
  const [mode, setMode] = useState<"idle" | "feedback">("idle");
  const [feedbackText, setFeedbackText] = useState("");
  const [showVersions, setShowVersions] = useState(false);

  if (isApproved) return null;

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    await onRefine(feedbackText.trim());
    setFeedbackText("");
    setMode("idle");
  };

  const handleQuickSuggestion = (text: string) => {
    setFeedbackText((prev) => (prev ? `${prev}\n${text}` : text));
  };

  return (
    <div
      className="sticky bottom-0 z-20 -mx-6 lg:-mx-8 px-6 lg:px-8 py-5 mt-8"
      style={{
        backgroundColor: "rgba(248, 249, 252, 0.95)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderTop: "1px solid var(--card-border)",
        boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div className="max-w-4xl">
        {mode === "idle" ? (
          <>
            <h3 className="font-bold text-[var(--text-primary)] text-base mb-1.5">
              מה דעתך על התוצאה?
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              אם התוצאה מדויקת - המשך לשלב הבא. אם לא - ספר לנו מה לשנות ונשפר.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="success" size="md" onClick={onApprove}>
                {approveLabel}
              </Button>
              <Button variant="secondary" size="md" onClick={() => setMode("feedback")}>
                לא בדיוק, אני רוצה לשנות
              </Button>
              {versionCount > 0 && onRestoreVersion && (
                <Button variant="ghost" size="sm" onClick={() => setShowVersions((v) => !v)}>
                  {showVersions ? "הסתר גרסאות" : `גרסאות קודמות (${versionCount})`}
                </Button>
              )}
            </div>

            {/* Version history */}
            {showVersions && versionCount > 0 && onRestoreVersion && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-[var(--card-border)]">
                <p className="text-xs font-bold text-[var(--text-secondary)] mb-2">גרסאות קודמות:</p>
                <div className="space-y-1.5">
                  {versionTimestamps.map((ts, idx) => (
                    <button
                      key={idx}
                      onClick={() => onRestoreVersion(idx)}
                      className="w-full text-right px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span className="text-[var(--text-secondary)]">גרסה {idx + 1}</span>
                      <span className="text-xs text-[var(--text-muted)]">{ts}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="font-bold text-[var(--text-primary)] text-base mb-1.5">
              מה תרצה לשנות?
            </h3>

            {/* Quick suggestion chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleQuickSuggestion(suggestion)}
                  disabled={isRefining}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer
                    hover:border-[var(--gold)] hover:text-[var(--gold)] hover:bg-[var(--gold-soft)]
                    active:scale-[0.97]
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder='או כתוב בחופשיות: "הטון יותר מדי רשמי", "תוסיף דגש על ניסיון של 10 שנים"...'
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-[var(--card-border)] bg-white text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-colors text-sm leading-relaxed"
              dir="rtl"
              disabled={isRefining}
            />
            <div className="flex gap-3 mt-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmitFeedback}
                disabled={isRefining || !feedbackText.trim()}
              >
                {isRefining ? "משפר את התוצאה..." : "שפר לפי ההערות"}
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => { setMode("idle"); setFeedbackText(""); }}
                disabled={isRefining}
              >
                ביטול
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
