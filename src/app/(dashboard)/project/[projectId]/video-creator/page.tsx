"use client";

import { useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { useProject } from "../layout";
import SceneCard from "@/components/video/SceneCard";
import VoiceSettingsComponent from "@/components/video/VoiceSettings";
import type { AdaptedScript, VoiceSettings, VideoScene } from "@/lib/video-types";
import type { VideoFormat, RenderScene } from "@/lib/video-composer";

/* ── helpers ── */
function parseScripts(raw: string): string[] {
  if (!raw) return [];
  return raw.split(/(?=## תסריט \d)/).map((p) => p.trim()).filter(Boolean);
}

function base64ToBlob(b64: string, mime = "image/png"): Blob {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

interface SceneAssets {
  imageUrl?: string;
  imageBlob?: Blob;
  imageLoading?: boolean;
  voiceOverUrl?: string;
  voiceOverBlob?: Blob;
  voiceOverLoading?: boolean;
  customAudioBlob?: Blob;
  customAudioUrl?: string;
}

/* ── page ── */
export default function VideoCreatorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { scripts, selectedNiche } = useProject();
  const scriptsList = parseScripts(scripts);

  // State
  const [selectedScriptIdx, setSelectedScriptIdx] = useState(0);
  const [format, setFormat] = useState<VideoFormat>("9:16");
  const [adaptedScript, setAdaptedScript] = useState<AdaptedScript | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voice: "female",
    rate: 1.0,
    pitch: 0,
  });
  const [sceneAssets, setSceneAssets] = useState<Record<number, SceneAssets>>({});

  const [isAdapting, setIsAdapting] = useState(false);
  const [isGeneratingAssets, setIsGeneratingAssets] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState("");
  const [renderProgressPct, setRenderProgressPct] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  /* ── 1. Adapt script ── */
  const handleAdaptScript = useCallback(async () => {
    if (!scriptsList[selectedScriptIdx]) return;
    setIsAdapting(true);
    setError("");
    setAdaptedScript(null);
    setVideoUrl(null);
    setSceneAssets({});

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
      if (!res.ok) throw new Error(data.error);
      setAdaptedScript(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05DE\u05E8\u05EA \u05EA\u05E1\u05E8\u05D9\u05D8");
    } finally {
      setIsAdapting(false);
    }
  }, [scriptsList, selectedScriptIdx, selectedNiche]);

  /* ── 2. Generate all assets (images + voice overs) ── */
  const handleGenerateAssets = useCallback(async () => {
    if (!adaptedScript) return;
    setIsGeneratingAssets(true);
    setError("");
    setVideoUrl(null);

    const brollScenes = adaptedScript.scenes.filter((s) => s.type === "b-roll");
    const newAssets: Record<number, SceneAssets> = {};

    // Initialize loading states
    for (const scene of adaptedScript.scenes) {
      newAssets[scene.number] = {
        ...sceneAssets[scene.number],
        imageLoading: scene.type === "b-roll",
        voiceOverLoading: scene.type === "b-roll" && !!scene.voiceOverText,
      };
    }
    setSceneAssets({ ...newAssets });

    try {
      // Generate images and voice overs in parallel per scene
      await Promise.all(
        brollScenes.map(async (scene) => {
          // Generate image
          if (scene.imagePrompt) {
            try {
              const imgRes = await fetch("/api/video/generate-broll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: scene.imagePrompt, format }),
              });
              const imgData = await imgRes.json();
              if (imgRes.ok && imgData.imageBase64) {
                const blob = base64ToBlob(imgData.imageBase64, imgData.mimeType || "image/png");
                const url = URL.createObjectURL(blob);
                newAssets[scene.number] = {
                  ...newAssets[scene.number],
                  imageUrl: url,
                  imageBlob: blob,
                  imageLoading: false,
                };
              } else {
                newAssets[scene.number] = { ...newAssets[scene.number], imageLoading: false };
              }
            } catch {
              newAssets[scene.number] = { ...newAssets[scene.number], imageLoading: false };
            }
            setSceneAssets((prev) => ({ ...prev, [scene.number]: { ...newAssets[scene.number] } }));
          }

          // Generate voice over
          if (scene.voiceOverText) {
            try {
              const voRes = await fetch("/api/video/generate-voiceover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: scene.voiceOverText,
                  voice: voiceSettings.voice,
                  speakingRate: voiceSettings.rate,
                  pitch: voiceSettings.pitch,
                }),
              });
              const voData = await voRes.json();
              if (voRes.ok && voData.audioContent) {
                const blob = base64ToBlob(voData.audioContent, "audio/mpeg");
                const url = URL.createObjectURL(blob);
                newAssets[scene.number] = {
                  ...newAssets[scene.number],
                  voiceOverUrl: url,
                  voiceOverBlob: blob,
                  voiceOverLoading: false,
                };
              } else {
                newAssets[scene.number] = { ...newAssets[scene.number], voiceOverLoading: false };
              }
            } catch {
              newAssets[scene.number] = { ...newAssets[scene.number], voiceOverLoading: false };
            }
            setSceneAssets((prev) => ({ ...prev, [scene.number]: { ...newAssets[scene.number] } }));
          }
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05E0\u05DB\u05E1\u05D9\u05DD");
    } finally {
      setIsGeneratingAssets(false);
    }
  }, [adaptedScript, format, voiceSettings, sceneAssets]);

  /* ── 3. Regenerate single image ── */
  const handleRegenerateImage = useCallback(
    async (scene: VideoScene) => {
      if (!scene.imagePrompt) return;
      setSceneAssets((prev) => ({
        ...prev,
        [scene.number]: { ...prev[scene.number], imageLoading: true },
      }));

      try {
        const res = await fetch("/api/video/generate-broll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: scene.imagePrompt, format }),
        });
        const data = await res.json();
        if (res.ok && data.imageBase64) {
          const blob = base64ToBlob(data.imageBase64, data.mimeType || "image/png");
          const url = URL.createObjectURL(blob);
          setSceneAssets((prev) => ({
            ...prev,
            [scene.number]: { ...prev[scene.number], imageUrl: url, imageBlob: blob, imageLoading: false },
          }));
        } else {
          setSceneAssets((prev) => ({
            ...prev,
            [scene.number]: { ...prev[scene.number], imageLoading: false },
          }));
        }
      } catch {
        setSceneAssets((prev) => ({
          ...prev,
          [scene.number]: { ...prev[scene.number], imageLoading: false },
        }));
      }
    },
    [format],
  );

  /* ── 4. Regenerate single voice over ── */
  const handleRegenerateVoice = useCallback(
    async (scene: VideoScene) => {
      if (!scene.voiceOverText) return;
      setSceneAssets((prev) => ({
        ...prev,
        [scene.number]: { ...prev[scene.number], voiceOverLoading: true },
      }));

      try {
        const res = await fetch("/api/video/generate-voiceover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: scene.voiceOverText,
            voice: voiceSettings.voice,
            speakingRate: voiceSettings.rate,
            pitch: voiceSettings.pitch,
          }),
        });
        const data = await res.json();
        if (res.ok && data.audioContent) {
          const blob = base64ToBlob(data.audioContent, "audio/mpeg");
          const url = URL.createObjectURL(blob);
          setSceneAssets((prev) => ({
            ...prev,
            [scene.number]: { ...prev[scene.number], voiceOverUrl: url, voiceOverBlob: blob, voiceOverLoading: false },
          }));
        } else {
          setSceneAssets((prev) => ({
            ...prev,
            [scene.number]: { ...prev[scene.number], voiceOverLoading: false },
          }));
        }
      } catch {
        setSceneAssets((prev) => ({
          ...prev,
          [scene.number]: { ...prev[scene.number], voiceOverLoading: false },
        }));
      }
    },
    [voiceSettings],
  );

  /* ── 5. Handle recorded audio for a scene ── */
  const handleRecordedAudio = useCallback(
    (sceneNumber: number, blob: Blob) => {
      const url = URL.createObjectURL(blob);
      setSceneAssets((prev) => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], customAudioBlob: blob, customAudioUrl: url },
      }));
    },
    [],
  );

  /* ── 6. Preview voice sample ── */
  const handlePreviewVoice = useCallback(async () => {
    try {
      const res = await fetch("/api/video/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "\u05E9\u05DC\u05D5\u05DD, \u05D6\u05D5\u05D4\u05D9 \u05D3\u05D5\u05D2\u05DE\u05D4 \u05DC\u05E7\u05D5\u05DC \u05E9\u05D9\u05E9\u05DE\u05E9 \u05D1\u05E1\u05E8\u05D8\u05D5\u05DF. \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05E0\u05D5\u05EA \u05D0\u05EA \u05E1\u05D5\u05D2 \u05D4\u05E7\u05D5\u05DC \u05D5\u05D4\u05DE\u05D4\u05D9\u05E8\u05D5\u05EA.",
          voice: voiceSettings.voice,
          speakingRate: voiceSettings.rate,
          pitch: voiceSettings.pitch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (previewAudioRef.current) previewAudioRef.current.pause();
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      previewAudioRef.current = audio;
      audio.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05D3\u05D5\u05D2\u05DE\u05D4");
    }
  }, [voiceSettings]);

  /* ── 7. Render final video ── */
  const handleRenderVideo = useCallback(async () => {
    if (!adaptedScript) return;
    setIsRendering(true);
    setError("");
    setRenderProgress("\u05D8\u05D5\u05E2\u05DF FFmpeg...");
    setRenderProgressPct(0);

    try {
      // Dynamic import to avoid SSR issues
      const { renderVideo, generateTitleCard } = await import("@/lib/video-composer");

      const renderScenes: RenderScene[] = [];

      for (const scene of adaptedScript.scenes) {
        const assets = sceneAssets[scene.number];

        if (scene.type === "b-roll") {
          // Use custom audio if available, else TTS
          const audioBlob = assets?.customAudioBlob || assets?.voiceOverBlob;

          renderScenes.push({
            index: scene.number,
            type: "b-roll",
            duration: scene.duration,
            imageBlob: assets?.imageBlob,
            audioBlob: audioBlob,
          });
        } else {
          // Selfie → generate title card
          const titleBlob = await generateTitleCard(
            scene.teleprompterText || "",
            format,
          );
          renderScenes.push({
            index: scene.number,
            type: "selfie",
            duration: scene.duration,
            imageBlob: titleBlob,
            titleText: scene.teleprompterText,
          });
        }
      }

      const videoBlob = await renderVideo(
        renderScenes,
        format,
        (step, pct) => {
          setRenderProgress(step);
          setRenderProgressPct(pct);
        },
      );

      const url = URL.createObjectURL(videoBlob);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(url);
    } catch (e) {
      console.error("Render error:", e);
      setError(e instanceof Error ? e.message : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05D4\u05E1\u05E8\u05D8\u05D5\u05DF");
    } finally {
      setIsRendering(false);
      setRenderProgress("");
    }
  }, [adaptedScript, sceneAssets, format, videoUrl]);

  /* ── Check if all b-roll scenes have assets ── */
  const allAssetsReady = adaptedScript?.scenes
    .filter((s) => s.type === "b-roll")
    .every((s) => {
      const a = sceneAssets[s.number];
      return a?.imageBlob && (a?.voiceOverBlob || a?.customAudioBlob);
    }) ?? false;

  /* ── No scripts ── */
  if (scriptsList.length === 0) {
    return (
      <div className="py-12 text-center" dir="rtl">
        <div
          className="rounded-xl p-8 max-w-md mx-auto"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <span className="text-4xl block mb-4">{"\u{1F3AC}"}</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            {"\u05D9\u05E6\u05D9\u05E8\u05EA \u05D5\u05D9\u05D3\u05D0\u05D5"}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {"\u05E6\u05E8\u05D9\u05DA \u05E7\u05D5\u05D3\u05DD \u05DC\u05D9\u05E6\u05D5\u05E8 \u05EA\u05E1\u05E8\u05D9\u05D8\u05D9\u05DD \u05D1\u05E9\u05DC\u05D1 \u05D4\u05EA\u05E1\u05E8\u05D9\u05D8\u05D9\u05DD"}
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
          <span>{"\u{1F3AC}"}</span>
          {"\u05D9\u05E6\u05D9\u05E8\u05EA \u05D5\u05D9\u05D3\u05D0\u05D5 AI"}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {"\u05D4\u05DE\u05E8 \u05D0\u05EA \u05D4\u05EA\u05E1\u05E8\u05D9\u05D8 \u05DC\u05E1\u05E8\u05D8\u05D5\u05DF \u05DE\u05D5\u05DB\u05DF \u05E2\u05DD B-Roll, Voice Over \u05D5\u05D4\u05E0\u05D7\u05D9\u05D5\u05EA \u05E6\u05D9\u05DC\u05D5\u05DD"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg p-4 text-sm"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.08)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
        >
          {error}
          <button onClick={() => setError("")} className="mr-3 underline cursor-pointer">{"\u05E1\u05D2\u05D5\u05E8"}</button>
        </div>
      )}

      {/* ── Step 1: Script + Format ── */}
      <section>
        <SectionHeader num={1} title={"\u05D1\u05D7\u05D9\u05E8\u05EA \u05EA\u05E1\u05E8\u05D9\u05D8 \u05D5\u05E4\u05D5\u05E8\u05DE\u05D8"} />

        <div
          className="rounded-xl p-5 space-y-4"
          style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          {/* Script selector */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
              {"\u05EA\u05E1\u05E8\u05D9\u05D8"}:
            </label>
            <select
              value={selectedScriptIdx}
              onChange={(e) => {
                setSelectedScriptIdx(Number(e.target.value));
                setAdaptedScript(null);
                setVideoUrl(null);
                setSceneAssets({});
              }}
              className="w-full px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: "var(--content-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
            >
              {scriptsList.map((_, i) => (
                <option key={i} value={i}>{`\u05EA\u05E1\u05E8\u05D9\u05D8 ${i + 1}`}</option>
              ))}
            </select>
          </div>

          {/* Format selector */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
              {"\u05D2\u05D5\u05D3\u05DC \u05E1\u05E8\u05D8\u05D5\u05DF"}:
            </label>
            <div className="flex gap-3">
              {(["9:16", "1:1"] as VideoFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setFormat(f);
                    if (adaptedScript) {
                      setSceneAssets({});
                      setVideoUrl(null);
                    }
                  }}
                  className="flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-lg cursor-pointer transition-all"
                  style={{
                    backgroundColor: format === f ? "rgba(212, 168, 67, 0.12)" : "var(--content-bg)",
                    border: format === f ? "2px solid #D4A843" : "2px solid var(--card-border)",
                    color: format === f ? "#D4A843" : "var(--text-secondary)",
                  }}
                >
                  <div
                    className="rounded border-2"
                    style={{
                      width: f === "9:16" ? 28 : 40,
                      height: f === "9:16" ? 50 : 40,
                      borderColor: format === f ? "#D4A843" : "var(--card-border)",
                    }}
                  />
                  <span className="text-sm font-medium">
                    {f === "9:16" ? "Story / Reels (9:16)" : "Feed (1:1)"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Script preview */}
          <div
            className="rounded-lg p-3 max-h-32 overflow-y-auto text-sm text-[var(--text-secondary)]"
            style={{ backgroundColor: "var(--content-bg)" }}
          >
            {scriptsList[selectedScriptIdx]?.substring(0, 300)}
            {(scriptsList[selectedScriptIdx]?.length || 0) > 300 && "..."}
          </div>

          {/* Adapt button */}
          <GoldButton onClick={handleAdaptScript} loading={isAdapting} label={"\u05D4\u05DE\u05E8 \u05EA\u05E1\u05E8\u05D9\u05D8 \u05DC\u05DE\u05D1\u05E0\u05D4 \u05D5\u05D9\u05D3\u05D0\u05D5"} loadingLabel={"\u05DE\u05E2\u05D1\u05D3 \u05EA\u05E1\u05E8\u05D9\u05D8..."} icon={"\u{1F504}"} />
        </div>
      </section>

      {/* ── Step 2: Voice Settings ── */}
      {adaptedScript && (
        <section>
          <SectionHeader num={2} title={"\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA Voice Over"} />
          <VoiceSettingsComponent
            settings={voiceSettings}
            onChange={setVoiceSettings}
            onPreview={handlePreviewVoice}
          />
        </section>
      )}

      {/* ── Step 3: Generate Assets ── */}
      {adaptedScript && (
        <section>
          <SectionHeader num={3} title={"\u05D9\u05E6\u05D9\u05E8\u05EA \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u05D5\u05E7\u05D5\u05DC"} />

          <GoldButton
            onClick={handleGenerateAssets}
            loading={isGeneratingAssets}
            label={"\u05E6\u05D5\u05E8 \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA B-Roll + Voice Over"}
            loadingLabel={"\u05D9\u05D5\u05E6\u05E8 \u05E0\u05DB\u05E1\u05D9\u05DD..."}
            icon={"\u{1F3A8}"}
          />

          {/* Stats bar */}
          {Object.keys(sceneAssets).length > 0 && (
            <div
              className="rounded-lg px-4 py-3 mt-4 flex items-center gap-6 text-sm"
              style={{ backgroundColor: "rgba(212, 168, 67, 0.06)", border: "1px solid rgba(212, 168, 67, 0.15)" }}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">{adaptedScript.scenes.length}</span>
                <span className="text-[var(--text-muted)]">{"\u05E1\u05E6\u05E0\u05D5\u05EA"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">{`~${adaptedScript.totalDuration}`}</span>
                <span className="text-[var(--text-muted)]">{"\u05E9\u05E0\u05D9\u05D5\u05EA"}</span>
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
          )}

          {/* Scene cards */}
          <div className="mt-4 space-y-0">
            {adaptedScript.scenes.map((scene) => {
              const assets = sceneAssets[scene.number] || {};
              return (
                <SceneCard
                  key={scene.number}
                  scene={scene}
                  format={format}
                  imageUrl={assets.imageUrl}
                  imageLoading={assets.imageLoading}
                  voiceOverUrl={assets.voiceOverUrl}
                  voiceOverLoading={assets.voiceOverLoading}
                  customAudioUrl={assets.customAudioUrl}
                  onRegenerateImage={() => handleRegenerateImage(scene)}
                  onRegenerateVoice={() => handleRegenerateVoice(scene)}
                  onRecordedAudio={(blob) => handleRecordedAudio(scene.number, blob)}
                />
              );
            })}
          </div>

          {/* Filming instructions */}
          {adaptedScript.filmingInstructions && (
            <div
              className="rounded-lg p-4 mt-4"
              style={{ backgroundColor: "rgba(59, 130, 246, 0.06)", border: "1px solid rgba(59, 130, 246, 0.15)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{"\u{1F4F7}"}</span>
                <strong className="text-sm text-[var(--text-primary)]">{"\u05D4\u05E0\u05D7\u05D9\u05D5\u05EA \u05E6\u05D9\u05DC\u05D5\u05DD"}</strong>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{adaptedScript.filmingInstructions}</p>
            </div>
          )}
        </section>
      )}

      {/* ── Step 4: Render Video ── */}
      {adaptedScript && allAssetsReady && !videoUrl && (
        <section>
          <SectionHeader num={4} title={"\u05D9\u05E6\u05D9\u05E8\u05EA \u05E1\u05E8\u05D8\u05D5\u05DF"} />

          <GoldButton
            onClick={handleRenderVideo}
            loading={isRendering}
            label={"\u05E6\u05D5\u05E8 \u05E1\u05E8\u05D8\u05D5\u05DF MP4"}
            loadingLabel={renderProgress || "\u05DE\u05E2\u05D1\u05D3..."}
            icon={"\u{1F3AC}"}
            large
          />

          {isRendering && (
            <div className="mt-3">
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--card-border)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round(renderProgressPct * 100)}%`,
                    background: "linear-gradient(90deg, #D4A843, #C49A38)",
                  }}
                />
              </div>
              <p className="text-center text-xs text-[var(--text-muted)] mt-2">
                {"\u05D4\u05EA\u05D4\u05DC\u05D9\u05DA \u05E2\u05E9\u05D5\u05D9 \u05DC\u05E7\u05D7\u05EA \u05DB\u05D3\u05E7\u05D4 \u05D0\u05D7\u05EA \u05E2\u05D3 \u05E9\u05DC\u05D5\u05E9"}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── Step 5: Video Ready ── */}
      {videoUrl && (
        <section>
          <div
            className="rounded-xl p-6"
            style={{ backgroundColor: "rgba(34, 197, 94, 0.06)", border: "1px solid rgba(34, 197, 94, 0.2)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}
              >
                {"\u2705"}
              </span>
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">{"\u05D4\u05E1\u05E8\u05D8\u05D5\u05DF \u05DE\u05D5\u05DB\u05DF!"}</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  {format === "9:16" ? "Story / Reels (1080x1920)" : "Feed (1080x1080)"} - MP4
                </p>
              </div>
            </div>

            {/* Video player */}
            <div className="rounded-lg overflow-hidden mb-4 flex justify-center bg-black">
              <video
                controls
                src={videoUrl}
                className="max-h-[400px]"
                style={{ aspectRatio: format === "9:16" ? "9/16" : "1/1" }}
              />
            </div>

            {/* Download + Re-render */}
            <div className="flex gap-3">
              <a
                href={videoUrl}
                download={`video-${format.replace(":", "x")}-${Date.now()}.mp4`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-bold cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
                  color: "#0F1117",
                  boxShadow: "0 2px 12px rgba(212, 168, 67, 0.3)",
                }}
              >
                <span>{"\u{1F4E5}"}</span>
                {"\u05D4\u05D5\u05E8\u05D3 MP4"}
              </a>
              <button
                onClick={() => { setVideoUrl(null); }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer"
                style={{ backgroundColor: "var(--content-bg)", color: "var(--text-secondary)", border: "1px solid var(--card-border)" }}
              >
                <span>{"\u{1F504}"}</span>
                {"\u05E2\u05E8\u05D5\u05DA \u05DE\u05D7\u05D3\u05E9"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Reusable sub-components ── */

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: "rgba(212, 168, 67, 0.12)", color: "#D4A843" }}
      >
        {num}
      </span>
      {title}
    </h2>
  );
}

function GoldButton({
  onClick,
  loading,
  label,
  loadingLabel,
  icon,
  large,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
  loadingLabel: string;
  icon: string;
  large?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 ${large ? "px-6 py-4 rounded-xl text-base" : "px-6 py-3 rounded-lg text-sm"} font-bold cursor-pointer transition-all`}
      style={{
        background: loading ? "var(--card-border)" : "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
        color: loading ? "var(--text-muted)" : "#0F1117",
        boxShadow: loading ? "none" : large ? "0 4px 16px rgba(212, 168, 67, 0.35)" : "0 2px 12px rgba(212, 168, 67, 0.3)",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-[#0F1117]/30 border-t-[#0F1117] rounded-full animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <span>{icon}</span>
          {label}
        </>
      )}
    </button>
  );
}
