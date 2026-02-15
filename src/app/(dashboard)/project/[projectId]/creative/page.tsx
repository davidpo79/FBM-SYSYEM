"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";
import CanvasEditor from "@/components/creatives/CanvasEditor";
import type { CreativeSuggestion } from "@/types";

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

  // Background images per script (separate from old generatedImages for backward compat)
  const [bgImages, setBgImages] = useState<Record<number, string>>({});

  // Album — save rendered canvas PNGs
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

  /* ── Suggest creative (AI analysis of script) ── */
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

  /* ── Generate background only (AI image) ── */
  const handleGenerateBackground = useCallback(
    async (config: {
      background: string;
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

        const bgSrc = json.imageBase64 || json.imageUrl || "";
        const idx = activeScriptIdx ?? 0;

        // Store background image
        setBgImages((prev) => ({ ...prev, [idx]: bgSrc }));

        // Also update generatedImages for pipeline compatibility
        const newImage = {
          url: json.imageUrl || "",
          base64: json.imageBase64 || "",
          scriptIdx: idx,
        };
        setGeneratedImages((prev) => {
          const filtered = prev.filter((img) => img.scriptIdx !== idx);
          return [...filtered, newImage];
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Generate background error:", msg, e);
        setCreativeError(`שגיאה ביצירת הרקע: ${msg}`);
      }
    },
    [activeScriptIdx, setGeneratedImages],
  );

  /* ── Save rendered canvas to album ── */
  const handleSaveToAlbum = useCallback(
    (base64: string, scriptIdx: number) => {
      setAlbumImages((prev) => {
        const exists = prev.some((img) => img.scriptIdx === scriptIdx);
        const next = exists
          ? prev.map((img) => img.scriptIdx === scriptIdx ? { ...img, base64, url: "" } : img)
          : [...prev, { url: "", base64, scriptIdx }];
        localStorage.setItem(albumStorageKey, JSON.stringify(next));
        window.dispatchEvent(new StorageEvent("storage", { key: albumStorageKey }));
        return next;
      });
    },
    [albumStorageKey],
  );

  if (!scripts) return null;

  const scriptParts = splitScripts(scripts);
  const allDone = generatedImages.length > 0 && generatedImages.length >= scriptParts.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 animate-in">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          קריאייטיב - עורך Canvas
        </h2>
        {albumImages.length > 0 && (
          <span className="text-sm font-medium text-[var(--gold)] bg-[var(--gold-soft)] px-3 py-1.5 rounded-full">
            {albumImages.length}/{scriptParts.length} נוספו לאלבום
          </span>
        )}
      </div>

      <div className="space-y-6">
        {scriptParts.map((scriptText, idx) => {
          const hasImage = generatedImages.some((img) => img.scriptIdx === idx);
          const bgForScript = bgImages[idx] || generatedImages.find((img) => img.scriptIdx === idx)?.base64 || generatedImages.find((img) => img.scriptIdx === idx)?.url || null;

          return (
            <div
              key={idx}
              className={`card-static overflow-hidden animate-in delay-${Math.min(idx + 1, 8)}`}
            >
              <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-primary)]">תסריט {idx + 1}</h3>
                <div className="flex items-center gap-2">
                  {hasImage && (
                    <span className="text-xs font-medium text-[var(--success)] bg-green-50 px-2 py-1 rounded-full">
                      רקע נוצר
                    </span>
                  )}
                  {isInAlbum(idx) && (
                    <span className="text-xs font-medium text-[var(--gold)] bg-[var(--gold-soft)] px-2 py-1 rounded-full">
                      באלבום
                    </span>
                  )}
                </div>
              </div>

              {/* Canvas Editor */}
              {activeScriptIdx === idx && suggestion && project && (
                <div className="p-5 border-b border-[var(--card-border)]">
                  {creativeError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-600">
                      {creativeError}
                    </div>
                  )}
                  <CanvasEditor
                    suggestion={suggestion}
                    userInfo={{
                      name: project.user_name,
                      role: selectedNiche?.name ?? "",
                      niche: selectedNiche?.name ?? "",
                    }}
                    backgroundImage={bgForScript}
                    onGenerateBackground={handleGenerateBackground}
                    onSaveToAlbum={handleSaveToAlbum}
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
                    className={hasImage ? "btn-outline !py-2.5 !px-5 text-sm" : "btn-gold !py-2.5 !px-5 text-sm"}
                  >
                    {hasImage ? "ערוך קריאייטיב" : "צור קריאייטיב לתסריט"}
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
        <div className="text-center py-8 bg-green-50 border border-green-200 rounded-[20px] mt-6 animate-in">
          <h2 className="text-2xl font-bold text-[var(--success)]">הכל מוכן!</h2>
          <p className="text-[var(--text-secondary)] mt-2">
            כל התסריטים והקריאטיבים נוצרו בהצלחה
          </p>
          {albumImages.length > 0 && (
            <p className="text-sm text-[var(--gold)] font-medium mt-1">
              {albumImages.length} תמונות נבחרו לאלבום
            </p>
          )}
          <button
            onClick={() => router.push(`/project/${projectId}/album`)}
            className="mt-4 btn-gold text-lg !px-8 !py-3"
          >
            עבור לאלבום הקריאטיבים
          </button>
        </div>
      )}
    </div>
  );
}
