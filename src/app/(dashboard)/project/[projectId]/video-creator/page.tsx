"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import SceneCard from "@/components/video/SceneCard";
import VoiceSettingsComponent from "@/components/video/VoiceSettings";
import type { AdaptedScript, VoiceSettings, VideoScene, PexelsVideo } from "@/lib/video-types";

/* ── States ── */
type PageState =
  | "idle"
  | "adapting"      // AI is converting script → scenes
  | "searching"     // Searching Pexels for clips
  | "ready"         // Scenes ready with clips, editable
  | "generating"    // FFmpeg composing final MP4
  | "done"          // Video ready
  | "error";

/* ── Progress steps (shown during generation) ── */
const STEPS = [
  { key: "download", label: "מוריד קליפים מ-Pexels" },
  { key: "tts", label: "יוצר קריינות בעברית" },
  { key: "compose", label: "מרכיב סרטון MP4" },
  { key: "upload", label: "מעלה לענן" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

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

  /* ── State ── */
  const [activeScript, setActiveScript] = useState(0);
  const [pageState, setPageState] = useState<PageState>("idle");
  const [adaptedScript, setAdaptedScript] = useState<AdaptedScript | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voice: "female",
    rate: 1.0,
    pitch: 0,
  });
  const [currentStep, setCurrentStep] = useState<StepKey | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [videoCount, setVideoCount] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const autoCreatedRef = useRef(false);

  const VIDEO_LIMIT = 3;

  /* ── Step 1: Adapt script → scenes ── */
  const handleAdaptScript = useCallback(
    async (scriptIdx: number) => {
      if (!scriptsList[scriptIdx]) return;

      setActiveScript(scriptIdx);
      setPageState("adapting");
      setAdaptedScript(null);
      setFinalVideoUrl(null);
      setGlobalError("");

      try {
        // 1a: Adapt script
        const adaptRes = await fetch("/api/video/adapt-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scriptText: scriptsList[scriptIdx],
            niche: selectedNiche?.name || "",
          }),
        });
        const adaptData = await adaptRes.json().catch(() => ({ error: `שגיאת שרת (${adaptRes.status})` }));
        if (!adaptRes.ok) throw new Error(adaptData.error || "שגיאה בהמרת התסריט");

        const adapted = adaptData as AdaptedScript;

        // 1b: Search Pexels clips for each scene
        setPageState("searching");

        const searchRes = await fetch("/api/video/search-clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenes: adapted.scenes.map((s) => ({
              number: s.number,
              searchQuery: s.searchQuery,
              duration: s.duration,
            })),
          }),
        });
        const searchData = await searchRes.json().catch(() => ({ error: `שגיאת חיפוש (${searchRes.status})` }));

        if (searchRes.ok && searchData.scenes) {
          // Merge clips into adapted script
          for (const sceneClips of searchData.scenes as { number: number; clips: PexelsVideo[] }[]) {
            const scene = adapted.scenes.find((s) => s.number === sceneClips.number);
            if (scene) {
              scene.clipOptions = sceneClips.clips;
              scene.selectedClip = sceneClips.clips[0] || undefined;
            }
          }
        }

        setAdaptedScript(adapted);
        setPageState("ready");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "שגיאה ביצירת תסריט הוידאו";
        setPageState("error");
        setGlobalError(msg);
      }
    },
    [scriptsList, selectedNiche],
  );

  /* ── Auto-adapt first script on load ── */
  useEffect(() => {
    if (!scripts || autoCreatedRef.current) return;
    const parts = parseScripts(scripts);
    if (parts.length > 0) {
      autoCreatedRef.current = true;
      handleAdaptScript(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripts]);

  /* ── Update a scene ── */
  const handleUpdateScene = useCallback(
    (sceneNumber: number, updates: Partial<VideoScene>) => {
      setAdaptedScript((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenes: prev.scenes.map((s) =>
            s.number === sceneNumber ? { ...s, ...updates } : s,
          ),
        };
      });
    },
    [],
  );

  /* ── Search new clips for a scene ── */
  const handleSwapClip = useCallback(
    async (sceneNumber: number) => {
      if (!adaptedScript) return;
      const scene = adaptedScript.scenes.find((s) => s.number === sceneNumber);
      if (!scene) return;

      const query = prompt("הכנס מילות חיפוש באנגלית:", scene.searchQuery);
      if (!query) return;

      try {
        const res = await fetch("/api/video/search-clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenes: [{ number: sceneNumber, searchQuery: query, duration: scene.duration }],
          }),
        });
        const data = await res.json();
        if (data.scenes?.[0]?.clips?.length > 0) {
          handleUpdateScene(sceneNumber, {
            searchQuery: query,
            clipOptions: data.scenes[0].clips,
            selectedClip: data.scenes[0].clips[0],
          });
        } else {
          setGlobalError("לא נמצאו קליפים. נסה מילות חיפוש אחרות.");
        }
      } catch {
        setGlobalError("שגיאה בחיפוש קליפים");
      }
    },
    [adaptedScript, handleUpdateScene],
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
      const data = await res.json().catch(() => ({ error: `שגיאת שרת (${res.status})` }));
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

  /* ── Generate final MP4 ── */
  const handleGenerateVideo = useCallback(async () => {
    if (!adaptedScript) return;

    // Check all scenes have clips
    const missingClip = adaptedScript.scenes.find((s) => !s.selectedClip);
    if (missingClip) {
      setGlobalError(`סצנה ${missingClip.number} חסר קליפ וידאו. בחר קליפ לכל סצנה.`);
      return;
    }

    if (videoCount >= VIDEO_LIMIT) {
      setGlobalError(`הגעת למגבלת ${VIDEO_LIMIT} סרטונים בתקופת הניסיון.`);
      return;
    }

    setPageState("generating");
    setCurrentStep("download");
    setGlobalError("");

    // Simulate step progression
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev === "download") return "tts";
        if (prev === "tts") return "compose";
        if (prev === "compose") return "upload";
        return prev;
      });
    }, 8000);

    try {
      const res = await fetch("/api/video/generate-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          adaptedScript,
          voiceSettings,
          scriptIndex: activeScript,
        }),
      });

      clearInterval(stepTimer);

      const data = await res.json().catch(() => ({ error: `שגיאת שרת (${res.status})` }));
      if (!res.ok) throw new Error(data.error || "שגיאה ביצירת הסרטון");

      setFinalVideoUrl(data.videoUrl);
      setPageState("done");
      setVideoCount((c) => c + 1);

      if (data.warning) {
        setGlobalError(data.warning);
      }
    } catch (e) {
      clearInterval(stepTimer);
      const msg = e instanceof Error ? e.message : "שגיאה ביצירת הסרטון";
      setPageState("error");
      setGlobalError(msg);
    }
  }, [adaptedScript, projectId, voiceSettings, activeScript, videoCount]);

  /* ── Redirect if no scripts ── */
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
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">יצירת וידאו</h2>
          <p className="text-sm text-[var(--text-secondary)]">צריך קודם ליצור תסריטים בשלב התסריטים</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 overflow-x-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-in">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">🎬 יצירת וידאו</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            סרטון MP4 של 60 שניות — קליפי סטוק + קריינות + כתוביות
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

      {/* Script selector (if multiple) */}
      {scriptsList.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {scriptsList.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleAdaptScript(idx)}
              disabled={pageState === "generating"}
              className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all whitespace-nowrap disabled:opacity-50"
              style={{
                backgroundColor: activeScript === idx ? "rgba(212, 168, 67, 0.12)" : "var(--content-bg)",
                color: activeScript === idx ? "#D4A843" : "var(--text-secondary)",
                border: activeScript === idx ? "2px solid #D4A843" : "2px solid var(--card-border)",
              }}
            >
              תסריט {idx + 1}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {globalError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-600 animate-in">
          {globalError}
        </div>
      )}

      {/* ── IDLE ── */}
      {pageState === "idle" && (
        <div className="card-static rounded-xl p-8 text-center animate-in">
          <div
            className="rounded-lg p-3 mb-4 max-h-24 overflow-y-auto text-sm text-[var(--text-secondary)] text-right mx-auto max-w-lg"
            style={{ backgroundColor: "var(--content-bg)" }}
          >
            {scriptsList[activeScript]?.substring(0, 200)}
            {(scriptsList[activeScript]?.length || 0) > 200 && "..."}
          </div>
          <button
            onClick={() => handleAdaptScript(activeScript)}
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
      {pageState === "adapting" && (
        <div className="card-static rounded-xl p-8 text-center animate-in">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-[var(--gold)] border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-[var(--text-primary)]">ממיר את התסריט לסצנות וידאו...</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">AI מפרק את התסריט ל-5 סצנות</p>
        </div>
      )}

      {/* ── SEARCHING ── */}
      {pageState === "searching" && (
        <div className="card-static rounded-xl p-8 text-center animate-in">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-[var(--text-primary)]">מחפש קליפים מתאימים...</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">מחפש ב-Pexels קליפי סטוק מקצועיים לכל סצנה</p>
        </div>
      )}

      {/* ── READY (editable scenes with clip previews) ── */}
      {pageState === "ready" && adaptedScript && (
        <div className="animate-in">
          {/* Info banner */}
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-[10px] text-xs text-blue-700 text-center">
            ערוך את הטקסט, החלף קליפים, ולחץ &quot;צור סרטון MP4&quot;
          </div>

          {/* Title */}
          {adaptedScript.title && (
            <h4 className="text-base font-bold text-[var(--text-primary)] mb-3 text-center">
              {adaptedScript.title}
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
            <span><strong>{adaptedScript.scenes.length}</strong> סצנות</span>
            <span><strong>{adaptedScript.totalDuration}</strong> שניות</span>
            <span>16:9</span>
            <span>Pexels B-Roll</span>
          </div>

          {/* Scene cards */}
          {adaptedScript.scenes.map((scene) => (
            <SceneCard
              key={scene.number}
              scene={scene}
              isEditing={true}
              onUpdateScene={(updates) => handleUpdateScene(scene.number, updates)}
              onSwapClip={handleSwapClip}
            />
          ))}

          {/* Voice settings */}
          <div className="mt-4">
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">🎙️ הגדרות קריינות</h4>
            <VoiceSettingsComponent
              settings={voiceSettings}
              onChange={setVoiceSettings}
              onPreview={() => handlePreviewVoice(voiceSettings)}
              isPreviewLoading={isPreviewLoading}
            />
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleGenerateVideo}
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
              onClick={() => handleAdaptScript(activeScript)}
              className="px-4 py-3.5 rounded-xl border-2 border-[var(--card-border)] text-[var(--text-secondary)] font-medium text-sm cursor-pointer hover:border-[var(--gold)] transition-all"
              title="צור תסריט מחדש"
            >
              🔄
            </button>
          </div>
        </div>
      )}

      {/* ── GENERATING (progress) ── */}
      {pageState === "generating" && (
        <div className="card-static rounded-xl p-6 animate-in">
          <h4 className="text-center font-bold text-[var(--text-primary)] mb-5">מייצר את הסרטון שלך...</h4>

          <div className="max-w-md mx-auto space-y-3">
            {STEPS.map((step) => {
              const stepIdx = STEPS.findIndex((s) => s.key === step.key);
              const currentIdx = STEPS.findIndex((s) => s.key === currentStep);
              const isCompleted = stepIdx < currentIdx;
              const isCurrent = step.key === currentStep;

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
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    {isCompleted ? (
                      <span className="text-green-500 text-lg">✓</span>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full border-2 border-[var(--gold)] border-t-transparent animate-spin" />
                    ) : (
                      <span className="text-lg opacity-30">○</span>
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
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] mt-4">
            אל תסגור את הדף. ההרכבה לוקחת 30-90 שניות.
          </p>
        </div>
      )}

      {/* ── ERROR ── */}
      {pageState === "error" && (
        <div className="card-static rounded-xl p-6 text-center animate-in">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center text-xl">
            ❌
          </div>
          <p className="text-sm text-red-600 mb-3">{globalError}</p>
          <button
            onClick={() => handleAdaptScript(activeScript)}
            className="btn-gold !py-2 !px-6 text-sm"
          >
            נסה שוב
          </button>
        </div>
      )}

      {/* ── DONE (video player) ── */}
      {pageState === "done" && finalVideoUrl && (
        <div className="animate-in">
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
                {adaptedScript?.scenes.length || 5} סצנות | קריינות בעברית | כתוביות
              </p>
            </div>
          </div>

          {/* Video player */}
          <div className="rounded-xl overflow-hidden mb-4" style={{ backgroundColor: "#000" }}>
            <video controls className="w-full" style={{ maxHeight: 400 }}>
              <source src={finalVideoUrl} type="video/mp4" />
              הדפדפן שלך לא תומך בנגן וידאו.
            </video>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <a
              href={finalVideoUrl}
              download={`fbm-video-script-${activeScript + 1}.mp4`}
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
              onClick={handleGenerateVideo}
              disabled={videoCount >= VIDEO_LIMIT}
              className="px-4 py-3 rounded-xl border-2 border-[var(--card-border)] text-[var(--text-secondary)] font-medium text-sm cursor-pointer hover:border-[var(--gold)] transition-all disabled:opacity-50"
            >
              🔄 צור מחדש
            </button>
          </div>

          {/* Scene breakdown (expandable) */}
          {adaptedScript && (
            <details className="mt-4">
              <summary className="text-sm font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]">
                📋 הצג סצנות
              </summary>
              <div className="mt-3">
                {adaptedScript.scenes.map((scene) => (
                  <SceneCard key={scene.number} scene={scene} />
                ))}
              </div>
            </details>
          )}

          {/* Continue */}
          <div className="text-center py-6 mt-4">
            <button
              onClick={() => router.push(`/project/${projectId}/copy`)}
              className="btn-gold text-lg !px-8 !py-3"
            >
              המשך לקופי למודעות
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
