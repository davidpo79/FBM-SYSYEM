import { useState, useEffect } from "react";
import type { Question } from "@/lib/questions";

interface QuestionCardProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  track?: "fbm" | "gtm";
  ideaName?: string;
}

export default function QuestionCard({
  question,
  value,
  onChange,
  error,
  track,
  ideaName,
}: QuestionCardProps) {
  const isGtm = track === "gtm";
  const [magicFillAvailable, setMagicFillAvailable] = useState(false);
  const [magicData, setMagicData] = useState<Record<string, string> | null>(null);

  // Check if ideator data is available for magic fill
  useEffect(() => {
    if (!isGtm) return;
    try {
      const stored = localStorage.getItem("gtm-ideator-selected");
      if (stored) {
        const idea = JSON.parse(stored);
        if (idea.name || idea.pitch || idea.niche) {
          const fillMap: Record<string, string> = {};
          if (idea.pitch) fillMap["1"] = `הבעיה שאני פותר: ${idea.pitch}\nקהל יעד: ${idea.niche || ""}`;
          if (idea.name) fillMap["2"] = `${idea.name}${idea.apisUsed ? ` — פתרון המבוסס על ${idea.apisUsed.join(", ")}` : ""}`;
          setMagicData(fillMap);
          setMagicFillAvailable(Object.keys(fillMap).length > 0);
        }
      }
    } catch { /* ignore */ }
  }, [isGtm]);

  const handleMagicFill = () => {
    if (!magicData || !magicData[question.id]) return;
    onChange(magicData[question.id]);
  };

  const canMagicFill = isGtm && magicFillAvailable && magicData?.[question.id] && (!value || value.length < 5);

  return (
    <div
      className={`rounded-2xl shadow-md border p-6 sm:p-8 ${
        isGtm
          ? "bg-[#0D1117] border-[#1E2D45]"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
      }`}
    >
      {/* Section badge */}
      <span
        className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 ${
          isGtm ? "text-[#00FF88] bg-[rgba(0,255,136,0.1)]" : "text-[var(--gold)] bg-[var(--gold-soft)]"
        }`}
      >
        {question.sectionTitle}
      </span>

      {/* Title — larger for GTM */}
      <h2
        className={`font-bold mb-3 ${
          isGtm
            ? "text-2xl sm:text-3xl text-[#F0F6FF]"
            : "text-xl sm:text-2xl text-gray-900 dark:text-gray-100"
        }`}
      >
        {question.title}
      </h2>

      {/* Question text — larger for GTM */}
      <p className={`mb-6 leading-relaxed ${
        isGtm
          ? "text-lg sm:text-xl text-[#B0BEC5]"
          : "text-base text-gray-600 dark:text-gray-400"
      }`}>
        {question.text}
      </p>

      {/* Pre-fill indicator for GTM */}
      {isGtm && value && value.length > 10 && (
        <div
          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-sm"
          style={{
            background: "rgba(0,255,136,0.06)",
            border: "1px solid rgba(0,255,136,0.15)",
            color: "#00FF88",
          }}
        >
          <span>✨</span>
          <span style={{ fontFamily: "monospace", fontSize: 12 }}>
            מולא אוטומטית מהרעיון שלך — ערוך או אשר
          </span>
        </div>
      )}

      {/* Magic Fill Button */}
      {canMagicFill && (
        <button
          type="button"
          onClick={handleMagicFill}
          className="mb-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer"
          style={{
            background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.25)",
            color: "#00FF88",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>✨</span>
          השתמש בניתוח ה-AI מהרעיון שלי
        </button>
      )}

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="הקלד/י את התשובה כאן..."
        rows={isGtm ? 6 : 5}
        className={`w-full rounded-xl border px-4 py-3 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 transition-colors ${
          isGtm
            ? error
              ? "border-red-400 focus:ring-red-400 bg-[#161D2B] text-[#F0F6FF] text-lg"
              : "border-[#1E2D45] bg-[#161D2B] text-[#F0F6FF] text-lg focus:ring-[#00FF88] focus:border-[#00FF88] placeholder:text-[#3D4F6F]"
            : error
              ? "border-red-400 focus:ring-red-400 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800"
              : "border-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800"
        }`}
      />

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      {/* Character count */}
      <p className={`mt-2 text-xs text-left ${isGtm ? "text-[#3D4F6F]" : "text-gray-400"}`} dir="ltr">
        {value.length} / 10 min
      </p>
    </div>
  );
}
