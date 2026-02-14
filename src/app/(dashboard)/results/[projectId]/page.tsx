"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import CreativeEditor from "@/components/creatives/CreativeEditor";
import type { CreativeSuggestion, CreativeResponse } from "@/types";
import { exportToPdf, downloadBlob } from "@/lib/pdf-export";
import { downloadAllAsZip } from "@/lib/zip-export";

/* ──────────────── types ──────────────── */

interface ProjectRow {
  id: string;
  user_name: string;
  answers_map: Record<string, string>;
  status: string;
}

interface Niche {
  name: string;
  fit_score: number;
  why_perfect_match: string;
  examples: string;
  core_pain: string;
  why_frequency_resonates: string;
}

type PipelineStep =
  | "loading"
  | "strategy"
  | "niches"
  | "pains"
  | "scripts"
  | "creatives"
  | "done"
  | "error";

/* ──────────────── countdown helper ──────────────── */

function CountdownTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setRemaining(seconds);
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const left = Math.max(0, seconds - elapsed);
      setRemaining(left);
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  return (
    <div className="inline-flex flex-col items-center">
      <div className="text-4xl font-bold text-blue-600 tabular-nums">
        {remaining > 0 ? `${remaining}` : "..."}
      </div>
      <span className="text-sm text-gray-500 mt-1">
        {remaining > 0 ? "שניות לסיום המשוער" : "עוד רגע..."}
      </span>
    </div>
  );
}

/* ──────────────── component ──────────────── */

