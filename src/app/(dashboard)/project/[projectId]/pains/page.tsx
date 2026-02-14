"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";

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
    strategy,
    selectedNiche,
    painAnalysis,
    setPainAnalysis,
    handleDownloadPdf,
    downloading,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const generationAttempted = useRef(false);

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
      </div>
    );
  }

  return (
    <div>
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] overflow-hidden">
        <div className="p-6 border-b border-[var(--card-border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            ניתוח כאבים - {selectedNiche?.name}
          </h2>
          <button
            onClick={() =>
              handleDownloadPdf(
                `ניתוח כאבים - ${selectedNiche?.name ?? ""}`,
                painAnalysis,
                "pain-analysis.pdf",
              )
            }
            disabled={downloading === "pain-analysis.pdf"}
            className="px-4 py-2 text-sm font-medium bg-white border border-[var(--card-border)] text-[var(--text-secondary)] rounded-[10px] hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {downloading === "pain-analysis.pdf" ? "מייצא..." : "הורד כ-PDF"}
          </button>
        </div>
        <div className="p-6 prose max-w-none text-sm leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]">
          {painAnalysis}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => router.push(`/project/${projectId}/niches`)}
          className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          &larr; חזרה לנישות
        </button>
        <button
          onClick={() => router.push(`/project/${projectId}/scripts`)}
          className="px-5 py-2.5 bg-[var(--gold)] text-white font-semibold rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
        >
          המשך לתסריטים
        </button>
      </div>
    </div>
  );
}
