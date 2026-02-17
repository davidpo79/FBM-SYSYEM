"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import SceneCard from "@/components/video/SceneCard";
import VoiceSettingsComponent from "@/components/video/VoiceSettings";
import type { AdaptedScript, VoiceSettings, SceneResult, VideoScene } from "@/lib/video-types";

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

/* ── Per-script state machine ── */
type VideoState = "idle" | "adapting" | "ready" | "generating" | "done";

interface ScriptVideo {
  state: VideoState;
  adaptedScript: AdaptedScript | null;
  voiceSettings: VoiceSettings;
  sceneResults: SceneResult[];
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
  const [error, setError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [videoCount, setVideoCount] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoCreatedRef = useRef(false);

  // Trial limit: 3 videos
  const VIDEO_LIMIT = 3;

  /* ── Get or init video state for a script ── */
  const getVideo = (idx: number): ScriptVideo => {
    return scriptVideos[idx] || {
      state: "idle",
      adaptedScript: null,
      voiceSettings: { voice: "female", rate: 1.0, pitch: 0 },
      sceneResults: [],
    };
  };

  /* ── One Click: adapt script → video script (60s, all B-Roll) ── */
  const handleCreateVideo = useCallback(
    async (scriptIdx: number) => {
      if (!scriptsList[scriptIdx]) return;

      setScriptVideos((prev) => ({
        ...prev,
        [scriptIdx]: {
          ...getVideo(scriptIdx),
          state: "adapting",
          adaptedScript: null,
          sceneResults: [],
        },
      }));
      setError("");

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

        setScriptVideos((prev) => ({
          ...prev,
          [scriptIdx]: {
            ...prev[scriptIdx],
            state: "ready",
            adaptedScript: data,
          },
        }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "שגיאה ביצירת תסריט וידאו");
        setScriptVideos((prev) => ({
          ...prev,
          [scriptIdx]: { ...getVideo(scriptIdx), state: "idle" },
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scriptsList, selectedNiche],
  );

  /* ── Auto-create on page load for first script (WOW effect like creative) ── */
  useEffect(() => {
    if (!scripts || autoCreatedRef.current) return;
    const parts = parseScripts(scripts);
    if (parts.length > 0 && !scriptVideos[0]) {
      autoCreatedRef.current = true;
      handleCreateVideo(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripts]);

  /* ── Update a scene within an adapted script ── */
  const handleUpdateScene = useCallback((scriptIdx: number, sceneNumber: number, updates: Partial<VideoScene>) => {
    setScriptVideos((prev) => {
      const video = prev[scriptIdx];
      if (!video?.adaptedScript) return prev;
      const updatedScenes = video.adaptedScript.scenes.map((s) =>
        s.number === sceneNumber ? { ...s, ...updates } : s
      );
      return {
        ...prev,
        [scriptIdx]: {
          ...video,
          adaptedScript: { ...video.adaptedScript, scenes: updatedScenes },
        },
      };
    });
  }, []);

  /* ── Update voice settings ── */
  const handleUpdateVoice = useCallback((scriptIdx: number, settings: VoiceSettings) => {
    setScriptVideos((prev) => ({
      ...prev,
      [scriptIdx]: { ...prev[scriptIdx], voiceSettings: settings },
    }));
  }, []);

  /* ── Preview voice ── */
  const handlePreviewVoice = useCallback(async (settings: VoiceSettings) => {
    setIsPreviewLoading(true);
    setError("");
    try {
      const sampleText = "שלום, זוהי דוגמה לקול שישמש בסרטון שלך.";
      const res = await fetch("/api/video/generate-voiceover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sampleText,
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
      setError(e instanceof Error ? e.message : "שגיאה ביצירת דוגמת קול");
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);

  /* ── Generate all assets (images + voice over) ── */
  const handleGenerateAll = useCallback(async (scriptIdx: number) => {
    const video = scriptVideos[scriptIdx];
    if (!video?.adaptedScript) return;

    if (videoCount >= VIDEO_LIMIT) {
      setError(`הגעת למגבלת ${VIDEO_LIMIT} סרטונים בתקופת הניסיון. שדרג את התוכנית שלך.`);
      return;
    }

    setScriptVideos((prev) => ({
      ...prev,
      [scriptIdx]: { ...prev[scriptIdx], state: "generating", sceneResults: [] },
    }));
    setError("");

    try {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate assets");

      setScriptVideos((prev) => ({
        ...prev,
        [scriptIdx]: {
          ...prev[scriptIdx],
          state: "done",
          sceneResults: data.scenes || [],
        },
      }));
      setVideoCount((c) => c + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת נכסי וידאו");
      setScriptVideos((prev) => ({
        ...prev,
        [scriptIdx]: { ...prev[scriptIdx], state: "ready" },
      }));
    }
  }, [scriptVideos, projectId, videoCount, VIDEO_LIMIT]);

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
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            יצירת וידאו AI
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            צריך קודם ליצור תסריטים בשלב התסריטים
          </p>
        </div>
      </div>
    );
  }

  const readyCount = Object.values(scriptVideos).filter(
    (v) => v.state === "ready" || v.state === "done"
  ).length;

  return (
    <div className="pb-20 overflow-x-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-in">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            🎬 יצירת וידאו AI
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            סרטון שיווקי של 60 שניות — מופק לגמרי ב-AI
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Video count badge */}
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
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-600 animate-in">
          {error}
        </div>
      )}

      {/* Script cards */}
      <div className="space-y-6">
        {scriptsList.map((scriptText, idx) => {
          const video = getVideo(idx);

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
                  {video.state === "ready" && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      תסריט וידאו מוכן
                    </span>
                  )}
                  {video.state === "done" && (
                    <span className="text-xs font-medium text-[var(--success)] bg-green-50 px-2 py-1 rounded-full">
                      ✓ סרטון מוכן
                    </span>
                  )}
                </div>
              </div>

              {/* ── State: IDLE ── */}
              {video.state === "idle" && (
                <div className="p-8 text-center">
                  {/* Script preview */}
                  <div
                    className="rounded-lg p-3 mb-4 max-h-24 overflow-y-auto text-sm text-[var(--text-secondary)] text-right mx-auto max-w-lg"
                    style={{ backgroundColor: "var(--content-bg)" }}
                  >
                    {scriptText.substring(0, 200)}
                    {scriptText.length > 200 && "..."}
                  </div>
                  <button
                    onClick={() => handleCreateVideo(idx)}
                    disabled={videoCount >= VIDEO_LIMIT}
                    className="btn-gold !py-3 !px-8 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✨ צור סרטון 60 שניות
                  </button>
                  {videoCount >= VIDEO_LIMIT && (
                    <p className="text-xs text-red-500 mt-2">
                      הגעת למגבלת הסרטונים בתקופת הניסיון
                    </p>
                  )}
                </div>
              )}

              {/* ── State: ADAPTING (creating video script) ── */}
              {video.state === "adapting" && (
                <div className="p-8 text-center">
                  <CountdownTimer seconds={8} />
                  <p className="text-sm text-[var(--text-muted)] mt-3">
                    FBM Studio ממיר את התסריט לסרטון 60 שניות...
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="text-xs text-[var(--text-muted)]">5 סצנות B-Roll</span>
                    <span className="text-[var(--text-muted)]">|</span>
                    <span className="text-xs text-[var(--text-muted)]">Voice Over בעברית</span>
                    <span className="text-[var(--text-muted)]">|</span>
                    <span className="text-xs text-[var(--text-muted)]">16:9</span>
                  </div>
                </div>
              )}

              {/* ── State: READY (video script ready, can edit + generate) ── */}
              {video.state === "ready" && video.adaptedScript && (
                <div className="p-5">
                  {/* Edit hint */}
                  <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-[10px] text-xs text-blue-700 dark:text-blue-300 text-center">
                    לחץ על טקסט כלשהו כדי לערוך אותו לפני יצירת הסרטון
                  </div>

                  {/* Video title */}
                  {video.adaptedScript.title && (
                    <h4 className="text-base font-bold text-[var(--text-primary)] mb-3 text-center">
                      {video.adaptedScript.title}
                    </h4>
                  )}

                  {/* Stats bar */}
                  <div
                    className="rounded-lg px-4 py-2.5 mb-4 flex items-center justify-center gap-6 text-sm"
                    style={{
                      backgroundColor: "rgba(212, 168, 67, 0.06)",
                      border: "1px solid rgba(212, 168, 67, 0.15)",
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[var(--text-primary)]">
                        {video.adaptedScript.scenes.length}
                      </span>
                      <span className="text-[var(--text-muted)]">סצנות</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[var(--text-primary)]">
                        {video.adaptedScript.totalDuration}
                      </span>
                      <span className="text-[var(--text-muted)]">שניות</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-muted)]">16:9</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[var(--text-muted)]">עברית</span>
                    </div>
                  </div>

                  {/* Scene cards (editable) */}
                  {video.adaptedScript.scenes.map((scene) => (
                    <SceneCard
                      key={scene.number}
                      scene={scene}
                      isEditing={true}
                      onUpdateScene={(updates) =>
                        handleUpdateScene(idx, scene.number, updates)
                      }
                    />
                  ))}

                  {/* Voice settings */}
                  <div className="mt-4">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">
                      🎙️ הגדרות קריינות
                    </h4>
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
                      onClick={() => handleGenerateAll(idx)}
                      disabled={videoCount >= VIDEO_LIMIT}
                      className="flex-1 py-3.5 rounded-xl text-white font-bold text-[15px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: "linear-gradient(135deg, #22C55E 0%, #16a34a 100%)",
                        boxShadow: "0 4px 16px rgba(34,197,94,0.3)",
                      }}
                    >
                      🎬 צור סרטון מוגמר
                    </button>
                    <button
                      onClick={() => handleCreateVideo(idx)}
                      className="px-4 py-3.5 rounded-xl border-2 border-[var(--card-border)] text-[var(--text-secondary)] font-medium text-sm cursor-pointer hover:border-[var(--gold)] transition-all"
                      title="צור תסריט וידאו מחדש"
                    >
                      🔄
                    </button>
                  </div>
                </div>
              )}

              {/* ── State: GENERATING ── */}
              {video.state === "generating" && (
                <div className="p-8 text-center">
                  <CountdownTimer seconds={45} />
                  <p className="text-sm text-[var(--text-muted)] mt-3">
                    FBM Studio מייצר {video.adaptedScript?.scenes.length || 5} תמונות B-Roll וקריינות...
                  </p>
                  <div className="mt-4 max-w-xs mx-auto">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: "60%",
                          background: "linear-gradient(90deg, #D4A843, #22C55E)",
                          animation: "shimmer 2s infinite",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── State: DONE ── */}
              {video.state === "done" && video.adaptedScript && (
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
                      <h4 className="font-bold text-[var(--text-primary)]">
                        סרטון מוכן!
                      </h4>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {video.sceneResults.filter((s) => s.imageUrl).length} תמונות B-Roll
                        {" + "}
                        {video.sceneResults.filter((s) => s.voiceOverUrl).length} קטעי קריינות
                      </p>
                    </div>
                  </div>

                  {/* Scene cards with results */}
                  {video.adaptedScript.scenes.map((scene) => {
                    const result = video.sceneResults.find(
                      (r) => r.number === scene.number
                    );
                    return (
                      <SceneCard
                        key={scene.number}
                        scene={scene}
                        imageUrl={result?.imageUrl}
                        voiceOverUrl={result?.voiceOverUrl}
                        isEditing={true}
                        onUpdateScene={(updates) =>
                          handleUpdateScene(idx, scene.number, updates)
                        }
                      />
                    );
                  })}

                  {/* Download + Regenerate buttons */}
                  <div className="flex gap-3 mt-4">
                    <a
                      href={`/api/video/download-package?projectId=${projectId}&scriptIndex=${idx}`}
                      download
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all"
                      style={{
                        background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
                        color: "#0F1117",
                        boxShadow: "0 2px 12px rgba(212, 168, 67, 0.3)",
                      }}
                    >
                      📥 הורד הכל (ZIP)
                    </a>
                    <button
                      onClick={() => handleGenerateAll(idx)}
                      disabled={videoCount >= VIDEO_LIMIT}
                      className="px-4 py-3 rounded-xl border-2 border-[var(--card-border)] text-[var(--text-secondary)] font-medium text-sm cursor-pointer hover:border-[var(--gold)] transition-all disabled:opacity-50"
                      title="צור מחדש"
                    >
                      🔄 צור מחדש
                    </button>
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
          {readyCount >= scriptsList.length ? (
            <>
              <h2 className="text-2xl font-bold text-[var(--success)]">כל הסרטונים מוכנים!</h2>
              <p className="text-[var(--text-secondary)] mt-2">
                כל התסריטים הומרו לסרטוני וידאו
              </p>
            </>
          ) : (
            <p className="text-[var(--text-secondary)]">
              {readyCount}/{scriptsList.length} סרטונים מוכנים
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
