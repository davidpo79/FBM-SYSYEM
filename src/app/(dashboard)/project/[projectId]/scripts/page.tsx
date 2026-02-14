"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
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

export default function ScriptsPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const {
    strategy,
    painAnalysis,
    scripts,
    setScripts,
    handleDownloadPdf,
    downloading,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editedScripts, setEditedScripts] = useState<Record<number, string>>({});
  const generationAttempted = useRef(false);

  // Redirect if no pain analysis
  useEffect(() => {
    if (!painAnalysis) {
      router.replace(`/project/${projectId}/pains`);
    }
  }, [painAnalysis, router, projectId]);

  const generateScripts = async () => {
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת תסריטים");
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

  if (error) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-red-600 mb-2">שגיאה</h2>
        <p className="text-[var(--text-secondary)] mb-4">{error}</p>
        <button
          onClick={() => { generationAttempted.current = false; generateScripts(); }}
          className="px-5 py-2.5 bg-[var(--gold)] hover:opacity-90 text-white font-semibold rounded-[10px] transition-opacity cursor-pointer"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!scripts) {
    return (
      <div className="text-center py-20">
        <CountdownTimer seconds={25} />
        <h2 className="text-xl font-bold mt-4 text-[var(--text-primary)]">כותב תסריטים...</h2>
        <p className="text-[var(--text-muted)] mt-2">3 תסריטי וידאו מותאמים אישית</p>
      </div>
    );
  }

  const scriptParts = splitScripts(scripts);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">תסריטים</h2>
        <button
          onClick={() => {
            const finalScripts = scriptParts.map((s, i) => editedScripts[i] ?? s).join("\n\n");
            handleDownloadPdf("תסריטי וידאו FBM", finalScripts, "scripts.pdf");
          }}
          disabled={downloading === "scripts.pdf"}
          className="px-4 py-2 text-sm font-medium bg-white border border-[var(--card-border)] text-[var(--text-secondary)] rounded-[10px] hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {downloading === "scripts.pdf" ? "מייצא..." : "הורד תסריטים כ-PDF"}
        </button>
      </div>

      <div className="space-y-4">
        {scriptParts.map((scriptText, idx) => {
          const isEditing = editingIdx === idx;
          const displayText = editedScripts[idx] ?? scriptText;

          return (
            <div
              key={idx}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] overflow-hidden"
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

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => router.push(`/project/${projectId}/pains`)}
          className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          &larr; חזרה לניתוח כאבים
        </button>
        <button
          onClick={() => router.push(`/project/${projectId}/creative`)}
          className="px-5 py-2.5 bg-[var(--gold)] text-white font-semibold rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
        >
          המשך לקריאייטיב
        </button>
      </div>
    </div>
  );
}
