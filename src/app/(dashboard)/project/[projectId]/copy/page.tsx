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

/* ── Chatbot flow type ── */
interface ChatbotFlow {
  step1: string;
  step2: string;
  optionA: string;
  optionB: string;
  optionC: string;
  replyA: string;
  replyB: string;
  replyC: string;
  step4: string;
  step5: string;
}

export default function CopyPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const { scripts, selectedNiche, setAdCopy } = useProject();

  const [copies, setCopies] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState<Record<number, boolean>>({});
  const [editing, setEditing] = useState<Record<number, boolean>>({});
  const [editText, setEditText] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState<Record<number, boolean>>({});

  // Chatbot flow state
  const [chatbotFlow, setChatbotFlow] = useState<ChatbotFlow | null>(null);
  const [chatbotGenerating, setChatbotGenerating] = useState(false);
  const [chatbotCopied, setChatbotCopied] = useState<Record<string, boolean>>({});
  const [activeReply, setActiveReply] = useState<"A" | "B" | "C" | null>(null);

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

  /* ── Generate Chatbot Flow ── */
  const handleGenerateChatbot = useCallback(async () => {
    setChatbotGenerating(true);
    try {
      const scriptParts = splitScripts(scripts);
      const res = await fetch("/api/generate-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: selectedNiche?.name || "",
          scriptText: scriptParts[0] || "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setChatbotFlow(json.flow);
    } catch (e) {
      console.error("generate-chatbot error:", e);
    } finally {
      setChatbotGenerating(false);
    }
  }, [scripts, selectedNiche]);

  const copyToClipboard = useCallback(async (text: string, key: string) => {
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

      {/* ── Chatbot Flow Generator ── */}
      <div className="mt-10 pt-8 border-t border-[var(--card-border)]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            💬 צ&apos;אטבוט מעורבות להודעות
          </h3>
          {chatbotFlow && (
            <span className="text-xs font-medium text-[var(--success)] bg-green-50 px-2 py-1 rounded-full">
              ✓ מוכן
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          צור תסריט צ&apos;אטבוט אוטומטי לקמפיין מעורבות להודעות — מותאם לנישה {selectedNiche?.name || "שלך"}.
        </p>

        {!chatbotFlow && !chatbotGenerating && (
          <button
            onClick={handleGenerateChatbot}
            className="btn-gold !py-3 !px-6 text-sm"
          >
            ✨ צור צ&apos;אטבוט לקמפיין הודעות
          </button>
        )}

        {chatbotGenerating && (
          <div className="p-8 text-center card-static rounded-2xl">
            <CountdownTimer seconds={12} />
            <p className="text-sm text-[var(--text-muted)] mt-3">
              FBM Studio בונה צ&apos;אטבוט מותאם לנישה...
            </p>
          </div>
        )}

        {chatbotFlow && !chatbotGenerating && (
          <div className="space-y-4">
            {/* Step 1: Opening message */}
            <ChatbotMessage
              label="שלב 1 — הודעת פתיחה"
              sublabel="תגובה אוטומטית למי שמגיב על המודעה"
              text={chatbotFlow.step1}
              isBusiness
              onCopy={() => copyToClipboard(chatbotFlow.step1, "step1")}
              copied={chatbotCopied["step1"]}
            />

            {/* Step 2: Filter question */}
            <ChatbotMessage
              label="שלב 2 — שאלת סינון"
              sublabel="שאלה עם כפתורי בחירה"
              text={chatbotFlow.step2}
              isBusiness
              onCopy={() => copyToClipboard(chatbotFlow.step2, "step2")}
              copied={chatbotCopied["step2"]}
            />

            {/* Options buttons */}
            <div className="flex gap-2 flex-wrap justify-center">
              {(["A", "B", "C"] as const).map((opt) => {
                const text = chatbotFlow[`option${opt}`];
                return (
                  <button
                    key={opt}
                    onClick={() => setActiveReply(activeReply === opt ? null : opt)}
                    className="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all"
                    style={{
                      backgroundColor: activeReply === opt ? "var(--gold)" : "rgba(212, 168, 67, 0.1)",
                      color: activeReply === opt ? "#0F1117" : "var(--gold)",
                      border: `1px solid ${activeReply === opt ? "var(--gold)" : "rgba(212, 168, 67, 0.3)"}`,
                    }}
                  >
                    {text}
                  </button>
                );
              })}
            </div>

            {/* Reply for selected option */}
            {activeReply && (
              <ChatbotMessage
                label={`תשובה לאפשרות ${activeReply === "A" ? "א" : activeReply === "B" ? "ב" : "ג"}`}
                sublabel={chatbotFlow[`option${activeReply}`]}
                text={chatbotFlow[`reply${activeReply}`]}
                isBusiness
                onCopy={() => copyToClipboard(chatbotFlow[`reply${activeReply}`], `reply${activeReply}`)}
                copied={chatbotCopied[`reply${activeReply}`]}
              />
            )}

            {/* Step 4: Value offer + CTA */}
            <ChatbotMessage
              label="שלב 4 — הצעת ערך + CTA"
              sublabel="הנעה לפעולה"
              text={chatbotFlow.step4}
              isBusiness
              onCopy={() => copyToClipboard(chatbotFlow.step4, "step4")}
              copied={chatbotCopied["step4"]}
            />

            {/* Step 5: Closing */}
            <ChatbotMessage
              label="שלב 5 — סגירה"
              sublabel="הודעת תודה ואישור"
              text={chatbotFlow.step5}
              isBusiness
              onCopy={() => copyToClipboard(chatbotFlow.step5, "step5")}
              copied={chatbotCopied["step5"]}
            />

            {/* Copy all + regenerate */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  const allText = [
                    `📨 הודעת פתיחה:\n${chatbotFlow.step1}`,
                    `❓ שאלת סינון:\n${chatbotFlow.step2}`,
                    `🅰️ אפשרות א: ${chatbotFlow.optionA}`,
                    `🅱️ אפשרות ב: ${chatbotFlow.optionB}`,
                    `🅲 אפשרות ג: ${chatbotFlow.optionC}`,
                    `↩️ תשובה א:\n${chatbotFlow.replyA}`,
                    `↩️ תשובה ב:\n${chatbotFlow.replyB}`,
                    `↩️ תשובה ג:\n${chatbotFlow.replyC}`,
                    `🎯 הצעת ערך:\n${chatbotFlow.step4}`,
                    `✅ סגירה:\n${chatbotFlow.step5}`,
                  ].join("\n\n---\n\n");
                  copyToClipboard(allText, "all");
                }}
                className="flex-1 btn-gold !py-2.5 text-sm"
              >
                {chatbotCopied["all"] ? "✅ הכל הועתק!" : "📋 העתק הכל"}
              </button>
              <button
                onClick={handleGenerateChatbot}
                className="flex-1 py-2.5 rounded-xl border border-[var(--card-border)] text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--gold)] transition-all cursor-pointer"
              >
                🔄 צור מחדש
              </button>
            </div>
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

/* ── Chatbot Message Bubble ── */
function ChatbotMessage({
  label,
  sublabel,
  text,
  isBusiness,
  onCopy,
  copied,
}: {
  label: string;
  sublabel?: string;
  text: string;
  isBusiness?: boolean;
  onCopy: () => void;
  copied?: boolean;
}) {
  return (
    <div className={`flex ${isBusiness ? "justify-start" : "justify-end"}`} dir="rtl">
      <div className="max-w-[85%] lg:max-w-[70%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-[var(--text-secondary)]">{label}</span>
          {sublabel && (
            <span className="text-[10px] text-[var(--text-muted)]">{sublabel}</span>
          )}
        </div>
        <div
          className="relative rounded-2xl p-4 text-sm leading-relaxed"
          style={{
            backgroundColor: isBusiness ? "rgba(212, 168, 67, 0.08)" : "var(--content-bg)",
            border: `1px solid ${isBusiness ? "rgba(212, 168, 67, 0.2)" : "var(--card-border)"}`,
          }}
        >
          <div className="whitespace-pre-wrap text-[var(--text-primary)]">{text}</div>
          <button
            onClick={onCopy}
            className="absolute top-2 left-2 text-xs px-2 py-1 rounded-lg cursor-pointer transition-all"
            style={{
              backgroundColor: copied ? "rgba(34, 197, 94, 0.1)" : "rgba(156, 163, 175, 0.1)",
              color: copied ? "#22C55E" : "var(--text-muted)",
            }}
          >
            {copied ? "✅" : "📋"}
          </button>
        </div>
      </div>
    </div>
  );
}
