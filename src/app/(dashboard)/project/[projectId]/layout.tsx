"use client";

import { useEffect, useRef, useState, createContext, useContext, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PipelineStepper from "@/components/layout/PipelineStepper";
import TopBar from "@/components/layout/TopBar";
import AutoSaveIndicator from "@/components/AutoSaveIndicator";
import { exportToPdf, downloadBlob } from "@/lib/pdf-export";
import { downloadAllAsZip } from "@/lib/zip-export";

/* ──────────────── types ──────────────── */

export type ProjectMode = "self" | "client" | "owner";

export interface ProjectRow {
  id: string;
  user_name: string;
  answers_map: Record<string, string>;
  owner_niche?: string;
  status: string;
  track?: "fbm" | "gtm";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pipeline_data?: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gtm_onboarding_data?: Record<string, any> | null;
}

export interface Niche {
  name: string;
  fit_score: number;
  why_perfect_match: string;
  examples: string;
  core_pain: string;
  why_frequency_resonates: string;
}

export interface VersionEntry {
  content: string;
  timestamp: string;
}

export interface VersionHistory {
  strategy: VersionEntry[];
  painAnalysis: VersionEntry[];
  scripts: VersionEntry[];
  adCopy: VersionEntry[];
}

export interface ProjectContextValue {
  project: ProjectRow | null;
  projectMode: ProjectMode;
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
  // Version history
  versionHistory: VersionHistory;
  pushVersion: (step: keyof VersionHistory, content: string) => void;
  restoreVersion: (step: keyof VersionHistory, index: number) => void;
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
  const [userTrack, setUserTrack] = useState<"fbm" | "gtm">("fbm");
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

  // Version history
  const emptyHistory: VersionHistory = { strategy: [], painAnalysis: [], scripts: [], adCopy: [] };
  const [versionHistory, setVersionHistory] = useState<VersionHistory>(emptyHistory);

  const pushVersion = useCallback((step: keyof VersionHistory, content: string) => {
    if (!content) return;
    const entry: VersionEntry = {
      content,
      timestamp: new Date().toLocaleString("he-IL"),
    };
    setVersionHistory((prev) => ({
      ...prev,
      [step]: [...prev[step], entry],
    }));
  }, []);

  const restoreVersion = useCallback((step: keyof VersionHistory, index: number) => {
    setVersionHistory((prev) => {
      const entry = prev[step][index];
      if (!entry) return prev;
      const setters: Record<keyof VersionHistory, (s: string) => void> = {
        strategy: setStrategy,
        painAnalysis: setPainAnalysis,
        scripts: setScripts,
        adCopy: setAdCopy,
      };
      setters[step](entry.content);
      return prev;
    });
  }, []);

  // Downloads
  const [downloading, setDownloading] = useState<string | null>(null);

  // Persistence
  const [hydrated, setHydrated] = useState(false);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch user's track from profile (user-level, not project-level)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("user_profiles")
        .select("track")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.track === "gtm") setUserTrack("gtm");
        });
    });
  }, []);

  useEffect(() => {
    async function load() {
      const { data, error: dbErr } = await supabase
        .from("projects")
        .select("id, user_name, answers_map, owner_niche, status, pipeline_data, gtm_onboarding_data, track")
        .eq("id", projectId)
        .single();

      if (dbErr || !data) {
        console.error("Project load error:", dbErr);
        setError(dbErr?.message || "הפרויקט לא נמצא");
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
      if (data.versionHistory) setVersionHistory(data.versionHistory as VersionHistory);
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
    setIsSaving(true);
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
        versionHistory,
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
      setIsSaving(false);
      setSaveTrigger((prev) => prev + 1);
    }, 500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [hydrated, projectId, strategy, strategyApproved, niches, selectedNiche, painAnalysis, scripts, generatedImages, adCopy, versionHistory]);

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

  // Use user-level track as the source of truth for which system to show
  const isGtmProject = userTrack === "gtm";

  // Determine pipeline steps
  const steps = isGtmProject
    ? [
        { key: "gtm-strategy", label: "אסטרטגיית GTM", href: `/project/${projectId}/gtm-strategy` },
      ]
    : [
        { key: "strategy", label: "אסטרטגיה", href: `/project/${projectId}/strategy` },
        { key: "niches", label: "נישות", href: `/project/${projectId}/niches` },
        { key: "pains", label: "ניתוח כאבים", href: `/project/${projectId}/pains` },
        { key: "scripts", label: "תסריטים", href: `/project/${projectId}/scripts` },
        { key: "creative", label: "קריאייטיב", href: `/project/${projectId}/creative` },
        { key: "video-creator", label: "וידאו", href: `/project/${projectId}/video-creator` },
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
    "gtm-strategy": "אסטרטגיית GTM",
    niches: "מחקר נישות",
    pains: "ניתוח כאבים",
    scripts: "תסריטים",
    creative: "קריאייטיב",
    copy: "קופי + צ'אטבוט",
    album: "אלבום הקריאטיבים",
    "video-creator": "יצירת וידאו",
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
        projectMode: (project?.answers_map?._project_mode as ProjectMode) || "client",
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
        versionHistory,
        pushVersion,
        restoreVersion,
        handleDownloadPdf,
        handleDownloadAll,
        downloading,
      }}
    >
      <div>
        {isGtmProject ? (
          <>
            {/* GTM: Animated RTL Stepper header */}
            <div style={{ padding: "24px 0 0", maxWidth: 900, margin: "0 auto" }}>
              <GTMAnimatedStepper currentStage="strategy" />
            </div>
            <div className="max-w-5xl mx-auto mt-6">
              {children}
            </div>
          </>
        ) : (
          <>
            <TopBar
              breadcrumbs={[
                { label: project?.user_name ?? "פרויקט" },
                { label: pageLabels[currentStepKey] ?? "" },
              ]}
              actions={
                <div className="flex items-center gap-3">
                  <AutoSaveIndicator trigger={saveTrigger} saving={isSaving} />
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
          </>
        )}
      </div>
    </ProjectContext.Provider>
  );
}

