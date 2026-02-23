"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject, Niche } from "../layout";
import ChatMessage from "@/components/chat/ChatMessage";
import TypingIndicator from "@/components/chat/TypingIndicator";

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

/* ─── Brainstorm message type ─── */
interface BrainstormMessage {
  role: "user" | "assistant";
  content: string;
}

/* ─── Brainstorm Panel ─── */
function BrainstormPanel({
  strategy,
  onSelectCustomNiche,
}: {
  strategy: string;
  onSelectCustomNiche: (niche: Niche) => void;
}) {
  const [messages, setMessages] = useState<BrainstormMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [customNicheName, setCustomNicheName] = useState("");
  const [isCreatingNiche, setIsCreatingNiche] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: BrainstormMessage = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch("/api/brainstorm-niches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            history: history.slice(0, -1),
            strategyDocument: strategy,
          }),
        });

        if (!res.ok) throw new Error("API error");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let assistantText = "";

        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                assistantText += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: assistantText,
                  };
                  return updated;
                });
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        setMessages((prev) => [
          ...prev.filter((m) => m.content !== ""),
          {
            role: "assistant",
            content: "מצטער, משהו השתבש. נסה שוב.",
          },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, strategy],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleCreateCustomNiche = async () => {
    if (!customNicheName.trim()) return;
    setIsCreatingNiche(true);

    try {
      const res = await fetch("/api/brainstorm-niches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `המשתמש בחר בנישה: "${customNicheName.trim()}". תן לי בבקשה JSON בפורמט הבא בלבד, בלי שום טקסט נוסף:
{"name": "שם הנישה", "fit_score": 8.5, "why_perfect_match": "הסבר למה זה מתאים", "examples": "דוגמה 1, דוגמה 2", "core_pain": "הכאב המרכזי", "why_frequency_resonates": "למה התדר מדבר אליהם"}`,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          strategyDocument: strategy,
        }),
      });

      if (!res.ok) throw new Error("API error");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) fullText += data.text;
          } catch {
            // ignore
          }
        }
      }

      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const nicheData = JSON.parse(jsonMatch[0]) as Niche;
        onSelectCustomNiche(nicheData);
      } else {
        onSelectCustomNiche({
          name: customNicheName.trim(),
          fit_score: 8,
          why_perfect_match: "נישה מותאמת אישית שנבחרה על ידי המשתמש",
          examples: "",
          core_pain: "",
          why_frequency_resonates: "",
        });
      }
    } catch {
      onSelectCustomNiche({
        name: customNicheName.trim(),
        fit_score: 8,
        why_perfect_match: "נישה מותאמת אישית שנבחרה על ידי המשתמש",
        examples: "",
        core_pain: "",
        why_frequency_resonates: "",
      });
    } finally {
      setIsCreatingNiche(false);
    }
  };

  const STARTERS = [
    "אני רוצה לשמוע על נישות אחרות שמתאימות לי",
    "איזו נישה תביא לי הכי הרבה לקוחות?",
    "אני מתלבט בין כמה נישות, עזור לי להחליט",
  ];

  return (
    <div
      className="card-elevated overflow-hidden animate-in"
      style={{ borderColor: "rgba(212, 168, 67, 0.3)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-5 py-3"
        style={{
          borderBottom: "1px solid var(--card-border)",
          background: "rgba(212, 168, 67, 0.05)",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="font-bold text-sm text-[var(--text-primary)]">
          סיעור מוחות עם AI
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">
          - דבר איתי על נישות שמתאימות לך
        </span>
      </div>

      {/* Messages */}
      <div
        className="overflow-y-auto px-4 py-4 space-y-1 sidebar-scroll"
        style={{ maxHeight: "380px", minHeight: "200px" }}
      >
        {/* Welcome */}
        {messages.length === 0 && (
          <>
            <ChatMessage
              role="assistant"
              content="היי! בוא נחשוב ביחד על הנישה הכי מתאימה לך. אתה יכול לשאול אותי על נישות אחרות, לבקש שאציע כיוונים חדשים, או פשוט לספר לי מה מרגיש לך נכון ומה לא."
              timestamp=""
            />
            {/* Starter questions */}
            <div className="flex flex-wrap gap-2 mt-3" dir="rtl">
              {STARTERS.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer hover:scale-[1.03]"
                  style={{
                    borderColor: "rgba(212, 168, 67, 0.3)",
                    color: "var(--gold)",
                    backgroundColor: "rgba(212, 168, 67, 0.06)",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}

        {isStreaming &&
          messages.length > 0 &&
          messages[messages.length - 1].content === "" && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3"
        style={{ borderTop: "1px solid var(--card-border)" }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: "var(--content-bg)" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="שאל, בקש, חשוב בקול..."
            rows={1}
            className="flex-1 bg-transparent text-[var(--text-primary)] text-sm resize-none outline-none placeholder-[var(--text-muted)] max-h-[80px]"
            style={{ minHeight: "36px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 80) + "px";
            }}
            disabled={isStreaming}
            dir="rtl"
          />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: input.trim() ? "var(--gold)" : "transparent",
              color: input.trim() ? "#0F1117" : "var(--text-muted)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: "rotate(180deg)" }}
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Custom niche input */}
      <div
        className="px-4 py-3"
        style={{
          borderTop: "1px solid var(--card-border)",
          background: "rgba(212, 168, 67, 0.03)",
        }}
      >
        <p className="text-xs text-[var(--text-muted)] mb-2">
          החלטת על נישה? כתוב את שם הנישה והמשך:
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customNicheName}
            onChange={(e) => setCustomNicheName(e.target.value)}
            placeholder='לדוגמה: "מאמנות כושר עצמאיות 30-45"'
            className="flex-1 px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-sm text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-colors"
            dir="rtl"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateCustomNiche();
            }}
          />
          <button
            onClick={handleCreateCustomNiche}
            disabled={!customNicheName.trim() || isCreatingNiche}
            className="px-4 py-2 bg-[var(--gold)] text-white font-semibold rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
          >
            {isCreatingNiche ? "יוצר..." : "המשך עם נישה זו"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function NichesPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const {
    strategy,
    strategyApproved,
    niches,
    setNiches,
    selectedNiche,
    setSelectedNiche,
    setPainAnalysis,
    setScripts,
    setGeneratedImages,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showBrainstorm, setShowBrainstorm] = useState(false);
  const generationAttempted = useRef(false);

  /** Clear all downstream pipeline data when niche changes */
  const clearDownstream = () => {
    setPainAnalysis("");
    setScripts("");
    setGeneratedImages([]);
  };

  // Redirect if strategy not approved
  useEffect(() => {
    if (!strategyApproved && !strategy) {
      router.replace(`/project/${projectId}/strategy`);
    }
  }, [strategyApproved, strategy, router, projectId]);

  // Generate niches
  useEffect(() => {
    if (!strategy || !strategyApproved || niches.length > 0 || generationAttempted.current) return;
    generationAttempted.current = true;
    setIsGenerating(true);

    (async () => {
      try {
        const res = await fetch("/api/generate-niches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strategyDocument: strategy }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setNiches(json.niches ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "שגיאה בזיהוי נישות");
      } finally {
        setIsGenerating(false);
      }
    })();
  }, [strategy, strategyApproved, niches.length, setNiches]);

  const handleRetry = () => {
    setError("");
    generationAttempted.current = false;
    setIsGenerating(true);

    (async () => {
      try {
        const res = await fetch("/api/generate-niches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strategyDocument: strategy }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setNiches(json.niches ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "שגיאה בזיהוי נישות");
      } finally {
        setIsGenerating(false);
      }
    })();
  };

  const [pickedNiches, setPickedNiches] = useState<Niche[]>(() => {
    return selectedNiche ? [selectedNiche] : [];
  });

  const handleToggleNiche = (niche: Niche) => {
    setPickedNiches((prev) => {
      const exists = prev.some((n) => n.name === niche.name);
      if (exists) return prev.filter((n) => n.name !== niche.name);
      if (prev.length >= 2) return [prev[1], niche]; // Replace oldest
      return [...prev, niche];
    });
  };

  const handleContinue = () => {
    if (pickedNiches.length === 0) return;
    clearDownstream();

    if (pickedNiches.length === 1) {
      setSelectedNiche(pickedNiches[0]);
    } else {
      // Merge 2 niches into one combined niche
      const [a, b] = pickedNiches;
      const merged: Niche = {
        name: `${a.name} + ${b.name}`,
        fit_score: Math.round(((a.fit_score + b.fit_score) / 2) * 10) / 10,
        why_perfect_match: `${a.why_perfect_match}\n\n${b.why_perfect_match}`,
        examples: [a.examples, b.examples].filter(Boolean).join(", "),
        core_pain: [a.core_pain, b.core_pain].filter(Boolean).join(" | "),
        why_frequency_resonates: `${a.why_frequency_resonates}\n\n${b.why_frequency_resonates}`,
      };
      setSelectedNiche(merged);
    }
    router.push(`/project/${projectId}/pains`);
  };

  /** Reset niches and re-generate from scratch */
  const handleResetNiches = () => {
    clearDownstream();
    setSelectedNiche(null);
    setNiches([]);
    setShowBrainstorm(false);
    generationAttempted.current = false;
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-red-600 mb-2">שגיאה</h2>
        <p className="text-[var(--text-secondary)] mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="px-5 py-2.5 bg-[var(--gold)] hover:opacity-90 text-white font-semibold rounded-[10px] transition-opacity cursor-pointer"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (niches.length === 0) {
    return (
      <div className="text-center py-20">
        <CountdownTimer seconds={15} />
        <p className="mt-4 text-[var(--text-muted)]">מזהה נישות מתאימות עבור התדר שלך...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">בחר נישה</h2>
        <p className="text-[var(--text-secondary)] mt-1">
          FBM Studio זיהה 3 נישות שמתאימות לתדר שלך. בחר עד 2 נישות:
        </p>
      </div>

      <div className="grid gap-4">
        {niches.map((niche, i) => {
          const isPicked = pickedNiches.some((n) => n.name === niche.name);
          return (
            <button
              key={i}
              onClick={() => handleToggleNiche(niche)}
              className={`text-right p-6 card-elevated cursor-pointer animate-in delay-${Math.min(i + 1, 8)} ${
                isPicked
                  ? "!border-[var(--gold)] !bg-[var(--gold-soft)]"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {isPicked && <span className="text-[var(--gold)] ml-2">&#10003;</span>}
                  {niche.name}
                </h3>
                <span className="bg-[var(--gold-soft)] text-[var(--gold)] text-sm font-bold px-3 py-1 rounded-[10px]">
                  {niche.fit_score}/10
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                {niche.why_perfect_match}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text-secondary)]">כאב מרכזי:</span>{" "}
                {niche.core_pain}
              </p>
            </button>
          );
        })}
      </div>

      {/* Continue button */}
      {pickedNiches.length > 0 && (
        <div className="mt-4 animate-in">
          <button
            onClick={handleContinue}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] transition-all cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
              boxShadow: "0 4px 16px rgba(212, 168, 67, 0.3)",
            }}
          >
            {pickedNiches.length === 1
              ? `המשך עם "${pickedNiches[0].name}"`
              : `המשך עם ${pickedNiches.length} נישות`}
          </button>
          {pickedNiches.length === 2 && (
            <p className="text-xs text-center text-[var(--text-muted)] mt-1.5">
              שתי הנישות ימוזגו לקהל יעד משולב
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => setShowBrainstorm((v) => !v)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] border transition-all cursor-pointer text-sm font-semibold"
          style={{
            borderColor: showBrainstorm
              ? "var(--gold)"
              : "var(--card-border)",
            color: showBrainstorm ? "var(--gold)" : "var(--text-secondary)",
            backgroundColor: showBrainstorm
              ? "rgba(212, 168, 67, 0.08)"
              : "var(--card-bg)",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {showBrainstorm
            ? "סגור סיעור מוחות"
            : "לא מרגיש מתאים? בוא נחשוב ביחד"}
        </button>

        <button
          onClick={handleResetNiches}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-red-400 hover:text-red-400 transition-all cursor-pointer text-sm font-semibold"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          התחל מחדש ניתוח נישות
        </button>
      </div>

      {/* Brainstorm panel */}
      {showBrainstorm && (
        <div className="mt-4">
          <BrainstormPanel
            strategy={strategy}
            onSelectCustomNiche={(niche) => {
              clearDownstream();
              setNiches([niche]);
              setSelectedNiche(niche);
              router.push(`/project/${projectId}/pains`);
            }}
          />
        </div>
      )}
    </div>
  );
}
