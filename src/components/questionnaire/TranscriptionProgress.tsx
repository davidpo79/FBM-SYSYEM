"use client";

interface TranscriptionProgressProps {
  stage: "transcribing" | "extracting" | "filling" | "done";
  error?: string;
  onRetry?: () => void;
  onSwitchToManual?: () => void;
}

const stages = [
  { key: "transcribing", emoji: "🎙️", label: "מתמלל את ההקלטה..." },
  { key: "extracting", emoji: "🧠", label: "מנתח ומחלץ תשובות..." },
  { key: "filling", emoji: "✍️", label: "ממלא את השאלון..." },
];

export default function TranscriptionProgress({
  stage,
  error,
  onRetry,
  onSwitchToManual,
}: TranscriptionProgressProps) {
  const currentIdx = stages.findIndex((s) => s.key === stage);

  return (
    <div dir="rtl" className="card-elevated p-8 animate-in text-center">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6">
        מעבד את ההקלטה שלך
      </h3>

      <div className="space-y-5 max-w-sm mx-auto">
        {stages.map((s, idx) => {
          const isDone = stage === "done" || idx < currentIdx;
          const isActive = idx === currentIdx && stage !== "done";
          const isPending = idx > currentIdx && stage !== "done";

          return (
            <div key={s.key} className="flex items-center gap-3">
              {/* Status icon */}
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                {isDone ? (
                  <div className="w-7 h-7 rounded-full bg-[var(--success)] flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div
                    className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }}
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-full"
                    style={{ backgroundColor: "var(--card-border)" }}
                  />
                )}
              </div>

              {/* Label */}
              <div className="flex-1 text-right">
                <span
                  className={`text-sm ${
                    isDone
                      ? "text-[var(--success)] font-medium"
                      : isActive
                        ? "text-[var(--text-primary)] font-semibold"
                        : "text-[var(--text-muted)]"
                  }`}
                >
                  {s.emoji} {s.label}
                </span>

                {/* Progress bar for active stage */}
                {isActive && !error && (
                  <div className="mt-1.5 w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: "var(--gold)",
                        animation: "shimmer 2s ease-in-out infinite",
                        width: "70%",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!error && stage !== "done" && (
        <p className="text-xs text-[var(--text-muted)] mt-6">
          זה יכול לקחת 30-60 שניות
        </p>
      )}

      {error && (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-red-500">{error}</p>
          <div className="flex gap-3 justify-center">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="btn-gold text-sm"
              >
                נסה שוב
              </button>
            )}
            {onSwitchToManual && (
              <button
                type="button"
                onClick={onSwitchToManual}
                className="btn-outline text-sm"
              >
                עבור לידני
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
