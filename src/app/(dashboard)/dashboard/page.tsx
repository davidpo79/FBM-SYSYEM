"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const ALL_STEPS = ["strategy", "niches", "pains", "scripts", "creative", "album"] as const;
const STEP_LABELS: Record<string, string> = {
  strategy: "אסטרטגיה",
  niches: "נישות",
  pains: "כאבים",
  scripts: "תסריטים",
  creative: "קריאייטיב",
  album: "אלבום",
};

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

/** Determine the last active pipeline step for linking */
function getActiveLink(projectId: string, info: PipelineInfo, isCompleted: boolean): string {
  if (isCompleted) return `/project/${projectId}/album`;
  const steps = info.completedSteps;
  if (steps.includes("creative")) return `/project/${projectId}/album`;
  if (steps.includes("scripts")) return `/project/${projectId}/creative`;
  if (steps.includes("pains")) return `/project/${projectId}/scripts`;
  if (steps.includes("niches")) return `/project/${projectId}/pains`;
  if (steps.includes("strategy")) return `/project/${projectId}/niches`;
  return `/project/${projectId}/strategy`;
}

/* ─────────── Stat Icon Gradients ─────────── */
const STAT_GRADIENTS = [
  "linear-gradient(135deg, #818CF8, #6366F1)", // purple-blue
  "linear-gradient(135deg, #34D399, #10B981)", // green
  "linear-gradient(135deg, #FB923C, #F97316)", // orange
  "linear-gradient(135deg, #D4A843, #C49A38)", // gold
];