/* ─── GTM Animated RTL Stepper (3 steps: רעיון -> משתמש -> אסטרטגיה) ─── */

function GTMAnimatedStepper({ currentStage }: { currentStage: "idea" | "user" | "strategy" }) {
  const stages = [
    { key: "idea", label: "רעיון", icon: "💡" },
    { key: "user", label: "משתמש", icon: "👤" },
    { key: "strategy", label: "אסטרטגיה", icon: "🚀" },
  ] as const;

  const currentIdx = stages.findIndex((s) => s.key === currentStage);

  return (
    <div dir="rtl" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "16px 0" }}>
      {stages.map((stage, i) => {
        const isCompleted = i < currentIdx;
        const isActive = i === currentIdx;
        const isPending = i > currentIdx;

        return (
          <div key={stage.key} style={{ display: "flex", alignItems: "center" }}>
            {/* Step circle */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  ...(isCompleted
                    ? {
                        background: "linear-gradient(135deg, #00FF88, #00CC6A)",
                        color: "#080A0F",
                        boxShadow: "0 0 16px rgba(0,255,136,0.4)",
                      }
                    : isActive
                      ? {
                          background: "rgba(0,255,136,0.15)",
                          border: "2px solid #00FF88",
                          color: "#00FF88",
                          boxShadow: "0 0 20px rgba(0,255,136,0.3)",
                          animation: "gtmStepPulse 2s ease-in-out infinite",
                        }
                      : {
                          background: "#1E2D45",
                          border: "2px solid #2A3A55",
                          color: "#6B7FA3",
                        }),
                }}
              >
                {isCompleted ? "✓" : stage.icon}
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 6,
                  fontFamily: "monospace",
                  color: isCompleted ? "#00FF88" : isActive ? "#00FF88" : "#6B7FA3",
                  textShadow: isActive ? "0 0 8px rgba(0,255,136,0.4)" : "none",
                }}
              >
                {stage.label}
              </span>
            </div>

            {/* Connector line */}
            {i < stages.length - 1 && (
              <div
                style={{
                  width: 64,
                  height: 2,
                  margin: "0 8px",
                  marginBottom: 22,
                  borderRadius: 1,
                  background: isCompleted
                    ? "linear-gradient(90deg, #00FF88, #00CC6A)"
                    : "#1E2D45",
                  transition: "all 0.5s ease",
                  boxShadow: isCompleted ? "0 0 8px rgba(0,255,136,0.3)" : "none",
                }}
              />
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes gtmStepPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(0,255,136,0.3); }
          50% { box-shadow: 0 0 24px rgba(0,255,136,0.5); }
        }
      `}</style>
    </div>
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
