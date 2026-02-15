"use client";

import { useState } from "react";
import { getQuestions, type QuestionnaireAnswers } from "@/lib/questions";

interface ExtractedData {
  answers: Record<string, string>;
  confidence: Record<string, number>;
  summary: string;
}

interface AnswerReviewProps {
  ownerNiche: string;
  extractedData: ExtractedData;
  onApprove: (answers: QuestionnaireAnswers) => void;
  onRecordMore: () => void;
}

export default function AnswerReview({
  ownerNiche,
  extractedData,
  onApprove,
  onRecordMore,
}: AnswerReviewProps) {
  const questions = getQuestions(ownerNiche);
  const [editedAnswers, setEditedAnswers] = useState<QuestionnaireAnswers>(
    () => {
      const initial: QuestionnaireAnswers = {};
      questions.forEach((q) => {
        initial[q.id] = extractedData.answers[q.id] || "";
      });
      return initial;
    },
  );

  const filledCount = questions.filter(
    (q) => (editedAnswers[q.id] ?? "").trim().length >= 10,
  ).length;

  const getConfidenceBadge = (qId: string) => {
    const conf = extractedData.confidence[qId] ?? 0;
    const answer = (editedAnswers[qId] ?? "").trim();
    if (!answer || conf <= 1) {
      return {
        label: "לא מצאנו — השלם ידנית",
        color: "#EF4444",
        bg: "rgba(239, 68, 68, 0.1)",
        icon: "❌",
      };
    }
    if (conf <= 3) {
      return {
        label: "תשובה חלקית — כדאי לערוך",
        color: "#F59E0B",
        bg: "rgba(245, 158, 11, 0.1)",
        icon: "⚠️",
      };
    }
    return {
      label: "תשובה מלאה",
      color: "#22C55E",
      bg: "rgba(34, 197, 94, 0.1)",
      icon: "✅",
    };
  };

  const handleChange = (qId: string, value: string) => {
    setEditedAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  return (
    <div dir="rtl" className="space-y-4">
      {/* Summary header */}
      <div className="card-elevated p-5 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              סקירת תשובות
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {extractedData.summary}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: "rgba(212, 168, 67, 0.1)" }}>
            <span className="text-lg font-black text-[var(--gold)]">
              {filledCount}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              מתוך {questions.length} מולאו
            </span>
          </div>
        </div>
      </div>

      {/* Answer cards */}
      {questions.map((q, idx) => {
        const badge = getConfidenceBadge(q.id);
        return (
          <div
            key={q.id}
            className={`card-static p-5 animate-in delay-${Math.min(idx + 1, 8)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs font-semibold text-[var(--gold)]">
                  {q.section}
                </span>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  {idx + 1}. {q.title}
                </h4>
              </div>
              <span
                className="text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap flex-shrink-0"
                style={{ backgroundColor: badge.bg, color: badge.color }}
              >
                {badge.icon} {badge.label}
              </span>
            </div>

            <textarea
              value={editedAnswers[q.id] ?? ""}
              onChange={(e) => handleChange(q.id, e.target.value)}
              rows={3}
              className="w-full mt-2 px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-white dark:bg-gray-800 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent"
              placeholder="כתוב או ערוך את התשובה..."
              style={{ minHeight: "80px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }}
            />
          </div>
        );
      })}

      {/* Action buttons */}
      <div className="flex gap-3 mt-6 sticky bottom-4">
        <button
          type="button"
          onClick={() => onApprove(editedAnswers)}
          className="flex-1 btn-gold !py-3.5 text-base"
        >
          ✅ אשר וצור אסטרטגיה 🚀
        </button>
        <button
          type="button"
          onClick={onRecordMore}
          className="btn-outline !py-3.5 px-5 text-sm"
        >
          🎙️ הקלט עוד קטע
        </button>
      </div>
    </div>
  );
}
