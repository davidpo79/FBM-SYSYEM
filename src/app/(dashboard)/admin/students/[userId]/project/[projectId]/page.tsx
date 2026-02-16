"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import MarkdownContent from "@/components/MarkdownContent";

interface NicheData {
  name: string;
  fit_score: number;
  why_perfect_match: string;
  examples: string;
  core_pain: string;
  why_frequency_resonates: string;
}

interface ProjectData {
  id: string;
  userId: string;
  userName: string;
  email: string;
  status: string;
  createdAt: string;
  answersMap: Record<string, string>;
  pipeline: {
    strategy: string;
    strategyApproved: boolean;
    niches: NicheData[];
    selectedNiche: NicheData | null;
    painAnalysis: string;
    scripts: string;
    generatedImages: { url: string; base64?: string; scriptIdx: number }[];
    adCopy: string;
  };
}

const PIPELINE_LABELS: Record<string, string> = {
  strategy: "מסמך תדר וקהלים",
  niches: "נישות",
  pains: "ניתוח כאבים",
  scripts: "תסריטים",
  creative: "קריאייטיב",
  copy: "קופי למודעות",
};

export default function AdminProjectViewPage({
  params,
}: {
  params: Promise<{ userId: string; projectId: string }>;
}) {
  const { userId, projectId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [error, setError] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    strategy: true,
    niches: true,
    pains: true,
    scripts: true,
    creative: true,
    copy: true,
  });

  useEffect(() => {
    async function init() {
      const admin = await isAdmin();
      if (!admin) {
        router.replace("/dashboard");
        return;
      }

      try {
        const res = await fetch(`/api/admin/project/${projectId}`);
        if (!res.ok) throw new Error("Failed to fetch project");
        const data = await res.json();
        setProject(data);
      } catch {
        setError("שגיאה בטעינת הפרויקט");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, projectId]);

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div dir="rtl">
        <div className="mb-6 animate-in">
          <div className="skeleton h-4 w-48 mb-6" />
          <div className="skeleton h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div dir="rtl" className="text-center py-20">
        <p className="text-red-500 text-lg mb-4">{error || "פרויקט לא נמצא"}</p>
        <Link href={`/admin/students/${userId}`} className="text-[var(--gold)] hover:underline">
          חזור לפרטי התלמיד
        </Link>
      </div>
    );
  }

  const { pipeline } = project;
  const hasStrategy = !!pipeline.strategy;
  const hasNiches = Array.isArray(pipeline.niches) && pipeline.niches.length > 0;
  const hasPains = !!pipeline.painAnalysis;
  const hasScripts = !!pipeline.scripts;
  const hasCreatives = pipeline.generatedImages.length > 0;
  const hasCopy = !!pipeline.adCopy;

  const completedCount = [hasStrategy, hasNiches, hasPains, hasScripts, hasCreatives, hasCopy].filter(Boolean).length;

  return (
    <div dir="rtl">
      {/* Back */}
      <Link
        href={`/admin/students/${userId}`}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors mb-6 animate-in"
      >
        <span>&larr;</span>
        <span>חזור לפרטי התלמיד</span>
      </Link>

      {/* Header */}
      <div className="card-elevated p-6 mb-6 animate-in delay-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {project.userName}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {project.email}
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[var(--text-muted)]">
              <span>נוצר: {new Date(project.createdAt).toLocaleDateString("he-IL")}</span>
              <span>סטטוס: {project.status || "פעיל"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{
                background: "linear-gradient(135deg, var(--gold), #C49A38)",
                color: "#0F1117",
              }}
            >
              {completedCount}/6 שלבים הושלמו
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline progress mini */}
      <div className="card-elevated p-4 mb-6 animate-in delay-2">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {Object.entries(PIPELINE_LABELS).map(([key, label], i) => {
            const done =
              (key === "strategy" && hasStrategy) ||
              (key === "niches" && hasNiches) ||
              (key === "pains" && hasPains) ||
              (key === "scripts" && hasScripts) ||
              (key === "creative" && hasCreatives) ||
              (key === "copy" && hasCopy);
            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: done ? "rgba(34, 197, 94, 0.1)" : "var(--content-bg)",
                    color: done ? "#22C55E" : "var(--text-muted)",
                    border: `1px solid ${done ? "rgba(34, 197, 94, 0.3)" : "var(--card-border)"}`,
                  }}
                >
                  {done ? "\u2713" : "\u25CB"} {label}
                </div>
                {i < Object.keys(PIPELINE_LABELS).length - 1 && (
                  <div
                    className="w-4 h-0.5 hidden sm:block"
                    style={{ backgroundColor: done ? "#22C55E" : "var(--card-border)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-4">

        {/* Strategy */}
        <DocumentSection
          title={PIPELINE_LABELS.strategy}
          icon="📊"
          available={hasStrategy}
          open={openSections.strategy}
          onToggle={() => toggleSection("strategy")}
        >
          <MarkdownContent content={pipeline.strategy} />
        </DocumentSection>

        {/* Niches */}
        <DocumentSection
          title={PIPELINE_LABELS.niches}
          icon="🎯"
          available={hasNiches}
          open={openSections.niches}
          onToggle={() => toggleSection("niches")}
        >
          {pipeline.selectedNiche && (
            <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
              <div className="text-sm font-bold text-[#22C55E] mb-1">נישה שנבחרה</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{pipeline.selectedNiche.name}</div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{pipeline.selectedNiche.why_perfect_match}</p>
            </div>
          )}
          <div className="space-y-3">
            {pipeline.niches.map((niche, i) => (
              <div
                key={i}
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: "var(--content-bg)",
                  border: `1px solid ${pipeline.selectedNiche?.name === niche.name ? "var(--gold)" : "var(--card-border)"}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-[var(--text-primary)]">{niche.name}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--gold-soft)", color: "var(--gold)" }}>
                    {niche.fit_score}/10
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{niche.why_perfect_match}</p>
                {niche.core_pain && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">כאב מרכזי: {niche.core_pain}</p>
                )}
              </div>
            ))}
          </div>
        </DocumentSection>

        {/* Pain Analysis */}
        <DocumentSection
          title={PIPELINE_LABELS.pains}
          icon="💡"
          available={hasPains}
          open={openSections.pains}
          onToggle={() => toggleSection("pains")}
        >
          <MarkdownContent content={pipeline.painAnalysis} />
        </DocumentSection>

        {/* Scripts */}
        <DocumentSection
          title={PIPELINE_LABELS.scripts}
          icon="🎬"
          available={hasScripts}
          open={openSections.scripts}
          onToggle={() => toggleSection("scripts")}
        >
          <MarkdownContent content={pipeline.scripts} />
        </DocumentSection>

        {/* Creatives */}
        <DocumentSection
          title={PIPELINE_LABELS.creative}
          icon="🎨"
          available={hasCreatives}
          open={openSections.creative}
          onToggle={() => toggleSection("creative")}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pipeline.generatedImages.map((img, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--card-border)" }}
              >
                {(img.base64 || img.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.base64 || img.url}
                    alt={`קריאייטיב ${i + 1}`}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="aspect-square flex items-center justify-center text-[var(--text-muted)] text-sm" style={{ backgroundColor: "var(--content-bg)" }}>
                    תמונה {i + 1}
                  </div>
                )}
                <div className="p-2 text-center text-xs text-[var(--text-muted)]" style={{ backgroundColor: "var(--content-bg)" }}>
                  תסריט {img.scriptIdx + 1}
                </div>
              </div>
            ))}
          </div>
        </DocumentSection>

        {/* Ad Copy */}
        <DocumentSection
          title={PIPELINE_LABELS.copy}
          icon="📝"
          available={hasCopy}
          open={openSections.copy}
          onToggle={() => toggleSection("copy")}
        >
          <MarkdownContent content={pipeline.adCopy} />
        </DocumentSection>

      </div>

      {/* Answers Map (if available) */}
      {project.answersMap && Object.keys(project.answersMap).length > 0 && (
        <div className="card-elevated p-6 mt-6 animate-in delay-3">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            תשובות שאלון
          </h2>
          <div className="space-y-3">
            {Object.entries(project.answersMap).map(([key, value]) => (
              <div
                key={key}
                className="p-3 rounded-xl"
                style={{
                  backgroundColor: "var(--content-bg)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div className="text-xs font-medium text-[var(--text-muted)] mb-1">{key}</div>
                <div className="text-sm text-[var(--text-primary)]">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Collapsible Document Section ── */
function DocumentSection({
  title,
  icon,
  available,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: string;
  available: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card-elevated overflow-hidden animate-in">
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--content-bg)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
          {available ? (
            <span className="text-xs font-medium text-[#22C55E] bg-green-50 px-2 py-0.5 rounded-full">
              קיים
            </span>
          ) : (
            <span className="text-xs font-medium text-[var(--text-muted)] px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--content-bg)" }}>
              טרם נוצר
            </span>
          )}
        </div>
        <span className="text-[var(--text-muted)] text-sm">
          {open ? "▼" : "▶"}
        </span>
      </button>

      {open && available && (
        <div className="px-5 pb-5 border-t border-[var(--card-border)]">
          <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl p-4" style={{ backgroundColor: "var(--content-bg)" }}>
            {children}
          </div>
        </div>
      )}

      {open && !available && (
        <div className="px-5 pb-5 border-t border-[var(--card-border)]">
          <p className="mt-4 text-sm text-[var(--text-muted)] text-center py-8">
            התלמיד עדיין לא הגיע לשלב הזה
          </p>
        </div>
      )}
    </div>
  );
}
