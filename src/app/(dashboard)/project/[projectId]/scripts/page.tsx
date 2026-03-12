"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import MarkdownContent from "@/components/MarkdownContent";
import FeedbackPanel from "@/components/FeedbackPanel";
import { useToast } from "@/components/Toast";
import StepCelebration from "@/components/StepCelebration";
import StepProgress from "@/components/ui/StepProgress";
import Button from "@/components/ui/Button";
import { trackEvent } from "@/lib/track-event";

export default function ScriptsPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const {
    project,
    strategy,
    painAnalysis,
    scripts,
    setScripts,
    handleDownloadPdf,
    downloading,
    versionHistory,
    pushVersion,
    restoreVersion,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [scriptsApproved, setScriptsApproved] = useState(false);
  const [error, setError] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editedScripts, setEditedScripts] = useState<Record<number, string>>({});
  const [showCelebration, setShowCelebration] = useState(false);
  const generationAttempted = useRef(false);
  const toast = useToast();

  // Track page view
  useEffect(() => {
    trackEvent({ eventType: "page_view", eventName: "scripts_page", stepName: "scripts", projectId });
  }, [projectId]);

  // Redirect if no pain analysis
  useEffect(() => {
    if (!painAnalysis) {
      router.replace(`/project/${projectId}/pains`);
    }
  }, [painAnalysis, router, projectId]);

  const generateScripts = async () => {
    trackEvent({ eventType: "generation_start", eventName: "generate_scripts", stepName: "scripts", projectId });
    setIsGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyDocument: strategy, painAnalysis }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setScripts(json.scripts);
      trackEvent({ eventType: "generation_complete", eventName: "scripts_generated", stepName: "scripts", projectId, metadata: { scriptCount: json.scripts?.split(/(?=## תסריט \d)/).filter((p: string) => p.trim()).length } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת תסריטים");
      trackEvent({ eventType: "error", eventName: "scripts_generation_error", stepName: "scripts", projectId });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate scripts
  useEffect(() => {
    if (!painAnalysis || !strategy || scripts || generationAttempted.current) return;
    generationAttempted.current = true;
    generateScripts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painAnalysis, strategy, scripts]);

  const splitScripts = (raw: string): string[] => {
    const parts = raw.split(/(?=## תסריט \d)/);
    return parts.filter((p) => p.trim().length > 0);
  };

  const handleRefine = async (feedback: string) => {
    setIsRefining(true);
    try {
      pushVersion("scripts", scripts);

      // Apply any manual edits before refining
      const scriptParts = splitScripts(scripts);
      const currentScripts = scriptParts.map((s, i) => editedScripts[i] ?? s).join("\n\n");

      const res = await fetch("/api/refine-scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentScripts,
          feedback,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setScripts(json.scripts);
      setEditedScripts({});
      setEditingIdx(null);
      toast.success("התסריטים עודכנו בהצלחה");

      fetch("/api/log-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project?.id,
          stepName: "scripts",
          feedbackType: "refine",
          feedbackText: feedback,
        }),
      }).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בעדכון התסריטים");
    } finally {
      setIsRefining(false);
    }
  };

  const handleApprove = () => {
    trackEvent({ eventType: "step_complete", eventName: "scripts_approved", stepName: "scripts", projectId });
    // Save any manual edits
    if (Object.keys(editedScripts).length > 0) {
      const scriptParts = splitScripts(scripts);
      const finalScripts = scriptParts.map((s, i) => editedScripts[i] ?? s).join("\n\n");
      setScripts(finalScripts);
    }

    fetch("/api/log-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project?.id,
        stepName: "scripts",
        feedbackType: "approve",
      }),
    }).catch(() => {});

    setScriptsApproved(true);
    setShowCelebration(true);
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-red-600 mb-2">שגיאה</h2>
        <p className="text-[var(--text-secondary)] mb-4">{error}</p>
        <Button variant="primary" onClick={() => { generationAttempted.current = false; generateScripts(); }}>
          נסה שוב
        </Button>
      </div>
    );
  }

  if (!scripts) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-6 text-[var(--text-primary)]">כותב תסריטים...</h2>
        <StepProgress
          steps={["מנתח את הכאבים", "כותב 3 תסריטים", "מסיים עריכה"]}
          estimatedSeconds={25}
        />
        <div className="max-w-md mx-auto mt-8 p-5 rounded-2xl text-right" style={{ background: "var(--gold-soft)", border: "1px solid rgba(212, 168, 67, 0.2)" }} dir="rtl">
          <p className="text-xs font-bold text-[var(--gold)] mb-1.5">שיטת FBM</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            בשיווק מבוסס תדר אנחנו מאמינים שהעסק הוא רק השתקפות של בעל העסק. לכן את סרטוני הוידאו מומלץ שבעל העסק יצלם את עצמו, כדי שהתדר והאנרגיה שלו יגיעו ישירות לקהל היעד המדויק.
          </p>
        </div>
      </div>
    );
  }

  const scriptParts = splitScripts(scripts);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          תסריטים
          {scriptsApproved && <span className="text-[var(--success)] text-base font-medium mr-2">(אושר)</span>}
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const finalScripts = scriptParts.map((s, i) => editedScripts[i] ?? s).join("\n\n");
            handleDownloadPdf("תסריטי וידאו FBM", finalScripts, `${project?.user_name ?? "export"} תסריטים.pdf`);
          }}
          disabled={downloading?.includes("תסריטים")}
        >
          {downloading?.includes("תסריטים") ? "מייצא..." : "הורד תסריטים כ-PDF"}
        </Button>
      </div>

      <div className="space-y-4">
        {scriptParts.map((scriptText, idx) => {
          const isEditing = editingIdx === idx;
          const displayText = editedScripts[idx] ?? scriptText;

          return (
            <div
              key={idx}
              className="card-static overflow-hidden"
            >
              <div className="p-5 flex items-center justify-between border-b border-[var(--card-border)]">
                <h3 className="font-bold text-[var(--text-primary)]">תסריט {idx + 1}</h3>
                <button
                  onClick={() => {
                    if (isEditing) {
                      setEditingIdx(null);
                    } else {
                      if (!(idx in editedScripts)) {
                        setEditedScripts((prev) => ({ ...prev, [idx]: scriptText }));
                      }
                      setEditingIdx(idx);
                    }
                  }}
                  className="text-sm px-3 py-1.5 rounded-[10px] transition-colors cursor-pointer bg-[var(--content-bg)] text-[var(--text-secondary)] hover:bg-gray-200"
                >
                  {isEditing ? "סיום עריכה" : "עריכה"}
                </button>
              </div>

              {isEditing ? (
                <div className="p-5">
                  <p className="text-xs text-amber-600 mb-3 bg-amber-50 border border-amber-200 rounded-[10px] p-2">
                    מומלץ לא לשנות את התסריט באופן משמעותי - תיקונים קטנים בלבד
                  </p>
                  <textarea
                    value={editedScripts[idx] ?? scriptText}
                    onChange={(e) =>
                      setEditedScripts((prev) => ({ ...prev, [idx]: e.target.value }))
                    }
                    dir="rtl"
                    rows={15}
                    className="w-full px-4 py-3 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-sm leading-relaxed focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent outline-none transition-all resize-y"
                  />
                </div>
              ) : (
                <div className="p-5">
                  <MarkdownContent content={displayText} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Back button */}
      <div className="flex gap-3 mt-6">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/project/${projectId}/pains`)}>
          &larr; חזרה לניתוח כאבים
        </Button>
      </div>

      {/* Feedback Panel */}
      <FeedbackPanel
        stepName="scripts"
        onApprove={handleApprove}
        onRefine={handleRefine}
        isRefining={isRefining}
        isApproved={scriptsApproved}
        approveLabel="התסריטים מדויקים, המשך לקריאייטיב"
        versionCount={versionHistory.scripts.length}
        onRestoreVersion={(idx) => restoreVersion("scripts", idx)}
        versionTimestamps={versionHistory.scripts.map((v) => v.timestamp)}
      />

      {/* Step Celebration */}
      {showCelebration && (
        <StepCelebration
          stepLabel="התסריטים"
          subtitle="התסריטים אושרו — ממשיכים ליצירת קריאייטיב!"
          nextStepLabel="המשך לקריאייטיב"
          onContinue={() => router.push(`/project/${projectId}/creative`)}
          summary={scripts ? `${splitScripts(scripts).length} תסריטי וידאו מותאמים` : undefined}
        />
      )}
    </div>
  );
}