export default function ResultsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // project data
  const [project, setProject] = useState<ProjectRow | null>(null);

  // pipeline state
  const [step, setStep] = useState<PipelineStep>("loading");
  const [error, setError] = useState("");

  // AI outputs
  const [strategy, setStrategy] = useState("");
  const [niches, setNiches] = useState<Niche[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);
  const [painAnalysis, setPainAnalysis] = useState("");
  const [scripts, setScripts] = useState("");

  // script editing
  const [editingScriptIdx, setEditingScriptIdx] = useState<number | null>(null);
  const [editedScripts, setEditedScripts] = useState<Record<number, string>>({});

  // creative flow
  const [activeScriptIdx, setActiveScriptIdx] = useState<number | null>(null);
  const [suggestion, setSuggestion] = useState<CreativeSuggestion | null>(null);
  const [generatedImages, setGeneratedImages] = useState<
    { url: string; base64?: string; scriptIdx: number }[]
  >([]);

  // image modal
  const [modalImage, setModalImage] = useState<{
    url: string;
    base64?: string;
    scriptIdx: number;
  } | null>(null);

  /* ── load project ── */
  useEffect(() => {
    async function load() {
      const { data, error: dbErr } = await supabase
        .from("projects")
        .select("id, user_name, answers_map, status")
        .eq("id", projectId)
        .single();

      if (dbErr || !data) {
        setError("Project not found");
        setStep("error");
        return;
      }
      setProject(data as ProjectRow);
      setStep("strategy");
    }
    load();
  }, [projectId]);

  /* ── step 1: strategy ── */
  useEffect(() => {
    if (step !== "strategy" || !project) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/generate-strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userName: project.user_name,
            answers: project.answers_map,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) {
          setStrategy(json.strategy);
          setStep("niches");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Strategy generation failed");
          setStep("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [step, project]);

  /* ── step 2: niches ── */
  useEffect(() => {
    if (step !== "niches" || !strategy) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/generate-niches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strategyDocument: strategy }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) {
          setNiches(json.niches ?? []);
          // stay on "niches" — user picks one
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Niches generation failed");
          setStep("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [step, strategy]);

  /* ── step 3: pains (after user selects niche) ── */
  useEffect(() => {
    if (step !== "pains" || !selectedNiche) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/generate-pains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategyDocument: strategy,
            selectedNiche: selectedNiche.name,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) {
          setPainAnalysis(json.painAnalysis);
          setStep("scripts");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Pain analysis failed");
          setStep("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [step, selectedNiche, strategy]);

  /* ── step 4: scripts ── */
  useEffect(() => {
    if (step !== "scripts" || !painAnalysis) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/generate-scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strategyDocument: strategy,
            painAnalysis,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (!cancelled) {
          setScripts(json.scripts);
          setStep("creatives");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Script generation failed");
          setStep("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [step, painAnalysis, strategy]);

  /* ── helpers ── */
  const selectNiche = (n: Niche) => {
    setSelectedNiche(n);
    setStep("pains");
  };

  const goBackToNiches = () => {
    setSelectedNiche(null);
    setPainAnalysis("");
    setScripts("");
    setStep("niches");
  };

  const goBackToPains = () => {
    setScripts("");
    setStep("pains");
  };

  const splitScripts = (raw: string): string[] => {
    // scripts are separated by "## תסריט" headings
    const parts = raw.split(/(?=## תסריט \d)/);
    return parts.filter((p) => p.trim().length > 0);
  };

  // creative error (separate from pipeline error)
  const [creativeError, setCreativeError] = useState("");

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
      cta: string;
      background: string;
      color: string;
      userInfo: { name: string; role: string; niche: string };
      profileImage?: string;
      displayName?: string;
      displayRole?: string;
    }) => {
      setCreativeError("");
      try {
        const res = await fetch("/api/generate-creatives", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const json: CreativeResponse = await res.json();
        if (!res.ok || !json.success) throw new Error("Generation failed");

        const newImage = {
          url: json.imageUrl,
          base64: json.imageBase64,
          scriptIdx: activeScriptIdx ?? 0,
        };
        setGeneratedImages((prev) => [...prev, newImage]);
        setSuggestion(null);
        setActiveScriptIdx(null);
        // Open modal to show the image
        setModalImage(newImage);
      } catch (e) {
        console.error("Generate creative error:", e);
        setCreativeError("שגיאה ביצירת התמונה. נסה שוב.");
        // Keep editor open (don't reset activeScriptIdx) so user can retry
      }
    },
    [activeScriptIdx],
  );

  /* ──────────────── PDF / ZIP downloads ──────────────── */
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  const handleDownloadPdf = async (title: string, content: string, filename: string) => {
    setDownloading(filename);
    setDownloadError("");
    try {
      const blob = await exportToPdf(title, content);
      downloadBlob(blob, filename);
    } catch (e) {
      console.error("PDF export error:", e);
      setDownloadError("שגיאה ביצירת ה-PDF. נסה שוב.");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading("zip");
    try {
      const documents = [];
      if (strategy) {
        documents.push({
          title: "מסמך אסטרטגיה FBM",
          content: strategy,
          filename: "strategy.pdf",
        });
      }
      if (painAnalysis) {
        documents.push({
          title: `ניתוח כאבים - ${selectedNiche?.name ?? ""}`,
          content: painAnalysis,
          filename: "pain-analysis.pdf",
        });
      }
      if (scripts) {
        documents.push({
          title: "תסריטי וידאו FBM",
          content: scripts,
          filename: "scripts.pdf",
        });
      }

      const images = generatedImages.map((img, i) => ({
        url: img.url,
        base64: img.base64,
        filename: `creative-${i + 1}.png`,
      }));

      await downloadAllAsZip(
        documents,
        images,
        `fbm-project-${project?.user_name ?? "export"}.zip`,
      );
    } catch (e) {
      console.error("ZIP export error:", e);
      setDownloadError("שגיאה ביצירת ה-ZIP. נסה שוב.");
    } finally {
      setDownloading(null);
    }
  };

  /* ──────────────── progress indicator ──────────────── */
  const stepsOrder: PipelineStep[] = [
    "strategy",
    "niches",
    "pains",
    "scripts",
    "creatives",
  ];
  const stepLabels: Record<string, string> = {
    strategy: "אסטרטגיה",
    niches: "נישות",
    pains: "ניתוח כאבים",
    scripts: "תסריטים",
    creatives: "קריאטיב (תמונה)",
  };
  const currentStepIdx = stepsOrder.indexOf(step);

  /* ──────────────── render ──────────────── */
  if (step === "error") {
    return (
      <div className="max-w-3xl mx-auto text-center py-20" dir="rtl">
        <h1 className="text-2xl font-bold text-red-600 mb-4">שגיאה</h1>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      {/* ── progress bar ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {stepsOrder.map((s, i) => {
            const done = i < currentStepIdx || step === "done";
            const active = i === currentStepIdx;
            return (
              <div key={s} className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    done
                      ? "bg-green-500 text-white"
                      : active
                        ? "bg-blue-600 text-white animate-pulse"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  className={`text-xs mt-1 ${active ? "font-bold text-blue-600" : "text-gray-500"}`}
                >
                  {stepLabels[s]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-700"
            style={{
              width: `${Math.max(5, ((currentStepIdx + (step === "done" ? 1 : 0.5)) / stepsOrder.length) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* ── loading state ── */}
      {step === "loading" && (
        <div className="text-center py-20">
          <CountdownTimer seconds={5} />
          <p className="mt-4 text-gray-600 dark:text-gray-400">טוען פרויקט...</p>
        </div>
      )}

      {/* ── step 1: strategy generating ── */}
      {step === "strategy" && (
        <div className="text-center py-20">
          <CountdownTimer seconds={30} />
          <h2 className="text-xl font-bold mt-4 text-gray-900 dark:text-gray-100">
            יוצר אסטרטגיית FBM...
          </h2>
          <p className="text-gray-500 mt-2">
            FBM Studio מנתח את התשובות שלך ובונה מסמך אסטרטגיה מותאם אישית
          </p>
        </div>
      )}

      {/* ── strategy done → show niches ── */}
      {strategy && (
        <section className="mb-8">
          <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <summary className="cursor-pointer p-4 font-semibold text-gray-900 dark:text-gray-100">
              1. מסמך אסטרטגיה (לחץ לפתיחה)
            </summary>
            <div className="p-4 pt-0 prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {strategy}
            </div>
            <div className="p-4 pt-0">
              <button
                onClick={() => handleDownloadPdf("מסמך אסטרטגיה FBM", strategy, "strategy.pdf")}
                disabled={downloading === "strategy.pdf"}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {downloading === "strategy.pdf" ? "מייצא..." : "הורד כ-PDF"}
              </button>
            </div>
          </details>
        </section>
      )}

      {/* ── step 2: niches selection ── */}
      {step === "niches" && niches.length === 0 && (
        <div className="text-center py-12">
          <CountdownTimer seconds={15} />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            מזהה נישות מושלמות...
          </p>
        </div>
      )}

      {step === "niches" && niches.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            2. בחר נישה
          </h2>
          <p className="text-gray-500 mb-4">
            FBM Studio זיהה 3 נישות שמתאימות לתדר שלך. בחר את הנישה שהכי מדברת אליך:
          </p>
          <div className="grid gap-4">
            {niches.map((niche, i) => (
              <button
                key={i}
                onClick={() => selectNiche(niche)}
                className="text-right p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {niche.name}
                  </h3>
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-bold px-2 py-1 rounded-lg">
                    {niche.fit_score}/10
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {niche.why_perfect_match}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold">כאב מרכזי:</span>{" "}
                  {niche.core_pain}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── step 3: pains generating ── */}
      {step === "pains" && (
        <div className="text-center py-12">
          <CountdownTimer seconds={20} />
          <h2 className="text-xl font-bold mt-4 text-gray-900 dark:text-gray-100">
            מנתח כאבים של &quot;{selectedNiche?.name}&quot;...
          </h2>
        </div>
      )}

      {painAnalysis && (
        <section className="mb-8">
          <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <summary className="cursor-pointer p-4 font-semibold text-gray-900 dark:text-gray-100">
              3. ניתוח כאבים - {selectedNiche?.name} (לחץ לפתיחה)
            </summary>
            <div className="p-4 pt-0 prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {painAnalysis}
            </div>
            <div className="p-4 pt-0">
              <button
                onClick={() =>
                  handleDownloadPdf(
                    `ניתוח כאבים - ${selectedNiche?.name ?? ""}`,
                    painAnalysis,
                    "pain-analysis.pdf",
                  )
                }
                disabled={downloading === "pain-analysis.pdf"}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {downloading === "pain-analysis.pdf" ? "מייצא..." : "הורד כ-PDF"}
              </button>
            </div>
          </details>
          {/* back button */}
          <button
            onClick={goBackToNiches}
            className="mt-3 inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
          >
            &larr; חזרה לבחירת נישה
          </button>
        </section>
      )}

      {/* ── step 4: scripts generating ── */}
      {step === "scripts" && (
        <div className="text-center py-12">
          <CountdownTimer seconds={25} />
          <h2 className="text-xl font-bold mt-4 text-gray-900 dark:text-gray-100">
            כותב תסריטים...
          </h2>
          <p className="text-gray-500 mt-2">3 תסריטי וידאו מותאמים אישית</p>
        </div>
      )}

      {/* ── step 5: creatives (scripts ready) ── */}
      {scripts && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              4. תסריטים + קריאטיב (תמונה)
            </h2>
            <button
              onClick={() => {
                // Build final scripts with edits applied
                const parts = splitScripts(scripts);
                const finalScripts = parts.map((s, i) => editedScripts[i] ?? s).join("\n\n");
                handleDownloadPdf("תסריטי וידאו FBM", finalScripts, "scripts.pdf");
              }}
              disabled={downloading === "scripts.pdf"}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {downloading === "scripts.pdf" ? "מייצא..." : "הורד תסריטים כ-PDF"}
            </button>
          </div>

          {splitScripts(scripts).map((scriptText, idx) => {
            const hasImage = generatedImages.some((img) => img.scriptIdx === idx);
            const imageForScript = generatedImages.find(
              (img) => img.scriptIdx === idx,
            );
            const isEditing = editingScriptIdx === idx;
            const displayText = editedScripts[idx] ?? scriptText;

            return (
              <div
                key={idx}
                className="mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden"
              >
                {/* script header */}
                <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">
                    תסריט {idx + 1}
                  </h3>
                  <button
                    onClick={() => {
                      if (isEditing) {
                        setEditingScriptIdx(null);
                      } else {
                        if (!(idx in editedScripts)) {
                          setEditedScripts((prev) => ({ ...prev, [idx]: scriptText }));
                        }
                        setEditingScriptIdx(idx);
                      }
                    }}
                    className="text-sm px-3 py-1.5 rounded-lg transition-colors cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    {isEditing ? "סיום עריכה" : "עריכה"}
                  </button>
                </div>

                {/* script content - editable or read-only */}
                {isEditing ? (
                  <div className="p-4">
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                      מומלץ לא לשנות את התסריט באופן משמעותי - תיקונים קטנים בלבד
                    </p>
                    <textarea
                      value={editedScripts[idx] ?? scriptText}
                      onChange={(e) =>
                        setEditedScripts((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      dir="rtl"
                      rows={15}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-y"
                    />
                  </div>
                ) : (
                  <div className="p-4 prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    {displayText}
                  </div>
                )}

                {/* generated image */}
                {hasImage && imageForScript && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-sm font-semibold text-green-600 mb-3">
                      קריאטיב נוצר בהצלחה!
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageForScript.url || imageForScript.base64}
                      alt={`קריאטיב לתסריט ${idx + 1}`}
                      className="w-full max-w-md mx-auto rounded-xl shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setModalImage(imageForScript)}
                    />
                    <div className="flex items-center justify-center gap-3 mt-3">
                      <button
                        onClick={() => setModalImage(imageForScript)}
                        className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        הגדל תמונה
                      </button>
                      <a
                        href={imageForScript.url || imageForScript.base64}
                        download={`creative-${idx + 1}.png`}
                        className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
                      >
                        הורד תמונה
                      </a>
                    </div>
                  </div>
                )}

                {/* creative editor */}
                {activeScriptIdx === idx && suggestion && project && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    {creativeError && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
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
                      onGenerate={handleGenerateCreative}
                    />
                  </div>
                )}

                {/* creative button */}
                {!hasImage && activeScriptIdx !== idx && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    {creativeError && activeScriptIdx === null && (
                      <p className="text-sm text-red-600 dark:text-red-400 mb-2">{creativeError}</p>
                    )}
                    <button
                      onClick={() => handleSuggestCreative(idx)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      צור קריאטיב (תמונה) לתסריט
                    </button>
                  </div>
                )}

                {/* loading suggestion */}
                {activeScriptIdx === idx && !suggestion && !creativeError && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-center">
                    <CountdownTimer seconds={10} />
                    <p className="text-sm text-gray-500 mt-2">
                      FBM Studio מנתח את התסריט ומציע קריאטיב...
                    </p>
                  </div>
                )}

                {/* loading error (before editor appears) */}
                {activeScriptIdx === idx && !suggestion && creativeError && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 mb-3">
                      {creativeError}
                    </div>
                    <button
                      onClick={() => handleSuggestCreative(idx)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      נסה שוב
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {/* back button */}
          <button
            onClick={goBackToNiches}
            className="mt-2 inline-flex items-center gap-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
          >
            &larr; חזרה לבחירת נישה
          </button>
        </section>
      )}

      {/* ── Download All as ZIP ── */}
      {(strategy || painAnalysis || scripts) && step !== "loading" && step !== "strategy" && (
        <section className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                הורדת כל המסמכים
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                כל ה-PDFs + תמונות קריאטיב בקובץ ZIP אחד
              </p>
            </div>
            <button
              onClick={handleDownloadAll}
              disabled={downloading === "zip"}
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
            >
              {downloading === "zip" ? "מכין ZIP..." : "הורד הכל כ-ZIP"}
            </button>
          </div>
        </section>
      )}

      {/* ── download error ── */}
      {downloadError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 text-center">
          {downloadError}
        </div>
      )}

      {/* ── done: all images generated ── */}
      {step === "creatives" &&
        generatedImages.length > 0 &&
        generatedImages.length >= splitScripts(scripts).length && (
          <div className="text-center py-8 bg-green-50 dark:bg-green-950 rounded-2xl mb-8">
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-300">
              הכל מוכן!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              כל התסריטים והקריאטיבים נוצרו בהצלחה
            </p>
          </div>
        )}

      {/* ── image lightbox modal ── */}
      {modalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setModalImage(null)}
              className="absolute top-3 left-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer text-lg"
            >
              &times;
            </button>

            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={modalImage.url || modalImage.base64}
              alt={`קריאטיב לתסריט ${modalImage.scriptIdx + 1}`}
              className="w-full"
            />

            {/* Actions */}
            <div className="p-4 flex items-center justify-between" dir="rtl">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                קריאטיב לתסריט {modalImage.scriptIdx + 1}
              </p>
              <a
                href={modalImage.url || modalImage.base64}
                download={`creative-${modalImage.scriptIdx + 1}.png`}
                className="px-5 py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
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
