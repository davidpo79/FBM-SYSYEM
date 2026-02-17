"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useProject } from "../layout";
import SceneCard from "@/components/video/SceneCard";
import VoiceSettingsComponent from "@/components/video/VoiceSettings";
import type { AdaptedScript, VoiceSettings, SceneResult } from "@/lib/video-types";

function parseScripts(raw: string): string[] {
  if (!raw) return [];
  const parts = raw.split(/(?=## תסריט \d)/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export default function VideoCreatorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { scripts, selectedNiche } = useProject();

  const scriptsList = parseScripts(scripts);

  const [selectedScriptIdx, setSelectedScriptIdx] = useState(0);
  const [adaptedScript, setAdaptedScript] = useState<AdaptedScript | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voice: "female",
    rate: 1.0,
    pitch: 0,
  });
  const [sceneResults, setSceneResults] = useState<SceneResult[]>([]);

  const [isAdapting, setIsAdapting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState("");
  const [generationProgress, setGenerationProgress] = useState("");

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleAdaptScript = useCallback(async () => {
    if (!scriptsList[selectedScriptIdx]) return;
    setIsAdapting(true);
    setError("");
    setAdaptedScript(null);
    setVideoReady(false);
    setSceneResults([]);

    try {
      const res = await fetch("/api/video/adapt-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptText: scriptsList[selectedScriptIdx],
          niche: selectedNiche?.name || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adapt script");
      setAdaptedScript(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בהמרת תסריט");
    } finally {
      setIsAdapting(false);
    }
  }, [scriptsList, selectedScriptIdx, selectedNiche]);

  const handlePreviewVoice = useCallback(async () => {
    setIsPreviewLoading(true);
    setError("");
    try {
      const sampleText = "שלום, זוהי דוגמה לקול שישמש בסרטון שלך. ניתן לשנות את סוג הקול, המהירות וגובה הקול.";
      const res = await fetch("/api/video/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sampleText,
          voice: voiceSettings.voice,
          speakingRate: voiceSettings.rate,
          pitch: voiceSettings.pitch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה ביצירת דוגמת קול");

      // Stop previous audio if playing
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      previewAudioRef.current = audio;
      await audio.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת דוגמת קול");
    } finally {
      setIsPreviewLoading(false);
    }
  }, [voiceSettings]);

  const handleGenerateAll = useCallback(async () => {
    if (!adaptedScript) return;
    setIsGenerating(true);
    setError("");
    setVideoReady(false);

    const brollCount = adaptedScript.scenes.filter((s) => s.type === "b-roll").length;
    setGenerationProgress(
      `יוצר ${brollCount} תמונות B-Roll וקבצי Voice Over...`,
    );

    try {
      const res = await fetch("/api/video/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          adaptedScript,
          voiceSettings,
          scriptIndex: selectedScriptIdx,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate assets");

      setSceneResults(data.scenes || []);
      setVideoReady(true);
      setGenerationProgress("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת נכסי וידאו");
      setGenerationProgress("");
    } finally {
      setIsGenerating(false);
    }
  }, [adaptedScript, projectId, voiceSettings, selectedScriptIdx]);

  // No scripts available
  if (scriptsList.length === 0) {
    return (
      <div className="py-12 text-center" dir="rtl">
        <div
          className="rounded-xl p-8 max-w-md mx-auto"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--card-border)",
          }}
        >
          <span className="text-4xl block mb-4">🎬</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            יצירת וידאו
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            צריך קודם ליצור תסריטים בשלב התסריטים
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <span>🎬</span>
          יצירת וידאו מהתסריט
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          המר את התסריט לחבילת וידאו מוכנת עם B-Roll, Voice Over והנחיות צילום
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div
          className="rounded-lg p-4 text-sm"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            color: "#EF4444",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          {error}
        </div>
      )}

      {/* Step 1: Script Selection & Adaptation */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: "rgba(212, 168, 67, 0.12)", color: "#D4A843" }}
          >
            1
          </span>
          התאמת תסריט למבנה וידאו
        </h2>

        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--card-border)",
          }}
        >
          <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
            בחר תסריט:
          </label>
          <select
            value={selectedScriptIdx}
            onChange={(e) => {
              setSelectedScriptIdx(Number(e.target.value));
              setAdaptedScript(null);
              setVideoReady(false);
              setSceneResults([]);
            }}
            className="w-full px-4 py-3 rounded-lg text-sm mb-4"
            style={{
              backgroundColor: "var(--content-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--text-primary)",
            }}
          >
            {scriptsList.map((_, i) => (
              <option key={i} value={i}>
                תסריט {i + 1}
              </option>
            ))}
          </select>

          {/* Script preview */}
          <div
            className="rounded-lg p-3 mb-4 max-h-40 overflow-y-auto text-sm text-[var(--text-secondary)]"
            style={{ backgroundColor: "var(--content-bg)" }}
          >
            {scriptsList[selectedScriptIdx]?.substring(0, 300)}
            {(scriptsList[selectedScriptIdx]?.length || 0) > 300 && "..."}
          </div>

          <button
            onClick={handleAdaptScript}
            disabled={isAdapting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold cursor-pointer transition-all"
            style={{
              background: isAdapting
                ? "var(--card-border)"
                : "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
              color: isAdapting ? "var(--text-muted)" : "#0F1117",
              boxShadow: isAdapting
                ? "none"
                : "0 2px 12px rgba(212, 168, 67, 0.3)",
              opacity: isAdapting ? 0.7 : 1,
            }}
          >
            {isAdapting ? (
              <>
                <span className="w-4 h-4 border-2 border-[#0F1117]/30 border-t-[#0F1117] rounded-full animate-spin" />
                מעבד תסריט...
              </>
            ) : (
              <>
                <span>🔄</span>
                המר תסריט למבנה וידאו
              </>
            )}
          </button>
        </div>
      </section>

      {/* Step 2: Scene Preview */}
      {adaptedScript && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: "rgba(212, 168, 67, 0.12)", color: "#D4A843" }}
            >
              2
            </span>
            תצוגה מקדימה של המבנה
          </h2>

          {/* Stats bar */}
          <div
            className="rounded-lg px-4 py-3 mb-4 flex items-center gap-6 text-sm"
            style={{
              backgroundColor: "rgba(212, 168, 67, 0.06)",
              border: "1px solid rgba(212, 168, 67, 0.15)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text-primary)]">
                {adaptedScript.scenes.length}
              </span>
              <span className="text-[var(--text-muted)]">סצנות</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--text-primary)]">
                {adaptedScript.totalDuration}
              </span>
              <span className="text-[var(--text-muted)]">שניות</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: "#3B82F6" }}>
                {adaptedScript.scenes.filter((s) => s.type === "b-roll").length}
              </span>
              <span className="text-[var(--text-muted)]">B-Roll</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium" style={{ color: "#22C55E" }}>
                {adaptedScript.scenes.filter((s) => s.type === "selfie").length}
              </span>
              <span className="text-[var(--text-muted)]">Selfie</span>
            </div>
          </div>

          {/* Scene cards */}
          {adaptedScript.scenes.map((scene) => {
            const result = sceneResults.find((r) => r.number === scene.number);
            return (
              <SceneCard
                key={scene.number}
                scene={scene}
                imageUrl={result?.imageUrl}
                voiceOverUrl={result?.voiceOverUrl}
              />
            );
          })}

          {/* Filming instructions */}
          {adaptedScript.filmingInstructions && (
            <div
              className="rounded-lg p-4 mt-4"
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.06)",
                border: "1px solid rgba(59, 130, 246, 0.15)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span>📷</span>
                <strong className="text-sm text-[var(--text-primary)]">
                  הנחיות צילום:
                </strong>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {adaptedScript.filmingInstructions}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Step 3: Voice Settings */}
      {adaptedScript && (
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: "rgba(212, 168, 67, 0.12)", color: "#D4A843" }}
            >
              3
            </span>
            הגדרות Voice Over
          </h2>
          <VoiceSettingsComponent
            settings={voiceSettings}
            onChange={setVoiceSettings}
            onPreview={handlePreviewVoice}
            isPreviewLoading={isPreviewLoading}
          />
        </section>
      )}

      {/* Step 4: Generate */}
      {adaptedScript && !videoReady && (
        <section>
          <button
            onClick={handleGenerateAll}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-bold cursor-pointer transition-all"
            style={{
              background: isGenerating
                ? "var(--card-border)"
                : "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
              color: isGenerating ? "var(--text-muted)" : "#0F1117",
              boxShadow: isGenerating
                ? "none"
                : "0 4px 16px rgba(212, 168, 67, 0.35)",
              opacity: isGenerating ? 0.7 : 1,
            }}
          >
            {isGenerating ? (
              <>
                <span className="w-5 h-5 border-2 border-[#0F1117]/30 border-t-[#0F1117] rounded-full animate-spin" />
                {generationProgress || "יוצר וידאו..."}
              </>
            ) : (
              <>
                <span>🎬</span>
                צור וידאו
              </>
            )}
          </button>
          {isGenerating && (
            <p className="text-center text-xs text-[var(--text-muted)] mt-2">
              התהליך עשוי לקחת כדקה אחת עד שלוש
            </p>
          )}
        </section>
      )}

      {/* Step 5: Download */}
      {videoReady && (
        <section>
          <div
            className="rounded-xl p-6"
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.06)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}
              >
                ✅
              </span>
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">
                  וידאו מוכן!
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  כל הנכסים נוצרו בהצלחה
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-2 mb-5">
              {sceneResults.filter((s) => s.imageUrl).length > 0 && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span style={{ color: "#22C55E" }}>✓</span>
                  {sceneResults.filter((s) => s.imageUrl).length}{" "}
                  תמונות B-Roll (PNG, 1920x1080)
                </div>
              )}
              {sceneResults.filter((s) => s.voiceOverUrl).length > 0 && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span style={{ color: "#22C55E" }}>✓</span>
                  {sceneResults.filter((s) => s.voiceOverUrl).length}{" "}
                  קטעי Voice Over (MP3)
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span style={{ color: "#22C55E" }}>✓</span>
                מדריך לצילום סלפי-וידאו
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span style={{ color: "#22C55E" }}>✓</span>
                Timeline JSON לעריכה
              </div>
            </div>

            {/* Download buttons */}
            <div className="flex gap-3">
              <a
                href={`/api/video/download-package?projectId=${projectId}`}
                download
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold cursor-pointer transition-all"
                style={{
                  background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
                  color: "#0F1117",
                  boxShadow: "0 2px 12px rgba(212, 168, 67, 0.3)",
                }}
              >
                <span>📥</span>
                הורד הכל (ZIP)
              </a>
              <button
                onClick={handleGenerateAll}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer"
                style={{
                  backgroundColor: "var(--content-bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <span>🔄</span>
                צור מחדש
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
