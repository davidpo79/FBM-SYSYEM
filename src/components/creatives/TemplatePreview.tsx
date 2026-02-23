"use client";

import { useRef, useCallback, useState } from "react";
import type { CreativeTemplate } from "./templates";
import type { FormatType } from "@/types";
import DraggableText from "./DraggableText";
import DraggableCTA from "./DraggableCTA";
import DraggableProfile from "./DraggableProfile";
import { exportCanvasToPng, renderCanvasToBase64 } from "./CanvasExport";

export interface TextStyleProps {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string; // "normal" | "italic"
  textDecoration?: string; // "none" | "underline"
  color?: string; // text color override
}

interface TemplatePreviewProps {
  template: CreativeTemplate;
  headline: string;
  subtitle: string;
  cta: string;
  format: FormatType;
  customBackground?: string; // base64 from upload or AI
  onSaveToAlbum?: (base64: string, scriptIdx: number) => void;
  scriptIdx: number;
  ownerPhoto?: string;
  ownerName?: string;
  ownerTitle?: string;
  headlineStyle?: TextStyleProps;
  subtitleStyle?: TextStyleProps;
}

export default function TemplatePreview({
  template,
  headline,
  subtitle,
  cta,
  format,
  customBackground,
  onSaveToAlbum,
  scriptIdx,
  ownerPhoto,
  ownerName,
  ownerTitle,
  headlineStyle,
  subtitleStyle,
}: TemplatePreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Draggable positions
  const [headlinePos, setHeadlinePos] = useState({ x: template.headline.x, y: template.headline.y });
  const [subtitlePos, setSubtitlePos] = useState({ x: template.subtitle.x, y: template.subtitle.y });
  const [ctaPos, setCtaPos] = useState({ x: template.cta.x, y: template.cta.y });
  const [profilePos, setProfilePos] = useState({ x: 60, y: 82 });

  const handleExportPng = useCallback(async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      await exportCanvasToPng(canvasRef.current, `creative-${scriptIdx + 1}-${format}.png`);
    } finally {
      setIsExporting(false);
    }
  }, [format, scriptIdx]);

  const handleSaveToAlbum = useCallback(async () => {
    if (!canvasRef.current || !onSaveToAlbum) return;
    setIsExporting(true);
    try {
      const base64 = await renderCanvasToBase64(canvasRef.current);
      onSaveToAlbum(base64, scriptIdx);
    } finally {
      setIsExporting(false);
    }
  }, [scriptIdx, onSaveToAlbum]);

  // Render decorations
  const renderDecorations = () => {
    return template.decorations.map((dec, i) => {
      if (dec.type === "line") {
        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              right: `${dec.x}%`,
              top: `${dec.y}%`,
              width: dec.width,
              height: dec.height,
              backgroundColor: dec.color,
            }}
          />
        );
      }
      if (dec.type === "corner-frame") {
        const s = dec.size;
        const t = dec.thickness;
        return (
          <div key={i} className="absolute inset-0 pointer-events-none">
            {/* Top-right */}
            <div style={{ position: "absolute", top: 12, right: 12, width: s, height: t, backgroundColor: dec.color }} />
            <div style={{ position: "absolute", top: 12, right: 12, width: t, height: s, backgroundColor: dec.color }} />
            {/* Top-left */}
            <div style={{ position: "absolute", top: 12, left: 12, width: s, height: t, backgroundColor: dec.color }} />
            <div style={{ position: "absolute", top: 12, left: 12, width: t, height: s, backgroundColor: dec.color }} />
            {/* Bottom-right */}
            <div style={{ position: "absolute", bottom: 12, right: 12, width: s, height: t, backgroundColor: dec.color }} />
            <div style={{ position: "absolute", bottom: 12, right: 12, width: t, height: s, backgroundColor: dec.color }} />
            {/* Bottom-left */}
            <div style={{ position: "absolute", bottom: 12, left: 12, width: s, height: t, backgroundColor: dec.color }} />
            <div style={{ position: "absolute", bottom: 12, left: 12, width: t, height: s, backgroundColor: dec.color }} />
          </div>
        );
      }
      if (dec.type === "bottom-bar") {
        return (
          <div
            key={i}
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{ height: dec.height, backgroundColor: dec.color }}
          />
        );
      }
      if (dec.type === "circle-glow") {
        return (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              right: `${dec.x}%`,
              top: `${dec.y}%`,
              width: dec.size,
              height: dec.size,
              backgroundColor: dec.color,
              opacity: dec.opacity,
              filter: "blur(40px)",
            }}
          />
        );
      }
      if (dec.type === "vignette") {
        return (
          <div
            key={i}
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: `inset 0 0 100px rgba(0,0,0,${dec.intensity})`,
            }}
          />
        );
      }
      return null;
    });
  };

  const showProfile = !!(ownerName || ownerPhoto);

  return (
    <div>
      {/* The Canvas */}
      <div
        ref={canvasRef}
        className="relative overflow-hidden rounded-2xl border-2 border-[var(--card-border)] mx-auto"
        style={{
          aspectRatio: format === "story" ? "9 / 16" : "1 / 1",
          width: "100%",
          maxWidth: format === "story" ? "450px" : "500px",
          maxHeight: "70vh",
        }}
      >
        {/* Layer 1: Background — custom image or template gradient */}
        {customBackground ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={customBackground}
            alt=""
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%", objectFit: "cover",
            }}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: template.background }} />
        )}

        {/* Layer 2: Overlay */}
        {template.overlay !== "none" && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: template.overlay }} />
        )}

        {/* Layer 3: Decorations */}
        {renderDecorations()}

        {/* Layer 4: Headline — draggable */}
        <DraggableText
          text={headline}
          x={headlinePos.x}
          y={headlinePos.y}
          fontSize={headlineStyle?.fontSize ?? template.headline.fontSize}
          color={headlineStyle?.color ?? template.headline.color}
          fontWeight={headlineStyle?.fontWeight ?? template.headline.fontWeight}
          fontFamily={headlineStyle?.fontFamily}
          fontStyle={headlineStyle?.fontStyle}
          textDecoration={headlineStyle?.textDecoration}
          visible={!!headline}
          onDragEnd={(nx, ny) => setHeadlinePos({ x: nx, y: ny })}
          maxWidth={template.headline.maxWidth}
          textShadow={template.headline.textShadow}
          textAlign={template.headline.textAlign}
          lineHeight={template.headline.lineHeight}
        />

        {/* Layer 5: Subtitle — draggable */}
        <DraggableText
          text={subtitle}
          x={subtitlePos.x}
          y={subtitlePos.y}
          fontSize={subtitleStyle?.fontSize ?? template.subtitle.fontSize}
          color={subtitleStyle?.color ?? template.subtitle.color}
          fontWeight={subtitleStyle?.fontWeight ?? (template.subtitle.fontWeight || "normal")}
          fontFamily={subtitleStyle?.fontFamily}
          fontStyle={subtitleStyle?.fontStyle}
          textDecoration={subtitleStyle?.textDecoration}
          maxWidth={template.subtitle.maxWidth || "85%"}
          textShadow={template.subtitle.textShadow}
          textAlign={template.subtitle.textAlign || "center"}
          lineHeight={template.subtitle.lineHeight || 1.3}
          visible={!!subtitle}
          onDragEnd={(nx, ny) => setSubtitlePos({ x: nx, y: ny })}
        />

        {/* Layer 6: CTA — draggable */}
        <DraggableCTA
          text={cta}
          x={ctaPos.x}
          y={ctaPos.y}
          bgColor={template.cta.bgColor}
          textColor={template.cta.textColor}
          fontSize={template.cta.fontSize}
          visible={!!cta}
          borderRadius={template.cta.borderRadius}
          padding={template.cta.padding}
          shadow={template.cta.shadow}
          onDragEnd={(nx, ny) => setCtaPos({ x: nx, y: ny })}
        />

        {/* Layer 7: Owner Profile — draggable */}
        {showProfile && (
          <DraggableProfile
            name={ownerName || ""}
            role={ownerTitle || ""}
            image={ownerPhoto}
            accentColor={template.cta.bgColor}
            x={profilePos.x}
            y={profilePos.y}
            visible={true}
            onDragEnd={(nx, ny) => setProfilePos({ x: nx, y: ny })}
          />
        )}
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 mt-3 max-w-[500px] mx-auto">
        <button
          onClick={handleExportPng}
          disabled={isExporting}
          className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[var(--gold)] text-white rounded-[10px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
        >
          {isExporting ? "מייצא..." : "📥 הורד PNG"}
        </button>
        {onSaveToAlbum && (
          <button
            onClick={handleSaveToAlbum}
            disabled={isExporting}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[var(--success)] text-white rounded-[10px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            📸 הוסף לאלבום
          </button>
        )}
      </div>
    </div>
  );
}
