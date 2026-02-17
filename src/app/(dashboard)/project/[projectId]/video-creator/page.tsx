"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import SceneCard from "@/components/video/SceneCard";
import VoiceSettingsComponent from "@/components/video/VoiceSettings";
import type { AdaptedScript, VoiceSettings, VideoScene } from "@/lib/video-types";

/* ── Progress steps ── */
const STEPS = [
  { key: "adapt", label: "המרת תסריט לסרטון", icon: "📝" },
  { key: "veo", label: "יצירת 5 קליפי וידאו (Veo)", icon: "🎥" },
  { key: "tts", label: "יצירת קריינות בעברית", icon: "🎙️" },
  { key: "compose", label: "הרכבת סרטון MP4 סופי", icon: "🎬" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

/* ── Per-script state ── */
type VideoState = "idle" | "adapting" | "ready" | "generating" | "done" | "error";

interface ScriptVideo {
  state: VideoState;
  adaptedScript: AdaptedScript | null;
  voiceSettings: VoiceSettings;
  currentStep: StepKey | null;
  stepsCompleted: StepKey[];
  finalVideoUrl: string | null;
  error: string | null;
}

function parseScripts(raw: string): string[] {
  if (!raw) return [];
  const parts = raw.split(/(?=## תסריט \d)/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

export default function VideoCreatorPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const { scripts, selectedNiche } = useProject();

  const scriptsList = parseScripts(scripts);

  const [scriptVideos, setScriptVideos] = useState<Record<number, ScriptVideo>>({});
  const [globalError, setGlobalError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [videoCount, setVideoCount] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoCreatedRef = useRef(false);

  const VIDEO_LIMIT = 3;

  const getVideo = (idx: number): ScriptVideo =>
    scriptVideos[idx] || {
      state: "idle",
      adaptedScript: null,
      voiceSettings: { voice: "female", rate: 1.0, pitch: 0 },
      currentStep: null,
      stepsCompleted: [],
      finalVideoUrl: null,
      error: null,
    };

  const updateVideo = useCallback(
    (idx: number, updates: Partial<ScriptVideo>) => {
      setScriptVideos((prev) => ({
        ...prev,
        [idx]: { ...getVideo(idx), ...prev[idx], ...updates },
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* ── Step 1: Adapt FBM script → video script ── */
  const handleAdaptScript = useCallback(
    async (scriptIdx: number) => {
      if (!scriptsList[scriptIdx]) return;

      updateVideo(scriptIdx, {
        state: "adapting",
        adaptedScript: null,
        currentStep: "adapt",
        stepsCompleted: [],
        finalVideoUrl: null,
        error: null,
      });
      setGlobalError("");

      try {
        const res = await fetch("/api/video/adapt-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scriptText: scriptsList[scriptIdx],
            niche: selectedNiche?.name || "",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to adapt script");

        updateVideo(scriptIdx, {
          state: "ready",
          adaptedScript: data,
          currentStep: null,
          stepsCompleted: ["adapt"],
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "שגיאה ביצירת תסריט וידאו";
        updateVideo(scriptIdx, { state: "idle", error: msg });
        setGlobalError(msg);
      }
    },
    [scriptsList, selectedNiche, updateVideo],
  );

  /* ── Auto-adapt first script on page load ── */
  useEffect(() => {
    if (!scripts || autoCreatedRef.current) return;
    const parts = parseScripts(scripts);
    if (parts.length > 0 && !scriptVideos[0]) {
      autoCreatedRef.current = true;
      handleAdaptScript(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripts]);

  /* ── Update a scene ── */
  const handleUpdateScene = useCallback(
    (scriptIdx: number, sceneNumber: number, updates: Partial<VideoScene>) => {
      setScriptVideos((prev) => {
        const video = prev[scriptIdx];
        if (!video?.adaptedScript) return prev;
        const updatedScenes = video.adaptedScript.scenes.map((s) =>
          s.number === sceneNumber ? { ...s, ...updates } : s,
        );
        return {
          ...prev,
          [scriptIdx]: {
            ...video,
            adaptedScript: { ...video.adaptedScript, scenes: updatedScenes },
          },
        };
      });
    },
    [],
  );

  /* ── Update voice settings ── */
  const handleUpdateVoice = useCallback(
    (scriptIdx: number, settings: VoiceSettings) => {
      updateVideo(scriptIdx, { voiceSettings: settings });
    },
    [updateVideo],
  );

  /* ── Preview voice ── */
  const handlePreviewVoice = useCallback(async (settings: VoiceSettings) => {
    setIsPreviewLoading(true);
    setGlobalError("");
    try {
      const res = await fetch("/api/video/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "שלום, זוהי דוגמה לקול שישמש בסרטון שלך.",
          voice: settings.voice,
          speakingRate: settings.rate,
          pitch: settings.pitch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה ביצירת דוגמת קול");

      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      previewAudioRef.current = audio;
      await audio.play();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "שגיאה ביצירת דוגמת קול";
      setGlobalError(msg);
    }
    setIsPreviewLoading(false);
  }, []);

  /* ── Full pipeline: Adapt → Veo → TTS → Compose → MP4 ── */
  const handleGenerateVideo = useCallback(
    async (scriptIdx: number) => {
      const video = scriptVideos[scriptIdx];
      if (!video?.adaptedScript) return;

      if (videoCount >= VIDEO_LIMIT) {
        setGlobalError(`הגעת למגבלת ${VIDEO_LIMIT} סרטונים בתקופת הניסיון. שדרג את התוכנית שלך.`);
        return;
      }

      updateVideo(scriptIdx, {
        state: "generating",
        currentStep: "veo",
        stepsCompleted: ["adapt"],
        finalVideoUrl: null,
        error: null,
      });
      setGlobalError("");

      try {
        // Simulate step progression for the UI
        // The generate-all endpoint handles the entire pipeline internally
        // Step progression: veo takes ~3min (staggered batches), tts ~20s, compose ~30s
        const stepTimer = setInterval(() => {
          setScriptVideos((prev) => {
            const v = prev[scriptIdx];
            if (!v || v.state !== "generating") return prev;
            const completed = v.stepsCompleted;
            if (!completed.includes("veo")) {
              return { ...prev, [scriptIdx]: { ...v, currentStep: "veo" as StepKey, stepsCompleted: [...completed, "veo"] } };
            }
            if (!completed.includes("tts")) {
              return { ...prev, [scriptIdx]: { ...v, currentStep: "tts" as StepKey, stepsCompleted: [...completed, "tts"] } };
            }
            if (!completed.includes("compose")) {
              return { ...prev, [scriptIdx]: { ...v, currentStep: "compose" as StepKey, stepsCompleted: [...completed, "compose"] } };
            }
            return prev;
          });
        }, 15000);

        const res = await fetch("/api/video/generate-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            adaptedScript: video.adaptedScript,
            voiceSettings: video.voiceSettings,
            scriptIndex: scriptIdx,
          }),
        });

        clearInterval(stepTimer);

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate video");

        updateVideo(scriptIdx, {
          state: "done",
          currentStep: null,
          stepsCompleted: ["adapt", "veo", "tts", "compose"],
          finalVideoUrl: data.videoUrl,
        });
        setVideoCount((c) => c + 1);

        if (data.warning) {
          setGlobalError(data.warning);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "שגיאה ביצירת הסרטון";
        updateVideo(scriptIdx, {
          state: "error",
          error: msg,
          currentStep: null,
        });
        setGlobalError(msg);
      }
    },
    [scriptVideos, projectId, videoCount, VIDEO_LIMIT, updateVideo],
  );

  // Redirect if no scripts
  useEffect(() => {
    if (!scripts) {
      router.replace(`/project/${projectId}/scripts`);
    }
  }, [scripts, router, projectId]);

  if (!scripts || scriptsList.length === 0) {
    return (
      <div className="py-12 text-center" dir="rtl">
        <div className="card-static rounded-xl p-8 max-w-md mx-auto">
          <span className="text-4xl block mb-4">🎬</span>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">יצירת וידאו AI</h2>
          <p className="text-sm text-[var(--text-secondary)]">צריך קודם ליצור תסריטים בשלב התסריטים</p>
        </div>
      </div>
    );
  }

  const doneCount = Object.values(scriptVideos).filter((v) => v.state === "done").length;

  return (
    <div className="pb-20 overflow-x-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-in">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">🎬 יצירת וידאו AI</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            סרטון MP4 של 60 שניות — קליפי Veo + קריינות + כתוביות + מוזיקה
          </p>
        </div>
        <span
          className="text-sm font-medium px-3 py-1.5 rounded-full"
          style={{
            backgroundColor: videoCount >= VIDEO_LIMIT ? "rgba(239, 68, 68, 0.1)" : "rgba(212, 168, 67, 0.1)",
            color: videoCount >= VIDEO_LIMIT ? "#EF4444" : "#D4A843",
          }}
        >
          🎬 {videoCount}/{VIDEO_LIMIT} סרטונים
        </span>
      </div>

      {/* Error */}
      {globalError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-600 animate-in">
          {globalError}
        </div>
      )}

      {/* Script cards */}
      <div className="space-y-6">
        {scriptsList.map((scriptText, idx) => {
          const video = getVideo(idx);

          return (
            <div key={idx} className="card-static overflow-hidden animate-in">
              {/* Header */}
              <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-primary)]">תסריט {idx + 1}</h3>
                <div className="flex items-center gap-2">
                  {video.state === "ready" && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      תסריט וידאו מוכן
                    </span>
                  )}
                  {video.state === "done" && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      ✓ MP4 מוכן
                    </span>
                  )}
                  {video.state === "error" && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      שגיאה
                    </span>
                  )}
                </div>
              </div>

              {/* ── IDLE ── */}
              {video.state === "idle" && (
                <div className="p-8 text-center">
                  <div
                    className="rounded-lg p-3 mb-4 max-h-24 overflow-y-auto text-sm text-[var(--text-secondary)] text-right mx-auto max-w-lg"
                    style={{ backgroundColor: "var(--content-bg)" }}
                  >
                    {scriptText.substring(0, 200)}
                    {scriptText.length > 200 && "..."}
                  </div>
                  <button
                    onClick={() => handleAdaptScript(idx)}
                    disabled={videoCount >= VIDEO_LIMIT}
                    className="btn-gold !py-3 !px-8 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✨ צור סרטון 60 שניות
                  </button>
                  {videoCount >= VIDEO_LIMIT && (
                    <p className="text-xs text-red-500 mt-2">הגעת למגבלת הסרטונים בתקופת הניסיון</p>
                  )}
                </div>
              )}

              {/* ── ADAPTING ── */}
              {video.state === "adapting" && (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-[var(--gold)] border-t-transparent animate-spin" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">ממיר את התסריט לסרטון 60 שניות...</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">5 סצנות B-Roll | Voice Over בעברית | 16:9</p>
                </div>
              )}

              {/* ── READY (editable video script) ── */}
              {video.state === "ready" && video.adaptedScript && (
                <div className="p-5">
                  <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-[10px] text-xs text-blue-700 text-center">
                    לחץ על טקסט כלשהו כדי לערוך. אחרי העריכה לחץ &quot;צור סרטון MP4&quot;
                  </div>

                  {video.adaptedScript.title && (
                    <h4 className="text-base font-bold text-[var(--text-primary)] mb-3 text-center">
                      {video.adaptedScript.title}
                    </h4>
                  )}

                  {/* Stats */}
                  <div
                    className="rounded-lg px-4 py-2.5 mb-4 flex items-center justify-center gap-6 text-sm"
                    style={{
                      backgroundColor: "rgba(212, 168, 67, 0.06)",
                      border: "1px solid rgba(212, 168, 67, 0.15)",
                    }}
                  >
                    <span><strong>{video.adaptedScript.scenes.length}</strong> סצנות</span>
                    <span><strong>{video.adaptedScript.totalDuration}</strong> שניות</span>
                    <span>16:9</span>
                    <span>Veo 3.1</span>
                  </div>

                  {/* Scene cards */}
                  {video.adaptedScript.scenes.map((scene) => (
                    <SceneCard
                      key={scene.number}
                      scene={scene}
                      isEditing={true}
                      onUpdateScene={(updates) => handleUpdateScene(idx, scene.number, updates)}
                    />
                  ))}

                  {/* Voice settings */}
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">🎙️ הגדרות קריינות</h4>
                    <VoiceSettingsComponent
                      settings={video.voiceSettings}
                      onChange={(s) => handleUpdateVoice(idx, s)}
                      onPreview={() => handlePreviewVoice(video.voiceSettings)}
                      isPreviewLoading={isPreviewLoading}
                    />
                  </div>

                  {/* Generate button */}
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleGenerateVideo(idx)}
                      disabled={videoCount >= VIDEO_LIMIT}
                      className="flex-1 py-3.5 rounded-xl text-white font-bold text-[15px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: "linear-gradient(135deg, #22C55E 0%, #16a34a 100%)",
                        boxShadow: "0 4px 16px rgba(34,197,94,0.3)",
                      }}
                    >
                      🎬 צור סרטון MP4
                    </button>
                    <button
                      onClick={() => handleAdaptScript(idx)}
                      className="px-4 py-3.5 rounded-xl border-2 border-[var(--card-border)] text-[var(--text-secondary)] font-medium text-sm cursor-pointer hover:border-[var(--gold)] transition-all"
                      title="צור תסריט מחדש"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              )}

              {/* ── GENERATING (progress) ── */}
              {video.state === "generating" && (
                <div className="p-6">
                  <h4 className="text-center font-bold text-[var(--text-primary)] mb-5">מייצר את הסרטון שלך...</h4>

                  {/* Progress steps */}
                  <div className="max-w-md mx-auto space-y-3">
                    {STEPS.map((step) => {
                      const isCompleted = video.stepsCompleted.includes(step.key);
                      const isCurrent = video.currentStep === step.key;

                      return (
                        <div
                          key={step.key}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl"
                          style={{
                            backgroundColor: isCurrent
                              ? "rgba(212, 168, 67, 0.08)"
                              : isCompleted
                                ? "rgba(34, 197, 94, 0.06)"
                                : "var(--content-bg)",
                            border: isCurrent
                              ? "1px solid rgba(212, 168, 67, 0.3)"
                              : "1px solid transparent",
                          }}
                        >
                          {/* Status icon */}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                            {isCompleted ? (
                              <span className="text-green-500 text-lg">✓</span>
                            ) : isCurrent ? (
                              <div className="w-5 h-5 rounded-full border-2 border-[var(--gold)] border-t-transparent animate-spin" />
                            ) : (
                              <span className="text-lg opacity-30">{step.icon}</span>
                            )}
                          </div>

                          <span
                            className="text-sm font-medium"
                            style={{
                              color: isCompleted
                                ? "var(--success)"
                                : isCurrent
                                  ? "var(--text-primary)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {step.label}
                          </span>

                          {isCurrent && (
                            <span className="mr-auto text-xs text-[var(--text-muted)] animate-pulse">
                              {step.key === "veo" ? "~3-4 דקות" : step.key === "compose" ? "~30 שניות" : ""}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                    אל תסגור את הדף. יצירת הסרטון לוקחת 3-5 דקות (מגבלת Veo: 2 בקשות לדקה).
                  </p>
                </div>
              )}

              {/* ── ERROR ── */}
              {video.state === "error" && (
                <div className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center text-xl">
                    ❌
                  </div>
                  <p className="text-sm text-red-600 mb-3">{video.error}</p>
                  <button
                    onClick={() => handleAdaptScript(idx)}
                    className="btn-gold !py-2 !px-6 text-sm"
                  >
                    נסה שוב
                  </button>
                </div>
              )}

              {/* ── DONE (video player) ── */}
              {video.state === "done" && video.finalVideoUrl && (
                <div className="p-5">
                  {/* Success banner */}
                  <div
                    className="rounded-xl p-4 mb-4 flex items-center gap-3"
                    style={{
                      backgroundColor: "rgba(34, 197, 94, 0.06)",
                      border: "1px solid rgba(34, 197, 94, 0.2)",
                    }}
                  >
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: "rgba(34, 197, 94, 0.15)" }}
                    >
                      ✅
                    </span>
                    <div>
                      <h4 className="font-bold text-[var(--text-primary)]">סרטון MP4 מוכן!</h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        60 שניות | 5 סצנות Veo | קריינות בעברית | כתוביות | מוזיקת רקע
                      </p>
                    </div>
                  </div>

                  {/* Video player */}
                  <div className="rounded-xl overflow-hidden mb-4" style={{ backgroundColor: "#000" }}>
                    <video
                      controls
                      className="w-full"
                      style={{ maxHeight: 400 }}
                      poster=""
                    >
                      <source src={video.finalVideoUrl} type="video/mp4" />
                      הדפדפן שלך לא תומך בנגן וידאו.
                    </video>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <a
                      href={video.finalVideoUrl}
                      download={`fbm-video-script-${idx + 1}.mp4`}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all"
                      style={{
                        background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
                        color: "#0F1117",
                        boxShadow: "0 2px 12px rgba(212, 168, 67, 0.3)",
                      }}
                    >
                      📥 הורד MP4
                    </a>
                    <button
                      onClick={() => handleGenerateVideo(idx)}
                      disabled={videoCount >= VIDEO_LIMIT}
                      className="px-4 py-3 rounded-xl border-2 border-[var(--card-border)] text-[var(--text-secondary)] font-medium text-sm cursor-pointer hover:border-[var(--gold)] transition-all disabled:opacity-50"
                    >
                      🔄 צור מחדש
                    </button>
                  </div>

                  {/* Expandable: Scene breakdown */}
                  {video.adaptedScript && (
                    <details className="mt-4">
                      <summary className="text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]">
                        📋 הצג סצנות
                      </summary>
                      <div className="mt-3">
                        {video.adaptedScript.scenes.map((scene) => (
                          <SceneCard key={scene.number} scene={scene} />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Next step */}
      {doneCount > 0 && (
        <div className="text-center py-8 bg-green-50 border border-green-200 rounded-[20px] mt-6 animate-in">
          <h2 className="text-2xl font-bold text-green-600">
            {doneCount >= scriptsList.length ? "כל הסרטונים מוכנים!" : `${doneCount}/${scriptsList.length} סרטונים מוכנים`}
          </h2>
          <p className="text-[var(--text-secondary)] mt-2">
            סרטוני MP4 עם קליפי Veo, קריינות, כתוביות ומוזיקה
          </p>
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
