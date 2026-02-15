"use client";

import { useState, useRef, useCallback } from "react";
import type {
  BackgroundType,
  ColorType,
  FontSizeType,
  FormatType,
  CreativeSuggestion,
} from "@/types";
import DraggableText from "./DraggableText";
import DraggableCTA from "./DraggableCTA";
import DraggableProfile from "./DraggableProfile";
import { exportCanvasToPng, renderCanvasToBase64 } from "./CanvasExport";
import NextImage from "next/image";

/* ──────────────── Types ──────────────── */

interface CanvasLayer {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  visible: boolean;
}

interface CanvasEditorProps {
  suggestion: CreativeSuggestion;
  userInfo: { name: string; role: string; niche: string };
  backgroundImage?: string | null; // base64 or URL of AI-generated background
  onGenerateBackground: (config: {
    background: BackgroundType;
    format?: FormatType;
    designVision?: string;
  }) => Promise<void>;
  onSaveToAlbum?: (base64: string, scriptIdx: number) => void;
  scriptIdx?: number;
}

/* ──────────────── Config ──────────────── */

const backgrounds: { value: BackgroundType; icon: string; label: string; gradient: string }[] = [
  { value: "lighthouse", icon: "\u{1F5FC}", label: "\u05DE\u05D2\u05D3\u05DC\u05D5\u05E8", gradient: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)" },
  { value: "mountain", icon: "\u26F0\uFE0F", label: "\u05D4\u05E8", gradient: "linear-gradient(135deg, #2b1055 0%, #5b3a8c 40%, #d4a843 100%)" },
  { value: "path", icon: "\u{1F6E4}\uFE0F", label: "\u05D3\u05E8\u05DA", gradient: "linear-gradient(135deg, #3e2723 0%, #8d6e63 50%, #d4a843 100%)" },
  { value: "office", icon: "\u{1F3E2}", label: "\u05DE\u05E9\u05E8\u05D3", gradient: "linear-gradient(135deg, #e8eaf0 0%, #bdc3c7 50%, #8e99a4 100%)" },
  { value: "city", icon: "\u{1F303}", label: "\u05E2\u05D9\u05E8", gradient: "linear-gradient(135deg, #141e30 0%, #243b55 50%, #4a6fa5 100%)" },
  { value: "sunset", icon: "\u{1F305}", label: "\u05E9\u05E7\u05D9\u05E2\u05D4", gradient: "linear-gradient(135deg, #ee9ca7 0%, #ffdde1 30%, #f5af19 70%, #f12711 100%)" },
  { value: "forest", icon: "\u{1F332}", label: "\u05D9\u05E2\u05E8", gradient: "linear-gradient(135deg, #0b3d0b 0%, #1b5e20 40%, #388e3c 80%, #1b5e20 100%)" },
  { value: "studio", icon: "\u{1F3A5}", label: "\u05E1\u05D8\u05D5\u05D3\u05D9\u05D5", gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 80%, #1a1a2e 100%)" },
];

const colors: { value: ColorType; hex: string; label: string }[] = [
  { value: "gold", hex: "#FFD700", label: "\u05D6\u05D4\u05D1" },
  { value: "teal", hex: "#00A3E0", label: "\u05EA\u05DB\u05DC\u05EA" },
];

const TEXT_COLORS = [
  { value: "#ffffff", label: "\u05DC\u05D1\u05DF" },
  { value: "#FFD700", label: "\u05D6\u05D4\u05D1" },
  { value: "#1a1a1a", label: "\u05E9\u05D7\u05D5\u05E8" },
];

const fontSizes: { value: FontSizeType; label: string; px: number }[] = [
  { value: "small", label: "\u05E7\u05D8\u05DF", px: 18 },
  { value: "medium", label: "\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9", px: 24 },
  { value: "large", label: "\u05D2\u05D3\u05D5\u05DC", px: 32 },
];

const CTA_SIZES = [
  { label: "\u05E7\u05D8\u05DF", px: 12 },
  { label: "\u05E8\u05D2\u05D9\u05DC", px: 14 },
  { label: "\u05D2\u05D3\u05D5\u05DC", px: 18 },
];

/* ──────────────── Component ──────────────── */

export default function CanvasEditor({
  suggestion,
  userInfo,
  backgroundImage,
  onGenerateBackground,
  onSaveToAlbum,
  scriptIdx = 0,
}: CanvasEditorProps) {
  // Format
  const [format, setFormat] = useState<FormatType>("story");

  // Background
  const [background, setBackground] = useState<BackgroundType>(suggestion.background);
  const [designVision, setDesignVision] = useState("");

  // Accent color
  const [color, setColor] = useState<ColorType>(suggestion.color);
  const colorHex = color === "gold" ? "#FFD700" : "#00A3E0";

  // Font size
  const [fontSize, setFontSize] = useState<FontSizeType>("medium");
  const fontPx = fontSizes.find((f) => f.value === fontSize)?.px ?? 24;

  // Text color
  const [textColor, setTextColor] = useState("#ffffff");

  // Overlay opacity
  const [overlayOpacity, setOverlayOpacity] = useState(50);

  // CTA size
  const [ctaSizeIdx, setCtaSizeIdx] = useState(1);
  const ctaPx = CTA_SIZES[ctaSizeIdx]?.px ?? 14;

  // Layers state
  const [headline, setHeadline] = useState<CanvasLayer>({
    text: suggestion.main_text,
    x: 5,
    y: 8,
    fontSize: fontPx,
    color: textColor,
    visible: true,
  });

  const [subtitleLayer, setSubtitleLayer] = useState<CanvasLayer>({
    text: `\u05E9\u05D9\u05D5\u05D5\u05E7 \u05DE\u05D1\u05D5\u05E1\u05E1 \u05EA\u05D3\u05E8 - \u05DC\u05D9\u05D3\u05D9\u05DD \u05DE\u05D3\u05D5\u05D9\u05E7\u05D9\u05DD \u05DC${userInfo.niche}`.slice(0, 80),
    x: 5,
    y: 22,
    fontSize: 14,
    color: "#ffffff",
    visible: true,
  });

  const [ctaLayer, setCtaLayer] = useState({
    text: suggestion.cta || "\u05E9\u05DC\u05D7\u05D5 \u05D4\u05D5\u05D3\u05E2\u05D4",
    x: 25,
    y: 78,
    visible: true,
  });

  const [profileLayer, setProfileLayer] = useState({
    x: 30,
    y: 88,
    visible: false,
  });

  // Profile details
  const [profileImage, setProfileImage] = useState("");
  const [displayName, setDisplayName] = useState(userInfo.name);
  const [displayRole, setDisplayRole] = useState(userInfo.role || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Canvas ref for export
  const canvasRef = useRef<HTMLDivElement>(null);

  const bgConfig = backgrounds.find((b) => b.value === background) || backgrounds[0];

  /* ── Generate background only ── */
  const handleGenerateBackground = async () => {
    setIsGenerating(true);
    try {
      await onGenerateBackground({
        background,
        format,
        designVision: designVision || undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /* ── Export PNG ── */
  const handleExportPng = useCallback(async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      await exportCanvasToPng(canvasRef.current, `creative-${scriptIdx + 1}-${format}.png`);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setIsExporting(false);
    }
  }, [format, scriptIdx]);

  /* ── Save to album ── */
  const handleSaveToAlbum = useCallback(async () => {
    if (!canvasRef.current || !onSaveToAlbum) return;
    setIsExporting(true);
    try {
      const base64 = await renderCanvasToBase64(canvasRef.current);
      onSaveToAlbum(base64, scriptIdx);
    } catch (e) {
      console.error("Album save error:", e);
    } finally {
      setIsExporting(false);
    }
  }, [scriptIdx, onSaveToAlbum]);

  /* ── Profile image upload ── */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const max = 300;
        let w = img.width;
        let h = img.height;
        if (w > max || h > max) {
          const ratio = Math.min(max / w, max / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d")?.drawImage(img, 0, 0, w, h);
        setProfileImage(c.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  /* ── Sync font size & text color to headline layer ── */
  const updateFontSize = (fs: FontSizeType) => {
    setFontSize(fs);
    const px = fontSizes.find((f) => f.value === fs)?.px ?? 24;
    setHeadline((prev) => ({ ...prev, fontSize: px }));
  };

  const updateTextColor = (c: string) => {
    setTextColor(c);
    setHeadline((prev) => ({ ...prev, color: c }));
  };

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-4">
        <span className="font-semibold text-[var(--gold)] inline-flex items-center gap-1">
          <NextImage src="/logo-fbm.png" alt="FBM" width={18} height={18} className="rounded" />
          FBM Studio
        </span>
        <span>\u05DE\u05E6\u05D9\u05E2:</span>
        <span className="italic text-[var(--text-muted)]">{suggestion.reasoning}</span>
      </div>

      {suggestion.look_and_feel && (
        <div className="mb-4 p-3 bg-[var(--gold-soft)] border border-[var(--gold)]/30 rounded-[10px] text-sm text-[var(--text-secondary)]">
          <span className="font-bold text-[var(--gold)]">Look & Feel:</span> {suggestion.look_and_feel}
        </div>
      )}

      {/* Hint */}
      <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-[10px] text-xs text-blue-700 dark:text-blue-300 text-center">
        \u05D2\u05E8\u05D5\u05E8 \u05D0\u05DC\u05DE\u05E0\u05D8\u05D9\u05DD \u05E2\u05DC \u05D4\u05E7\u05E0\u05D1\u05E1 \u05DB\u05D3\u05D9 \u05DC\u05D4\u05D6\u05D9\u05D6 \u05D0\u05D5\u05EA\u05DD. \u05E9\u05E0\u05D4 \u05D8\u05E7\u05E1\u05D8 \u05D1\u05E4\u05D0\u05E0\u05DC \u05D1\u05E6\u05D3 \u2014 \u05D4\u05E9\u05D9\u05E0\u05D5\u05D9 \u05DE\u05D9\u05D9\u05D3\u05D9!
      </div>

      {/* Two-column layout: Canvas left, Controls right */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ═══════ LEFT: Canvas ═══════ */}
        <div className="lg:w-[55%] flex-shrink-0">
          <div className="sticky top-4 space-y-3">
            {/* The Canvas */}
            <div
              ref={canvasRef}
              className="relative overflow-hidden rounded-2xl border-2 border-[var(--card-border)]"
              style={{
                aspectRatio: format === "story" ? "9/16" : "1/1",
                maxWidth: format === "story" ? "400px" : "500px",
                width: "100%",
              }}
            >
              {/* Layer 1: Background */}
              {backgroundImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={backgroundImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: bgConfig.gradient }}
                />
              )}

              {/* Layer 2: Dark overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to bottom, rgba(0,0,0,${overlayOpacity / 100 * 0.7}) 0%, transparent 35%, transparent 65%, rgba(0,0,0,${overlayOpacity / 100 * 0.6}) 100%)`,
                }}
              />

              {/* Layer 3: Headline — draggable */}
              <DraggableText
                text={headline.text}
                x={headline.x}
                y={headline.y}
                fontSize={headline.fontSize}
                color={headline.color}
                fontWeight="bold"
                visible={headline.visible}
                onDragEnd={(nx, ny) => setHeadline((prev) => ({ ...prev, x: nx, y: ny }))}
              />

              {/* Layer 4: Subtitle — draggable */}
              <DraggableText
                text={subtitleLayer.text}
                x={subtitleLayer.x}
                y={subtitleLayer.y}
                fontSize={subtitleLayer.fontSize}
                color={subtitleLayer.color}
                fontWeight="normal"
                visible={subtitleLayer.visible}
                onDragEnd={(nx, ny) => setSubtitleLayer((prev) => ({ ...prev, x: nx, y: ny }))}
              />

              {/* Layer 5: CTA — draggable */}
              <DraggableCTA
                text={ctaLayer.text}
                x={ctaLayer.x}
                y={ctaLayer.y}
                bgColor={colorHex}
                textColor={color === "gold" ? "#1a1a1a" : "#ffffff"}
                fontSize={ctaPx}
                visible={ctaLayer.visible}
                onDragEnd={(nx, ny) => setCtaLayer((prev) => ({ ...prev, x: nx, y: ny }))}
              />

              {/* Layer 6: Profile — draggable */}
              <DraggableProfile
                name={displayName}
                role={displayRole}
                image={profileImage || undefined}
                accentColor={colorHex}
                x={profileLayer.x}
                y={profileLayer.y}
                visible={profileLayer.visible}
                onDragEnd={(nx, ny) => setProfileLayer((prev) => ({ ...prev, x: nx, y: ny }))}
              />

              {/* Generating overlay */}
              {isGenerating && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-white font-semibold mt-4 text-lg">\u05D9\u05D5\u05E6\u05E8 \u05E8\u05E7\u05E2 AI...</p>
                  <p className="text-white/70 text-sm mt-1">~15 \u05E9\u05E0\u05D9\u05D5\u05EA</p>
                </div>
              )}

              {/* Placeholder when no background */}
              {!backgroundImage && !isGenerating && (
                <button
                  type="button"
                  onClick={handleGenerateBackground}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-transparent cursor-pointer group"
                >
                  <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">&#10024;</span>
                  <span className="text-white/70 text-sm font-semibold">\u05E6\u05D5\u05E8 \u05E8\u05E7\u05E2 AI</span>
                </button>
              )}
            </div>

            {/* Export buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExportPng}
                disabled={isExporting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[var(--gold)] text-white rounded-[10px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {isExporting ? "\u05DE\u05D9\u05D9\u05E6\u05D0..." : "\u05D4\u05D5\u05E8\u05D3 PNG"}
              </button>
              {onSaveToAlbum && (
                <button
                  onClick={handleSaveToAlbum}
                  disabled={isExporting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[var(--success)] text-white rounded-[10px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  \u05D4\u05D5\u05E1\u05E3 \u05DC\u05D0\u05DC\u05D1\u05D5\u05DD
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ RIGHT: Editor Panel ═══════ */}
        <div className="lg:w-[45%] space-y-4 max-h-[85vh] lg:overflow-y-auto lg:pl-2 sidebar-scroll">
          {/* Format */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              \u05E4\u05D5\u05E8\u05DE\u05D8 \u05EA\u05DE\u05D5\u05E0\u05D4
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
                  {f === "feed" ? "\u05E4\u05D9\u05D3 1:1" : "\u05E1\u05D8\u05D5\u05E8\u05D9 9:16"}
                </button>
              ))}
            </div>
          </section>

          {/* Headline text */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              \u05DB\u05D5\u05EA\u05E8\u05EA \u05E8\u05D0\u05E9\u05D9\u05EA
            </label>
            <textarea
              value={headline.text}
              onChange={(e) => setHeadline((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="\u05D4\u05D8\u05E7\u05E1\u05D8 \u05E9\u05D9\u05D5\u05E4\u05D9\u05E2 \u05E2\u05DC \u05D4\u05EA\u05DE\u05D5\u05E0\u05D4..."
              maxLength={120}
              rows={2}
              className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
            />
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{headline.text.length}/120</p>
          </section>

          {/* Subtitle */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-[var(--text-primary)]">
                \u05EA\u05EA-\u05DB\u05D5\u05EA\u05E8\u05EA
              </label>
              <button
                type="button"
                onClick={() => setSubtitleLayer((prev) => ({ ...prev, visible: !prev.visible }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  subtitleLayer.visible ? "bg-[var(--gold)]" : "bg-[var(--card-border)]"
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  subtitleLayer.visible ? "-translate-x-4.5" : "-translate-x-0.5"
                }`} />
              </button>
            </div>
            {subtitleLayer.visible && (
              <>
                <input
                  type="text"
                  value={subtitleLayer.text}
                  onChange={(e) => setSubtitleLayer((prev) => ({ ...prev, text: e.target.value }))}
                  maxLength={80}
                  placeholder="\u05EA\u05EA-\u05DB\u05D5\u05EA\u05E8\u05EA..."
                  className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
                />
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitleLayer.text.length}/80</p>
              </>
            )}
          </section>

          {/* CTA */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-[var(--text-primary)]">
                \u05E7\u05E8\u05D9\u05D0\u05D4 \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4 (CTA)
              </label>
              <button
                type="button"
                onClick={() => setCtaLayer((prev) => ({ ...prev, visible: !prev.visible }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  ctaLayer.visible ? "bg-[var(--gold)]" : "bg-[var(--card-border)]"
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  ctaLayer.visible ? "-translate-x-4.5" : "-translate-x-0.5"
                }`} />
              </button>
            </div>
            {ctaLayer.visible && (
              <>
                <input
                  type="text"
                  value={ctaLayer.text}
                  onChange={(e) => setCtaLayer((prev) => ({ ...prev, text: e.target.value }))}
                  maxLength={30}
                  placeholder="\u05E9\u05DC\u05D7\u05D5 \u05D4\u05D5\u05D3\u05E2\u05D4"
                  className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
                />
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{ctaLayer.text.length}/30</p>
              </>
            )}
          </section>

          {/* CTA size */}
          {ctaLayer.visible && (
            <section>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                \u05D2\u05D5\u05D3\u05DC CTA
              </label>
              <div className="flex gap-2">
                {CTA_SIZES.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCtaSizeIdx(i)}
                    className={`flex-1 px-3 py-2 rounded-[10px] border text-sm cursor-pointer transition-all ${
                      ctaSizeIdx === i
                        ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                        : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Overlay opacity */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              Overlay \u05E9\u05E7\u05D9\u05E4\u05D5\u05EA ({overlayOpacity}%)
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(Number(e.target.value))}
              className="w-full accent-[var(--gold)]"
            />
          </section>

          {/* Text color */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              \u05E6\u05D1\u05E2 \u05D8\u05E7\u05E1\u05D8
            </label>
            <div className="flex gap-2">
              {TEXT_COLORS.map((tc) => (
                <button
                  key={tc.value}
                  type="button"
                  onClick={() => updateTextColor(tc.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[10px] border text-sm cursor-pointer transition-all flex-1 ${
                    textColor === tc.value
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] font-semibold"
                      : "border-[var(--card-border)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  <span
                    className="inline-block w-5 h-5 rounded-full border border-[var(--card-border)]"
                    style={{ backgroundColor: tc.value }}
                  />
                  <span className="text-[var(--text-primary)]">{tc.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Font Size */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              \u05D2\u05D5\u05D3\u05DC \u05D8\u05E7\u05E1\u05D8
            </label>
            <div className="flex gap-2">
              {fontSizes.map((fs) => (
                <button
                  key={fs.value}
                  type="button"
                  onClick={() => updateFontSize(fs.value)}
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

          {/* Accent Color */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              \u05E6\u05D1\u05E2 \u05D0\u05E7\u05E1\u05E0\u05D8
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

          {/* Background type */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              \u05E1\u05D5\u05D2 \u05E8\u05E7\u05E2
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

          {/* Design Vision */}
          <section className="border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/20 rounded-[10px] p-3">
            <label className="block text-sm font-bold text-purple-700 dark:text-purple-300 mb-1.5">
              \u05D7\u05D6\u05D5\u05DF \u05E2\u05D9\u05E6\u05D5\u05D1 - \u05D4\u05E0\u05D7\u05D9\u05D5\u05EA \u05DC-AI
            </label>
            <textarea
              value={designVision}
              onChange={(e) => setDesignVision(e.target.value)}
              placeholder="\u05DC\u05DE\u05E9\u05DC: \u05D0\u05D5\u05D5\u05D9\u05E8\u05D4 \u05D7\u05DE\u05D4 \u05E2\u05DD \u05EA\u05D0\u05D5\u05E8\u05D4 \u05D3\u05E8\u05DE\u05D8\u05D9\u05EA, \u05E6\u05D1\u05E2\u05D9\u05DD \u05DB\u05D4\u05D9\u05DD \u05E2\u05DD \u05D4\u05D3\u05D2\u05E9\u05D5\u05EA \u05D6\u05D4\u05D1..."
              rows={2}
              className="w-full px-3 py-2 rounded-[10px] border border-purple-200 dark:border-purple-700 bg-white dark:bg-purple-950/30 text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all text-sm"
            />
          </section>

          {/* Profile */}
          <section className="border border-[var(--card-border)] rounded-[10px] p-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[var(--text-primary)]">
                \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D0\u05D9\u05E9\u05D9
              </label>
              <button
                type="button"
                onClick={() => setProfileLayer((prev) => ({ ...prev, visible: !prev.visible }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  profileLayer.visible ? "bg-[var(--gold)]" : "bg-[var(--card-border)]"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  profileLayer.visible ? "-translate-x-6" : "-translate-x-1"
                }`} />
              </button>
            </div>

            {profileLayer.visible && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  {profileImage ? (
                    <div className="relative flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profileImage}
                        alt="\u05EA\u05DE\u05D5\u05E0\u05EA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC"
                        className="w-14 h-14 rounded-full object-cover border-2 border-[var(--gold)]"
                      />
                      <button
                        type="button"
                        onClick={() => { setProfileImage(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
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
                      id={`canvas-profile-upload-${scriptIdx}`}
                    />
                    <label
                      htmlFor={`canvas-profile-upload-${scriptIdx}`}
                      className="inline-block px-3 py-1.5 text-xs font-medium text-[var(--gold)] bg-[var(--gold-soft)] rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {profileImage ? "\u05D4\u05D7\u05DC\u05E3 \u05EA\u05DE\u05D5\u05E0\u05D4" : "\u05D4\u05E2\u05DC\u05D4 \u05EA\u05DE\u05D5\u05E0\u05D4"}
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">\u05E9\u05DD \u05DE\u05DC\u05D0</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={userInfo.name}
                    className="w-full px-3 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">\u05EA\u05E4\u05E7\u05D9\u05D3 / \u05EA\u05D9\u05D0\u05D5\u05E8</label>
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

          {/* Generate background button */}
          <div className="pt-3 border-t border-[var(--card-border)] space-y-2">
            <button
              onClick={handleGenerateBackground}
              disabled={isGenerating}
              className={`w-full h-12 text-base font-bold rounded-[10px] text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                backgroundImage
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isGenerating
                ? "\u05D9\u05D5\u05E6\u05E8 \u05E8\u05E7\u05E2 AI... (~15 \u05E9\u05E0\u05D9\u05D5\u05EA)"
                : backgroundImage
                  ? "\u05E6\u05D5\u05E8 \u05E8\u05E7\u05E2 \u05DE\u05D7\u05D3\u05E9 (1 \u05E7\u05E8\u05D3\u05D9\u05D8)"
                  : "\u05E6\u05D5\u05E8 \u05E8\u05E7\u05E2 AI (1 \u05E7\u05E8\u05D3\u05D9\u05D8)"}
            </button>
            <p className="text-xs text-[var(--text-muted)] text-center">
              \u05E9\u05D9\u05E0\u05D5\u05D9 \u05D8\u05E7\u05E1\u05D8, \u05E6\u05D1\u05E2, \u05D2\u05D5\u05D3\u05DC, \u05DE\u05D9\u05E7\u05D5\u05DD \u2014 \u05DE\u05D9\u05D9\u05D3\u05D9, \u05D1\u05DC\u05D9 API. \u05E8\u05E7 &quot;\u05E6\u05D5\u05E8 \u05E8\u05E7\u05E2&quot; \u05E7\u05D5\u05E8\u05D0 \u05DC-AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
