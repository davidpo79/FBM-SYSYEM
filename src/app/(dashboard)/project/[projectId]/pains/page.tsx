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

  // Track page view
  useEffect(() => {
    trackEvent({ eventType: "page_view", eventName: "pains_page", stepName: "pains", projectId, metadata: { niche: selectedNiche?.name } });
  }, [projectId, selectedNiche?.name]);

  // Redirect if no niche selected
  useEffect(() => {
    if (!selectedNiche) {
      router.replace(`/project/${projectId}/niches`);
    }
  }, [selectedNiche, router, projectId]);

  const generatePains = async () => {
    trackEvent({ eventType: "generation_start", eventName: "generate_pains", stepName: "pains", projectId, metadata: { niche: selectedNiche?.name } });
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
      trackEvent({ eventType: "generation_complete", eventName: "pains_generated", stepName: "pains", projectId });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בניתוח כאבים");
      trackEvent({ eventType: "error", eventName: "pains_generation_error", stepName: "pains", projectId });
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
    trackEvent({ eventType: "step_complete", eventName: "pains_approved", stepName: "pains", projectId });
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
        <Button variant="primary" onClick={() => { generationAttempted.current = false; generatePains(); }}>
          נסה שוב
        </Button>
      </div>
    );
  }

  if (!painAnalysis) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold mb-6 text-[var(--text-primary)]">
          מנתח כאבים של &quot;{selectedNiche?.name}&quot;...
        </h2>
        <StepProgress
          steps={["מזהה כאבים עמוקים", "מנתח שפת כאב", "בונה מסמך ניתוח"]}
          estimatedSeconds={20}
        />
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
        <div className="p-8 border-b border-[var(--card-border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            ניתוח כאבים - {selectedNiche?.name}
            {painsApproved && <span className="text-[var(--success)] text-base font-medium mr-2">(אושר)</span>}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              handleDownloadPdf(
                `ניתוח כאבים - ${selectedNiche?.name ?? ""}`,
                painAnalysis,
                `${project?.user_name ?? "export"} מסמך נישות.pdf`,
              )
            }
            disabled={downloading?.includes("מסמך נישות")}
          >
            {downloading?.includes("מסמך נישות") ? "מייצא..." : "הורד כ-PDF"}
          </Button>
        </div>
        <div className="p-8">
          <MarkdownContent content={painAnalysis} />
        </div>
      </div>

      {/* Back button */}
      <div className="flex gap-3 mt-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/project/${projectId}/niches`)}>
          &larr; חזרה לנישות
        </Button>
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
          summary={`ניתוח כאבים לנישת "${selectedNiche?.name}"`}
        />
      )}
    </div>
  );
}
