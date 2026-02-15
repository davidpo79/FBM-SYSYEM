"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ProjectData {
  id: string;
  name: string;
  user_name: string;
  status: string;
  created_at: string;
}

interface PipelineInfo {
  niche?: string;
  scriptsCount: number;
  creativesCount: number;
  completedSteps: string[];
}

function getPipelineInfo(projectId: string): PipelineInfo {
  try {
    const saved = localStorage.getItem(`fbm-pipeline-${projectId}`);
    if (!saved) return { scriptsCount: 0, creativesCount: 0, completedSteps: [] };
    const data = JSON.parse(saved);
    const completedSteps: string[] = [];
    if (data.strategyApproved) completedSteps.push("strategy");
    if (data.selectedNiche) completedSteps.push("niches");
    if (data.painAnalysis) completedSteps.push("pains");
    if (data.scripts) completedSteps.push("scripts");
    if (data.generatedImages?.length > 0) completedSteps.push("creative");

    const scriptsCount = data.scripts
      ? data.scripts.split(/(?=## תסריט \d)/).filter((p: string) => p.trim().length > 0).length
      : 0;

    return {
      niche: data.selectedNiche?.name,
      scriptsCount,
      creativesCount: data.generatedImages?.length ?? 0,
      completedSteps,
    };
  } catch {
    return { scriptsCount: 0, creativesCount: 0, completedSteps: [] };
  }
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineInfoMap, setPipelineInfoMap] = useState<Record<string, PipelineInfo>>({});

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Action menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("projects")
        .select("id, name, user_name, status, created_at")
        .order("created_at", { ascending: false });

      const projectsList = (data as ProjectData[]) ?? [];
      setProjects(projectsList);
      setLoading(false);

      // Load pipeline info from localStorage
      const infoMap: Record<string, PipelineInfo> = {};
      for (const p of projectsList) {
        infoMap[p.id] = getPipelineInfo(p.id);
      }
      setPipelineInfoMap(infoMap);
    }
    load();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuId]);

  const handleRename = useCallback(async (projectId: string, newName: string) => {
    if (!newName.trim()) return;
    const res = await fetch("/api/update-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, updates: { user_name: newName.trim() } }),
    });

    if (res.ok) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, user_name: newName.trim() } : p))
      );
    }
    setRenamingId(null);
  }, []);

  const handleToggleStatus = useCallback(async (projectId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "in_progress" : "completed";
    const res = await fetch("/api/update-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, updates: { status: newStatus } }),
    });

    if (res.ok) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
      );
    }
  }, []);

  const handleDelete = useCallback(async (projectId: string) => {
    if (!confirm("למחוק את הפרויקט?")) return;

    const res = await fetch("/api/delete-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      localStorage.removeItem(`fbm-pipeline-${projectId}`);
      localStorage.removeItem(`album_${projectId}`);
    }
  }, []);

  const handleDuplicate = useCallback(async (projectId: string) => {
    const res = await fetch("/api/duplicate-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    if (res.ok) {
      const newProject = await res.json();
      setProjects((prev) => [newProject, ...prev]);
      router.push(`/project/${newProject.id}/strategy`);
    }
  }, [router]);

  const stepLabels: Record<string, string> = {
    strategy: "אסטרטגיה",
    niches: "נישות",
    pains: "כאבים",
    scripts: "תסריטים",
    creative: "קריאייטיב",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">הפרויקטים שלי</h1>
        <Link
          href="/questionnaire"
          className="px-5 py-2.5 bg-[var(--gold)] text-white font-semibold rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
        >
          פרויקט חדש
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card-static p-5 space-y-3">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card-static border-2 border-dashed !border-[var(--card-border)] p-12 text-center">
          <p className="text-[var(--text-muted)] mb-4">עדיין אין לך פרויקטים</p>
          <Link
            href="/questionnaire"
            className="px-5 py-2.5 bg-[var(--gold)] text-white font-semibold rounded-[10px] hover:opacity-90 transition-opacity inline-block"
          >
            צור את הפרויקט הראשון
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const date = new Date(project.created_at).toLocaleDateString("he-IL", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            const isCompleted = project.status === "completed";
            const info = pipelineInfoMap[project.id];
            const isRenaming = renamingId === project.id;
            const isMenuOpen = openMenuId === project.id;

            return (
              <div
                key={project.id}
                className="card-elevated p-5 group relative"
              >
                {/* Action menu (3 dots) */}
                <div className="absolute top-3 left-3" ref={isMenuOpen ? menuRef : undefined}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenMenuId(isMenuOpen ? null : project.id);
                    }}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none px-1 py-0.5 rounded transition-colors cursor-pointer"
                    title="פעולות"
                  >
                    &#8942;
                  </button>
                  {isMenuOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-[var(--card-border)] py-1 min-w-[120px] z-50">
                      <button
                        type="button"
                        className="w-full text-right px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--content-bg)] transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(null);
                          setRenamingId(project.id);
                          setRenameValue(project.user_name || project.name);
                        }}
                      >
                        שנה שם
                      </button>
                      <button
                        type="button"
                        className="w-full text-right px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--content-bg)] transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleDuplicate(project.id);
                        }}
                      >
                        שכפל
                      </button>
                      <button
                        type="button"
                        className="w-full text-right px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleDelete(project.id);
                        }}
                      >
                        מחק
                      </button>
                    </div>
                  )}
                </div>

                {/* Header: name + status */}
                <div className="flex items-start justify-between mb-2">
                  {isRenaming ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleRename(project.id, renameValue); }}
                      className="flex-1 ml-2"
                    >
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRename(project.id, renameValue)}
                        onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                        className="w-full px-2 py-1 text-sm font-bold border border-[var(--gold)] rounded-lg bg-[var(--content-bg)] text-[var(--text-primary)] text-right focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                      />
                    </form>
                  ) : (
                    <h3
                      className="font-bold text-[var(--text-primary)] group-hover:text-[var(--gold)] transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        setRenamingId(project.id);
                        setRenameValue(project.user_name || project.name);
                      }}
                      title="לחץ לשינוי שם"
                    >
                      {project.user_name || project.name}
                    </h3>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleStatus(project.id, project.status);
                    }}
                    className={`text-[10px] font-medium px-2 py-1 rounded-full cursor-pointer transition-colors flex-shrink-0 ${
                      isCompleted
                        ? "bg-green-50 text-[var(--success)] hover:bg-green-100"
                        : "bg-[var(--gold-soft)] text-[var(--gold)] hover:bg-[var(--gold-glow)]"
                    }`}
                    title="לחץ לשינוי סטטוס"
                  >
                    {isCompleted ? "הושלם" : "בתהליך"}
                  </button>
                </div>

                {/* Niche */}
                {info?.niche && (
                  <p className="text-sm text-[var(--text-secondary)] mb-2 truncate">
                    {info.niche}
                  </p>
                )}

                {/* Pipeline progress */}
                {info && info.completedSteps.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(["strategy", "niches", "pains", "scripts", "creative"] as const).map((step) => {
                      const done = info.completedSteps.includes(step);
                      return (
                        <span
                          key={step}
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            done
                              ? "bg-green-50 text-[var(--success)]"
                              : "bg-[var(--content-bg)] text-[var(--text-muted)]"
                          }`}
                        >
                          {done ? "\u2713" : "\u2022"} {stepLabels[step]}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Stats */}
                {info && (info.scriptsCount > 0 || info.creativesCount > 0) && (
                  <div className="flex gap-3 mb-3 text-xs text-[var(--text-muted)]">
                    {info.scriptsCount > 0 && (
                      <span>{info.scriptsCount} תסריטים</span>
                    )}
                    {info.creativesCount > 0 && (
                      <span>{info.creativesCount} קריאטיבים</span>
                    )}
                  </div>
                )}

                {/* Date + Link */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--text-muted)]">{date}</p>
                  <Link
                    href={isCompleted ? `/project/${project.id}/album` : `/project/${project.id}/strategy`}
                    className="text-xs font-medium text-[var(--gold)] hover:underline"
                  >
                    {isCompleted ? <>צפה בסיכום &larr;</> : <>פתח פרויקט &larr;</>}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
