"use client";

import { useState } from "react";

export interface FeedbackPanelProps {
  /** The pipeline step name (for logging) */
  stepName: string;
  /** Called when user clicks "Accurate" */
  onApprove: () => void;
  /** Called when user submits feedback for refinement */
  onRefine: (feedback: string) => Promise<void>;
  /** Whether refinement is in progress */
  isRefining?: boolean;
  /** Whether this step has already been approved */
  isApproved?: boolean;
  /** Approve button label (default: "מדויק, אפשר להמשיך") */
  approveLabel?: string;
  /** Number of previous versions available */
  versionCount?: number;
  /** Called to restore a previous version */
  onRestoreVersion?: (versionIndex: number) => void;
  /** List of previous version timestamps */
  versionTimestamps?: string[];
}

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

  return (
    <div
      className="sticky bottom-0 z-20 -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 mt-6"
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
            <h3 className="font-bold text-[var(--text-primary)] text-base mb-2">
              מה דעתך על התוצאה?
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              אם התוצאה מדויקת - המשך לשלב הבא. אם לא - ספר לנו מה לשנות ונשפר.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={onApprove}
                className="px-5 py-2.5 text-white font-semibold rounded-[10px] transition-all cursor-pointer hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
                  boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
                }}
              >
                {approveLabel}
              </button>
              <button
                onClick={() => setMode("feedback")}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-[10px] transition-colors cursor-pointer"
              >
                לא בדיוק, אני רוצה לשנות
              </button>
              {versionCount > 0 && onRestoreVersion && (
                <button
                  onClick={() => setShowVersions((v) => !v)}
                  className="px-4 py-2.5 rounded-[10px] border border-[var(--card-border)] text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--gold)] transition-all cursor-pointer"
                >
                  {showVersions ? "הסתר גרסאות" : `גרסאות קודמות (${versionCount})`}
                </button>
              )}
            </div>

            {/* Version history */}
            {showVersions && versionCount > 0 && onRestoreVersion && (
              <div className="mt-3 p-3 bg-white rounded-[10px] border border-[var(--card-border)]">
                <p className="text-xs font-bold text-[var(--text-secondary)] mb-2">גרסאות קודמות:</p>
                <div className="space-y-1.5">
                  {versionTimestamps.map((ts, idx) => (
                    <button
                      key={idx}
                      onClick={() => onRestoreVersion(idx)}
                      className="w-full text-right px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span className="text-[var(--text-secondary)]">
                        גרסה {idx + 1}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{ts}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="font-bold text-[var(--text-primary)] text-base mb-2">
              מה תרצה לשנות?
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              תאר מה לא מדויק ומה צריך להשתנות — ה-AI ישפר את התוצאה בהתאם.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder='לדוגמה: "הטון יותר מדי רשמי, אני מדבר בשפה יותר קלילה", "תוסיף דגש על ניסיון של 10 שנים"...'
              rows={3}
              className="w-full px-4 py-3 rounded-[10px] border border-[var(--card-border)] bg-white text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-colors text-sm"
              dir="rtl"
              disabled={isRefining}
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleSubmitFeedback}
                disabled={isRefining || !feedbackText.trim()}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isRefining ? "משפר את התוצאה..." : "שפר לפי ההערות"}
              </button>
              <button
                onClick={() => { setMode("idle"); setFeedbackText(""); }}
                disabled={isRefining}
                className="px-4 py-2.5 rounded-[10px] border border-[var(--card-border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                ביטול
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
