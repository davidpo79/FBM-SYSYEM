"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2" dir="rtl">
      <span className="text-xs text-[var(--text-muted)]">מומחה FBM מקליד</span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: "var(--gold)",
              animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes bounce {
          0%,
          60%,
          100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
}
