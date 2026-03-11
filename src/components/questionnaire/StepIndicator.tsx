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
    return (
      <div className="w-full mb-8">
        {/* GTM 3-phase stepper */}
        <div className="flex items-center justify-center gap-1 mb-5" style={{ fontFamily: "monospace", fontSize: 12 }}>
          <span className="px-3 py-1.5 rounded" style={{ background: "rgba(0,255,136,0.15)", color: "#00FF88" }}>
            [1] רעיון ✓
          </span>
          <span style={{ color: "#3D4F6F" }}>→</span>
          <span className="px-3 py-1.5 rounded" style={{ background: "rgba(0,255,136,0.15)", color: "#00FF88" }}>
            [2] משתמש ✓
          </span>
          <span style={{ color: "#3D4F6F" }}>→</span>
          <span className="px-3 py-1.5 rounded" style={{ background: "rgba(0,255,136,0.15)", color: "#00FF88", border: "1px solid rgba(0,255,136,0.3)" }}>
            [3] אסטרטגיה (בביצוע)
          </span>
        </div>

        {/* GTM Logo + Title */}
        <div className="flex flex-col items-center gap-3 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gtm-logo.svg" alt="GTM BootCamp" className="h-12 w-12" />
          {ideaName && (
            <h1 className="text-lg font-bold text-center text-[#F0F6FF]" style={{ fontFamily: "monospace" }}>
              בוא נבנה את אסטרטגיית ה-GTM עבור{" "}
              <span className="text-[#00D4FF]" dir="ltr">{ideaName}</span>
            </h1>
          )}
        </div>

        {/* Neon green progress bar */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#6B7FA3]">
            {label || `שאלה ${current} מתוך ${total}`}
          </span>
          <span className="text-sm font-medium text-[#00FF88]">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#1E2D45" }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg, #00FF88, #00CC6A)" }}
          />
        </div>
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
