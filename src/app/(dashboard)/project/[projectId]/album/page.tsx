"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProject } from "../layout";
import { supabase } from "@/lib/supabase";
import JSZip from "jszip";
import { exportToPdf } from "@/lib/pdf-export";
import { downloadBlob } from "@/lib/pdf-export";

type AlbumImage = { url: string; base64?: string; scriptIdx: number };

export default function AlbumPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const {
    project,
    strategy,
    strategyApproved,
    selectedNiche,
    painAnalysis,
    scripts,
    generatedImages,
  } = useProject();

  // Load album images from the new album_${projectId} localStorage key
  const [albumImages, setAlbumImages] = useState<AlbumImage[]>(() => {
    try {
      const saved = localStorage.getItem(`album_${projectId}`);
      return saved ? (JSON.parse(saved) as AlbumImage[]) : [];
    } catch {
      return [];
    }
  });

  // Selection state for download actions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);
  // Re-read album images when page gains focus (in case user added from creative page)
  useEffect(() => {
    const handleFocus = () => {
      try {
        const saved = localStorage.getItem(`album_${projectId}`);
        if (saved) setAlbumImages(JSON.parse(saved) as AlbumImage[]);
      } catch { /* ignore */ }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [projectId]);

  // Track completed status locally so UI reacts immediately
  const [isCompleted, setIsCompleted] = useState(project?.status === "completed");

  useEffect(() => {
    if (project?.status === "completed") setIsCompleted(true);
  }, [project?.status]);

  const [markError, setMarkError] = useState("");

  const handleMarkComplete = async () => {
    if (!projectId) return;
    setMarkError("");

    // Get auth token to pass to API route
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch("/api/complete-project", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ projectId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error("complete-project API error:", res.status, body);
      setMarkError(body.error || "שגיאה בשמירה");
      return;
    }

    setIsCompleted(true);
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
    if (selectedIds.size === displayImages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayImages.map((_, i) => i)));
    }
  };

  // Use album images if available, otherwise fall back to generatedImages
  const displayImages: AlbumImage[] = albumImages.length > 0 ? albumImages : generatedImages;

  // Download single image
  const handleDownloadSingle = useCallback(async (img: AlbumImage, idx: number) => {
    try {
      const src = img.base64 || img.url;
      if (!src) return;

      if (src.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = src;
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

      // Add selected images (or all if none selected)
      const imgFolder = zip.folder("creatives");
      if (imgFolder) {
        const imagesToDownload = selectedIds.size > 0
          ? displayImages.filter((_, i) => selectedIds.has(i))
          : displayImages;

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
  }, [selectedIds, displayImages, strategy, painAnalysis, scripts, selectedNiche, project]);

  // Export summary PDF
  const handleExportSummaryPdf = useCallback(async () => {
    setDownloading(true);
    try {
      const sections: string[] = [];
      sections.push(`# סיכום פרויקט FBM — ${project?.user_name ?? ""}\n`);
      if (strategy) {
        sections.push(`## אסטרטגיה\n${strategy.slice(0, 500)}...\n`);
      }
      if (selectedNiche) {
        sections.push(`## נישה שנבחרה\n${selectedNiche.name}\n${selectedNiche.why_perfect_match}\n`);
      }
      if (painAnalysis) {
        sections.push(`## ניתוח כאבים\n${painAnalysis.slice(0, 500)}...\n`);
      }
      if (scripts) {
        sections.push(`## תסריטים\n${scripts.slice(0, 500)}...\n`);
      }
      sections.push(`\n## קריאטיבים\n${displayImages.length} תמונות נוצרו\n`);

      const blob = await exportToPdf("סיכום פרויקט FBM", sections.join("\n"));
      downloadBlob(blob, `fbm-summary-${project?.user_name ?? "export"}.pdf`);
    } catch (e) {
      console.error("PDF export error:", e);
    } finally {
      setDownloading(false);
    }
  }, [project, strategy, selectedNiche, painAnalysis, scripts, displayImages.length]);

  // Split scripts for counting
  const scriptParts = scripts
    ? scripts.split(/(?=## תסריט \d)/).filter((p) => p.trim().length > 0)
    : [];

  // Summary card component
  const SummaryCard = ({
    title,
    href,
    children,
  }: {
    title: string;
    href: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="w-full text-right card-elevated p-4 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-[var(--success)] flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">{title}</h4>
        </div>
        <span className="text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors text-lg leading-none mt-0.5">
          &larr;
        </span>
      </div>
      {children}
    </button>
  );

  return (
    <div dir="rtl">
      {/* Header — Rule 8: celebration background */}
      <div className="flex items-center justify-between mb-6 relative card-static p-6 animate-in overflow-hidden">
        {/* Celebration glow */}
        {isCompleted && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[20px]">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--gold)] opacity-[0.04] rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[var(--success)] opacity-[0.04] rounded-full blur-3xl" />
          </div>
        )}
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <div className="relative w-8 h-8 flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, rgba(212, 168, 67, 0.35) 0%, rgba(212, 168, 67, 0) 70%)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-lg">📸</div>
            </div>
            אלבום הקריאטיבים
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {albumImages.length > 0
              ? `${albumImages.length} תמונות נבחרו לאלבום`
              : "הפרויקט הושלם! בחר תמונות להורדה או הורד הכל כ-ZIP"}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left - Image gallery */}
        <div className="lg:w-[60%]">
          {displayImages.length === 0 ? (
            <div className="card-static border-2 border-dashed !border-[var(--card-border)] p-12 text-center animate-in delay-1">
              <p className="text-lg font-semibold text-[var(--text-secondary)] mb-2">
                עדיין לא הוספת תמונות לאלבום
              </p>
              <p className="text-[var(--text-muted)] text-sm mb-6">
                חזור לשלב הקריאייטיב ולחץ על &quot;הוסף לאלבום&quot; מתחת לכל תמונה
              </p>
              <button
                type="button"
                onClick={() => router.push(`/project/${projectId}/creative`)}
                className="btn-gold text-sm"
              >
                חזור לקריאייטיב
              </button>
            </div>
          ) : (
            <>
              {/* Select all / actions bar */}
              <div className="flex items-center justify-between mb-4 card-static !rounded-xl px-4 py-2.5 animate-in delay-1">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-sm font-medium text-[var(--gold)] hover:underline cursor-pointer"
                >
                  {selectedIds.size === displayImages.length ? "בטל בחירה" : "בחר הכל"}
                </button>
                <span className="text-xs text-[var(--text-muted)]">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} תמונות נבחרו`
                    : `${displayImages.length} קריאטיבים באלבום`}
                </span>
              </div>

              {/* Image grid */}
              {/* Rule 8: grid-cols-2 for bigger images */}
              <div className="grid grid-cols-2 gap-4">
                {displayImages.map((img, idx) => {
                  const src = img.base64 || img.url;
                  const isSelected = selectedIds.has(idx);
                  return (
                    <div
                      key={idx}
                      className={`relative group rounded-[16px] overflow-hidden border-2 transition-all cursor-pointer animate-in delay-${Math.min(idx + 2, 8)} ${
                        isSelected
                          ? "border-[var(--gold)] shadow-lg scale-[0.98]"
                          : "border-[var(--card-border)] hover:border-[var(--gold)]/50 hover:shadow-lg hover:scale-[1.03]"
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
                          className="w-full object-cover"
                          style={{ aspectRatio: "9/16" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent && !parent.querySelector(".img-fallback")) {
                              const fallback = document.createElement("div");
                              fallback.className = "img-fallback w-full aspect-square bg-[var(--content-bg)] flex items-center justify-center";
                              fallback.innerHTML = `<span class="text-xs text-center px-2 text-[var(--text-muted)]">תמונה לא זמינה — צור מחדש</span>`;
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full bg-[var(--content-bg)] flex items-center justify-center text-[var(--text-muted)]" style={{ aspectRatio: "9/16" }}>
                          <span className="text-xs text-center px-2">תמונה לא זמינה — צור מחדש</span>
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
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    if (selectedIds.size === 0) setSelectedIds(new Set(displayImages.map((_, i) => i)));
                    handleDownloadZip();
                  }}
                  disabled={downloading}
                  className="flex-1 btn-success !py-3.5 text-base"
                >
                  {downloading
                    ? "מכין ZIP..."
                    : selectedIds.size > 0
                      ? `הורד ${selectedIds.size} נבחרות (ZIP)`
                      : "הורד הכל (ZIP)"}
                </button>
                <button
                  onClick={handleExportSummaryPdf}
                  disabled={downloading}
                  className="btn-outline !py-3.5 px-5 text-sm"
                >
                  {downloading ? "..." : "PDF"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right - Project summary */}
        <div className="lg:w-[40%]">
          <div className="sticky top-4 space-y-3">
            {/* Summary header + complete button */}
            <div className="card-static p-5 animate-in delay-1">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                סיכום הפרויקט
              </h3>
              <p className="text-sm text-[var(--text-muted)]">
                {project?.user_name}
              </p>
              {isCompleted ? (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-[var(--success)] rounded-full text-sm font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  הפרויקט הושלם
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  className="mt-3 w-full btn-success !py-3 text-base flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  סיים פרויקט
                </button>
              )}
              {markError && (
                <p className="mt-2 text-xs text-red-500 text-center">{markError}</p>
              )}
            </div>

            {/* Clickable summary cards */}
            {strategyApproved && (
              <SummaryCard title="אסטרטגיה" href={`/project/${projectId}/strategy`}>
                <p className="text-xs text-[var(--text-muted)] line-clamp-2 pr-8">
                  {strategy.slice(0, 150)}...
                </p>
              </SummaryCard>
            )}

            {selectedNiche && (
              <SummaryCard title="נישה שנבחרה" href={`/project/${projectId}/niches`}>
                <p className="text-sm font-semibold text-[var(--gold)] pr-8">{selectedNiche.name}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 pr-8">{selectedNiche.why_perfect_match}</p>
              </SummaryCard>
            )}

            {painAnalysis && (
              <SummaryCard title="ניתוח כאבים" href={`/project/${projectId}/pains`}>
                <p className="text-xs text-[var(--text-muted)] line-clamp-2 pr-8">
                  {painAnalysis.slice(0, 150)}...
                </p>
              </SummaryCard>
            )}

            {scriptParts.length > 0 && (
              <SummaryCard title="תסריטים" href={`/project/${projectId}/scripts`}>
                <div className="flex items-baseline gap-2 pr-8">
                  <span className="text-2xl font-black text-[var(--text-primary)]">{scriptParts.length}</span>
                  <span className="text-sm text-[var(--text-secondary)]">תסריטים נוצרו</span>
                </div>
              </SummaryCard>
            )}

            {displayImages.length > 0 && (
              <SummaryCard title="קריאטיבים" href={`/project/${projectId}/creative`}>
                <div className="flex items-baseline gap-2 pr-8">
                  <span className="text-2xl font-black text-[var(--text-primary)]">{displayImages.length}</span>
                  <span className="text-sm text-[var(--text-secondary)]">תמונות נוצרו</span>
                </div>
              </SummaryCard>
            )}

            {/* Start new project button */}
            <button
              type="button"
              onClick={() => router.push("/questionnaire")}
              className="w-full mt-4 btn-outline !py-4 text-base border-2 border-dashed"
            >
              🔄 התחל פרויקט חדש
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