export default function DashboardPage() {
  const [email, setEmail] = useState("");
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [pipelineMap, setPipelineMap] = useState<Record<string, PipelineInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? "");
      }

      const { data } = await supabase
        .from("projects")
        .select("id, name, user_name, status, created_at")
        .order("created_at", { ascending: false });

      const list = (data as ProjectData[]) ?? [];
      setProjects(list);

      // Load pipeline info from localStorage
      const map: Record<string, PipelineInfo> = {};
      for (const p of list) {
        map[p.id] = getPipelineInfo(p.id);
      }
      setPipelineMap(map);
      setLoading(false);
    }
    load();
  }, []);

  // Split projects
  const inProgress = projects.filter((p) => p.status !== "completed");
  const completed = projects.filter((p) => p.status === "completed");

  // Real stats from localStorage pipeline data
  const totalScripts = Object.values(pipelineMap).reduce((s, info) => s + info.scriptsCount, 0);
  const totalCreatives = Object.values(pipelineMap).reduce((s, info) => s + info.creativesCount, 0);

  const stats = [
    {
      label: "פרויקטים",
      value: `${projects.length}`,
      sub: completed.length > 0 ? `${completed.length} הושלמו` : undefined,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: "תסריטים",
      value: `${totalScripts}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      label: "קריאייטיבים",
      value: `${totalCreatives}`,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" /><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" /><circle cx="6.5" cy="12" r="0.5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
      ),
    },
    {
      label: "תוכנית",
      value: "Pro",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-in">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          שלום{email ? `, ${email.split("@")[0]}` : ""}
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">ברוך הבא ל-FBM Studio</p>
      </div>

      {/* Stats — Rule 7: gradient icons, big numbers, animate-in */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`card-elevated p-6 animate-in delay-${i + 1}`}
            style={{ cursor: "default" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-white"
              style={{ background: STAT_GRADIENTS[i] }}
            >
              {stat.icon}
            </div>
            <div className="text-3xl font-black text-[var(--text-primary)]">{stat.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider">
              {stat.label}
              {stat.sub && <span className="normal-case tracking-normal mr-1">({stat.sub})</span>}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        /* Rule 13: Skeleton loading */
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
      ) : (
        <>
          {/* ── In Progress Section ── */}
          <div className="flex items-center justify-between mb-4 animate-in delay-5">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              פרויקטים בתהליך
              {inProgress.length > 0 && (
                <span className="text-sm font-normal text-[var(--text-muted)] mr-2">
                  ({inProgress.length})
                </span>
              )}
            </h2>
            <Link
              href="/projects"
              className="text-sm text-[var(--gold)] hover:opacity-80 transition-opacity"
            >
              הצג הכל
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* New project card */}
            <Link
              href="/questionnaire"
              className="card-elevated border-2 border-dashed !border-[var(--card-border)] p-6 flex flex-col items-center justify-center gap-3 hover:!border-[var(--gold)] hover:bg-[var(--gold-soft)] group cursor-pointer min-h-[220px] animate-in delay-6"
            >
              <div className="w-12 h-12 rounded-full bg-[var(--gold-soft)] flex items-center justify-center text-[var(--gold)] group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="font-semibold text-[var(--text-primary)]">פרויקט חדש</span>
            </Link>

            {inProgress.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                info={pipelineMap[project.id]}
                isCompleted={false}
                animDelay={i + 7}
              />
            ))}
          </div>

          {/* ── Completed Section ── */}
          {completed.length > 0 && (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  פרויקטים שהושלמו
                  <span className="text-sm font-normal text-[var(--text-muted)] mr-2">
                    ({completed.length})
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map((project, i) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    info={pipelineMap[project.id]}
                    isCompleted
                    animDelay={i + 1}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ─────────── Project Card Component ─────────── */

function ProjectCard({
  project,
  info,
  isCompleted,
  animDelay = 1,
}: {
  project: ProjectData;
  info?: PipelineInfo;
  isCompleted: boolean;
  animDelay?: number;
}) {
  const date = new Date(project.created_at).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const link = info
    ? getActiveLink(project.id, info, isCompleted)
    : `/project/${project.id}/strategy`;

  const completedCount = info ? info.completedSteps.length + (isCompleted ? 1 : 0) : 0;
  const progressPercent = (completedCount / ALL_STEPS.length) * 100;

  return (
    <Link
      href={link}
      className={`card-elevated p-5 cursor-pointer group relative overflow-hidden animate-in delay-${Math.min(animDelay, 8)} ${
        isCompleted
          ? "!border-[var(--success)]/30 border-r-[3px] !border-r-[var(--success)]"
          : ""
      }`}
    >
      {/* Header: status badge + name */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--gold)] transition-colors">
          {project.user_name || project.name}
        </h3>
        <span
          className={`text-[10px] font-medium px-2 py-1 rounded-full flex-shrink-0 flex items-center gap-1 ${
            isCompleted
              ? "bg-green-50 text-[var(--success)]"
              : "bg-[var(--gold-soft)] text-[var(--gold)]"
          }`}
        >
          {!isCompleted && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] status-dot" />
          )}
          {isCompleted ? "הושלם" : "בתהליך"}
        </span>
      </div>

      {/* Niche description */}
      {info?.niche && (
        <p className="text-sm text-[var(--text-secondary)] mb-3 truncate">
          {info.niche}
        </p>
      )}

      {/* Pipeline steps */}
      {info && (
        <div className="flex flex-wrap gap-1 mb-3">
          {ALL_STEPS.map((step) => {
            const done = info.completedSteps.includes(step) || (step === "album" && isCompleted);
            return (
              <span
                key={step}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  done
                    ? "bg-green-50 text-[var(--success)]"
                    : "bg-[var(--content-bg)] text-[var(--text-muted)]"
                }`}
              >
                {done ? "\u2713" : "\u25CB"} {STEP_LABELS[step]}
              </span>
            );
          })}
        </div>
      )}

      {/* Stats row */}
      {info && (info.scriptsCount > 0 || info.creativesCount > 0) && (
        <div className="flex gap-3 mb-3 text-xs text-[var(--text-muted)]">
          {info.scriptsCount > 0 && <span>{info.scriptsCount} תסריטים</span>}
          {info.creativesCount > 0 && <span>{info.creativesCount} קריאייטיבים</span>}
        </div>
      )}

      {/* Date + action */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">{date}</p>
        <span className="text-xs font-medium text-[var(--gold)] group-hover:underline">
          {isCompleted ? "צפה בסיכום \u2190" : "פתח פרויקט \u2190"}
        </span>
      </div>

      {/* Rule 7: Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-100">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${progressPercent}%`,
            background: isCompleted
              ? "linear-gradient(90deg, #22C55E, #16A34A)"
              : "linear-gradient(90deg, #D4A843, #C49A38)",
          }}
        />
      </div>
    </Link>
  );
}
