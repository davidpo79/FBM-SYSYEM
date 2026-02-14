"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProject } from "../layout";

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

export default function NichesPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();
  const {
    strategy,
    strategyApproved,
    niches,
    setNiches,
    selectedNiche,
    setSelectedNiche,
  } = useProject();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const generationAttempted = useRef(false);

  // Redirect if strategy not approved
  useEffect(() => {
    if (!strategyApproved && !strategy) {
      router.replace(`/project/${projectId}/strategy`);
    }
  }, [strategyApproved, strategy, router, projectId]);

  // Generate niches
  useEffect(() => {
    if (!strategy || !strategyApproved || niches.length > 0 || generationAttempted.current) return;
    generationAttempted.current = true;
    setIsGenerating(true);

    (async () => {
      try {
        const res = await fetch("/api/generate-niches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strategyDocument: strategy }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setNiches(json.niches ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "שגיאה בזיהוי נישות");
      } finally {
        setIsGenerating(false);
      }
    })();
  }, [strategy, strategyApproved, niches.length, setNiches]);

  const handleRetry = () => {
    setError("");
    generationAttempted.current = false;
    setIsGenerating(true);

    (async () => {
      try {
        const res = await fetch("/api/generate-niches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strategyDocument: strategy }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setNiches(json.niches ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "שגיאה בזיהוי נישות");
      } finally {
        setIsGenerating(false);
      }
    })();
  };

  const handleSelectNiche = (niche: typeof niches[0]) => {
    setSelectedNiche(niche);
    router.push(`/project/${projectId}/pains`);
  };

  if (error) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-red-600 mb-2">שגיאה</h2>
        <p className="text-[var(--text-secondary)] mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="px-5 py-2.5 bg-[var(--gold)] hover:opacity-90 text-white font-semibold rounded-[10px] transition-opacity cursor-pointer"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (niches.length === 0) {
    return (
      <div className="text-center py-20">
        <CountdownTimer seconds={15} />
        <p className="mt-4 text-[var(--text-muted)]">מזהה נישות מתאימות עבור התדר שלך...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">בחר נישה</h2>
        <p className="text-[var(--text-secondary)] mt-1">
          FBM Studio זיהה 3 נישות שמתאימות לתדר שלך. בחר את הנישה שהכי מדברת אליך:
        </p>
      </div>

      <div className="grid gap-4">
        {niches.map((niche, i) => {
          const isSelected = selectedNiche?.name === niche.name;
          return (
            <button
              key={i}
              onClick={() => handleSelectNiche(niche)}
              className={`text-right p-6 bg-[var(--card-bg)] border rounded-[16px] transition-all cursor-pointer ${
                isSelected
                  ? "border-[var(--gold)] bg-[var(--gold-soft)] shadow-md"
                  : "border-[var(--card-border)] hover:border-[var(--gold)] hover:shadow-md"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {niche.name}
                </h3>
                <span className="bg-[var(--gold-soft)] text-[var(--gold)] text-sm font-bold px-3 py-1 rounded-[10px]">
                  {niche.fit_score}/10
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-2">
                {niche.why_perfect_match}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text-secondary)]">כאב מרכזי:</span>{" "}
                {niche.core_pain}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
