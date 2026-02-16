"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";

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

/* ── Chatbot result type ── */
interface ChatbotResult {
  message1: string;
  buttonText: string;
  message2: string;
}

type OwnerGender = "male" | "female";
type AudienceGender = "male" | "female" | "all";

export default function CopyPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const { scripts, selectedNiche, setAdCopy } = useProject();

  const [copies, setCopies] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState<Record<number, boolean>>({});
  const [editing, setEditing] = useState<Record<number, boolean>>({});
  const [editText, setEditText] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});

  // Chatbot state
  const [ownerGender, setOwnerGender] = useState<OwnerGender>("male");
  const [audienceGender, setAudienceGender] = useState<AudienceGender>("all");
  const [chatbot, setChatbot] = useState<ChatbotResult | null>(null);
  const [chatbotGenerating, setChatbotGenerating] = useState(false);
  const [chatbotCopied, setChatbotCopied] = useState<Record<string, boolean>>({});

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

  /* ── Generate Chatbot ── */
  const handleGenerateChatbot = useCallback(async () => {
    setChatbotGenerating(true);
    try {
      const res = await fetch("/api/generate-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: selectedNiche?.name || "",
          ownerGender,
          audienceGender,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setChatbot(json.chatbot);
    } catch (e) {
      console.error("generate-chatbot error:", e);
    } finally {
      setChatbotGenerating(false);
    }
  }, [selectedNiche, ownerGender, audienceGender]);

  const copyText = useCallback(async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setChatbotCopied((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setChatbotCopied((prev) => ({ ...prev, [key]: false })), 2000);
  }, []);

  if (!scripts) return null;

  const scriptParts = splitScripts(scripts);
  const readyCount = Object.keys(copies).length;

  return (
    <div className="pb-20">
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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── Chatbot for Messenger Engagement Campaign ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-10 pt-8 border-t-2 border-[var(--card-border)]">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
            💬 צ&apos;אטבוט לקמפיין מעורבות להודעות
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            צור את הטקסט לצ&apos;אטבוט שנשלח אוטומטית כשלקוח לוחץ על &quot;שליחת הודעה&quot; במודעה.
          </p>
        </div>

        {/* Gender selectors */}
        <div className="card-static p-5 mb-4 space-y-4" dir="rtl">
          {/* Owner gender */}
          <div>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">
              בעל/ת העסק (מי שפונה):
            </label>
            <div className="flex gap-2">
              <GenderButton
                label="בעל עסק (גבר)"
                active={ownerGender === "male"}
                onClick={() => { setOwnerGender("male"); setChatbot(null); }}
              />
              <GenderButton
                label="בעלת עסק (אישה)"
                active={ownerGender === "female"}
                onClick={() => { setOwnerGender("female"); setChatbot(null); }}
              />
            </div>
          </div>

          {/* Audience gender */}
          <div>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">
              קהל היעד (למי פונים):
            </label>
            <div className="flex gap-2 flex-wrap">
              <GenderButton
                label="גברים"
                active={audienceGender === "male"}
                onClick={() => { setAudienceGender("male"); setChatbot(null); }}
              />
              <GenderButton
                label="נשים"
                active={audienceGender === "female"}
                onClick={() => { setAudienceGender("female"); setChatbot(null); }}
              />
              <GenderButton
                label="גברים ונשים"
                active={audienceGender === "all"}
                onClick={() => { setAudienceGender("all"); setChatbot(null); }}
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerateChatbot}
            disabled={chatbotGenerating}
            className="w-full btn-gold !py-3 text-sm disabled:opacity-50"
          >
            {chatbotGenerating
              ? "⏳ יוצר צ\u0027אטבוט..."
              : chatbot
                ? "🔄 צור מחדש"
                : "✨ צור צ\u0027אטבוט לקמפיין הודעות"}
          </button>
        </div>

        {/* Loading state */}
        {chatbotGenerating && (
          <div className="p-8 text-center card-static rounded-2xl mb-4">
            <CountdownTimer seconds={5} />
            <p className="text-sm text-[var(--text-muted)] mt-3">
              FBM Studio בונה צ&apos;אטבוט מותאם לנישה...
            </p>
          </div>
        )}

        {/* ── Chatbot Result — Messenger-like conversation ── */}
        {chatbot && !chatbotGenerating && (
          <div className="space-y-3" dir="rtl">

            {/* Message 1: Opening */}
            <div className="card-static overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[var(--card-border)] flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  📨 הודעה 1 — הודעת פתיחה
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  נשלחת אוטומטית ללקוח
                </span>
              </div>
              <div className="p-4">
                <div
                  className="rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    backgroundColor: "rgba(0, 132, 255, 0.08)",
                    border: "1px solid rgba(0, 132, 255, 0.15)",
                    color: "var(--text-primary)",
                  }}
                >
                  {chatbot.message1}
                </div>
                <button
                  onClick={() => copyText(chatbot.message1, "msg1")}
                  className="mt-2 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all font-medium"
                  style={{
                    backgroundColor: chatbotCopied["msg1"] ? "rgba(34, 197, 94, 0.1)" : "rgba(156, 163, 175, 0.08)",
                    color: chatbotCopied["msg1"] ? "#22C55E" : "var(--text-muted)",
                    border: `1px solid ${chatbotCopied["msg1"] ? "rgba(34, 197, 94, 0.2)" : "var(--card-border)"}`,
                  }}
                >
                  {chatbotCopied["msg1"] ? "✅ הועתק!" : "📋 העתק הודעה"}
                </button>
              </div>
            </div>

            {/* Button the customer clicks */}
            <div className="flex justify-center py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">הלקוח לוחץ:</span>
                <div
                  className="px-5 py-2.5 rounded-full text-sm font-bold"
                  style={{
                    background: "linear-gradient(135deg, #0084FF 0%, #0066CC 100%)",
                    color: "#FFFFFF",
                    boxShadow: "0 2px 8px rgba(0, 132, 255, 0.3)",
                  }}
                >
                  {chatbot.buttonText}
                </div>
              </div>
            </div>

            {/* Message 2: Follow-up */}
            <div className="card-static overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[var(--card-border)] flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-secondary)]">
                  📨 הודעה 2 — בקשת טלפון
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  נשלחת אחרי לחיצת הכפתור
                </span>
              </div>
              <div className="p-4">
                <div
                  className="rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{
                    backgroundColor: "rgba(0, 132, 255, 0.08)",
                    border: "1px solid rgba(0, 132, 255, 0.15)",
                    color: "var(--text-primary)",
                  }}
                >
                  {chatbot.message2}
                </div>
                <button
                  onClick={() => copyText(chatbot.message2, "msg2")}
                  className="mt-2 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all font-medium"
                  style={{
                    backgroundColor: chatbotCopied["msg2"] ? "rgba(34, 197, 94, 0.1)" : "rgba(156, 163, 175, 0.08)",
                    color: chatbotCopied["msg2"] ? "#22C55E" : "var(--text-muted)",
                    border: `1px solid ${chatbotCopied["msg2"] ? "rgba(34, 197, 94, 0.2)" : "var(--card-border)"}`,
                  }}
                >
                  {chatbotCopied["msg2"] ? "✅ הועתק!" : "📋 העתק הודעה"}
                </button>
              </div>
            </div>

            {/* Copy all */}
            <button
              onClick={() => {
                const allText = [
                  `📨 הודעה 1 — הודעת פתיחה:`,
                  chatbot.message1,
                  ``,
                  `🔘 כפתור: ${chatbot.buttonText}`,
                  ``,
                  `📨 הודעה 2 — בקשת טלפון:`,
                  chatbot.message2,
                ].join("\n");
                copyText(allText, "all");
              }}
              className="w-full btn-gold !py-2.5 text-sm"
            >
              {chatbotCopied["all"] ? "✅ הכל הועתק!" : "📋 העתק את כל הצ\u0027אטבוט"}
            </button>
          </div>
        )}
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

/* ── Gender selector button ── */
function GenderButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
      style={{
        backgroundColor: active ? "var(--gold)" : "var(--content-bg)",
        color: active ? "#0F1117" : "var(--text-secondary)",
        border: `1.5px solid ${active ? "var(--gold)" : "var(--card-border)"}`,
        fontWeight: active ? 700 : 500,
      }}
    >
      {label}
    </button>
  );
}
