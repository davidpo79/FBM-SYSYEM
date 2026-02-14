"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "../layout";
import MarkdownContent from "@/components/MarkdownContent";

function CountdownTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setRemaining(seconds);
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setRemaining(Math.max(0, seconds - elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  return (
    <div className="inline-flex flex-col items-center">
      <div className="text-4xl font-bold text-[var(--gold)] tabular-nums">
        {remaining > 0 ? remaining : "..."}
      </div>
      <span className="text-sm text-[var(--text-muted)] mt-1">
        {remaining > 0 ? "שניות לסיום המשוער" : "עוד רגע..."}
      </span>
    </div>
  );
}

export default function StrategyPage() {
  const router = useRouter();
  const {
    project,
    strategy,
    setStrategy,
    strategyApproved,
    setStrategyApproved,
    handleDownloadPdf,
    downloading,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [strategyFeedback, setStrategyFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState("");
  const generationAttempted = useRef(false);

  const generateStrategy = async () => {
    if (!project) return;
    setIsGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: project.user_name,
          answers: project.answers_map,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStrategy(json.strategy);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת האסטרטגיה");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate strategy on mount if not yet generated
  useEffect(() => {
    if (strategy || !project || generationAttempted.current) return;
    generationAttempted.current = true;
    generateStrategy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, strategy]);

  const handleRefineStrategy = async () => {
    if (!strategyFeedback.trim()) return;
    setIsRefining(true);
    try {
      const res = await fetch("/api/refine-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStrategy: strategy,
          feedback: strategyFeedback,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStrategy(json.strategy);
      setStrategyFeedback("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בעדכון המסמך");
    } finally {
      setIsRefining(false);
    }
  };

  const handleApprove = () => {
    setStrategyApproved(true);
    router.push(`/project/${project?.id}/niches`);
  };

  if (error && !strategy) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-red-600 mb-2">שגיאה</h2>
        <p className="text-[var(--text-secondary)] mb-4">{error}</p>
        <button
          onClick={() => { generationAttempted.current = false; generateStrategy(); }}
          className="px-5 py-2.5 bg-[var(--gold)] hover:opacity-90 text-white font-semibold rounded-[10px] transition-opacity cursor-pointer"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  // Loading state
  if (!strategy) {
    return (
      <div className="text-center py-20">
        <CountdownTimer seconds={30} />
        <h2 className="text-xl font-bold mt-4 text-[var(--text-primary)]">
          יוצר אסטרטגיית FBM...
        </h2>
        <p className="text-[var(--text-muted)] mt-2">
          FBM Studio מנתח את התשובות שלך ובונה מסמך אסטרטגיה מותאם אישית
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={`flex flex-col lg:flex-row gap-6${!strategyApproved ? " pb-4" : ""}`}>
        {/* Main content - strategy document */}
        <div className="flex-1">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] overflow-hidden">
            <div className="p-6 border-b border-[var(--card-border)]">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                מסמך אסטרטגיה {strategyApproved && <span className="text-[var(--success)] text-base font-medium mr-2">(אושר)</span>}
              </h2>
            </div>
            <div className="p-6">
              <MarkdownContent content={strategy} />
            </div>
          </div>

          {/* Download after approval */}
          {strategyApproved && (
            <div className="mt-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-[16px] p-4">
              <p className="text-sm font-medium text-[var(--success)]">
                המסמך אושר - עכשיו ניתן להוריד
              </p>
              <button
                onClick={() => handleDownloadPdf("מסמך אסטרטגיה FBM", strategy, "strategy.pdf")}
                disabled={downloading === "strategy.pdf"}
                className="px-4 py-2 text-sm font-medium bg-white border border-[var(--card-border)] text-[var(--text-secondary)] rounded-[10px] hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {downloading === "strategy.pdf" ? "מייצא..." : "הורד כ-PDF"}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="lg:w-[340px] flex-shrink-0 space-y-4">
          {/* Status card */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-5">
            <h3 className="font-bold text-[var(--text-primary)] mb-3 text-sm">סטטוס התהליך</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-[var(--gold)] h-2 rounded-full transition-all"
                style={{ width: strategyApproved ? "20%" : "10%" }}
              />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {strategyApproved ? "שלב 1 מתוך 5 הושלם" : "שלב 1 מתוך 5 - בתהליך"}
            </p>
          </div>

          {/* Project info card */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-5">
            <h3 className="font-bold text-[var(--text-primary)] mb-3 text-sm">פרטי הפרויקט</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">שם</span>
                <span className="text-[var(--text-primary)] font-medium">{project?.user_name}</span>
              </div>
              {strategy && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">מילים</span>
                  <span className="text-[var(--text-primary)] font-medium">
                    {strategy.split(/\s+/).length.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky approval flow - floats at bottom while scrolling */}
      {!strategyApproved && (
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
            <h3 className="font-bold text-[var(--text-primary)] text-base mb-2">
              האם המסמך מאפיין אותך?
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              תרצה לדייק או לשנות משהו? כתוב את ההערות שלך ונתקן את המסמך.
            </p>
            <textarea
              value={strategyFeedback}
              onChange={(e) => setStrategyFeedback(e.target.value)}
              placeholder="לדוגמה: אני עובד בתחום כבר 10 שנים ולא 5, הניסיון שלי הוא בעיקר עם עסקים קטנים..."
              rows={2}
              className="w-full px-4 py-3 rounded-[10px] border border-[var(--card-border)] bg-white text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-colors text-sm"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleRefineStrategy}
                disabled={isRefining || !strategyFeedback.trim()}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-[10px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isRefining ? "מעדכן את המסמך..." : "עדכן מסמך"}
              </button>
              <button
                onClick={handleApprove}
                disabled={isRefining}
                className="px-5 py-2.5 bg-[var(--gold)] hover:opacity-90 text-white font-semibold rounded-[10px] transition-opacity disabled:opacity-50 cursor-pointer"
              >
                המסמך מדויק, אפשר להמשיך
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
