"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import MarkdownContent from "@/components/MarkdownContent";
import FeedbackPanel from "@/components/FeedbackPanel";
import { useToast } from "@/components/Toast";
import StepCelebration from "@/components/StepCelebration";

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

export default function PainsPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const {
    project,
    strategy,
    selectedNiche,
    painAnalysis,
    setPainAnalysis,
    handleDownloadPdf,
    downloading,
    versionHistory,
    pushVersion,
    restoreVersion,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [painsApproved, setPainsApproved] = useState(false);
  const [error, setError] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const generationAttempted = useRef(false);
  const toast = useToast();

  // Redirect if no niche selected
  useEffect(() => {
    if (!selectedNiche) {
      router.replace(`/project/${projectId}/niches`);
    }
  }, [selectedNiche, router, projectId]);

  const generatePains = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-pains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyDocument: strategy,
          selectedNiche: selectedNiche!.name,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPainAnalysis(json.painAnalysis);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בניתוח כאבים");
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate pain analysis
  useEffect(() => {
    if (!selectedNiche || !strategy || painAnalysis || generationAttempted.current) return;
    generationAttempted.current = true;
    generatePains();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNiche, strategy, painAnalysis]);

  const handleRefine = async (feedback: string) => {
    setIsRefining(true);
    try {
      pushVersion("painAnalysis", painAnalysis);

      const res = await fetch("/api/refine-pains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPainAnalysis: painAnalysis,
          feedback,
          selectedNiche: selectedNiche?.name || "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setPainAnalysis(json.painAnalysis);
      toast.success("הניתוח עודכן בהצלחה");

      fetch("/api/log-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project?.id,
          stepName: "pains",
          feedbackType: "refine",
          feedbackText: feedback,
        }),
      }).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בעדכון ניתוח הכאבים");
    } finally {
      setIsRefining(false);
    }
  };

  const handleApprove = () => {
    fetch("/api/log-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: project?.id,
        stepName: "pains",
        feedbackType: "approve",
      }),
    }).catch(() => {});

    setPainsApproved(true);
    setShowCelebration(true);
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-red-600 mb-2">שגיאה</h2>
        <p className="text-[var(--text-secondary)] mb-4">{error}</p>
        <button
          onClick={() => { generationAttempted.current = false; generatePains(); }}
          className="px-5 py-2.5 bg-[var(--gold)] hover:opacity-90 text-white font-semibold rounded-[10px] transition-opacity cursor-pointer"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!painAnalysis) {
    return (
      <div className="text-center py-20">
        <CountdownTimer seconds={20} />
        <h2 className="text-xl font-bold mt-4 text-[var(--text-primary)]">
          מנתח כאבים של &quot;{selectedNiche?.name}&quot;...
        </h2>
        <p className="text-[var(--text-muted)] mt-2">
          מזהה את הכאבים העמוקים של קהל היעד שלך
        </p>
        <div className="max-w-md mx-auto mt-8 p-5 rounded-2xl text-right" style={{ background: "var(--gold-soft)", border: "1px solid rgba(212, 168, 67, 0.2)" }} dir="rtl">
          <p className="text-xs font-bold text-[var(--gold)] mb-1.5">שיטת FBM</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            בשיטת שיווק מבוסס תדר, ניתוח הכאבים הוא לא רק הבנת הבעיות — אלא חיבור עמוק לרגשות ולתחושות של קהל היעד. כשמדברים בשפת הכאב שלהם, התדר שלנו מגיע אליהם ישירות.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card-static overflow-hidden">
        <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            ניתוח כאבים - {selectedNiche?.name}
            {painsApproved && <span className="text-[var(--success)] text-base font-medium mr-2">(אושר)</span>}
          </h2>
          <button
            onClick={() =>
              handleDownloadPdf(
                `ניתוח כאבים - ${selectedNiche?.name ?? ""}`,
                painAnalysis,
                `${project?.user_name ?? "export"} מסמך נישות.pdf`,
              )
            }
            disabled={downloading?.includes("מסמך נישות")}
            className="px-4 py-2 text-sm font-medium bg-white border border-[var(--card-border)] text-[var(--text-secondary)] rounded-[10px] hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {downloading?.includes("מסמך נישות") ? "מייצא..." : "הורד כ-PDF"}
          </button>
        </div>
        <div className="p-6">
          <MarkdownContent content={painAnalysis} />
        </div>
      </div>

      {/* Back button */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => router.push(`/project/${projectId}/niches`)}
          className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          &larr; חזרה לנישות
        </button>
      </div>

      {/* Feedback Panel */}
      <FeedbackPanel
        stepName="pains"
        onApprove={handleApprove}
        onRefine={handleRefine}
        isRefining={isRefining}
        isApproved={painsApproved}
        approveLabel="הניתוח מדויק, המשך לתסריטים"
        versionCount={versionHistory.painAnalysis.length}
        onRestoreVersion={(idx) => restoreVersion("painAnalysis", idx)}
        versionTimestamps={versionHistory.painAnalysis.map((v) => v.timestamp)}
      />

      {/* Step Celebration */}
      {showCelebration && (
        <StepCelebration
          stepLabel="ניתוח הכאבים"
          subtitle="ניתוח הכאבים אושר — ממשיכים לכתיבת תסריטים!"
          nextStepLabel="המשך לתסריטים"
          onContinue={() => router.push(`/project/${projectId}/scripts`)}
        />
      )}
    </div>
  );
}
