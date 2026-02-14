"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import html2canvas from "html2canvas-pro";
import type {
  BackgroundType,
  ColorType,
  FontSizeType,
  TextPositionType,
  FormatType,
  CreativeSuggestion,
} from "@/types";
import FBMLogo from "@/components/FBMLogo";

/* ──────────────── Props ──────────────── */

interface CreativeEditorProps {
  suggestion: CreativeSuggestion;
  userInfo: {
    name: string;
    role: string;
    niche: string;
  };
  generatedImage?: { url: string; base64?: string } | null;
  onGenerate: (config: {
    mainText: string;
    subtitle?: string;
    cta: string;
    background: BackgroundType;
    color: ColorType;
    userInfo: { name: string; role: string; niche: string };
    showProfile?: boolean;
    profileImage?: string;
    displayName?: string;
    displayRole?: string;
    fontSize?: FontSizeType;
    textPosition?: TextPositionType;
    format?: FormatType;
    designVision?: string;
  }) => Promise<void>;
  onSaveLocal?: (dataUrl: string, scriptIdx: number) => void;
  scriptIdx?: number;
}

/* ──────────────── Background config ──────────────── */

const backgrounds: { value: BackgroundType; icon: string; label: string; gradient: string }[] = [
  { value: "lighthouse", icon: "\u{1F5FC}", label: "מגדלור", gradient: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)" },
  { value: "mountain", icon: "\u26F0\uFE0F", label: "הר", gradient: "linear-gradient(135deg, #2b1055 0%, #5b3a8c 40%, #d4a843 100%)" },
  { value: "path", icon: "\u{1F6E4}\uFE0F", label: "דרך", gradient: "linear-gradient(135deg, #3e2723 0%, #8d6e63 50%, #d4a843 100%)" },
  { value: "office", icon: "\u{1F3E2}", label: "משרד", gradient: "linear-gradient(135deg, #e8eaf0 0%, #bdc3c7 50%, #8e99a4 100%)" },
  { value: "city", icon: "\u{1F303}", label: "עיר", gradient: "linear-gradient(135deg, #141e30 0%, #243b55 50%, #4a6fa5 100%)" },
  { value: "sunset", icon: "\u{1F305}", label: "שקיעה", gradient: "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 30%, #f5af19 70%, #f12711 100%)" },
  { value: "forest", icon: "\u{1F332}", label: "יער", gradient: "linear-gradient(135deg, #0b3d0b 0%, #1b5e20 40%, #388e3c 80%, #1b5e20 100%)" },
  { value: "studio", icon: "\u{1F3A5}", label: "סטודיו", gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 80%, #1a1a2e 100%)" },
];

const colors: { value: ColorType; hex: string; label: string }[] = [
  { value: "gold", hex: "#FFD700", label: "זהב" },
  { value: "teal", hex: "#00A3E0", label: "תכלת" },
];

const fontSizes: { value: FontSizeType; label: string }[] = [
  { value: "small", label: "קטן" },
  { value: "medium", label: "בינוני" },
  { value: "large", label: "גדול" },
];

const textPositions: { value: TextPositionType; label: string }[] = [
  { value: "top", label: "למעלה" },
  { value: "center", label: "מרכז" },
  { value: "bottom", label: "למטה" },
];

/* ──────────────── Component ──────────────── */

export default function CreativeEditor({
  suggestion,
  userInfo,
  generatedImage,
  onGenerate,
  onSaveLocal,
  scriptIdx = 0,
}: CreativeEditorProps) {
  const defaultSubtitle = `שיווק מבוסס תדר - לידים מדויקים ל${userInfo.niche}`.slice(0, 80);
  const [mainText, setMainText] = useState(suggestion.main_text);
  const [subtitle, setSubtitle] = useState(defaultSubtitle);
  const [cta, setCta] = useState(suggestion.cta || "שלחו הודעה");
  const [designVision, setDesignVision] = useState("");
  const [background, setBackground] = useState<BackgroundType>(suggestion.background);
  const [color, setColor] = useState<ColorType>(suggestion.color);
  const [format, setFormat] = useState<FormatType>("story");
  const [fontSize, setFontSize] = useState<FontSizeType>("medium");
  const [textPosition, setTextPosition] = useState<TextPositionType>("top");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAiImage, setShowAiImage] = useState(false);

  // Which element is currently being edited on canvas
  const [editingField, setEditingField] = useState<"main" | "subtitle" | "cta" | null>(null);

  // Profile
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [profileImage, setProfileImage] = useState<string>("");
  const [displayName, setDisplayName] = useState(userInfo.name);
  const [displayRole, setDisplayRole] = useState(userInfo.role || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview ref for html2canvas export
  const previewRef = useRef<HTMLDivElement>(null);

  // Refs for contentEditable elements
  const mainTextRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Track changes after AI generation
  const [hasChanges, setHasChanges] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!!generatedImage);

  useEffect(() => {
    if (hasGenerated) setHasChanges(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainText, subtitle, cta, designVision, background, color, format, fontSize, textPosition, showProfileUpload, profileImage, displayName, displayRole]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setProfileImage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Sync contentEditable → state ── */
  const handleContentEditBlur = (field: "main" | "subtitle" | "cta", ref: React.RefObject<HTMLElement | null>) => {
    const text = ref.current?.innerText ?? "";
    if (field === "main") setMainText(text.slice(0, 120));
    else if (field === "subtitle") setSubtitle(text.slice(0, 80));
    else if (field === "cta") setCta(text.slice(0, 30));
    setEditingField(null);
  };

  /* ── AI generation (uses credits) ── */
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate({
        mainText, subtitle, cta, background, color, userInfo, format, fontSize, textPosition,
        showProfile: showProfileUpload,
        designVision: designVision || undefined,
        ...(showProfileUpload && {
          // Send a small flag instead of the full base64 data to avoid exceeding body size limits.
          // The API only checks !!profileImage to decide the prompt text.
          profileImage: profileImage ? "uploaded" : undefined,
          displayName,
          displayRole,
        }),
      });
      setHasGenerated(true);
      setHasChanges(false);
      setShowAiImage(true);
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Free PNG export via html2canvas ── */
  const handleExportPng = useCallback(async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    try {
      const el = previewRef.current;
      const w = 1080;
      const scale = w / el.offsetWidth;

      const canvas = await html2canvas(el, {
        scale,
        width: el.offsetWidth,
        height: el.offsetHeight,
        useCORS: true,
        backgroundColor: null,
      });

      const dataUrl = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `creative-${scriptIdx + 1}-${format}.png`;
      a.click();

      onSaveLocal?.(dataUrl, scriptIdx);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setIsExporting(false);
    }
  }, [format, scriptIdx, onSaveLocal]);

  const colorHex = color === "gold" ? "#FFD700" : "#00A3E0";
  const bgConfig = backgrounds.find((b) => b.value === background) || backgrounds[0];
  const aiImageSrc = generatedImage?.url || generatedImage?.base64;

  const fontSizeMap = {
    small: format === "story" ? "clamp(1rem, 3vw, 1.25rem)" : "clamp(0.875rem, 2.5vw, 1.1rem)",
    medium: format === "story" ? "clamp(1.25rem, 4vw, 1.6rem)" : "clamp(1rem, 3vw, 1.3rem)",
    large: format === "story" ? "clamp(1.5rem, 5vw, 2rem)" : "clamp(1.25rem, 3.5vw, 1.6rem)",
  };

  const positionMap: Record<TextPositionType, string> = {
    top: "flex-start",
    center: "center",
    bottom: "flex-end",
  };

  /* ── Editable element wrapper style ── */
  const editableStyle = (field: "main" | "subtitle" | "cta") => ({
    outline: editingField === field ? `2px solid ${colorHex}` : "none",
    borderRadius: "4px",
    cursor: "text",
    minWidth: "40px",
    minHeight: "1em",
  });

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
        <span className="font-semibold text-[var(--gold)] inline-flex items-center gap-1">
          <FBMLogo size={18} />
          FBM Studio
        </span>
        <span>מציע:</span>
        <span className="italic text-[var(--text-muted)]">{suggestion.reasoning}</span>
      </div>

      {suggestion.look_and_feel && (
        <div className="mb-4 p-3 bg-[var(--gold-soft)] border border-[var(--gold)]/30 rounded-[10px] text-sm text-[var(--text-secondary)]">
          <span className="font-bold text-[var(--gold)]">Look & Feel:</span> {suggestion.look_and_feel}
        </div>
      )}

      {/* Hint about direct editing */}
      <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-[10px] text-xs text-blue-700 dark:text-blue-300 text-center">
        לחץ על כל טקסט בתצוגה המקדימה כדי לערוך אותו ישירות על התמונה
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - Live preview */}
        <div className="lg:w-[55%] flex-shrink-0">
          <div className="sticky top-4 space-y-3">
            {/* Toggle: Live Preview / AI Image */}
            {aiImageSrc && (
              <div className="flex rounded-[10px] border border-[var(--card-border)] overflow-hidden text-sm">
                <button
                  type="button"
                  onClick={() => setShowAiImage(false)}
                  className={`flex-1 px-3 py-2 transition-colors cursor-pointer ${!showAiImage ? "bg-[var(--gold)] text-white font-semibold" : "bg-[var(--card-bg)] text-[var(--text-secondary)]"}`}
                >
                  תצוגה מקדימה
                </button>
                <button
                  type="button"
                  onClick={() => setShowAiImage(true)}
                  className={`flex-1 px-3 py-2 transition-colors cursor-pointer ${showAiImage ? "bg-[var(--gold)] text-white font-semibold" : "bg-[var(--card-bg)] text-[var(--text-secondary)]"}`}
                >
                  תמונת AI
                </button>
              </div>
            )}

            {/* Preview container */}
            <div className={`relative ${format === "story" ? "max-h-[65vh]" : ""}`}>
              {showAiImage && aiImageSrc ? (
                <div className={`${format === "story" ? "aspect-[9/16] max-h-[65vh]" : "aspect-square"} w-full rounded-2xl overflow-hidden border border-[var(--card-border)] bg-black`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={aiImageSrc}
                    alt="קריאטיב AI"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                /* Live HTML Preview - click to edit text directly */
                <div
                  ref={previewRef}
                  className={`${format === "story" ? "aspect-[9/16]" : "aspect-square"} w-full rounded-2xl overflow-hidden border-2 border-dashed border-[var(--card-border)] relative`}
                  style={{
                    background: bgConfig.gradient,
                    maxHeight: format === "story" ? "65vh" : "none",
                  }}
                >
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-black/35 pointer-events-none" />

                  {/* Content wrapper */}
                  <div
                    className="absolute inset-0 flex flex-col p-5"
                    style={{
                      justifyContent: positionMap[textPosition],
                      direction: "rtl",
                    }}
                  >
                    {/* Main text block - CENTERED */}
                    <div
                      className="rounded-xl px-4 py-3 text-center"
                      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                    >
                      {/* Main text - EDITABLE */}
                      <h2
                        ref={mainTextRef}
                        contentEditable
                        suppressContentEditableWarning
                        onFocus={() => setEditingField("main")}
                        onBlur={() => handleContentEditBlur("main", mainTextRef)}
                        className="font-bold leading-tight whitespace-pre-wrap"
                        style={{
                          color: colorHex,
                          fontSize: fontSizeMap[fontSize],
                          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                          textAlign: "center",
                          ...editableStyle("main"),
                        }}
                      >
                        {mainText || "לחץ כאן לכתוב כותרת"}
                      </h2>

                      {/* Subtitle - EDITABLE */}
                      <p
                        ref={subtitleRef}
                        contentEditable
                        suppressContentEditableWarning
                        onFocus={() => setEditingField("subtitle")}
                        onBlur={() => handleContentEditBlur("subtitle", subtitleRef)}
                        className="mt-2 opacity-90"
                        style={{
                          color: "#ffffff",
                          fontSize: "clamp(0.7rem, 2vw, 0.85rem)",
                          textAlign: "center",
                          ...editableStyle("subtitle"),
                        }}
                      >
                        {subtitle || "לחץ כאן לכתוב תת-כותרת"}
                      </p>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1 min-h-4" />

                    {/* CTA button - CENTERED & EDITABLE (above profile) */}
                    <div className="flex justify-center mb-3">
                      <div
                        ref={ctaRef}
                        contentEditable
                        suppressContentEditableWarning
                        onFocus={() => setEditingField("cta")}
                        onBlur={() => handleContentEditBlur("cta", ctaRef)}
                        className="px-6 py-2.5 rounded-full font-bold text-sm text-center"
                        style={{
                          backgroundColor: colorHex,
                          color: color === "gold" ? "#1a1a1a" : "#ffffff",
                          ...editableStyle("cta"),
                        }}
                      >
                        {cta || "שלחו הודעה"}
                      </div>
                    </div>

                    {/* Profile (below CTA, at very bottom) */}
                    {showProfileUpload && (
                      <div className="flex items-center justify-center gap-2">
                        {profileImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={profileImage}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                            style={{ border: `3px solid ${colorHex}` }}
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
                            style={{ border: `3px solid ${colorHex}` }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-white text-xs font-bold leading-tight">{displayName}</p>
                          <p className="text-white/70 text-[10px] leading-tight">{displayRole}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Loading overlay */}
                  {isGenerating && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 rounded-2xl">
                      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      <p className="text-white font-semibold mt-4 text-lg">יוצר תמונת AI...</p>
                      <p className="text-white/70 text-sm mt-1">~15 שניות</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Export buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExportPng}
                disabled={isExporting || showAiImage}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[var(--gold)] text-white rounded-[10px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isExporting ? "מייצא..." : "הורד PNG (חינם)"}
              </button>
              {aiImageSrc && showAiImage && (
                <a
                  href={aiImageSrc}
                  download={`creative-ai-${scriptIdx + 1}.png`}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[var(--success)] text-white rounded-[10px] hover:opacity-90 transition-opacity text-center cursor-pointer"
                >
                  הורד תמונת AI
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Editor panel */}
        <div className="lg:w-[45%] space-y-4 max-h-[85vh] lg:overflow-y-auto lg:pl-2">
          {/* Format */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              פורמט תמונה
            </label>
            <div className="flex gap-2">
              {(["feed", "story"] as FormatType[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`flex-1 px-3 py-2 rounded-[10px] border text-sm cursor-pointer transition-all ${
                    format === f
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  {f === "feed" ? "פיד 1:1" : "סטורי 9:16"}
                </button>
              ))}
            </div>
          </section>

          {/* Main Text */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              טקסט ראשי
            </label>
            <textarea
              value={mainText}
              onChange={(e) => {
                setMainText(e.target.value);
                if (mainTextRef.current) mainTextRef.current.innerText = e.target.value;
              }}
              placeholder="הטקסט שיופיע על התמונה..."
              maxLength={120}
              rows={2}
              className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
            />
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{mainText.length}/120</p>
          </section>

          {/* Subtitle */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              תת-כותרת
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => {
                setSubtitle(e.target.value);
                if (subtitleRef.current) subtitleRef.current.innerText = e.target.value;
              }}
              maxLength={80}
              placeholder="שיווק מבוסס תדר - לידים מדויקים ל..."
              className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
            />
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle.length}/80</p>
          </section>

          {/* CTA */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              קריאה לפעולה (CTA)
            </label>
            <input
              type="text"
              value={cta}
              onChange={(e) => {
                setCta(e.target.value);
                if (ctaRef.current) ctaRef.current.innerText = e.target.value;
              }}
              maxLength={30}
              placeholder="שלחו הודעה"
              className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
            />
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{cta.length}/30</p>
          </section>

          {/* Design Vision - AI instructions */}
          <section className="border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/20 rounded-[10px] p-3">
            <label className="block text-sm font-bold text-purple-700 dark:text-purple-300 mb-1.5">
              חזון עיצוב - הנחיות ל-AI
            </label>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 mb-2">
              תאר לבינה המלאכותית איך אתה רוצה שהתמונה תיראה. החזון שלך יקבל עדיפות בעת יצירת התמונה.
            </p>
            <textarea
              value={designVision}
              onChange={(e) => setDesignVision(e.target.value)}
              placeholder="למשל: אווירה חמה עם תאורה דרמטית, אדם עומד על במה מול קהל, צבעים כהים עם הדגשות זהב..."
              rows={3}
              className="w-full px-3 py-2 rounded-[10px] border border-purple-200 dark:border-purple-700 bg-white dark:bg-purple-950/30 text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all text-sm"
            />
          </section>

          {/* Background */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              סוג רקע
            </label>
            <div className="grid grid-cols-2 gap-2">
              {backgrounds.map((bg) => (
                <button
                  key={bg.value}
                  type="button"
                  onClick={() => setBackground(bg.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-[10px] border text-sm cursor-pointer transition-all ${
                    background === bg.value
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  <span>{bg.icon}</span>
                  <span>{bg.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Color */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              צבע
            </label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[10px] border text-sm cursor-pointer transition-all flex-1 ${
                    color === c.value
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] font-semibold"
                      : "border-[var(--card-border)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  <span
                    className="inline-block w-5 h-5 rounded-full border border-[var(--card-border)]"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-[var(--text-primary)]">{c.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Font Size */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              גודל טקסט
            </label>
            <div className="flex gap-2">
              {fontSizes.map((fs) => (
                <button
                  key={fs.value}
                  type="button"
                  onClick={() => setFontSize(fs.value)}
                  className={`flex-1 px-3 py-2 rounded-[10px] border text-sm cursor-pointer transition-all ${
                    fontSize === fs.value
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  {fs.label}
                </button>
              ))}
            </div>
          </section>

          {/* Text Position */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              מיקום טקסט
            </label>
            <div className="flex gap-2">
              {textPositions.map((tp) => (
                <button
                  key={tp.value}
                  type="button"
                  onClick={() => setTextPosition(tp.value)}
                  className={`flex-1 px-3 py-2 rounded-[10px] border text-sm cursor-pointer transition-all ${
                    textPosition === tp.value
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
          </section>

          {/* Profile Image Upload */}
          <section className="border border-[var(--card-border)] rounded-[10px] p-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[var(--text-primary)]">
                תמונה אישית
              </label>
              <button
                type="button"
                onClick={() => setShowProfileUpload(!showProfileUpload)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  showProfileUpload ? "bg-[var(--gold)]" : "bg-[var(--card-border)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showProfileUpload ? "-translate-x-6" : "-translate-x-1"
                  }`}
                />
              </button>
            </div>

            {showProfileUpload && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  {profileImage ? (
                    <div className="relative flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profileImage}
                        alt="תמונת פרופיל"
                        className="w-14 h-14 rounded-full object-cover border-2 border-[var(--gold)]"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 cursor-pointer"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[var(--content-bg)] flex items-center justify-center text-[var(--text-muted)] flex-shrink-0 border border-[var(--card-border)]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id={`profile-upload-${scriptIdx}`}
                    />
                    <label
                      htmlFor={`profile-upload-${scriptIdx}`}
                      className="inline-block px-3 py-1.5 text-xs font-medium text-[var(--gold)] bg-[var(--gold-soft)] rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {profileImage ? "החלף תמונה" : "העלה תמונה"}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">שם מלא</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={userInfo.name}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">תפקיד / תיאור</label>
                  <input
                    type="text"
                    value={displayRole}
                    onChange={(e) => setDisplayRole(e.target.value)}
                    placeholder={userInfo.role}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-all text-sm"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Generate with AI button */}
          <div className="pt-3 border-t border-[var(--card-border)]">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !mainText.trim() || !cta.trim()}
              className={`w-full h-12 text-base font-bold rounded-[10px] text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                hasGenerated && hasChanges
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isGenerating
                ? "יוצר תמונת AI... (~15 שניות)"
                : hasGenerated && hasChanges
                  ? "צור מחדש עם AI (1 קרדיט)"
                  : "צור תמונה עם AI (1 קרדיט)"}
            </button>
            <p className="text-xs text-[var(--text-muted)] text-center mt-2">
              התצוגה המקדימה ניתנת להורדה בחינם. רינדור AI יוצר תמונה ברזולוציה גבוהה.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
