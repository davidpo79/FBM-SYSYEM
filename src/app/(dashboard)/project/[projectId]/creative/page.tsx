"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import CanvasEditor from "@/components/creatives/CanvasEditor";
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
        {remaining > 0 ? "\u05E9\u05E0\u05D9\u05D5\u05EA \u05DC\u05E1\u05D9\u05D5\u05DD \u05D4\u05DE\u05E9\u05D5\u05E2\u05E8" : "\u05E2\u05D5\u05D3 \u05E8\u05D2\u05E2..."}
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
  customBackground?: string; // from upload or AI
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
  const [advancedOpenIdx, setAdvancedOpenIdx] = useState<number | null>(null);

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
    const parts = raw.split(/(?=## \u05EA\u05E1\u05E8\u05D9\u05D8 \d)/);
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

      // Set analyzing state
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

        // Auto-select template based on AI suggestion
        const templateId = suggestTemplate(suggestion.background, suggestion.color);

        setScriptCreatives((prev) => ({
          ...prev,
          [scriptIdx]: {
            state: "ready",
            suggestion,
            templateId,
            headline: suggestion.main_text,
            subtitle: `\u05E9\u05D9\u05D5\u05D5\u05E7 \u05DE\u05D1\u05D5\u05E1\u05E1 \u05EA\u05D3\u05E8 \u2014 \u05DC\u05D9\u05D3\u05D9\u05DD \u05DE\u05D3\u05D5\u05D9\u05E7\u05D9\u05DD \u05DC${selectedNiche?.name || ""}`.slice(0, 80),
            cta: suggestion.cta || "\u05E9\u05DC\u05D7\u05D5 \u05D4\u05D5\u05D3\u05E2\u05D4",
            format: "story",
          },
        }));
      } catch (e) {
        console.error("Suggest creative error:", e);
        setScriptCreatives((prev) => ({
          ...prev,
          [scriptIdx]: { ...getCreative(scriptIdx), state: "idle" },
        }));
        setCreativeError("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05D4\u05E6\u05E2\u05EA \u05E7\u05E8\u05D9\u05D0\u05D8\u05D9\u05D1. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.");
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
  const updateField = useCallback((scriptIdx: number, field: "headline" | "subtitle" | "cta" | "format", value: string) => {
    setScriptCreatives((prev) => ({
      ...prev,
      [scriptIdx]: { ...prev[scriptIdx], [field]: value },
    }));
  }, []);

  /* ── Generate AI background (advanced) ── */
  const handleGenerateBackground = useCallback(
    async (config: { background: string; format?: string; designVision?: string }, scriptIdx: number) => {
      setCreativeError("");
      try {
        const res = await fetch("/api/generate-creatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch {
          throw new Error(`\u05E9\u05D2\u05D9\u05D0\u05EA \u05E9\u05E8\u05EA (${res.status})`);
        }
        if (!res.ok || !json.success) throw new Error(json.error || "Generation failed");

        const bgSrc = json.imageBase64 || json.imageUrl || "";

        // Set as custom background for this script
        setScriptCreatives((prev) => ({
          ...prev,
          [scriptIdx]: { ...prev[scriptIdx], customBackground: bgSrc },
        }));

        // Also update generatedImages for pipeline compatibility
        const newImage = { url: json.imageUrl || "", base64: json.imageBase64 || "", scriptIdx };
        setGeneratedImages((prev) => {
          const filtered = prev.filter((img) => img.scriptIdx !== scriptIdx);
          return [...filtered, newImage];
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setCreativeError(`\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05D4\u05E8\u05E7\u05E2: ${msg}`);
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
          setCreativeError("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05D4 \u05DC\u05D0\u05DC\u05D1\u05D5\u05DD \u2014 \u05E0\u05E4\u05D7 \u05D4\u05D0\u05D7\u05E1\u05D5\u05DF \u05DE\u05DC\u05D0. \u05E0\u05E1\u05D4 \u05DC\u05D4\u05D5\u05E8\u05D9\u05D3 PNG \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA.");
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-in">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          {"\uD83C\uDFA8"} \u05E7\u05E8\u05D9\u05D0\u05D9\u05D9\u05D8\u05D9\u05D1
        </h2>
        {albumImages.length > 0 && (
          <span className="text-sm font-medium text-[var(--gold)] bg-[var(--gold-soft)] px-3 py-1.5 rounded-full">
            {"\uD83D\uDCF8"} {albumImages.length}/{scriptParts.length} \u05D1\u05D0\u05DC\u05D1\u05D5\u05DD
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
                  \u05EA\u05E1\u05E8\u05D9\u05D8 {idx + 1}
                </h3>
                <div className="flex items-center gap-2">
                  {creative.state === "ready" && (
                    <span className="text-xs font-medium text-[var(--success)] bg-green-50 px-2 py-1 rounded-full">
                      {"\u2713"} \u05DE\u05D5\u05DB\u05DF
                    </span>
                  )}
                  {isInAlbum(idx) && (
                    <span className="text-xs font-medium text-[var(--gold)] bg-[var(--gold-soft)] px-2 py-1 rounded-full">
                      {"\uD83D\uDCF8"} \u05D1\u05D0\u05DC\u05D1\u05D5\u05DD
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
                    {"\u2728"} \u05E6\u05D5\u05E8 \u05E7\u05E8\u05D9\u05D0\u05D9\u05D9\u05D8\u05D9\u05D1
                  </button>
                </div>
              )}

              {/* ── State: ANALYZING ── */}
              {creative.state === "analyzing" && (
                <div className="p-8 text-center">
                  <CountdownTimer seconds={5} />
                  <p className="text-sm text-[var(--text-muted)] mt-3">
                    FBM Studio \u05DE\u05E0\u05EA\u05D7 \u05D0\u05EA \u05D4\u05EA\u05E1\u05E8\u05D9\u05D8 \u05D5\u05DE\u05E6\u05D9\u05E2 \u05E7\u05E8\u05D9\u05D0\u05D8\u05D9\u05D1...
                  </p>
                </div>
              )}

              {/* ── State: READY ── */}
              {creative.state === "ready" && (
                <div className="p-5">
                  {/* Two column: Preview + Edit */}
                  <div className="flex flex-col lg:flex-row gap-6">
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
                    <div className="lg:w-[45%] space-y-4">
                      {/* Headline */}
                      <div>
                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                          \u05DB\u05D5\u05EA\u05E8\u05EA
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
                          \u05EA\u05EA-\u05DB\u05D5\u05EA\u05E8\u05EA
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
                          \u05E4\u05D5\u05E8\u05DE\u05D8
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
                              {f === "feed" ? "\u05E4\u05D9\u05D3 1:1" : "\u05E1\u05D8\u05D5\u05E8\u05D9 9:16"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Template strip */}
                      <div>
                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
                          \u05EA\u05D1\u05E0\u05D9\u05EA
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

                      {/* Advanced options (collapsed) */}
                      <div className="border-t border-[var(--card-border)] pt-3">
                        <button
                          type="button"
                          onClick={() => setAdvancedOpenIdx(advancedOpenIdx === idx ? null : idx)}
                          className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
                        >
                          {advancedOpenIdx === idx ? "\u25BC" : "\u25B6"} \u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05DE\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA
                        </button>

                        {advancedOpenIdx === idx && creative.suggestion && project && (
                          <div className="mt-4">
                            <CanvasEditor
                              suggestion={creative.suggestion}
                              userInfo={{
                                name: project.user_name,
                                role: selectedNiche?.name ?? "",
                                niche: selectedNiche?.name ?? "",
                              }}
                              backgroundImage={creative.customBackground || null}
                              onGenerateBackground={(config) =>
                                handleGenerateBackground(config, idx)
                              }
                              onSaveToAlbum={handleSaveToAlbum}
                              onUploadBackground={(base64) =>
                                handleUploadBackground(base64, idx)
                              }
                              scriptIdx={idx}
                            />
                          </div>
                        )}
                      </div>
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
              <h2 className="text-2xl font-bold text-[var(--success)]">\u05D4\u05DB\u05DC \u05DE\u05D5\u05DB\u05DF!</h2>
              <p className="text-[var(--text-secondary)] mt-2">
                \u05DB\u05DC \u05D4\u05EA\u05E1\u05E8\u05D9\u05D8\u05D9\u05DD \u05D5\u05D4\u05E7\u05E8\u05D9\u05D0\u05D8\u05D9\u05D1\u05D9\u05DD \u05E0\u05D5\u05E6\u05E8\u05D5 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4
              </p>
            </>
          ) : (
            <p className="text-[var(--text-secondary)]">
              {readyCount}/{scriptParts.length} \u05E7\u05E8\u05D9\u05D0\u05D8\u05D9\u05D1\u05D9\u05DD \u05DE\u05D5\u05DB\u05E0\u05D9\u05DD
            </p>
          )}
          {albumImages.length > 0 && (
            <p className="text-sm text-[var(--gold)] font-medium mt-1">
              {albumImages.length} \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u05E0\u05D1\u05D7\u05E8\u05D5 \u05DC\u05D0\u05DC\u05D1\u05D5\u05DD
            </p>
          )}
          <button
            onClick={() => router.push(`/project/${projectId}/album`)}
            className="mt-4 btn-gold text-lg !px-8 !py-3"
          >
            \u05E2\u05D1\u05D5\u05E8 \u05DC\u05D0\u05DC\u05D1\u05D5\u05DD \u05D4\u05E7\u05E8\u05D9\u05D0\u05D8\u05D9\u05D1\u05D9\u05DD
          </button>
        </div>
      )}
    </div>
  );
}
