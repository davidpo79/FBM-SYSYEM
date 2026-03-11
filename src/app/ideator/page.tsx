"use client";

import { useState } from "react";
import Script from "next/script";

/* ── Suggested niches the user can click to get started quickly ── */
const NICHE_SUGGESTIONS = [
  "סוכני נדל\"ן",
  "מאמני כושר",
  "עורכי דין",
  "מעצבי פנים",
  "חנויות e-commerce",
  "מורים פרטיים",
  "קליניקות יופי",
  "יועצי משכנתאות",
  "מסעדנים",
  "פרילנסרים",
  "רואי חשבון",
  "סוכני ביטוח",
];

interface IdeaResult {
  name: string;
  pitch: string;
  niche: string;
  marketSize: string;
  apisUsed: string[];
  apiExplanation: string;
  monetization: string;
}

type Stage = "input" | "building" | "results";

export default function IdeatorPage() {
  const [niche, setNiche] = useState("");
  const [stage, setStage] = useState<Stage>("input");
  const [ideas, setIdeas] = useState<IdeaResult[]>([]);
  const [error, setError] = useState("");
  const [buildStep, setBuildStep] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const buildSteps = [
    "סורק שווקים ונישות...",
    "מזהה בעיות לפתרון...",
    "מחבר שילובי API חכמים...",
    "מחשב פוטנציאל הכנסות...",
    "מרכיב 3 רעיונות מנצחים...",
  ];

  const handleGenerate = async () => {
    if (!niche.trim()) return;
    setStage("building");
    setError("");
    setBuildStep(0);

    const interval = setInterval(() => {
      setBuildStep((s) => {
        if (s >= buildSteps.length - 1) {
          clearInterval(interval);
          return s;
        }
        return s + 1;
      });
    }, 1800);

    try {
      const res = await fetch("/api/public/ideator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim() }),
      });
      const data = await res.json();
      clearInterval(interval);

      if (data.error) {
        setError(data.error);
        setStage("input");
        return;
      }

      setIdeas(data.ideas || []);
      setStage("results");
    } catch {
      clearInterval(interval);
      setError("משהו השתבש. נסה שוב.");
      setStage("input");
    }
  };

  const handleActivateIdea = (idea: IdeaResult) => {
    try {
      localStorage.setItem("gtm-ideator-selected", JSON.stringify({
        name: idea.name,
        pitch: idea.pitch,
        niche: idea.niche,
        apisUsed: idea.apisUsed,
      }));
    } catch { /* ignore */ }
    setShowModal(true);
  };

  return (
    <div className="theme-gtm min-h-screen bg-[#080A0F] text-[#F0F6FF] pb-20" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-[#1E2D45]">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gtm-logo.svg" alt="GTM BootCamp" className="h-10 w-10 object-contain" />
          <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "monospace" }}>&lt;GTM&gt; BootCamp</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#00FF88]/15 text-[#00FF88] font-mono font-semibold">BETA</span>
        </div>
        <a
          href="/signup?track=gtm"
          className="px-5 py-2 rounded-lg text-sm font-bold no-underline transition-all hover:shadow-lg"
          style={{
            background: "linear-gradient(135deg, #00FF88, #00CC6A)",
            color: "#080A0F",
            boxShadow: "0 2px 12px rgba(0,255,136,0.25)",
          }}
        >
          הצטרף לבוטקאמפ
        </a>
      </header>

      <main className="max-w-[960px] mx-auto px-5 pt-12 pb-6">
        {/* ── INPUT STAGE ── */}
        {stage === "input" && (
          <>
            {/* Hero */}
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
                מנוע רעיונות{" "}
                <span className="text-[#00FF88]">Micro-SaaS</span>
              </h1>
              <p className="text-lg text-[#6B7FA3] max-w-2xl mx-auto mb-2">
                ספר לנו מי קהל היעד שלך — ואנחנו נייצר לך 3 רעיונות לעסק דיגיטלי רווחי,
                כולל גודל שוק, מודל הכנסות, ושילובי API מוכנים לבנייה.
              </p>
              <p className="text-xs text-[#3D4F6F] font-mono">
                Powered by GTM BootCamp AI Engine
              </p>
            </div>

            {/* Niche Input */}
            <div className="max-w-xl mx-auto mb-6">
              <label className="block mb-2 text-sm font-semibold text-[#F0F6FF]">
                מי הלקוח שלך? מה הנישה?
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && niche.trim()) handleGenerate(); }}
                placeholder='לדוגמה: "סוכני נדל״ן שצריכים לנהל לידים" או "מאמני כושר"'
                className="w-full px-5 py-4 rounded-2xl text-base outline-none transition-all"
                style={{
                  border: "2px solid #1E2D45",
                  background: "#0D1117",
                  color: "#F0F6FF",
                  fontSize: 16,
                }}
              />
              <p className="text-[11px] text-[#3D4F6F] font-mono mt-2">
                תאר את קהל היעד, הבעיה, או התחום — המנוע יעשה את השאר
              </p>
            </div>

            {/* Quick Niche Suggestions */}
            <div className="max-w-xl mx-auto mb-10">
              <p className="text-[11px] font-mono text-[#6B7FA3] mb-3 text-center">או בחר נישה מוכנה:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {NICHE_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setNiche(s)}
                    className="px-4 py-2 rounded-xl text-sm transition-all cursor-pointer"
                    style={{
                      border: `1.5px solid ${niche === s ? "#00FF88" : "#1E2D45"}`,
                      background: niche === s ? "rgba(0,255,136,0.12)" : "#161D2B",
                      color: niche === s ? "#00FF88" : "#6B7FA3",
                      fontWeight: niche === s ? 600 : 400,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            {/* Generate Button */}
            <div className="text-center">
              <button
                onClick={handleGenerate}
                disabled={!niche.trim()}
                className="px-12 py-4 rounded-2xl text-lg font-bold transition-all cursor-pointer"
                style={{
                  border: "none",
                  background: niche.trim()
                    ? "linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)"
                    : "#1E2D45",
                  color: niche.trim() ? "#080A0F" : "#3D4F6F",
                  cursor: niche.trim() ? "pointer" : "not-allowed",
                  boxShadow: niche.trim() ? "0 4px 24px rgba(0,255,136,0.35)" : "none",
                }}
              >
                ייצר לי רעיונות
              </button>
            </div>

            {/* How it works */}
            <div className="max-w-2xl mx-auto mt-16">
              <p className="text-center text-xs font-mono text-[#3D4F6F] mb-6 uppercase tracking-widest">איך זה עובד?</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: "01", title: "ספר לנו מי הלקוח", desc: "הגדר נישה או קהל יעד" },
                  { step: "02", title: "המנוע בונה רעיונות", desc: "AI מנתח שוק ומזהה שילובי API רווחיים" },
                  { step: "03", title: "קבל 3 שרטוטי SaaS", desc: "כולל גודל שוק, טכנולוגיה, ומודל הכנסות" },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-xl p-5 text-center"
                    style={{ background: "#161D2B", border: "1px solid #1E2D45" }}
                  >
                    <span className="text-2xl font-extrabold text-[#00FF88] font-mono block mb-2">{item.step}</span>
                    <p className="text-sm font-bold text-[#F0F6FF] mb-1">{item.title}</p>
                    <p className="text-xs text-[#6B7FA3]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── BUILDING STAGE ── */}
        {stage === "building" && (
          <div className="text-center py-20">
            <div className="flex flex-col-reverse items-center gap-1.5 mb-10 min-h-[180px]">
              {[0, 1, 2, 3, 4].map((i) => {
                const visible = buildStep >= i;
                return (
                  <div
                    key={i}
                    style={{
                      width: 60 + (4 - i) * 12,
                      height: visible ? 28 : 0,
                      borderRadius: 8,
                      background: visible
                        ? `linear-gradient(135deg, #00FF88 ${10 + i * 20}%, #00CC6A 100%)`
                        : "transparent",
                      transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      opacity: visible ? 1 : 0,
                      boxShadow: visible ? `0 0 ${14 + i * 5}px rgba(0,255,136,${0.2 + i * 0.06})` : "none",
                      transform: visible ? "translateY(0)" : "translateY(-40px)",
                    }}
                  />
                );
              })}
            </div>

            <p className="text-lg font-semibold text-[#00FF88] font-mono mb-2">
              {buildSteps[buildStep]}
            </p>
            <p className="text-sm text-[#6B7FA3]">
              מחפש רעיונות עבור: <span className="text-[#F0F6FF] font-semibold">{niche}</span>
            </p>

            <div className="max-w-xs mx-auto mt-6 h-1 rounded bg-[#1E2D45] overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${((buildStep + 1) / buildSteps.length) * 100}%`,
                  background: "linear-gradient(90deg, #00FF88, #00CC6A)",
                }}
              />
            </div>
          </div>
        )}

        {/* ── RESULTS STAGE ── */}
        {stage === "results" && (
          <>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-2">
                <span className="text-[#00FF88]">3 רעיונות SaaS</span> מוכנים עבורך
              </h2>
              <p className="text-sm text-[#6B7FA3]">
                נישה: <span className="text-[#F0F6FF] font-semibold">{niche}</span>
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {ideas.map((idea, idx) => (
                <div
                  key={idx}
                  className="bg-[#161D2B] border border-[#1E2D45] rounded-2xl p-7 relative overflow-hidden"
                  style={{ animation: `fadeInUp 0.5s ${idx * 0.15}s both` }}
                >
                  {/* Glow accent */}
                  <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(0,255,136,0.06), transparent 70%)" }} />

                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <span className="text-[10px] font-mono text-[#3D4F6F] block mb-1">רעיון #{idx + 1}</span>
                      <h3 className="text-xl font-bold text-[#F0F6FF]" style={{ direction: "ltr", textAlign: "right" }}>{idea.name}</h3>
                    </div>
                    <span className="shrink-0 text-xs font-mono px-3 py-1 rounded-full bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/20">
                      Micro-SaaS
                    </span>
                  </div>

                  {/* Pitch */}
                  <p className="text-[#FF6B35] text-[15px] font-semibold leading-relaxed mb-5">
                    {idea.pitch}
                  </p>

                  {/* Info Row: Niche + Market Size */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <div className="bg-[#0D1117] rounded-xl p-4 border border-[#1E2D45]">
                      <p className="text-[10px] font-mono text-[#6B7FA3] mb-1">קהל יעד</p>
                      <p className="text-sm text-[#F0F6FF] font-semibold">{idea.niche}</p>
                    </div>
                    <div className="bg-[#0D1117] rounded-xl p-4 border border-[#1E2D45]">
                      <p className="text-[10px] font-mono text-[#6B7FA3] mb-1">גודל שוק משוער</p>
                      <p className="text-sm text-[#F0F6FF] font-semibold">{idea.marketSize}</p>
                    </div>
                  </div>

                  {/* API Combinations — NEW RUBRIC */}
                  <div className="mb-5 p-4 rounded-xl border border-[#00FF88]/20" style={{ background: "rgba(0,255,136,0.04)" }}>
                    <p className="text-[10px] font-mono text-[#00FF88] mb-2 uppercase tracking-wider">שילובי API מומלצים ליישום</p>
                    <div className="flex flex-wrap gap-1.5 mb-3" style={{ direction: "ltr" }}>
                      {(idea.apisUsed || []).map((api, j) => (
                        <span
                          key={j}
                          className="text-[11px] font-mono px-2.5 py-1 rounded-md"
                          style={{
                            background: "rgba(0,255,136,0.1)",
                            border: "1px solid rgba(0,255,136,0.3)",
                            color: "#00FF88",
                            boxShadow: "0 0 6px rgba(0,255,136,0.1)",
                          }}
                        >
                          {api}
                        </span>
                      ))}
                    </div>
                    <p className="text-[13px] text-[#B0BEC5] leading-relaxed">
                      {idea.apiExplanation}
                    </p>
                  </div>

                  {/* Monetization */}
                  <div className="bg-[#080A0F]/60 rounded-xl p-4 border border-[#1E2D45]/50 mb-5">
                    <p className="text-[10px] font-mono text-[#6B7FA3] mb-1">מודל הכנסות</p>
                    <p className="text-[13px] text-[#F0F6FF] leading-relaxed">{idea.monetization}</p>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleActivateIdea(idea)}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all cursor-pointer hover:shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,255,136,0.05))",
                      border: "1.5px solid rgba(0,255,136,0.3)",
                      color: "#00FF88",
                    }}
                  >
                    הוצא את הרעיון לפועל
                  </button>
                </div>
              ))}
            </div>

            {/* Try again */}
            <div className="text-center mt-8">
              <button
                onClick={() => { setStage("input"); setIdeas([]); }}
                className="px-6 py-2.5 rounded-lg text-sm font-mono cursor-pointer transition-all"
                style={{ background: "transparent", border: "1px solid #1E2D45", color: "#6B7FA3" }}
              >
                נסה נישה אחרת
              </button>
            </div>
          </>
        )}
      </main>

      {/* ── LEAD CAPTURE MODAL ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl overflow-hidden"
            style={{
              background: "#0D1117",
              border: "1.5px solid #1E2D45",
              boxShadow: "0 0 60px rgba(0,255,136,0.1), 0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1E2D45", color: "#6B7FA3" }}
            >
              X
            </button>

            {/* Modal Header */}
            <div className="p-6 pb-4 text-center" style={{ borderBottom: "1px solid #1E2D45" }}>
              <div className="flex justify-center mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gtm-logo.svg" alt="GTM" className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold mb-2" dir="rtl">
                מוכן להפוך את הרעיון{" "}
                <span className="text-[#00FF88]">לעסק רווחי?</span>
              </h3>
              <p className="text-sm text-[#6B7FA3]" dir="rtl">
                הצטרף ל-GTM BootCamp — קבל אסטרטגיית Go-To-Market מלאה, מסגרת ולידציה, ותוכנית השקה ל-90 יום.
              </p>
            </div>

            {/* GoHighLevel Form */}
            <div className="p-4" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <iframe
                src="https://api.leadconnectorhq.com/widget/form/VY7Wpt7X70ijeluHvP8D"
                style={{ width: "100%", height: "691px", border: "none", borderRadius: "8px" }}
                id="inline-VY7Wpt7X70ijeluHvP8D"
                data-layout={"{'id':'INLINE'}"}
                data-trigger-type="alwaysShow"
                data-activation-type="alwaysActivated"
                data-deactivation-type="neverDeactivate"
                data-form-name="bootcamp"
                data-height="691"
                data-layout-iframe-id="inline-VY7Wpt7X70ijeluHvP8D"
                data-form-id="VY7Wpt7X70ijeluHvP8D"
                title="bootcamp"
              />
              <Script src="https://link.msgsndr.com/js/form_embed.js" strategy="lazyOnload" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
