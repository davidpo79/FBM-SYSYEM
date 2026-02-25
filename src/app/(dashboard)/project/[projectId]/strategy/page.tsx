"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "../layout";
import MarkdownContent from "@/components/MarkdownContent";
import FeedbackPanel from "@/components/FeedbackPanel";

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
    versionHistory,
    pushVersion,
    restoreVersion,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
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

  const handleRefine = async (feedback: string) => {
    setIsRefining(true);
    try {
      // Save current version before refining
      pushVersion("strategy", strategy);

      const res = await fetch("/api/refine-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStrategy: strategy,
          feedback,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStrategy(json.strategy);

      // Log feedback
      fetch("/api/log-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project?.id,
          stepName: "strategy",
          feedbackType: "refine",
          feedbackText: feedback,
        }),
      }).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בעדכון המסמך");
    } finally {
      setIsRefining(false);
    }
  };

  const handleApprove = () => {
    // Log approval
    fetch("/api/log-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project?.id,
        stepName: "strategy",
        feedbackType: "approve",
      }),
    }).catch(() => {});

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
          <div className="card-static overflow-hidden animate-in">
            <div className="p-8 border-b border-[var(--card-border)]">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                מסמך אסטרטגיה {strategyApproved && <span className="text-[var(--success)] text-base font-medium mr-2">(אושר)</span>}
              </h2>
            </div>
            <div className="p-8">
              <div style={{ maxWidth: "800px" }}>
                <MarkdownContent content={strategy} />
              </div>
            </div>
          </div>

          {/* Download after approval */}
          {strategyApproved && (
            <div className="mt-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-[20px] p-4 animate-in delay-1">
              <p className="text-sm font-medium text-[var(--success)]">
                המסמך אושר - עכשיו ניתן להוריד
              </p>
              <button
                onClick={() => handleDownloadPdf("מסמך אסטרטגיה FBM", strategy, `${project?.user_name ?? "export"} מסמך תדר וקהלים.pdf`)}
                disabled={downloading?.includes("מסמך תדר וקהלים")}
                className="px-4 py-2 text-sm font-medium bg-white border border-[var(--card-border)] text-[var(--text-secondary)] rounded-[10px] hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {downloading?.includes("מסמך תדר וקהלים") ? "מייצא..." : "הורד כ-PDF"}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="lg:w-[340px] flex-shrink-0 space-y-4">
          {/* Status card */}
          <div className="card-static p-5 animate-in delay-2">
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
          <div className="card-static p-5 animate-in delay-3">
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

      {/* Feedback Panel */}
      <FeedbackPanel
        stepName="strategy"
        onApprove={handleApprove}
        onRefine={handleRefine}
        isRefining={isRefining}
        isApproved={strategyApproved}
        approveLabel="המסמך מדויק, אפשר להמשיך"
        versionCount={versionHistory.strategy.length}
        onRestoreVersion={(idx) => restoreVersion("strategy", idx)}
        versionTimestamps={versionHistory.strategy.map((v) => v.timestamp)}
      />
    </div>
  );
}
