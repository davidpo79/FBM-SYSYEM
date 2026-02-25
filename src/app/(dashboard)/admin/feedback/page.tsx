"use client";

import { useEffect, useState } from "react";

interface FeedbackStats {
  [stepName: string]: { approve: number; refine: number };
}

interface FeedbackEntry {
  id: string;
  step_name: string;
  feedback_text: string;
  created_at: string;
  project_id: string | null;
}

interface FeedbackData {
  stats: FeedbackStats;
  recentFeedback: FeedbackEntry[];
  summary: {
    totalApproves: number;
    totalRefines: number;
    approvalRate: number;
  };
}

const STEP_LABELS: Record<string, string> = {
  strategy: "אסטרטגיה",
  pains: "ניתוח כאבים",
  scripts: "תסריטים",
  copy: "קופי",
};

export default function AdminFeedbackPage() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/feedback")
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-[var(--gold)]/30 border-t-[var(--gold)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-20 text-[var(--text-muted)]">לא נמצאו נתונים</div>;
  }

  return (
    <div className="max-w-5xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">ניתוח פידבק</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card-static p-5 text-center">
          <div className="text-3xl font-bold text-[var(--success)]">{data.summary.approvalRate}%</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">שיעור אישור</div>
        </div>
        <div className="card-static p-5 text-center">
          <div className="text-3xl font-bold text-[var(--gold)]">{data.summary.totalApproves}</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">אישורים</div>
        </div>
        <div className="card-static p-5 text-center">
          <div className="text-3xl font-bold text-orange-500">{data.summary.totalRefines}</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">בקשות שיפור</div>
        </div>
      </div>

      {/* Per-step breakdown */}
      <div className="card-static overflow-hidden mb-8">
        <div className="p-5 border-b border-[var(--card-border)]">
          <h2 className="font-bold text-[var(--text-primary)]">פירוט לפי שלב</h2>
        </div>
        <div className="divide-y divide-[var(--card-border)]">
          {Object.entries(data.stats).map(([step, counts]) => {
            const total = counts.approve + counts.refine;
            const rate = total > 0 ? Math.round((counts.approve / total) * 100) : 0;
            return (
              <div key={step} className="p-5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[var(--text-primary)]">
                    {STEP_LABELS[step] || step}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    {counts.approve} אישורים | {counts.refine} שיפורים
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{
                        width: `${rate}%`,
                        backgroundColor: rate >= 70 ? "#22C55E" : rate >= 40 ? "#F59E0B" : "#EF4444",
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[var(--text-secondary)] w-12 text-left">
                    {rate}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent feedback */}
      <div className="card-static overflow-hidden">
        <div className="p-5 border-b border-[var(--card-border)]">
          <h2 className="font-bold text-[var(--text-primary)]">
            בקשות שיפור אחרונות ({data.recentFeedback.length})
          </h2>
        </div>
        <div className="divide-y divide-[var(--card-border)]">
          {data.recentFeedback.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              אין בקשות שיפור עדיין
            </div>
          ) : (
            data.recentFeedback.map((entry) => (
              <div key={entry.id} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "rgba(249, 115, 22, 0.1)",
                      color: "#F97316",
                    }}
                  >
                    {STEP_LABELS[entry.step_name] || entry.step_name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {new Date(entry.created_at).toLocaleString("he-IL")}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                  &ldquo;{entry.feedback_text}&rdquo;
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
