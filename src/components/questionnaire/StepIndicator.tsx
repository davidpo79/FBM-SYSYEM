interface StepIndicatorProps {
  current: number;
  total: number;
  label?: string;
  track?: "fbm" | "gtm";
  ideaName?: string;
}

export default function StepIndicator({ current, total, label, track, ideaName }: StepIndicatorProps) {
  const progress = Math.min((current / total) * 100, 100);
  const isGtm = track === "gtm";

  if (isGtm) {
    // Determine which GTM phase we're in
    const gtmSteps = [
      { key: "idea", label: "רעיון", icon: "💡" },
      { key: "user", label: "משתמש", icon: "👤" },
      { key: "strategy", label: "אסטרטגיה", icon: "🚀" },
    ];
    // Phase 1 (idea) is done (they came from ideator), phase 2 (user) is done (they signed up), phase 3 is in progress
    const activePhase = 2; // Strategy phase (0-indexed)

    return (
      <div className="w-full mb-3">
        {/* RTL Animated Stepper — compact */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "6px 0 10px", direction: "rtl" }}>
          {gtmSteps.map((step, i) => {
            const isCompleted = i < activePhase;
            const isActive = i === activePhase;

            return (
              <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      ...(isCompleted
                        ? {
                            background: "linear-gradient(135deg, #00FF88, #00CC6A)",
                            color: "#080A0F",
                            boxShadow: "0 0 12px rgba(0,255,136,0.4)",
                          }
                        : isActive
                          ? {
                              background: "rgba(0,255,136,0.12)",
                              border: "2px solid #00FF88",
                              color: "#00FF88",
                              animation: "gtmStepPulse 2s ease-in-out infinite",
                            }
                          : {
                              background: "#1E2D45",
                              border: "2px solid #2A3A55",
                              color: "#6B7FA3",
                            }),
                    }}
                  >
                    {isCompleted ? "✓" : step.icon}
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      marginTop: 2,
                      fontFamily: "monospace",
                      color: isCompleted || isActive ? "#00FF88" : "#6B7FA3",
                    }}
                  >
                    {step.label}
                  </span>
                </div>

                {i < gtmSteps.length - 1 && (
                  <div
                    style={{
                      width: 36,
                      height: 2,
                      margin: "0 4px",
                      marginBottom: 16,
                      borderRadius: 1,
                      background: isCompleted
                        ? "linear-gradient(90deg, #00FF88, #00CC6A)"
                        : "#1E2D45",
                      boxShadow: isCompleted ? "0 0 6px rgba(0,255,136,0.3)" : "none",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* GTM Logo + Title — compact */}
        <div className="flex flex-col items-center gap-1 mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gtm-logo.svg" alt="GTM BootCamp" style={{ height: 24, width: "auto" }} />
          {ideaName && (
            <h1 className="text-sm font-bold text-center text-[#F0F6FF]" style={{ fontFamily: "monospace" }}>
              אסטרטגיית GTM עבור{" "}
              <span className="text-[#00D4FF]" dir="ltr">{ideaName}</span>
            </h1>
          )}
        </div>

        {/* Neon green progress bar — compact */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-[#6B7FA3]">
            {label || `שאלה ${current} מתוך ${total}`}
          </span>
          <span className="text-xs font-medium text-[#00FF88]">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#1E2D45" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #00FF88, #00CC6A)" }}
          />
        </div>

        <style>{`
          @keyframes gtmStepPulse {
            0%, 100% { box-shadow: 0 0 8px rgba(0,255,136,0.2); }
            50% { box-shadow: 0 0 20px rgba(0,255,136,0.5); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label || `שאלה ${current} מתוך ${total}`}
        </span>
        <span className="text-sm font-medium text-[var(--gold)]">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: 'var(--gold)' }}
        />
      </div>
    </div>
  );
}
