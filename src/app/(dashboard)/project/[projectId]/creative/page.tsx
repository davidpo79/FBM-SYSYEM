"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import CreativeEditor from "@/components/creatives/CreativeEditor";
import type { CreativeSuggestion, CreativeResponse } from "@/types";

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

  const [activeScriptIdx, setActiveScriptIdx] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<CreativeSuggestion | null>(null);
  const [creativeError, setCreativeError] = useState("");
  const [modalImage, setModalImage] = useState<{
    url: string;
    base64?: string;
    scriptIdx: number;
  } | null>(null);

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

  const handleSuggestCreative = useCallback(
    async (scriptIdx: number) => {
      const scriptParts = splitScripts(scripts);
      const scriptText = scriptParts[scriptIdx] ?? "";
      setActiveScriptIdx(scriptIdx);
      setSuggestion(null);
      setCreativeError("");

      try {
        const res = await fetch("/api/suggest-creative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scriptText }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setSuggestion(json.suggestion as CreativeSuggestion);
      } catch (e) {
        console.error("Suggest creative error:", e);
        setActiveScriptIdx(null);
        setCreativeError("שגיאה ביצירת הצעת קריאטיב. נסה שוב.");
      }
    },
    [scripts],
  );

  const handleGenerateCreative = useCallback(
    async (config: {
      mainText: string;
      subtitle?: string;
      cta: string;
      background: string;
      color: string;
      userInfo: { name: string; role: string; niche: string };
      showProfile?: boolean;
      profileImage?: string;
      displayName?: string;
      displayRole?: string;
      fontSize?: string;
      textPosition?: string;
      format?: string;
      designVision?: string;
    }) => {
      setCreativeError("");
      try {
        const res = await fetch("/api/generate-creatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const text = await res.text();
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(`שגיאת שרת (${res.status}): ${text.slice(0, 100)}`);
        }
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Generation failed");
        }

        const newImage = {
          url: json.imageUrl,
          base64: json.imageBase64,
          scriptIdx: activeScriptIdx ?? 0,
        };
        setGeneratedImages((prev) => {
          const filtered = prev.filter((img) => img.scriptIdx !== (activeScriptIdx ?? 0));
          return [...filtered, newImage];
        });
        setModalImage(newImage);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Generate creative error:", msg, e);
        setCreativeError(`שגיאה ביצירת התמונה: ${msg}`);
      }
    },
    [activeScriptIdx, setGeneratedImages],
  );

  if (!scripts) return null;

  const scriptParts = splitScripts(scripts);
  const allDone = generatedImages.length > 0 && generatedImages.length >= scriptParts.length;

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
        קריאייטיב - תמונות לפרסום
      </h2>

      <div className="space-y-6">
        {scriptParts.map((scriptText, idx) => {
          const hasImage = generatedImages.some((img) => img.scriptIdx === idx);
          const imageForScript = generatedImages.find((img) => img.scriptIdx === idx);

          return (
            <div
              key={idx}
              className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] overflow-hidden"
            >
              <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-primary)]">תסריט {idx + 1}</h3>
                {hasImage && (
                  <span className="text-xs font-medium text-[var(--success)] bg-green-50 px-2 py-1 rounded-full">
                    קריאטיב נוצר
                  </span>
                )}
              </div>

              {/* Generated image */}
              {hasImage && imageForScript && (
                <div className="p-5 border-b border-[var(--card-border)]">
                  {(imageForScript.url || imageForScript.base64) ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageForScript.url || imageForScript.base64}
                        alt={`קריאטיב לתסריט ${idx + 1}`}
                        className="w-full max-w-md mx-auto rounded-[10px] shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setModalImage(imageForScript)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                      <div className="hidden w-full max-w-md mx-auto rounded-[10px] bg-[var(--content-bg)] border border-[var(--card-border)] p-8 text-center">
                        <p className="text-[var(--text-muted)] text-sm">התמונה לא זמינה - צור מחדש</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full max-w-md mx-auto rounded-[10px] bg-[var(--content-bg)] border border-[var(--card-border)] p-8 text-center">
                      <p className="text-[var(--text-muted)] text-sm">התמונה לא זמינה - צור מחדש</p>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <button
                      onClick={() => setModalImage(imageForScript)}
                      className="px-4 py-2 text-sm font-medium bg-[var(--content-bg)] text-[var(--text-secondary)] rounded-[10px] hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      הגדל תמונה
                    </button>
                    {(imageForScript.url || imageForScript.base64) && (
                      <a
                        href={imageForScript.url || imageForScript.base64}
                        download={`creative-${idx + 1}.png`}
                        className="px-4 py-2 text-sm font-medium bg-[var(--success)] text-white rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        הורד תמונה
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Creative editor */}
              {activeScriptIdx === idx && suggestion && project && (
                <div className="p-5 border-b border-[var(--card-border)]">
                  {creativeError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-600">
                      {creativeError}
                    </div>
                  )}
                  <CreativeEditor
                    suggestion={suggestion}
                    userInfo={{
                      name: project.user_name,
                      role: selectedNiche?.name ?? "",
                      niche: selectedNiche?.name ?? "",
                    }}
                    generatedImage={imageForScript ? { url: imageForScript.url, base64: imageForScript.base64 } : null}
                    onGenerate={handleGenerateCreative}
                    scriptIdx={idx}
                  />
                </div>
              )}

              {/* Action button */}
              {activeScriptIdx !== idx && (
                <div className="p-5">
                  {creativeError && activeScriptIdx === null && (
                    <p className="text-sm text-red-600 mb-2">{creativeError}</p>
                  )}
                  <button
                    onClick={() => handleSuggestCreative(idx)}
                    className={`px-5 py-2.5 font-semibold rounded-[10px] transition-all cursor-pointer ${
                      hasImage
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "bg-[var(--gold)] hover:opacity-90 text-white"
                    }`}
                  >
                    {hasImage ? "ערוך ויצור מחדש" : "צור קריאייטיב לתסריט"}
                  </button>
                </div>
              )}

              {/* Loading suggestion */}
              {activeScriptIdx === idx && !suggestion && !creativeError && (
                <div className="p-5 text-center">
                  <CountdownTimer seconds={10} />
                  <p className="text-sm text-[var(--text-muted)] mt-2">
                    FBM Studio מנתח את התסריט ומציע קריאטיב...
                  </p>
                </div>
              )}

              {/* Loading error */}
              {activeScriptIdx === idx && !suggestion && creativeError && (
                <div className="p-5">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-600 mb-3">
                    {creativeError}
                  </div>
                  <button
                    onClick={() => handleSuggestCreative(idx)}
                    className="px-5 py-2.5 bg-[var(--gold)] hover:opacity-90 text-white font-semibold rounded-[10px] transition-opacity cursor-pointer"
                  >
                    נסה שוב
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All done */}
      {allDone && (
        <div className="text-center py-8 bg-green-50 border border-green-200 rounded-[16px] mt-6">
          <h2 className="text-2xl font-bold text-[var(--success)]">הכל מוכן!</h2>
          <p className="text-[var(--text-secondary)] mt-2">
            כל התסריטים והקריאטיבים נוצרו בהצלחה
          </p>
          <button
            onClick={() => router.push(`/project/${projectId}/album`)}
            className="mt-4 px-8 py-3 text-lg font-bold bg-[var(--gold)] text-white rounded-[12px] hover:opacity-90 transition-opacity cursor-pointer"
          >
            עבור לאלבום הקריאטיבים
          </button>
        </div>
      )}

      {/* Image lightbox modal */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-[var(--card-bg)] rounded-[16px] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-3 left-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer text-lg"
            >
              &times;
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={modalImage.url || modalImage.base64}
              alt={`קריאטיב לתסריט ${modalImage.scriptIdx + 1}`}
              className="w-full"
            />
            <div className="p-4 flex items-center justify-between" dir="rtl">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">
                קריאטיב לתסריט {modalImage.scriptIdx + 1}
              </p>
              <a
                href={modalImage.url || modalImage.base64}
                download={`creative-${modalImage.scriptIdx + 1}.png`}
                className="px-5 py-2.5 bg-[var(--success)] text-white font-semibold rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
              >
                הורד תמונה באיכות גבוהה
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
