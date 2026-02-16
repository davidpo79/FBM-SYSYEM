"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import TemplatePreview from "@/components/creatives/TemplatePreview";
import { TEMPLATES, suggestTemplate } from "@/components/creatives/templates";

import type { CreativeSuggestion, FormatType } from "@/types";

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
}

export default function CreativePage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const {
    project,
    scripts,
    selectedNiche,
    generatedImages,
    setGeneratedImages,
  } = useProject();

  const [creativeError, setCreativeError] = useState("");
  const [scriptCreatives, setScriptCreatives] = useState<Record<number, ScriptCreative>>({});
  const [isGeneratingBg, setIsGeneratingBg] = useState<Record<number, boolean>>({});

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
      templateId: "dark-gold",
      headline: "",
      subtitle: "",
      cta: "",
      format: "story" as FormatType,
    };
  };

  /* ── One Click Magic: analyze + auto-template ── */
  const handleCreateCreative = useCallback(
    async (scriptIdx: number) => {
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

        setScriptCreatives((prev) => ({
          ...prev,
          [scriptIdx]: {
            state: "ready",
            suggestion,
            templateId,
            headline: suggestion.main_text,
            subtitle: `שיווק מבוסס תדר — לידים מדויקים ל${selectedNiche?.name || ""}`.slice(0, 80),
            cta: suggestion.cta || "שלחו הודעה",
            format: "story",
          },
        }));
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
    [scripts, selectedNiche],
  );

  /* ── Change template for a script ── */
  const handleChangeTemplate = useCallback((scriptIdx: number, templateId: string) => {
    setScriptCreatives((prev) => ({
      ...prev,
      [scriptIdx]: { ...prev[scriptIdx], templateId },
    }));
  }, []);

  /* ── Update text fields ── */
  const updateField = useCallback((scriptIdx: number, field: "headline" | "subtitle" | "cta" | "format" | "designVision", value: string) => {
    setScriptCreatives((prev) => ({
      ...prev,
      [scriptIdx]: { ...prev[scriptIdx], [field]: value },
    }));
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
        } catch (e) {
          console.error("localStorage save failed:", e);
          setCreativeError("שגיאה בשמירה לאלבום — נפח האחסון מלא. נסה להוריד PNG ישירות.");
        }
        return next;
      });
    },
    [albumStorageKey],
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
                    onClick={() => handleCreateCreative(idx)}
                    className="btn-gold !py-3 !px-8 text-base"
                  >
                    ✨ צור קריאייטיב
                  </button>
                </div>
              )}

              {/* ── State: ANALYZING ── */}
              {creative.state === "analyzing" && (
                <div className="p-8 text-center">
                  <CountdownTimer seconds={5} />
                  <p className="text-sm text-[var(--text-muted)] mt-3">
                    FBM Studio מנתח את התסריט ומציע קריאטיב...
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
                        headline={creative.headline}
                        subtitle={creative.subtitle}
                        cta={creative.cta}
                        format={creative.format}
                        customBackground={creative.customBackground}
                        onSaveToAlbum={handleSaveToAlbum}
                        scriptIdx={idx}
                      />
                    </div>

                    {/* RIGHT: Edit panel */}
                    <div className="lg:w-[45%] space-y-4 lg:max-h-[80vh] lg:overflow-y-auto lg:pr-1">
                      {/* Headline */}
                      <div>
                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                          כותרת
                        </label>
                        <textarea
                          value={creative.headline}
                          onChange={(e) => updateField(idx, "headline", e.target.value)}
                          maxLength={120}
                          rows={2}
                          className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
                        />
                      </div>

                      {/* Subtitle */}
                      <div>
                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                          תת-כותרת
                        </label>
                        <input
                          type="text"
                          value={creative.subtitle}
                          onChange={(e) => updateField(idx, "subtitle", e.target.value)}
                          maxLength={80}
                          className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
                        />
                      </div>

                      {/* CTA */}
                      <div>
                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                          CTA
                        </label>
                        <input
                          type="text"
                          value={creative.cta}
                          onChange={(e) => updateField(idx, "cta", e.target.value)}
                          maxLength={30}
                          className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
                        />
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

                      {/* Design Vision — AI prompt for background */}
                      <div>
                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                          הנחיה לרקע AI (אופציונלי)
                        </label>
                        <textarea
                          value={creative.designVision || ""}
                          onChange={(e) => updateField(idx, "designVision", e.target.value)}
                          placeholder="למשל: אווירה חמה עם תאורה דרמטית, צבעים כהים עם הדגשות זהב..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
                        />
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
                              imagePrompt: creative.suggestion?.image_prompt || "",
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

                      {/* Upload custom background */}
                      <label className="block w-full py-3 rounded-xl border-2 border-dashed border-[var(--card-border)] text-center text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all cursor-pointer">
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
            onClick={() => router.push(`/project/${projectId}/copy`)}
            className="mt-4 btn-gold text-lg !px-8 !py-3"
          >
            המשך לקופי למודעות
          </button>
        </div>
      )}
    </div>
  );
}
