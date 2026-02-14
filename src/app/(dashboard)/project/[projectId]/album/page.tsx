"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useProject } from "../layout";
import { supabase } from "@/lib/supabase";
import JSZip from "jszip";
import { exportToPdf } from "@/lib/pdf-export";
import { downloadBlob } from "@/lib/pdf-export";
import FBMLogo from "@/components/FBMLogo";

export default function AlbumPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    project,
    strategy,
    strategyApproved,
    selectedNiche,
    niches,
    painAnalysis,
    scripts,
    generatedImages,
  } = useProject();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const markedComplete = useRef(false);

  // Mark project as completed when there are images
  useEffect(() => {
    if (markedComplete.current || !project) return;
    if (generatedImages.length === 0) return;
    markedComplete.current = true;
    supabase
      .from("projects")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", projectId)
      .then(() => {});
  }, [project, projectId, generatedImages.length]);

  const handleMarkComplete = async () => {
    await supabase
      .from("projects")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", projectId);
    markedComplete.current = true;
  };

  const toggleSelect = (idx: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === generatedImages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(generatedImages.map((_, i) => i)));
    }
  };

  // Download single image
  const handleDownloadSingle = useCallback(async (img: { url: string; base64?: string }, idx: number) => {
    try {
      const src = img.url || img.base64;
      if (!src) return;

      if (img.base64?.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = img.base64;
        a.download = `creative-${idx + 1}.png`;
        a.click();
        return;
      }

      const res = await fetch(src);
      const blob = await res.blob();
      downloadBlob(blob, `creative-${idx + 1}.png`);
    } catch (e) {
      console.error("Download error:", e);
    }
  }, []);

  // Download selected as ZIP
  const handleDownloadZip = useCallback(async () => {
    setDownloading(true);
    try {
      const zip = new JSZip();

      // Add documents
      const docsFolder = zip.folder("documents");
      if (docsFolder && strategy) {
        const pdfBlob = await exportToPdf("מסמך אסטרטגיה FBM", strategy);
        docsFolder.file("strategy.pdf", pdfBlob);
      }
      if (docsFolder && painAnalysis) {
        const pdfBlob = await exportToPdf(`ניתוח כאבים - ${selectedNiche?.name ?? ""}`, painAnalysis);
        docsFolder.file("pain-analysis.pdf", pdfBlob);
      }
      if (docsFolder && scripts) {
        const pdfBlob = await exportToPdf("תסריטי וידאו FBM", scripts);
        docsFolder.file("scripts.pdf", pdfBlob);
      }

      // Add selected images
      const imgFolder = zip.folder("creatives");
      if (imgFolder) {
        const imagesToDownload = selectedIds.size > 0
          ? generatedImages.filter((_, i) => selectedIds.has(i))
          : generatedImages;

        for (let i = 0; i < imagesToDownload.length; i++) {
          const img = imagesToDownload[i];
          if (img.base64?.startsWith("data:")) {
            const raw = img.base64.replace(/^data:image\/\w+;base64,/, "");
            imgFolder.file(`creative-${i + 1}.png`, raw, { base64: true });
          } else if (img.url) {
            try {
              const res = await fetch(img.url);
              const blob = await res.blob();
              imgFolder.file(`creative-${i + 1}.png`, blob);
            } catch { /* skip */ }
          }
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `fbm-project-${project?.user_name ?? "export"}.zip`);
    } catch (e) {
      console.error("ZIP error:", e);
    } finally {
      setDownloading(false);
    }
  }, [selectedIds, generatedImages, strategy, painAnalysis, scripts, selectedNiche, project]);

  // Split scripts for counting
  const scriptParts = scripts
    ? scripts.split(/(?=## תסריט \d)/).filter((p) => p.trim().length > 0)
    : [];

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FBMLogo size={24} />
            אלבום הקריאטיבים
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            הפרויקט הושלם! בחר תמונות להורדה או הורד הכל כ-ZIP
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left - Image gallery */}
        <div className="lg:w-[60%]">
          {generatedImages.length === 0 ? (
            <div className="bg-[var(--card-bg)] border-2 border-dashed border-[var(--card-border)] rounded-[16px] p-12 text-center">
              <p className="text-[var(--text-muted)] mb-2">עדיין לא נוצרו קריאטיבים.</p>
              <p className="text-[var(--text-muted)] text-sm mb-6">
                חזור לשלב הקריאייטיב ולחץ על יצירת תמונות
              </p>
              {!markedComplete.current && (
                <>
                  <div className="text-[var(--text-muted)] text-xs mb-4">— או —</div>
                  <button
                    type="button"
                    onClick={handleMarkComplete}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--success)] text-white font-semibold rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    סמן פרויקט כהושלם בכל זאת
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Select all / actions bar */}
              <div className="flex items-center justify-between mb-4 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[10px] px-4 py-2.5">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm font-medium text-[var(--gold)] hover:underline cursor-pointer"
                >
                  {selectedIds.size === generatedImages.length ? "בטל בחירה" : "בחר הכל"}
                </button>
                <span className="text-xs text-[var(--text-muted)]">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} תמונות נבחרו`
                    : `${generatedImages.length} קריאטיבים`}
                </span>
              </div>

              {/* Image grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {generatedImages.map((img, idx) => {
                  const src = img.url || img.base64;
                  const isSelected = selectedIds.has(idx);
                  return (
                    <div
                      key={idx}
                      className={`relative group rounded-[12px] overflow-hidden border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-[var(--gold)] shadow-lg"
                          : "border-[var(--card-border)] hover:border-[var(--gold)]/50"
                      }`}
                      onClick={() => toggleSelect(idx)}
                    >
                      {/* Checkbox */}
                      <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-[var(--gold)] border-[var(--gold)]"
                          : "bg-black/30 border-white/50 group-hover:border-white"
                      }`}>
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      {/* Image */}
                      {src ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={src}
                          alt={`קריאטיב ${idx + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-[var(--content-bg)] flex items-center justify-center text-[var(--text-muted)]">
                          תמונה לא זמינה
                        </div>
                      )}

                      {/* Overlay with download button */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between">
                          <span className="text-white text-xs font-medium">תסריט {img.scriptIdx + 1}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadSingle(img, idx);
                            }}
                            className="text-[10px] bg-white/20 text-white px-2 py-1 rounded-lg hover:bg-white/40 transition-colors cursor-pointer"
                          >
                            הורד
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Download buttons */}
              <div className="mt-6 space-y-3">
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleDownloadZip}
                    disabled={downloading}
                    className="w-full py-3.5 text-base font-bold bg-[var(--gold)] text-white rounded-[10px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                  >
                    {downloading ? "מכין ZIP..." : `הורד ${selectedIds.size} תמונות נבחרות + מסמכים (ZIP)`}
                  </button>
                )}
                <button
                  onClick={() => { setSelectedIds(new Set(generatedImages.map((_, i) => i))); handleDownloadZip(); }}
                  disabled={downloading}
                  className={`w-full py-4 text-lg font-bold rounded-[12px] transition-all disabled:opacity-50 cursor-pointer ${
                    selectedIds.size > 0
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-[var(--gold)] hover:opacity-90 text-white"
                  }`}
                >
                  {downloading ? "מכין ZIP..." : "הורד הכל ב-ZIP (מסמכים + קריאטיבים)"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right - Project summary */}
        <div className="lg:w-[40%]">
          <div className="sticky top-4 space-y-4">
            {/* Summary header */}
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-5">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                סיכום הפרויקט
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                {project?.user_name}
              </p>

              {/* Completion badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-[var(--success)] rounded-full text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                הפרויקט הושלם
              </div>
            </div>

            {/* Strategy summary */}
            {strategyApproved && (
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--success)] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">אסטרטגיה</h4>
                </div>
                <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                  {strategy.slice(0, 150)}...
                </p>
              </div>
            )}

            {/* Niche */}
            {selectedNiche && (
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--success)] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">נישה שנבחרה</h4>
                </div>
                <p className="text-sm font-semibold text-[var(--gold)]">{selectedNiche.name}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{selectedNiche.why_perfect_match}</p>
              </div>
            )}

            {/* Pains */}
            {painAnalysis && (
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--success)] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">ניתוח כאבים</h4>
                </div>
                <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                  {painAnalysis.slice(0, 150)}...
                </p>
              </div>
            )}

            {/* Scripts */}
            {scriptParts.length > 0 && (
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--success)] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">תסריטים</h4>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{scriptParts.length} תסריטי וידאו נוצרו</p>
              </div>
            )}

            {/* Creatives stats */}
            {generatedImages.length > 0 && (
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--success)] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">קריאטיבים</h4>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{generatedImages.length} תמונות נוצרו</p>
              </div>
            )}

            {/* Questionnaire answers */}
            {project?.answers_map && Object.keys(project.answers_map).length > 0 && (
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-4">
                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3">פרטי השאלון</h4>
                <div className="space-y-2">
                  {Object.entries(project.answers_map).slice(0, 6).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="font-medium text-[var(--text-secondary)]">{key}: </span>
                      <span className="text-[var(--text-muted)]">{String(value).slice(0, 80)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
