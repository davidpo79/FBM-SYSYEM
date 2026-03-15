"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import { useToast } from "@/components/Toast";
import TemplatePreview from "@/components/creatives/TemplatePreview";
import type { TextStyleProps } from "@/components/creatives/TemplatePreview";
import { TEMPLATES, suggestTemplate } from "@/components/creatives/templates";

import type { CreativeSuggestion, FormatType } from "@/types";
import { trackEvent } from "@/lib/track-event";

/* ── Countdown Timer ── */
function CountdownTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = Date.now();
    setRemaining(seconds); // eslint-disable-line react-hooks/set-state-in-effect
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

/* ── Toggle Switch ── */
function ToggleSwitch({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
      style={{ backgroundColor: enabled ? 'var(--gold)' : '#9ca3af' }}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
    >
      <span
        className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
        style={{ transform: enabled ? 'translateX(0px)' : 'translateX(16px)' }}
      />
    </button>
  );
}

/* ── Extract structured suggestion from AI chat response ── */
function extractSuggestion(text: string): { headline?: string; subtitle?: string; cta?: string; backgroundPrompt?: string } {
  const result: { headline?: string; subtitle?: string; cta?: string; backgroundPrompt?: string } = {};

  // Match headline: כותרת: "..." or **כותרת:** "..."
  const headlineMatch = text.match(/\*?\*?כותרת\*?\*?[:\s]+["״]([^"״]+)["״]/);
  if (headlineMatch) result.headline = headlineMatch[1].trim();

  // Match subtitle/pilot offer
  const subtitleMatch = text.match(/\*?\*?(?:תת-כותרת|הצעת פיילוט|תת כותרת)[^:]*\*?\*?[:\s]+["״]([^"״]+)["״]/);
  if (subtitleMatch) result.subtitle = subtitleMatch[1].trim();

  // Match CTA
  const ctaMatch = text.match(/\*?\*?CTA\*?\*?[:\s]+["״]([^"״]+)["״]/);
  if (ctaMatch) result.cta = ctaMatch[1].trim();

  // Match background prompt suggestion
  const bgMatch = text.match(/\*?\*?(?:הנחיה לרקע|רקע|Background)[^:]*\*?\*?[:\s]+["״]([^"״]+)["״]/);
  if (bgMatch) result.backgroundPrompt = bgMatch[1].trim();

  return result;
}

type ChatMessage = { role: "user" | "assistant"; text: string };

const INITIAL_CHAT_MSG: ChatMessage = {
  role: "assistant",
  text: "שלום! אני מומחה קריאטיב ופרסום עם 15 שנות ניסיון.\nאני כאן לעזור לך עם כותרות, הצעת פיילוט 500 ₪, CTA, ורעיונות לרקע.\n\nהצעת הפיילוט ב-500 ₪ היא הלב של המודעה — זו ההצעה שגורמת לאנשים ללחוץ.\n\nאיך אוכל לעזור? למשל:\n- \"תציע הצעה חדשה לקריאטיב\"\n- \"שפר את הצעת הפיילוט של 500 ₪\"\n- \"תן רעיונות ל-CTA\"\n- \"הצע רעיון לרקע\"",
};

/* ── Hebrew Fonts ── */
const HEBREW_FONTS = [
  { value: "Rubik, sans-serif", label: "רוביק (Rubik)" },
  { value: "Heebo, sans-serif", label: "חיבו (Heebo)" },
  { value: "Assistant, sans-serif", label: "אסיסטנט (Assistant)" },
  { value: "'Varela Round', sans-serif", label: "וארלה (Varela Round)" },
  { value: "'David Libre', serif", label: "דוד (David Libre)" },
  { value: "'Frank Ruhl Libre', serif", label: "פרנק רוהל (Frank Ruhl)" },
  { value: "'Noto Sans Hebrew', sans-serif", label: "נוטו (Noto Sans)" },
  { value: "'Secular One', sans-serif", label: "סקולר (Secular One)" },
  { value: "Alef, sans-serif", label: "אלף (Alef)" },
  { value: "Karantina, sans-serif", label: "קרנטינה (Karantina)" },
];

/* ── Text Style Panel ── */
function TextStylePanel({
  label,
  style,
  onChange,
  collapsed,
}: {
  label: string;
  style: TextStyleProps;
  onChange: (s: TextStyleProps) => void;
  collapsed?: boolean;
}) {
  if (collapsed) return null;

  const isBold = style.fontWeight === "bold" || style.fontWeight === "800" || style.fontWeight === "700";
  const isItalic = style.fontStyle === "italic";
  const isUnderline = style.textDecoration === "underline";

  return (
    <div className="space-y-3 p-3 bg-[var(--content-bg)] dark:bg-gray-900/30 rounded-xl border border-[var(--card-border)]">
      <p className="text-xs font-bold text-[var(--text-primary)]">{label}</p>

      {/* Font Size Slider */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] text-[var(--text-muted)]">גודל פונט</label>
          <span className="text-[11px] font-bold text-[var(--gold)] tabular-nums min-w-[32px] text-center">
            {style.fontSize ?? 28}px
          </span>
        </div>
        <input
          type="range"
          min={12}
          max={60}
          step={1}
          value={style.fontSize ?? 28}
          onChange={(e) => onChange({ ...style, fontSize: Number(e.target.value) })}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to left, var(--gold) ${((style.fontSize ?? 28) - 12) / 48 * 100}%, var(--card-border) ${((style.fontSize ?? 28) - 12) / 48 * 100}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
          <span>12</span>
          <span>60</span>
        </div>
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-[11px] text-[var(--text-muted)] mb-1">סוג פונט</label>
        <select
          value={style.fontFamily || "Rubik, sans-serif"}
          onChange={(e) => onChange({ ...style, fontFamily: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)] cursor-pointer"
          style={{ fontFamily: style.fontFamily || "Rubik, sans-serif" }}
        >
          {HEBREW_FONTS.map((f) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Style Buttons (Bold, Italic, Underline) */}
      <div>
        <label className="block text-[11px] text-[var(--text-muted)] mb-1">עיצוב</label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ ...style, fontWeight: isBold ? "normal" : "bold" })}
            className={`flex-1 py-2 rounded-lg border text-sm font-bold cursor-pointer transition-all ${
              isBold
                ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)]"
                : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
            }`}
            title="מודגש"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...style, fontStyle: isItalic ? "normal" : "italic" })}
            className={`flex-1 py-2 rounded-lg border text-sm cursor-pointer transition-all ${
              isItalic
                ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)]"
                : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
            }`}
            style={{ fontStyle: "italic" }}
            title="נטוי"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...style, textDecoration: isUnderline ? "none" : "underline" })}
            className={`flex-1 py-2 rounded-lg border text-sm cursor-pointer transition-all ${
              isUnderline
                ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)]"
                : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
            }`}
            style={{ textDecoration: "underline" }}
            title="קו תחתון"
          >
            U
          </button>
        </div>
      </div>

      {/* Text Color */}
      <div>
        <label className="block text-[11px] text-[var(--text-muted)] mb-1">צבע טקסט</label>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-wrap flex-1">
            {["#FFFFFF", "#000000", "#D4A843", "#FF4444", "#22C55E", "#3B82F6", "#F59E0B", "#A855F7"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ ...style, color: c })}
                className="w-7 h-7 rounded-lg cursor-pointer transition-all"
                style={{
                  backgroundColor: c,
                  border: (style.color || "#FFFFFF") === c
                    ? "2px solid var(--gold)"
                    : "2px solid var(--card-border)",
                  boxShadow: (style.color || "#FFFFFF") === c ? "0 0 0 1px var(--gold)" : "none",
                }}
                title={c}
              />
            ))}
          </div>
          <input
            type="color"
            value={style.color || "#FFFFFF"}
            onChange={(e) => onChange({ ...style, color: e.target.value })}
            className="w-7 h-7 rounded-lg cursor-pointer border border-[var(--card-border)]"
            title="צבע מותאם"
            style={{ padding: 0 }}
          />
        </div>
      </div>

      {/* Preview */}
      <div
        className="p-3 rounded-lg bg-black/80 text-center overflow-hidden"
        style={{
          fontFamily: style.fontFamily || "Rubik, sans-serif",
          fontSize: `${Math.min(style.fontSize ?? 28, 24)}px`,
          fontWeight: style.fontWeight || "normal",
          fontStyle: style.fontStyle || "normal",
          textDecoration: style.textDecoration || "none",
          color: style.color || "#fff",
          direction: "rtl",
          lineHeight: 1.4,
        }}
      >
        טקסט לדוגמה
      </div>
    </div>
  );
}

