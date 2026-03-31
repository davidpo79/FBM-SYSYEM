import { useState, useEffect, useCallback } from "react";
import type { Question } from "@/lib/questions";
import { supabase } from "@/lib/supabase";

interface QuestionCardProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  track?: "fbm" | "gtm";
  ideaName?: string;
  allAnswers?: Record<string, string>;
}

export default function QuestionCard({
  question,
  value,
  onChange,
  error,
  track,
  ideaName,
  allAnswers,
}: QuestionCardProps) {
  const isGtm = track === "gtm";
  const [magicFillAvailable, setMagicFillAvailable] = useState(false);
  const [magicData, setMagicData] = useState<Record<string, string> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Scroll to textarea after AI fills it to prevent button from jumping away
  const scrollToTextarea = useCallback(() => {
    // Small delay to let the DOM update with new content
    setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>(".questionnaire-textarea");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  }, []);

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

  const handleAiSuggest = useCallback(async () => {
    setAiLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/suggest-gtm-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          questionId: question.id,
          questionTitle: question.title,
          questionText: question.text,
          ideaName: ideaName || "",
          existingAnswers: allAnswers || {},
        }),
      });
      const json = await res.json();
      if (json.answer) {
        onChange(json.answer);
        scrollToTextarea();
      }
    } catch {
      /* ignore */
    } finally {
      setAiLoading(false);
    }
  }, [question.id, question.title, question.text, ideaName, allAnswers, onChange, scrollToTextarea]);

  const canMagicFill = isGtm && magicFillAvailable && magicData?.[question.id] && (!value || value.length < 5);

  return (
    <div
      className={`rounded-2xl shadow-md border flex flex-col ${
        isGtm
          ? "bg-[#0D1117] border-[#1E2D45] p-4 sm:p-5"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 p-6 sm:p-8"
      }`}
      style={isGtm ? { minHeight: 0, flex: 1 } : undefined}
    >
      {/* Section badge */}
      <span
        className={`inline-block font-semibold px-3 py-0.5 rounded-full ${
          isGtm ? "text-xs text-[#00FF88] bg-[rgba(0,255,136,0.1)] mb-2" : "text-sm text-[var(--gold)] bg-[var(--gold-soft)] mb-4"
        }`}
      >
        {question.sectionTitle}
      </span>

      {/* Title — compact for GTM */}
      <h2
        className={`font-bold ${
          isGtm
            ? "text-base sm:text-lg text-[#F0F6FF] mb-1"
            : "text-xl sm:text-2xl text-gray-900 dark:text-gray-100 mb-3"
        }`}
      >
        {question.title}
      </h2>

      {/* Question text — compact for GTM */}
      <p className={`leading-relaxed ${
        isGtm
          ? "text-sm text-[#B0BEC5] mb-2"
          : "text-base text-gray-600 dark:text-gray-400 mb-6"
      }`}>
        {question.text}
      </p>

      {/* Pre-fill indicator for GTM */}
      {isGtm && value && value.length > 10 && (
        <div
          className="flex items-center gap-2 mb-2 px-2 py-1 rounded-lg"
          style={{
            background: "rgba(0,255,136,0.06)",
            border: "1px solid rgba(0,255,136,0.15)",
            color: "#00FF88",
          }}
        >
          <span style={{ fontSize: 12 }}>✨</span>
          <span style={{ fontFamily: "monospace", fontSize: 11 }}>
            מולא אוטומטית — ערוך או אשר
          </span>
        </div>
      )}

      {/* GTM action buttons row — inline to save space */}
      {isGtm && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Magic Fill Button */}
          {canMagicFill && (
            <button
              type="button"
              onClick={handleMagicFill}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: "rgba(0,255,136,0.08)",
                border: "1px solid rgba(0,255,136,0.25)",
                color: "#00FF88",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>✨</span>
              מילוי מהרעיון
            </button>
          )}

          {/* AI Answer Suggestion Button */}
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={aiLoading}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            style={{
              background: aiLoading ? "rgba(59,130,246,0.15)" : "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.12))",
              border: "1px solid rgba(59,130,246,0.3)",
              color: aiLoading ? "#6B7FA3" : "#60A5FA",
              display: "flex",
              alignItems: "center",
              gap: 4,
              opacity: aiLoading ? 0.7 : 1,
            }}
          >
            {aiLoading ? (
              <>
                <span className="gtm-skeleton" style={{ width: 14, height: 14, borderRadius: "50%", display: "inline-block" }} />
                <span>...AI מייצר</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>תשובה מה-AI</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Non-GTM: original magic fill + AI buttons */}
      {!isGtm && canMagicFill && (
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
        rows={isGtm ? 3 : 5}
        className={`questionnaire-textarea w-full rounded-xl border px-4 py-2 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 transition-colors ${
          isGtm
            ? `flex-1 ${error
              ? "border-red-400 focus:ring-red-400 bg-[#161D2B] text-[#F0F6FF] text-sm"
              : "border-[#1E2D45] bg-[#161D2B] text-[#F0F6FF] text-sm focus:ring-[#00FF88] focus:border-[#00FF88] placeholder:text-[#3D4F6F]"}`
            : error
              ? "border-red-400 focus:ring-red-400 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800"
              : "border-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800"
        }`}
        style={isGtm ? { minHeight: 0, flex: 1 } : undefined}
      />

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {/* Character count */}
      <p className={`mt-1 text-xs text-left ${isGtm ? "text-[#3D4F6F]" : "text-gray-400"}`} dir="ltr">
        {value.length} / 10 min
      </p>
    </div>
  );
}
