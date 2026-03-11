"use client";

import { useState } from "react";
import Script from "next/script";

const API_BADGES = [
  "Twilio", "Stripe", "OpenAI", "Shopify", "Slack",
  "Google Sheets", "Notion", "Airtable", "Zapier", "HubSpot",
  "SendGrid", "Firebase", "AWS S3", "Vercel", "GitHub",
  "Discord", "Telegram", "WhatsApp", "Google Maps", "Calendly",
  "Zoom", "LinkedIn", "Twitter/X", "YouTube", "Plaid",
];

interface IdeaResult {
  name: string;
  pitch: string;
  niche: string;
  marketSize: string;
  apisUsed: string[];
  monetization: string;
}

type Stage = "select" | "building" | "results";
type Market = "israel" | "international";

export default function IdeatorPage() {
  const [selectedApis, setSelectedApis] = useState<string[]>([]);
  const [customApi, setCustomApi] = useState("");
  const [niche, setNiche] = useState("");
  const [market, setMarket] = useState<Market>("international");
  const [stage, setStage] = useState<Stage>("select");
  const [ideas, setIdeas] = useState<IdeaResult[]>([]);
  const [error, setError] = useState("");
  const [buildStep, setBuildStep] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const buildSteps = [
    "מחבר צמתים...",
    "מסנתז ארכיטקטורה...",
    "מקמפל מודלי SaaS...",
    "מאמת זרמי הכנסות...",
    "מרכיב את השרטוטים הסופיים...",
  ];

  const toggleApi = (api: string) => {
    setSelectedApis((prev) =>
      prev.includes(api) ? prev.filter((a) => a !== api) : [...prev, api]
    );
  };

  const addCustomApi = () => {
    const trimmed = customApi.trim();
    if (trimmed && !selectedApis.includes(trimmed)) {
      setSelectedApis((prev) => [...prev, trimmed]);
      setCustomApi("");
    }
  };

  const handleGenerate = async () => {
    if (selectedApis.length === 0) return;
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
        body: JSON.stringify({
          apis: selectedApis,
          market,
          niche: niche.trim() || undefined,
        }),
      });
      const data = await res.json();
      clearInterval(interval);

      if (data.error) {
        setError(data.error);
        setStage("select");
        return;
      }

      setIdeas(data.ideas || []);
      setStage("results");
    } catch {
      clearInterval(interval);
      setError("משהו השתבש. נסה שוב.");
      setStage("select");
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

  const canGenerate = selectedApis.length > 0;

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
        {/* ── SELECT STAGE ── */}
        {stage === "select" && (
          <>
            {/* Hero */}
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
                מנוע רעיונות{" "}
                <span className="text-[#00FF88]">Micro-SaaS</span>
              </h1>
              <p className="text-base text-[#6B7FA3] max-w-xl mx-auto">
                בחר APIs, הגדר קהל יעד — ונייצר לך 3 רעיונות SaaS רווחיים שאפשר לבנות תוך שבועות.
              </p>
            </div>

            {/* Market Selection */}
            <div className="flex justify-center gap-3 mb-8">
              {(["israel", "international"] as Market[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarket(m)}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                  style={{
                    border: `1.5px solid ${market === m ? "#00FF88" : "#1E2D45"}`,
                    background: market === m ? "rgba(0,255,136,0.1)" : "#161D2B",
                    color: market === m ? "#00FF88" : "#6B7FA3",
                  }}
                >
                  {m === "israel" ? "🇮🇱 שוק ישראלי" : "🌍 שוק בינלאומי"}
                </button>
              ))}
            </div>

            {/* Niche / Target Audience input */}
            <div className="max-w-lg mx-auto mb-8">
              <label className="block mb-2 text-sm font-semibold text-[#F0F6FF]">
                קהל יעד או בעיה לפתרון
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder='לדוגמה: "סוכני נדל״ן שצריכים לנהל לידים" או "מאמני כושר שרוצים לאסוף תשלומים"'
                className="w-full px-4 py-3 rounded-xl text-sm font-mono outline-none transition-all"
                style={{
                  border: "1.5px solid #1E2D45",
                  background: "#0D1117",
                  color: "#F0F6FF",
                }}
              />
              <p className="text-[11px] text-[#3D4F6F] font-mono mt-1.5">
                אופציונלי — אם תגדיר נישה, הרעיונות יותאמו ספציפית אליה
              </p>
            </div>

            {/* Section title */}
            <div className="text-center mb-4">
              <p className="text-xs font-mono text-[#6B7FA3] uppercase tracking-widest">בחר APIs לשילוב</p>
              {selectedApis.length > 0 && (
                <p className="text-xs font-mono text-[#00FF88] mt-1">{selectedApis.length} נבחרו</p>
              )}
            </div>

            {/* API Badge Grid — Lego blocks */}
            <div className="flex flex-wrap gap-2 justify-center mb-5 max-w-3xl mx-auto">
              {API_BADGES.map((api) => {
                const sel = selectedApis.includes(api);
                return (
                  <button
                    key={api}
                    onClick={() => toggleApi(api)}
                    className="transition-all cursor-pointer"
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: `1.5px solid ${sel ? "#00FF88" : "#1E2D45"}`,
                      background: sel ? "rgba(0,255,136,0.12)" : "#161D2B",
                      color: sel ? "#00FF88" : "#F0F6FF",
                      fontSize: 13,
                      fontWeight: sel ? 600 : 400,
                      fontFamily: "monospace",
                      direction: "ltr" as const,
                      boxShadow: sel ? "0 0 12px rgba(0,255,136,0.15)" : "none",
                    }}
                  >
                    {sel ? "✓ " : ""}{api}
                  </button>
                );
              })}
            </div>

            {/* Custom API input */}
            <div className="flex gap-2 max-w-sm mx-auto mb-10" style={{ direction: "ltr" }}>
              <input
                type="text"
                value={customApi}
                onChange={(e) => setCustomApi(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCustomApi(); }}
                placeholder="+ הוסף API מותאם..."
                className="flex-1 px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
                style={{ border: "1px solid #1E2D45", background: "#0D1117", color: "#F0F6FF", direction: "rtl" }}
              />
              <button
                onClick={addCustomApi}
                disabled={!customApi.trim()}
                className="px-4 py-2.5 rounded-lg text-sm font-mono font-semibold transition-all"
                style={{
                  border: "1px solid #1E2D45",
                  background: customApi.trim() ? "rgba(0,255,136,0.15)" : "#161D2B",
                  color: customApi.trim() ? "#00FF88" : "#3D4F6F",
                  cursor: customApi.trim() ? "pointer" : "not-allowed",
                }}
              >
                הוסף
              </button>
            </div>

            {error && <p className="text-red-500 text-center mb-4">{error}</p>}

            {/* Generate Button */}
            <div className="text-center">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="px-12 py-4 rounded-2xl text-base font-bold transition-all cursor-pointer"
                style={{
                  border: "none",
                  background: canGenerate
                    ? "linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)"
                    : "#1E2D45",
                  color: canGenerate ? "#080A0F" : "#3D4F6F",
                  cursor: canGenerate ? "pointer" : "not-allowed",
                  boxShadow: canGenerate ? "0 4px 24px rgba(0,255,136,0.35)" : "none",
                }}
              >
                🚀 הרכב רעיונות
              </button>
            </div>
          </>
        )}

        {/* ── BUILDING STAGE ── */}
        {stage === "building" && (
          <div className="text-center py-20">
            {/* Stacking blocks */}
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
            <p className="text-sm text-[#3D4F6F] font-mono" style={{ direction: "ltr" }}>
              [{selectedApis.join(" + ")}]
            </p>

            {/* Progress bar */}
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
                <span className="text-[#00FF88]">3 שרטוטי SaaS</span> מוכנים
              </h2>
              <p className="text-sm text-[#6B7FA3] font-mono" style={{ direction: "ltr" }}>
                {selectedApis.join(" + ")}
              </p>
              <p className="text-xs text-[#3D4F6F] font-mono mt-1">
                {market === "israel" ? "🇮🇱 שוק ישראלי" : "🌍 שוק בינלאומי"}
                {niche ? ` · ${niche}` : ""}
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
                      <span className="text-[10px] font-mono text-[#3D4F6F] block mb-1">שרטוט #{idx + 1}</span>
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
                      <p className="text-[10px] font-mono text-[#6B7FA3] mb-1">גודל שוק</p>
                      <p className="text-sm text-[#F0F6FF] font-semibold">{idea.marketSize}</p>
                    </div>
                  </div>

                  {/* APIs Used — Neon Tags */}
                  <div className="mb-5">
                    <p className="text-[10px] font-mono text-[#6B7FA3] mb-2">טכנולוגיות API בשימוש</p>
                    <div className="flex flex-wrap gap-1.5" style={{ direction: "ltr" }}>
                      {(idea.apisUsed || []).map((api, j) => (
                        <span
                          key={j}
                          className="text-[11px] font-mono px-2.5 py-1 rounded-md"
                          style={{
                            background: "rgba(0,255,136,0.08)",
                            border: "1px solid rgba(0,255,136,0.25)",
                            color: "#00FF88",
                            boxShadow: "0 0 6px rgba(0,255,136,0.1)",
                          }}
                        >
                          {api}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Monetization */}
                  <div className="bg-[#080A0F]/60 rounded-xl p-4 border border-[#1E2D45]/50 mb-5">
                    <p className="text-[10px] font-mono text-[#6B7FA3] mb-1">מונטיזציה</p>
                    <p className="text-[13px] text-[#F0F6FF] leading-relaxed">{idea.monetization}</p>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleActivateIdea(idea)}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,255,136,0.12), rgba(0,255,136,0.05))",
                      border: "1.5px solid rgba(0,255,136,0.3)",
                      color: "#00FF88",
                    }}
                  >
                    🚀 הוצא את הרעיון לפועל
                  </button>
                </div>
              ))}
            </div>

            {/* Try again */}
            <div className="text-center mt-8">
              <button
                onClick={() => { setStage("select"); setIdeas([]); }}
                className="px-6 py-2.5 rounded-lg text-sm font-mono cursor-pointer transition-all"
                style={{ background: "transparent", border: "1px solid #1E2D45", color: "#6B7FA3" }}
              >
                נסה שילוב אחר
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
              ✕
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
