"use client";

import { useEffect, useRef, useState, createContext, useContext, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PipelineStepper from "@/components/layout/PipelineStepper";
import TopBar from "@/components/layout/TopBar";
import { exportToPdf, downloadBlob } from "@/lib/pdf-export";
import { downloadAllAsZip } from "@/lib/zip-export";

/* ──────────────── types ──────────────── */

export interface ProjectRow {
  id: string;
  user_name: string;
  answers_map: Record<string, string>;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipeline_data?: Record<string, any> | null;
}

export interface Niche {
  name: string;
  fit_score: number;
  why_perfect_match: string;
  examples: string;
  core_pain: string;
  why_frequency_resonates: string;
}

export interface ProjectContextValue {
  project: ProjectRow | null;
  loading: boolean;
  error: string;
  // Strategy
  strategy: string;
  setStrategy: (s: string) => void;
  strategyApproved: boolean;
  setStrategyApproved: (v: boolean) => void;
  // Niches
  niches: Niche[];
  setNiches: (n: Niche[]) => void;
  selectedNiche: Niche | null;
  setSelectedNiche: (n: Niche | null) => void;
  // Pains
  painAnalysis: string;
  setPainAnalysis: (s: string) => void;
  // Scripts
  scripts: string;
  setScripts: (s: string) => void;
  // Creatives
  generatedImages: { url: string; base64?: string; scriptIdx: number }[];
  setGeneratedImages: React.Dispatch<React.SetStateAction<{ url: string; base64?: string; scriptIdx: number }[]>>;
  // Copy
  adCopy: string;
  setAdCopy: (s: string) => void;
  // Downloads
  handleDownloadPdf: (title: string, content: string, filename: string) => Promise<void>;
  handleDownloadAll: () => Promise<void>;
  downloading: string | null;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectLayout");
  return ctx;
}

/* ──────────────── layout ──────────────── */

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pipeline state
  const [strategy, setStrategy] = useState("");
  const [strategyApproved, setStrategyApproved] = useState(false);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);
  const [painAnalysis, setPainAnalysis] = useState("");
  const [scripts, setScripts] = useState("");
  const [generatedImages, setGeneratedImages] = useState<
    { url: string; base64?: string; scriptIdx: number }[]
  >([]);
  const [adCopy, setAdCopy] = useState("");

  // Downloads
  const [downloading, setDownloading] = useState<string | null>(null);

  // Persistence
  const [hydrated, setHydrated] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error: dbErr } = await supabase
        .from("projects")
        .select("id, user_name, answers_map, status, pipeline_data")
        .eq("id", projectId)
        .single();

      if (dbErr || !data) {
        setError("הפרויקט לא נמצא");
        setLoading(false);
        return;
      }
      setProject(data as ProjectRow);
      setLoading(false);
    }
    load();
  }, [projectId]);

  // Hydrate pipeline state from localStorage, fallback to Supabase pipeline_data
  useEffect(() => {
    if (loading) return;
    if (!project) { setHydrated(true); return; }

    // Helper to apply pipeline data from any source
    const applyPipelineData = (data: Record<string, unknown>) => {
      if (data.strategy) setStrategy(data.strategy as string);
      if (data.strategyApproved) setStrategyApproved(true);
      if ((data.niches as unknown[])?.length) setNiches(data.niches as Niche[]);
      if (data.selectedNiche) setSelectedNiche(data.selectedNiche as Niche);
      if (data.painAnalysis) setPainAnalysis(data.painAnalysis as string);
      if (data.scripts) setScripts(data.scripts as string);
      if ((data.generatedImages as unknown[])?.length) setGeneratedImages(data.generatedImages as { url: string; base64?: string; scriptIdx: number }[]);
      if (data.adCopy) setAdCopy(data.adCopy as string);
    };

    let loaded = false;
    try {
      const saved = localStorage.getItem(`fbm-pipeline-${projectId}`);
      if (saved) {
        const data = JSON.parse(saved);
        // Only consider it loaded if there's actual content
        if (data.strategy || data.scripts || data.selectedNiche) {
          applyPipelineData(data);
          loaded = true;
        }
      }
    } catch (e) {
      console.error("Failed to load pipeline from localStorage:", e);
    }

    // Fallback: load from Supabase pipeline_data (critical for mobile!)
    if (!loaded && project.pipeline_data) {
      try {
        applyPipelineData(project.pipeline_data as Record<string, unknown>);
        // Re-save to localStorage so it's available next time
        try {
          localStorage.setItem(`fbm-pipeline-${projectId}`, JSON.stringify(project.pipeline_data));
        } catch { /* quota exceeded — ignore */ }
      } catch (e) {
        console.error("Failed to load pipeline from Supabase:", e);
      }
    }

    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, project, projectId]);

  // Save pipeline state to localStorage + Supabase (debounced)
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const data = {
        strategy,
        strategyApproved,
        niches,
        selectedNiche,
        painAnalysis,
        scripts,
        // Save URLs; keep base64 only when URL is missing (upload failed fallback)
        generatedImages: generatedImages.map(({ url, base64, scriptIdx }) => ({
          url,
          scriptIdx,
          ...((!url && base64) ? { base64 } : {}),
        })),
        adCopy,
      };
      // Save to localStorage (primary)
      try {
        localStorage.setItem(`fbm-pipeline-${projectId}`, JSON.stringify(data));
      } catch (e) {
        console.error("Failed to save pipeline to localStorage:", e);
      }
      // Save to Supabase (background, don't block)
      fetch("/api/save-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, pipelineData: data }),
      }).catch(() => { /* ignore — localStorage is the primary store */ });
    }, 500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [hydrated, projectId, strategy, strategyApproved, niches, selectedNiche, painAnalysis, scripts, generatedImages, adCopy]);

  const handleDownloadPdf = useCallback(async (title: string, content: string, filename: string) => {
    setDownloading(filename);
    try {
      const blob = await exportToPdf(title, content);
      downloadBlob(blob, filename);
    } catch (e) {
      console.error("PDF export error:", e);
    } finally {
      setDownloading(null);
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
    setDownloading("zip");
    try {
      const documents = [];
      const userName = project?.user_name ?? "export";
      if (strategy) {
        documents.push({ title: "מסמך אסטרטגיה FBM", content: strategy, filename: `${userName} מסמך תדר וקהלים.pdf` });
      }
      if (painAnalysis) {
        documents.push({ title: `ניתוח כאבים - ${selectedNiche?.name ?? ""}`, content: painAnalysis, filename: `${userName} מסמך נישות.pdf` });
      }
      if (scripts) {
        documents.push({ title: "תסריטי וידאו FBM", content: scripts, filename: `${userName} תסריטים.pdf` });
      }
      const images = generatedImages.map((img, i) => ({
        url: img.url,
        base64: img.base64,
        filename: `creative-${i + 1}.png`,
      }));
      await downloadAllAsZip(documents, images, `${userName} פרויקט FBM.zip`);
    } catch (e) {
      console.error("ZIP export error:", e);
    } finally {
      setDownloading(null);
    }
  }, [strategy, painAnalysis, scripts, generatedImages, selectedNiche, project]);

  // Determine pipeline steps
  const steps = [
    { key: "strategy", label: "אסטרטגיה", href: `/project/${projectId}/strategy` },
    { key: "niches", label: "נישות", href: `/project/${projectId}/niches` },
    { key: "pains", label: "ניתוח כאבים", href: `/project/${projectId}/pains` },
    { key: "scripts", label: "תסריטים", href: `/project/${projectId}/scripts` },
    { key: "creative", label: "קריאייטיב", href: `/project/${projectId}/creative` },
    { key: "copy", label: "קופי", href: `/project/${projectId}/copy` },
    { key: "album", label: "אלבום", href: `/project/${projectId}/album` },
  ];

  const completedSteps: string[] = [];
  if (strategyApproved) completedSteps.push("strategy");
  if (selectedNiche) completedSteps.push("niches");
  if (painAnalysis) completedSteps.push("pains");
  if (scripts) completedSteps.push("scripts");
  if (generatedImages.length > 0) completedSteps.push("creative");
  if (adCopy) completedSteps.push("copy");

  // Current step from pathname
  const currentStepKey = pathname.split("/").pop() || "strategy";

  // Page labels for breadcrumb
  const pageLabels: Record<string, string> = {
    strategy: "אסטרטגיית FBM",
    niches: "מחקר נישות",
    pains: "ניתוח כאבים",
    scripts: "תסריטים",
    creative: "קריאייטיב",
    copy: "קופי + צ'אטבוט",
    album: "אלבום הקריאטיבים",
  };

  if (loading || !hydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[var(--gold)]/30 border-t-[var(--gold)] rounded-full animate-spin" />
          <span className="text-[var(--text-muted)] text-sm">טוען פרויקט...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-red-600 mb-4">שגיאה</h1>
        <p className="text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  return (
    <ProjectContext.Provider
      value={{
        project,
        loading,
        error,
        strategy,
        setStrategy,
        strategyApproved,
        setStrategyApproved,
        niches,
        setNiches,
        selectedNiche,
        setSelectedNiche,
        painAnalysis,
        setPainAnalysis,
        scripts,
        setScripts,
        generatedImages,
        setGeneratedImages,
        adCopy,
        setAdCopy,
        handleDownloadPdf,
        handleDownloadAll,
        downloading,
      }}
    >
      <div>
        <TopBar
          breadcrumbs={[
            { label: project?.user_name ?? "פרויקט" },
            { label: pageLabels[currentStepKey] ?? "" },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <FbmExpertButton />
            </div>
          }
        />

        <div className="max-w-5xl mx-auto mt-6">
          <PipelineStepper
            steps={steps}
            currentStep={currentStepKey}
            completedSteps={completedSteps}
          />
          {children}
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

/* ─── FBM Expert Button (top bar) ─── */

function FbmExpertButton() {
  const handleClick = () => {
    // Dispatch custom event to toggle expert panel (handled by dashboard layout)
    window.dispatchEvent(new CustomEvent("toggle-fbm-expert"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[10px] cursor-pointer transition-all hover:opacity-90"
      style={{
        background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
        color: "#0F1117",
        boxShadow: "0 2px 8px rgba(212, 168, 67, 0.3)",
        animation: "goldGlow 2s ease-in-out infinite alternate",
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <circle cx="12" cy="5" r="4" />
        <line x1="8" y1="16" x2="8" y2="16.01" />
        <line x1="16" y1="16" x2="16" y2="16.01" />
      </svg>
      מומחה FBM אישי
    </button>
  );
}
