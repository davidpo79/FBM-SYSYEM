"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import FBMExpertPanel from "@/components/chat/FBMExpertPanel";

/* ── Countdown Timer ── */
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

export default function CopyPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const { project, scripts, selectedNiche, adCopy, setAdCopy } = useProject();

  const [copies, setCopies] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState<Record<number, boolean>>({});
  const [editing, setEditing] = useState<Record<number, boolean>>({});
  const [editText, setEditText] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});
  const [chatOpen, setChatOpen] = useState(false);

  // Redirect if no scripts
  useEffect(() => {
    if (!scripts) {
      router.replace(`/project/${projectId}/scripts`);
    }
  }, [scripts, router, projectId]);

  const splitScripts = (raw: string): string[] => {
    const parts = raw.split(/(?=## תסריט \d)/);
    return parts.filter((p) => p.trim().length > 0);
  };

  const handleGenerateCopy = useCallback(
    async (idx: number) => {
      const scriptParts = splitScripts(scripts);
      const scriptText = scriptParts[idx] ?? "";
      setGenerating((prev) => ({ ...prev, [idx]: true }));
      try {
        const res = await fetch("/api/generate-copy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scriptText,
            niche: selectedNiche?.name || "",
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setCopies((prev) => ({ ...prev, [idx]: json.copy }));
        // Update pipeline state
        setAdCopy(json.copy);
      } catch (e) {
        console.error("generate-copy error:", e);
      } finally {
        setGenerating((prev) => ({ ...prev, [idx]: false }));
      }
    },
    [scripts, selectedNiche, setAdCopy],
  );

  const handleCopy = useCallback(async (idx: number) => {
    await navigator.clipboard.writeText(copies[idx]);
    setCopied((prev) => ({ ...prev, [idx]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [idx]: false })), 2000);
  }, [copies]);

  if (!scripts) return null;

  const scriptParts = splitScripts(scripts);
  const readyCount = Object.keys(copies).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-in">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          📝 קופי למודעות
        </h2>
        {readyCount > 0 && (
          <span className="text-sm font-medium text-[var(--gold)] bg-[var(--gold-soft)] px-3 py-1.5 rounded-full">
            {readyCount}/{scriptParts.length} קופי מוכן
          </span>
        )}
      </div>

      <div className="space-y-6">
        {scriptParts.map((scriptText, idx) => {
          const hasCopy = !!copies[idx];
          const isGenerating = generating[idx];
          const isEditing = editing[idx];

          return (
            <div
              key={idx}
              className={`card-static overflow-hidden animate-in delay-${Math.min(idx + 1, 8)}`}
            >
              {/* Script header */}
              <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-primary)]">
                  תסריט {idx + 1}
                </h3>
                {hasCopy && (
                  <span className="text-xs font-medium text-[var(--success)] bg-green-50 px-2 py-1 rounded-full">
                    ✓ קופי מוכן
                  </span>
                )}
              </div>

              {/* ── State: IDLE ── */}
              {!hasCopy && !isGenerating && (
                <div className="p-5 text-center">
                  <p className="text-sm text-[var(--text-muted)] mb-3">
                    צור קופי למודעת פייסבוק מבוסס על התסריט
                  </p>
                  <button
                    onClick={() => handleGenerateCopy(idx)}
                    className="btn-gold !py-3 !px-8 text-base"
                  >
                    ✨ צור קופי
                  </button>
                </div>
              )}

              {/* ── State: GENERATING ── */}
              {isGenerating && (
                <div className="p-8 text-center">
                  <CountdownTimer seconds={8} />
                  <p className="text-sm text-[var(--text-muted)] mt-3">
                    FBM Studio כותב קופי מותאם לתסריט...
                  </p>
                </div>
              )}

              {/* ── State: READY ── */}
              {hasCopy && !isGenerating && (
                <div className="p-5">
                  {/* Copy content */}
                  <div className="bg-white/90 backdrop-blur border border-[var(--card-border)] rounded-2xl p-5">
                    {isEditing ? (
                      <textarea
                        value={editText[idx] ?? copies[idx]}
                        onChange={(e) =>
                          setEditText((prev) => ({ ...prev, [idx]: e.target.value }))
                        }
                        rows={10}
                        className="w-full text-sm text-[var(--text-primary)] text-right leading-relaxed resize-none border border-[var(--card-border)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                        dir="rtl"
                      />
                    ) : (
                      <div
                        className="whitespace-pre-wrap text-sm text-[var(--text-primary)] leading-relaxed"
                        dir="rtl"
                      >
                        {copies[idx]}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleCopy(idx)}
                      className="flex-1 btn-gold !py-2.5 text-sm"
                    >
                      {copied[idx] ? "✅ הועתק!" : "📋 העתק"}
                    </button>
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setCopies((prev) => ({
                            ...prev,
                            [idx]: editText[idx] ?? copies[idx],
                          }));
                          setEditing((prev) => ({ ...prev, [idx]: false }));
                        } else {
                          setEditText((prev) => ({ ...prev, [idx]: copies[idx] }));
                          setEditing((prev) => ({ ...prev, [idx]: true }));
                        }
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-[var(--card-border)] text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--gold)] transition-all cursor-pointer"
                    >
                      {isEditing ? "💾 שמור" : "✏️ ערוך"}
                    </button>
                    <button
                      onClick={() => handleGenerateCopy(idx)}
                      className="flex-1 py-2.5 rounded-xl border border-[var(--card-border)] text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--gold)] transition-all cursor-pointer"
                    >
                      🔄 צור מחדש
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FBM Expert Chatbot Section */}
      <div className="mt-10 pt-8 border-t border-[var(--card-border)]">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
          🤖 צ'אטבוט FBM Expert
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          שאל את המומחה של FBM כל שאלה על שיווק, קופי, קריאייטיב, או אסטרטגיה.
        </p>
        <button
          onClick={() => setChatOpen(true)}
          className="btn-gold !py-3 !px-6 text-sm"
        >
          🤖 פתח צ'אט עם מומחה FBM
        </button>
        <FBMExpertPanel
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          projectId={projectId}
          currentPage="copy"
        />
      </div>

      {/* Continue to album */}
      {readyCount > 0 && (
        <div className="text-center py-6 mt-6">
          <button
            onClick={() => router.push(`/project/${projectId}/album`)}
            className="btn-gold text-lg !px-8 !py-3"
          >
            עבור לאלבום
          </button>
        </div>
      )}
    </div>
  );
}