/* ── Creative Chat Modal ── */
function CreativeChatModal({
  open,
  onClose,
  onApplyAll,
  messages,
  setMessages,
  scriptText,
  currentHeadline,
  currentSubtitle,
  currentCta,
  currentDesignVision,
  niche,
}: {
  open: boolean;
  onClose: () => void;
  onApplyAll: (data: { headline?: string; subtitle?: string; cta?: string; backgroundPrompt?: string }) => void;
  messages: ChatMessage[];
  setMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  scriptText: string;
  currentHeadline: string;
  currentSubtitle: string;
  currentCta: string;
  currentDesignVision: string;
  niche: string;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev: ChatMessage[]) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);
    setAppliedIdx(null);

    try {
      const res = await fetch("/api/creative-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          scriptText,
          currentHeadline,
          currentSubtitle,
          currentCta,
          currentDesignVision,
          niche,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessages((prev: ChatMessage[]) => [...prev, { role: "assistant", text: json.reply }]);
    } catch {
      setMessages((prev: ChatMessage[]) => [...prev, { role: "assistant", text: "שגיאה בקבלת תשובה. נסה שוב." }]);
    } finally {
      setLoading(false);
    }
  };

  // Find the latest assistant message with extractable content
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
  const extracted = lastAssistantMsg ? extractSuggestion(lastAssistantMsg.text) : {};
  const hasExtracted = !!(extracted.headline || extracted.subtitle || extracted.cta || extracted.backgroundPrompt);

  const handleApplyAll = () => {
    if (!hasExtracted) return;
    onApplyAll(extracted);
    const idx = messages.length - 1 - [...messages].reverse().findIndex(m => m.role === "assistant");
    setAppliedIdx(idx);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">מומחה קריאטיב AI</h3>
            <p className="text-xs text-[var(--text-muted)]">15 שנות ניסיון בפרסום דיגיטלי</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[var(--gold)] text-white rounded-br-none"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none"
                }`}
                style={{ userSelect: "text" }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-2.5 text-sm text-[var(--text-muted)]">
                חושב...
              </div>
            </div>
          )}
        </div>

        {/* Apply All button — prominent, single action */}
        {hasExtracted && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
            {/* Preview what will be applied */}
            <div className="bg-[var(--gold-soft)] border border-[var(--gold)]/30 rounded-xl p-3 text-xs space-y-1">
              <p className="font-bold text-[var(--gold)] text-[11px] mb-1.5">זוהה בהצעה:</p>
              {extracted.headline && (
                <p className="text-[var(--text-primary)]"><span className="font-semibold">כותרת:</span> {extracted.headline}</p>
              )}
              {extracted.subtitle && (
                <p className="text-[var(--text-primary)]"><span className="font-semibold">הצעת פיילוט:</span> {extracted.subtitle}</p>
              )}
              {extracted.cta && (
                <p className="text-[var(--text-primary)]"><span className="font-semibold">CTA:</span> {extracted.cta}</p>
              )}
              {extracted.backgroundPrompt && (
                <p className="text-[var(--text-primary)]"><span className="font-semibold">הנחיה לרקע:</span> {extracted.backgroundPrompt}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleApplyAll}
              disabled={appliedIdx !== null}
              className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                appliedIdx !== null
                  ? "bg-green-100 text-green-700 border border-green-300"
                  : "bg-[var(--gold)] text-white hover:opacity-90"
              }`}
            >
              {appliedIdx !== null
                ? "הוחל בהצלחה!"
                : "החל הכל — כותרת, פיילוט, CTA ורקע"}
            </button>
          </div>
        )}

        {/* Quick suggestion chips */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex gap-1.5 flex-wrap">
          {["תציע הצעה חדשה", "שפר את הצעת ה-500 ₪", "שפר את הכותרת", "הצע רעיון לרקע"].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => { setInput(q); }}
              className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="שאל את המומחה..."
            className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-xl bg-[var(--gold)] text-white font-semibold text-sm disabled:opacity-50 cursor-pointer"
          >
            שלח
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Per-script state ── */
type ScriptState = "idle" | "analyzing" | "ready";

interface ScriptCreative {
  state: ScriptState;
  suggestion: CreativeSuggestion | null;
  templateId: string;
  headline: string;
  subtitle: string;
  cta: string;
  format: FormatType;
  customBackground?: string;
  designVision?: string;
  showHeadline: boolean;
  showSubtitle: boolean;
  showCta: boolean;
  showOwnerProfile: boolean;
  ownerPhoto?: string;
  ownerName: string;
  ownerTitle: string;
  // Text styling
  headlineStyle?: TextStyleProps;
  subtitleStyle?: TextStyleProps;
  syncTextStyle: boolean; // when true, headline style applies to both
}

export default function CreativePage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const {
    project,
    projectMode,
    scripts,
    selectedNiche,
    generatedImages,
    setGeneratedImages,
  } = useProject();

  const [creativeError, setCreativeError] = useState("");
  const creativesStorageKey = `creatives_${projectId}`;
  const [scriptCreatives, setScriptCreatives] = useState<Record<number, ScriptCreative>>(() => {
    try {
      const saved = localStorage.getItem(creativesStorageKey);
      return saved ? (JSON.parse(saved) as Record<number, ScriptCreative>) : {};
    } catch { return {}; }
  });
  const [isGeneratingBg, setIsGeneratingBg] = useState<Record<number, boolean>>({});
  const [chatOpen, setChatOpen] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<number, ChatMessage[]>>({});
  const [advancedOpen, setAdvancedOpen] = useState<Record<number, boolean>>({});
  const autoCreatedRef = useRef(false);
  const toast = useToast();

  // Persist scriptCreatives to localStorage
  useEffect(() => {
    // Only save when there are actual creatives (avoid overwriting with empty on mount race)
    if (Object.keys(scriptCreatives).length === 0) return;
    try {
      localStorage.setItem(creativesStorageKey, JSON.stringify(scriptCreatives));
    } catch (e) {
      console.error("Failed to save creatives to localStorage:", e);
    }
  }, [scriptCreatives, creativesStorageKey]);

  // Track page view
  useEffect(() => {
    trackEvent({ eventType: "page_view", eventName: "creative_page", stepName: "creative", projectId });
  }, [projectId]);

  /* ── Get or init chat messages for a script ── */
  const getChatMessages = useCallback((idx: number): ChatMessage[] => {
    return chatMessages[idx] || [INITIAL_CHAT_MSG];
  }, [chatMessages]);

  const setChatMessagesForScript = useCallback((idx: number) => {
    return (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setChatMessages(prev => ({
        ...prev,
        [idx]: typeof msgs === "function" ? msgs(prev[idx] || [INITIAL_CHAT_MSG]) : msgs,
      }));
    };
  }, []);

  // Album
  const albumStorageKey = `album_${projectId}`;
  type AlbumImage = { url: string; base64?: string; scriptIdx: number };
  const [albumImages, setAlbumImages] = useState<AlbumImage[]>(() => {
    try {
      const saved = localStorage.getItem(albumStorageKey);
      return saved ? (JSON.parse(saved) as AlbumImage[]) : [];
    } catch { return []; }
  });

  const isInAlbum = useCallback(
    (scriptIdx: number) => albumImages.some((img) => img.scriptIdx === scriptIdx),
    [albumImages],
  );

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

  /* ── Get or init creative state for a script ── */
  const getCreative = (idx: number): ScriptCreative => {
    return scriptCreatives[idx] || {
      state: "idle",
      suggestion: null,
      templateId: "fbm-pilot",
      headline: "",
      subtitle: "",
      cta: "",
      format: "story" as FormatType,
      showHeadline: true,
      showSubtitle: true,
      showCta: true,
      showOwnerProfile: false,
      ownerName: "",
      ownerTitle: "",
      syncTextStyle: true,
    };
  };

  /* ── One Click Magic: analyze + auto-template + auto-generate background ── */
  const handleCreateCreative = useCallback(
    async (scriptIdx: number, autoGenerateBg = false) => {
      const scriptParts = splitScripts(scripts);
      const scriptText = scriptParts[scriptIdx] ?? "";

      setScriptCreatives((prev) => ({
        ...prev,
        [scriptIdx]: {
          ...getCreative(scriptIdx),
          state: "analyzing",
          suggestion: null,
        },
      }));
      setCreativeError("");

      try {
        const res = await fetch("/api/suggest-creative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scriptText }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        const suggestion = json.suggestion as CreativeSuggestion;
        const templateId = suggestTemplate(suggestion.background, suggestion.color);

        const pilotSubtitle = suggestion.pilot_subtitle
          || `פיילוט ב-500 ₪ בלבד — הצעה שאי אפשר לסרב לה.\nגלה איך להגיע ללקוחות המדויקים ל${selectedNiche?.name || "הנישה שלך"} לפני כולם.`;

        setScriptCreatives((prev) => ({
          ...prev,
          [scriptIdx]: {
            state: "ready",
            suggestion,
            templateId,
            headline: suggestion.main_text,
            subtitle: pilotSubtitle,
            cta: suggestion.cta || "שלח לי הודעה לתיאום שיחה",
            format: "story",
            showHeadline: true,
            showSubtitle: true,
            showCta: true,
            showOwnerProfile: false,
            ownerName: project?.user_name || "",
            ownerTitle: (() => {
              if (projectMode === "client" || projectMode === "owner") {
                // Client/Owner mode: show the profession (e.g., "מאמן כושר")
                return project?.owner_niche || "";
              }
              // Self mode: show "מומחה שיווק מבוסס תדר ל[target niche]"
              const raw = (selectedNiche?.name || "").split(/\s*[-–—]\s*/)[0].trim();
              const core = raw
                .replace(/\s*(בגילא[יי]ם?\s+\d+[-–]\d+|בני\s+\d+[-–]\d+|\d+[-–]\d+)/g, "")
                .replace(/\s*(מתמחים ב|שעוסקים ב|שמתמחים ב|העוסקים ב)/g, "")
                .replace(/\s+/g, " ")
                .trim();
              return core ? `מומחה שיווק מבוסס תדר ל${core}` : "";
            })(),
            syncTextStyle: true,
          },
        }));

        // Auto-generate background for WOW effect
        if (autoGenerateBg && suggestion.image_prompt) {
          setIsGeneratingBg(prev => ({ ...prev, [scriptIdx]: true }));
          try {
            const bgRes = await fetch("/api/generate-creatives", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                background: suggestion.background,
                format: "story",
                designVision: suggestion.look_and_feel || "",
                imagePrompt: suggestion.image_prompt,
              }),
            });
            const bgText = await bgRes.text();
            let bgJson;
            try { bgJson = JSON.parse(bgText); } catch { bgJson = null; }
            if (bgJson?.success) {
              const bgSrc = bgJson.imageBase64 || bgJson.imageUrl || "";
              setScriptCreatives((prev) => ({
                ...prev,
                [scriptIdx]: { ...prev[scriptIdx], customBackground: bgSrc },
              }));
              const newImage = { url: bgJson.imageUrl || "", base64: bgJson.imageBase64 || "", scriptIdx };
              setGeneratedImages((prev) => {
                const filtered = prev.filter((img) => img.scriptIdx !== scriptIdx);
                return [...filtered, newImage];
              });
            }
          } finally {
            setIsGeneratingBg(prev => ({ ...prev, [scriptIdx]: false }));
          }
        }
      } catch (e) {
        console.error("Suggest creative error:", e);
        setScriptCreatives((prev) => ({
          ...prev,
          [scriptIdx]: { ...getCreative(scriptIdx), state: "idle" },
        }));
        setCreativeError("שגיאה ביצירת הצעת קריאטיב. נסה שוב.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scripts, selectedNiche, project, projectMode, setGeneratedImages],
  );

  /* ── Auto-create on page load for WOW effect ── */
  useEffect(() => {
    if (!scripts || autoCreatedRef.current) return;
    const parts = splitScripts(scripts);
    if (parts.length > 0 && !scriptCreatives[0]) {
      autoCreatedRef.current = true;
      // Silently handle failure — don't show error banner on auto-create
      handleCreateCreative(0, true).catch(() => {
        setCreativeError("");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripts]);

  /* ── Change template for a script ── */
  const handleChangeTemplate = useCallback((scriptIdx: number, templateId: string) => {
    setScriptCreatives((prev) => ({
      ...prev,
      [scriptIdx]: { ...prev[scriptIdx], templateId },
    }));
  }, []);

  /* ── Update text fields ── */
  const updateField = useCallback((scriptIdx: number, field: keyof ScriptCreative, value: string | boolean) => {
    setScriptCreatives((prev) => ({
      ...prev,
      [scriptIdx]: { ...prev[scriptIdx], [field]: value },
    }));
  }, []);

  /* ── Update text style ── */
  const updateTextStyle = useCallback((scriptIdx: number, target: "headline" | "subtitle", style: TextStyleProps) => {
    setScriptCreatives((prev) => {
      const creative = prev[scriptIdx];
      if (!creative) return prev;
      if (target === "headline") {
        const update: Partial<ScriptCreative> = { headlineStyle: style };
        // If synced, also apply to subtitle (with different default fontSize)
        if (creative.syncTextStyle) {
          update.subtitleStyle = {
            ...style,
            fontSize: style.fontSize ? Math.max(12, Math.round(style.fontSize * 0.6)) : undefined,
          };
        }
        return { ...prev, [scriptIdx]: { ...creative, ...update } };
      } else {
        return { ...prev, [scriptIdx]: { ...creative, subtitleStyle: style } };
      }
    });
  }, []);

  /* ── Generate AI background ── */
  const handleGenerateBackground = useCallback(
    async (config: { background: string; format?: string; designVision?: string; imagePrompt?: string }, scriptIdx: number) => {
      setCreativeError("");
      try {
        const creative = getCreative(scriptIdx);
        const res = await fetch("/api/generate-creatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...config,
            imagePrompt: config.imagePrompt || creative.suggestion?.image_prompt,
          }),
        });
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch {
          throw new Error(`שגיאת שרת (${res.status})`);
        }
        if (!res.ok || !json.success) throw new Error(json.error || "Generation failed");

        const bgSrc = json.imageBase64 || json.imageUrl || "";

        setScriptCreatives((prev) => ({
          ...prev,
          [scriptIdx]: { ...prev[scriptIdx], customBackground: bgSrc },
        }));

        const newImage = { url: json.imageUrl || "", base64: json.imageBase64 || "", scriptIdx };
        setGeneratedImages((prev) => {
          const filtered = prev.filter((img) => img.scriptIdx !== scriptIdx);
          return [...filtered, newImage];
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setCreativeError(`שגיאה ביצירת הרקע: ${msg}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setGeneratedImages],
  );

  /* ── Upload background ── */
  const handleUploadBackground = useCallback((base64: string, scriptIdx: number) => {
    setScriptCreatives((prev) => ({
      ...prev,
      [scriptIdx]: { ...prev[scriptIdx], customBackground: base64 },
    }));
    setGeneratedImages((prev) => {
      const filtered = prev.filter((img) => img.scriptIdx !== scriptIdx);
      return [...filtered, { url: "", base64, scriptIdx }];
    });
  }, [setGeneratedImages]);

  /* ── Remove background ── */
  const handleRemoveBackground = useCallback((scriptIdx: number) => {
    setScriptCreatives((prev) => ({
      ...prev,
      [scriptIdx]: { ...prev[scriptIdx], customBackground: undefined },
    }));
    setGeneratedImages((prev) => prev.filter((img) => img.scriptIdx !== scriptIdx));
  }, [setGeneratedImages]);

  /* ── Upload owner photo ── */
  const handleUploadOwnerPhoto = useCallback((base64: string, scriptIdx: number) => {
    setScriptCreatives((prev) => ({
      ...prev,
      [scriptIdx]: { ...prev[scriptIdx], ownerPhoto: base64 },
    }));
  }, []);

  /* ── Save to album ── */
  const handleSaveToAlbum = useCallback(
    (base64: string, scriptIdx: number) => {
      setAlbumImages((prev) => {
        const exists = prev.some((img) => img.scriptIdx === scriptIdx);
        const next = exists
          ? prev.map((img) => img.scriptIdx === scriptIdx ? { ...img, base64, url: "" } : img)
          : [...prev, { url: "", base64, scriptIdx }];
        try {
          localStorage.setItem(albumStorageKey, JSON.stringify(next));
          window.dispatchEvent(new StorageEvent("storage", { key: albumStorageKey }));
          toast.success("נשמר לאלבום בהצלחה");
        } catch (e) {
          console.error("localStorage save failed:", e);
          toast.error("שגיאה בשמירה לאלבום — נפח האחסון מלא");
        }
        return next;
      });
    },
    [albumStorageKey, toast],
  );

  if (!scripts) return null;

  const scriptParts = splitScripts(scripts);
  const readyCount = Object.values(scriptCreatives).filter((c) => c.state === "ready").length;

  return (
    <div className="pb-20 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-in">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          🎨 קריאייטיב
        </h2>
        {albumImages.length > 0 && (
          <span className="text-sm font-medium text-[var(--gold)] bg-[var(--gold-soft)] px-3 py-1.5 rounded-full">
            📸 {albumImages.length}/{scriptParts.length} באלבום
          </span>
        )}
      </div>

      {/* Error banner */}
      {creativeError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-600 animate-in">
          {creativeError}
        </div>
      )}

      <div className="space-y-6">
        {scriptParts.map((scriptText, idx) => {
          const creative = getCreative(idx);
          const template = TEMPLATES.find((t) => t.id === creative.templateId) || TEMPLATES[0];

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
                <div className="flex items-center gap-2">
                  {creative.state === "ready" && (
                    <span className="text-xs font-medium text-[var(--success)] bg-green-50 px-2 py-1 rounded-full">
                      ✓ מוכן
                    </span>
                  )}
                  {isInAlbum(idx) && (
                    <span className="text-xs font-medium text-[var(--gold)] bg-[var(--gold-soft)] px-2 py-1 rounded-full">
                      📸 באלבום
                    </span>
                  )}
                </div>
              </div>

              {/* ── State: IDLE ── */}
              {creative.state === "idle" && (
                <div className="p-5 text-center">
                  <button
                    onClick={() => handleCreateCreative(idx, true)}
                    className="btn-gold !py-3 !px-8 text-base"
                  >
                    ✨ צור קריאייטיב
                  </button>
                </div>
              )}

              {/* ── State: ANALYZING ── */}
              {creative.state === "analyzing" && (
                <div className="p-8 text-center">
                  <CountdownTimer seconds={isGeneratingBg[idx] ? 20 : 5} />
                  <p className="text-sm text-[var(--text-muted)] mt-3">
                    {isGeneratingBg[idx]
                      ? "FBM Studio מכין את העיצוב המושלם שלך... כותרת, רקע ו-CTA"
                      : "FBM Studio מנתח את התסריט ומציע קריאטיב..."}
                  </p>
                </div>
              )}

              {/* ── State: READY ── */}
              {creative.state === "ready" && (
                <div className="p-5">
                  {/* Drag hint */}
                  <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-[10px] text-xs text-blue-700 dark:text-blue-300 text-center">
                    גרור את הטקסטים על התמונה כדי למקם אותם. ערוך טקסט בפאנל בצד.
                  </div>

                  {/* Two column layout */}
                  <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                    {/* LEFT: Template Preview */}
                    <div className="lg:w-[55%] flex-shrink-0">
                      <TemplatePreview
                        template={template}
                        headline={creative.showHeadline ? creative.headline : ""}
                        subtitle={creative.showSubtitle ? creative.subtitle : ""}
                        cta={creative.showCta ? creative.cta : ""}
                        format={creative.format}
                        customBackground={creative.customBackground}
                        onSaveToAlbum={handleSaveToAlbum}
                        scriptIdx={idx}
                        ownerPhoto={creative.showOwnerProfile ? creative.ownerPhoto : undefined}
                        ownerName={creative.showOwnerProfile ? creative.ownerName : ""}
                        ownerTitle={creative.showOwnerProfile ? creative.ownerTitle : ""}
                        headlineStyle={creative.headlineStyle}
                        subtitleStyle={creative.subtitleStyle}
                      />
                    </div>

                    {/* RIGHT: Edit panel */}
                    <div className="lg:w-[45%] space-y-4 lg:max-h-[80vh] lg:overflow-y-auto lg:pr-1">

                      {/* Chatbot button */}
                      <button
                        type="button"
                        onClick={() => setChatOpen(idx)}
                        className="w-full py-2.5 rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-semibold text-sm hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span className="text-lg">🤖</span>
                        מומחה קריאטיב AI — בריינסטורמינג כותרות ו-CTA
                      </button>

                      {/* Headline with toggle */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-bold text-[var(--text-primary)]">
                            כותרת
                          </label>
                          <ToggleSwitch
                            enabled={creative.showHeadline}
                            onChange={(v) => updateField(idx, "showHeadline", v)}
                            label="הצג כותרת"
                          />
                        </div>
                        {creative.showHeadline && (
                          <textarea
                            value={creative.headline}
                            onChange={(e) => updateField(idx, "headline", e.target.value)}
                            maxLength={120}
                            rows={2}
                            className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
                          />
                        )}
                      </div>

                      {/* Subtitle / Pilot Offer with toggle */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-bold text-[var(--text-primary)]">
                            הצעת פיילוט (תת-כותרת)
                          </label>
                          <ToggleSwitch
                            enabled={creative.showSubtitle}
                            onChange={(v) => updateField(idx, "showSubtitle", v)}
                            label="הצג הצעת פיילוט"
                          />
                        </div>
                        {creative.showSubtitle && (
                          <>
                            <textarea
                              value={creative.subtitle}
                              onChange={(e) => updateField(idx, "subtitle", e.target.value)}
                              maxLength={120}
                              rows={2}
                              placeholder="פיילוט ב-500 ₪ בלבד — הצעה שאי אפשר לסרב לה..."
                              className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
                            />
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium">
                              הצעת הפיילוט ב-500 ₪ היא הלב של המודעה — הצעה שאי אפשר לסרב לה
                            </p>
                          </>
                        )}
                      </div>

                      {/* CTA with toggle */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-bold text-[var(--text-primary)]">
                            CTA (הנעה לפעולה)
                          </label>
                          <ToggleSwitch
                            enabled={creative.showCta}
                            onChange={(v) => updateField(idx, "showCta", v)}
                            label="הצג CTA"
                          />
                        </div>
                        {creative.showCta && (
                          <input
                            type="text"
                            value={creative.cta}
                            onChange={(e) => updateField(idx, "cta", e.target.value)}
                            maxLength={45}
                            placeholder="שלח לי הודעה לתיאום שיחה"
                            className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
                          />
                        )}
                      </div>

                      {/* ── Advanced Options (Collapsible) ── */}
                      <button
                        type="button"
                        onClick={() => setAdvancedOpen(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl border border-[var(--card-border)] text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all cursor-pointer"
                      >
                        <span>הגדרות מתקדמות</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className="transition-transform"
                          style={{ transform: advancedOpen[idx] ? "rotate(180deg)" : "rotate(0deg)" }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>

                      {advancedOpen[idx] && (
                        <div className="space-y-4 animate-in">
                          {/* Text Styling Section */}
                          <div className="border border-[var(--card-border)] rounded-xl p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-bold text-[var(--text-primary)]">
                                עיצוב טקסט
                              </label>
                            </div>

                            <TextStylePanel
                              label="כותרת ראשית"
                              style={creative.headlineStyle || { fontSize: template.headline.fontSize, fontWeight: template.headline.fontWeight, fontFamily: "Rubik, sans-serif", fontStyle: "normal", textDecoration: "none" }}
                              onChange={(s) => updateTextStyle(idx, "headline", s)}
                            />

                            <div className="flex items-center justify-between py-2 px-1">
                              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                                עיצוב זהה לכותרת ותת-כותרת
                              </label>
                              <ToggleSwitch
                                enabled={creative.syncTextStyle ?? true}
                                onChange={(v) => {
                                  updateField(idx, "syncTextStyle", v);
                                  if (v && creative.headlineStyle) {
                                    const subStyle: TextStyleProps = {
                                      ...creative.headlineStyle,
                                      fontSize: creative.headlineStyle.fontSize
                                        ? Math.max(12, Math.round(creative.headlineStyle.fontSize * 0.6))
                                        : undefined,
                                    };
                                    setScriptCreatives((prev) => ({
                                      ...prev,
                                      [idx]: { ...prev[idx], subtitleStyle: subStyle, syncTextStyle: true },
                                    }));
                                  }
                                }}
                                label="סנכרון עיצוב"
                              />
                            </div>

                            {!creative.syncTextStyle && (
                              <TextStylePanel
                                label="תת-כותרת"
                                style={creative.subtitleStyle || { fontSize: template.subtitle.fontSize, fontWeight: template.subtitle.fontWeight || "normal", fontFamily: "Rubik, sans-serif", fontStyle: "normal", textDecoration: "none" }}
                                onChange={(s) => updateTextStyle(idx, "subtitle", s)}
                              />
                            )}
                          </div>

                          {/* Owner photo upload section */}
                          <div className="border border-[var(--card-border)] rounded-xl p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-bold text-[var(--text-primary)]">
                                תמונת בעל העסק
                              </label>
                              <ToggleSwitch
                                enabled={creative.showOwnerProfile}
                                onChange={(v) => updateField(idx, "showOwnerProfile", v)}
                                label="הצג תמונת בעל העסק"
                              />
                            </div>
                            {creative.showOwnerProfile && (
                              <div className="space-y-3">
                                <input
                                  type="text"
                                  value={creative.ownerName}
                                  onChange={(e) => updateField(idx, "ownerName", e.target.value)}
                                  placeholder="שם בעל העסק"
                                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right text-xs focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                                />
                                <div className="flex justify-center">
                                  {creative.ownerPhoto ? (
                                    <div className="relative">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={creative.ownerPhoto}
                                        alt=""
                                        className="w-14 h-14 rounded-full object-cover border-2 border-[var(--gold)]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => updateField(idx, "ownerPhoto", "")}
                                        className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center cursor-pointer hover:bg-red-600"
                                        title="הסר תמונה"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="w-14 h-14 rounded-full border-2 border-dashed border-[var(--card-border)] flex items-center justify-center text-[var(--text-muted)] hover:border-[var(--gold)] cursor-pointer transition-all">
                                      <span className="text-xl">📷</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const reader = new FileReader();
                                          reader.onload = () => handleUploadOwnerPhoto(reader.result as string, idx);
                                          reader.readAsDataURL(file);
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  value={creative.ownerTitle}
                                  onChange={(e) => updateField(idx, "ownerTitle", e.target.value)}
                                  placeholder="תיאור קהל היעד"
                                  className="w-full px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right text-xs focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                                />
                              </div>
                            )}
                          </div>

                          {/* Format */}
                          <div>
                            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                              פורמט
                            </label>
                            <div className="flex gap-2">
                              {(["story", "feed"] as FormatType[]).map((f) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => updateField(idx, "format", f)}
                                  className={`flex-1 px-3 py-2 rounded-[10px] border text-sm cursor-pointer transition-all ${
                                    creative.format === f
                                      ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                                  }`}
                                >
                                  {f === "feed" ? "פיד 1:1" : "סטורי 9:16"}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Template strip */}
                          <div>
                            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                              תבנית
                            </label>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                              {TEMPLATES.map((t) => (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => handleChangeTemplate(idx, t.id)}
                                  className={`flex-shrink-0 w-14 h-14 rounded-[10px] border-2 flex flex-col items-center justify-center text-xs cursor-pointer transition-all ${
                                    creative.templateId === t.id
                                      ? "border-[var(--gold)] ring-2 ring-[var(--gold)]/30"
                                      : "border-[var(--card-border)] hover:border-[var(--text-muted)]"
                                  }`}
                                  style={{ background: t.background }}
                                  title={t.name}
                                >
                                  <span className="text-lg">{t.preview}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Design Vision — AI prompt for background */}
                      <div>
                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                          הנחיה לרקע AI (אופציונלי)
                        </label>
                        <textarea
                          value={creative.designVision || ""}
                          onChange={(e) => updateField(idx, "designVision", e.target.value)}
                          placeholder="למשל: בעל העסק עומד ליד מגדלור שמאיר על קבוצת אנשים, אווירה חמה עם תאורה דרמטית..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
                        />
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          תאר בדיוק את הרקע שאתה רוצה — הוא יקבל עדיפות מקסימלית בעיצוב
                        </p>
                      </div>

                      {/* Generate AI Background */}
                      <button
                        onClick={async () => {
                          setIsGeneratingBg(prev => ({ ...prev, [idx]: true }));
                          try {
                            await handleGenerateBackground({
                              background: creative.suggestion?.background || "lighthouse",
                              format: creative.format,
                              designVision: creative.designVision || creative.suggestion?.look_and_feel || "",
                              imagePrompt: creative.designVision
                                ? creative.designVision
                                : (creative.suggestion?.image_prompt || ""),
                            }, idx);
                          } finally {
                            setIsGeneratingBg(prev => ({ ...prev, [idx]: false }));
                          }
                        }}
                        disabled={isGeneratingBg[idx]}
                        className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: isGeneratingBg[idx]
                            ? '#6B7084'
                            : creative.customBackground
                              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                              : 'linear-gradient(135deg, #22C55E 0%, #16a34a 100%)',
                          boxShadow: isGeneratingBg[idx] ? 'none' : '0 4px 16px rgba(34,197,94,0.3)',
                        }}
                      >
                        {isGeneratingBg[idx]
                          ? '⏳ יוצר רקע AI... (~15 שניות)'
                          : creative.customBackground
                            ? '🔄 צור רקע מחדש (1 credit)'
                            : '✨ צור רקע AI (1 credit)'}
                      </button>

                      {/* Upload custom background + Remove background */}
                      <div className="flex gap-2">
                        <label className="flex-1 block py-3 rounded-xl border-2 border-dashed border-[var(--card-border)] text-center text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all cursor-pointer">
                          📁 העלה רקע מותאם (0 credits)
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                const base64 = reader.result as string;
                                handleUploadBackground(base64, idx);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {creative.customBackground && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBackground(idx)}
                            className="px-4 py-3 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                            title="הסר רקע"
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-[var(--text-muted)] text-center">
                        שינוי טקסט, מיקום, תבנית — מיידי. רק &quot;צור רקע&quot; משתמש ב-AI.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All done / next step */}
      {readyCount > 0 && (
        <div className="text-center py-8 bg-green-50 border border-green-200 rounded-[20px] mt-6 animate-in">
          {readyCount >= scriptParts.length ? (
            <>
              <h2 className="text-2xl font-bold text-[var(--success)]">הכל מוכן!</h2>
              <p className="text-[var(--text-secondary)] mt-2">
                כל התסריטים והקריאטיבים נוצרו בהצלחה
              </p>
            </>
          ) : (
            <p className="text-[var(--text-secondary)]">
              {readyCount}/{scriptParts.length} קריאטיבים מוכנים
            </p>
          )}
          {albumImages.length > 0 && (
            <p className="text-sm text-[var(--gold)] font-medium mt-1">
              {albumImages.length} תמונות נבחרו לאלבום
            </p>
          )}
          <button
            onClick={() => router.push(`/project/${projectId}/video-creator`)}
            className="mt-4 btn-gold text-lg !px-8 !py-3"
          >
            המשך ליצירת וידאו
          </button>
        </div>
      )}

      {/* Chat Modal */}
      {chatOpen !== null && (
        <CreativeChatModal
          open={true}
          onClose={() => setChatOpen(null)}
          scriptText={scriptParts[chatOpen] || ""}
          currentHeadline={getCreative(chatOpen).headline}
          currentSubtitle={getCreative(chatOpen).subtitle}
          currentCta={getCreative(chatOpen).cta}
          currentDesignVision={getCreative(chatOpen).designVision || ""}
          niche={selectedNiche?.name || ""}
          messages={getChatMessages(chatOpen)}
          setMessages={setChatMessagesForScript(chatOpen)}
          onApplyAll={(data) => {
            if (data.headline) updateField(chatOpen, "headline", data.headline);
            if (data.subtitle) updateField(chatOpen, "subtitle", data.subtitle);
            if (data.cta) updateField(chatOpen, "cta", data.cta);
            if (data.backgroundPrompt) updateField(chatOpen, "designVision", data.backgroundPrompt);
          }}
        />
      )}
    </div>
  );
}
