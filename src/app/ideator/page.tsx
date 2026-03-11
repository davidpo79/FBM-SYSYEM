"use client";

import { useState } from "react";
import Script from "next/script";

/* ── Category tiles with emojis — user picks a niche ── */
const CATEGORIES = [
  { value: "ai-automation", label: "AI ואוטומציה", emoji: "🤖" },
  { value: "fintech", label: "פינטק", emoji: "💰" },
  { value: "healthtech", label: "הלט'טק", emoji: "🏥" },
  { value: "edtech", label: "חינוך וטכנולוגיה", emoji: "📚" },
  { value: "ecommerce", label: "E-Commerce וקמעונאות", emoji: "🛒" },
  { value: "devtools", label: "כלים למפתחים", emoji: "⚙️" },
  { value: "saas-b2b", label: "SaaS B2B", emoji: "🏢" },
  { value: "creator-economy", label: "כלכלת יוצרים", emoji: "🎬" },
  { value: "sustainability", label: "קלינטק וקיימות", emoji: "🌱" },
  { value: "proptech", label: "נדל\"ן וטכנולוגיה", emoji: "🏠" },
  { value: "legaltech", label: "משפטי וטכנולוגיה", emoji: "⚖️" },
  { value: "hrtech", label: "HR וגיוס", emoji: "👥" },
];

interface IdeaResult {
  name: string;
  tagline: string;
  problem: string;
  solution: string;
  target_audience: string;
  monetization: string;
  mvp_scope: string[];
  competitive_edge: string;
  market_size: string;
  difficulty: "easy" | "medium" | "hard";
  apis_used: string[];
  api_explanation: string;
}

type Stage = "select" | "building" | "results";

export default function IdeatorPage() {
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState<Stage>("select");
  const [ideas, setIdeas] = useState<IdeaResult[]>([]);
  const [error, setError] = useState("");
  const [buildStep, setBuildStep] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const buildSteps = [
    "סורק מגמות שוק...",
    "מנתח פערים תחרותיים...",
    "מזהה נקודות כאב...",
    "מרכיב קונספטים...",
    "מאמת מודלים עסקיים...",
    "מסיים ומלטש...",
  ];

  const handleGenerate = async () => {
    if (!category) return;
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
    }, 1500);

    try {
      const res = await fetch("/api/public/ideator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
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

  const difficultyLabel = (d: string) => {
    if (d === "easy") return "קל";
    if (d === "medium") return "בינוני";
    return "מאתגר";
  };

  const difficultyColor = (d: string) => {
    if (d === "easy") return { bg: "rgba(0,255,136,0.15)", color: "#00FF88" };
    if (d === "medium") return { bg: "rgba(255,107,53,0.15)", color: "#FF6B35" };
    return { bg: "rgba(239,68,68,0.15)", color: "#EF4444" };
  };

  const handleActivateIdea = (idea: IdeaResult) => {
    try {
      localStorage.setItem("gtm-ideator-selected", JSON.stringify({
        name: idea.name,
        pitch: idea.tagline,
        niche: idea.target_audience,
        apisUsed: idea.apis_used,
      }));
    } catch { /* ignore */ }
    setShowModal(true);
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #080A0F 0%, #0D1117 50%, #080A0F 100%)",
        color: "#F0F6FF",
        paddingBottom: 80,
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #1E2D45",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gtm-logo.svg" alt="GTM" style={{ height: 40, width: 40 }} />
          <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>&lt;GTM&gt; BootCamp</span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 4,
              background: "rgba(0,255,136,0.15)",
              color: "#00FF88",
              fontFamily: "monospace",
              fontWeight: 600,
            }}
          >
            BETA
          </span>
        </div>
        <a
          href="/signup?track=gtm"
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            background: "linear-gradient(135deg, #00FF88, #00CC6A)",
            color: "#080A0F",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 2px 12px rgba(0,255,136,0.25)",
          }}
        >
          הצטרף לבוטקאמפ
        </a>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
        {/* ── SELECT STAGE ── */}
        {stage === "select" && (
          <>
            {/* Hero */}
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h1
                style={{
                  fontSize: "clamp(32px, 5vw, 56px)",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  marginBottom: 16,
                }}
              >
                מנוע רעיונות{" "}
                <span style={{ color: "#00FF88" }}>Micro-SaaS</span>
              </h1>
              <p style={{ fontSize: 18, color: "#6B7FA3", maxWidth: 600, margin: "0 auto 8px" }}>
                בחר קטגוריה וקבל 3 רעיונות מאומתים למיקרו-SaaS שאפשר לבנות ולהשיק תוך שבועות.
              </p>
              <p style={{ fontSize: 13, color: "#3D4F6F", fontFamily: "monospace" }}>
                Powered by GTM BootCamp AI Engine
              </p>
            </div>

            {/* Category Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    border: `1.5px solid ${category === cat.value ? "#00FF88" : "#1E2D45"}`,
                    background: category === cat.value ? "rgba(0,255,136,0.08)" : "#161D2B",
                    color: category === cat.value ? "#00FF88" : "#F0F6FF",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "right",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>
                    {cat.emoji}
                  </span>
                  {cat.label}
                </button>
              ))}
            </div>

            {error && (
              <p style={{ color: "#EF4444", textAlign: "center", marginBottom: 16 }}>{error}</p>
            )}

            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleGenerate}
                disabled={!category}
                style={{
                  padding: "14px 48px",
                  borderRadius: 12,
                  border: "none",
                  background: category
                    ? "linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)"
                    : "#1E2D45",
                  color: category ? "#080A0F" : "#3D4F6F",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: category ? "pointer" : "not-allowed",
                  transition: "all 0.3s",
                  boxShadow: category ? "0 4px 16px rgba(0,255,136,0.3)" : "none",
                }}
              >
                ייצר לי רעיונות
              </button>
            </div>
          </>
        )}

        {/* ── BUILDING ANIMATION ── */}
        {stage === "building" && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 40,
                    height: buildStep >= i ? 40 + i * 12 : 8,
                    borderRadius: 6,
                    background: buildStep >= i
                      ? `linear-gradient(135deg, #00FF88 ${20 + i * 15}%, #00CC6A 100%)`
                      : "#1E2D45",
                    transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    opacity: buildStep >= i ? 1 : 0.3,
                    boxShadow: buildStep >= i ? "0 0 12px rgba(0,255,136,0.3)" : "none",
                  }}
                />
              ))}
            </div>

            <p style={{ fontSize: 18, fontWeight: 600, color: "#00FF88", fontFamily: "monospace", marginBottom: 8 }}>
              {buildSteps[buildStep]}
            </p>
            <p style={{ fontSize: 13, color: "#3D4F6F" }}>
              שלב {buildStep + 1} מתוך {buildSteps.length}
            </p>

            <div style={{ maxWidth: 300, margin: "24px auto 0", height: 4, borderRadius: 2, background: "#1E2D45", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${((buildStep + 1) / buildSteps.length) * 100}%`,
                  background: "linear-gradient(90deg, #00FF88, #00CC6A)",
                  borderRadius: 2,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === "results" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                <span style={{ color: "#00FF88" }}>3 הרעיונות שלך</span> מוכנים
              </h2>
              <p style={{ color: "#6B7FA3", fontSize: 14 }}>
                כל רעיון אומת עבור התאמה לשוק, יכולת בנייה, ופוטנציאל הכנסות.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {ideas.map((idea, idx) => {
                const dc = difficultyColor(idea.difficulty);
                return (
                  <div
                    key={idx}
                    style={{
                      background: "#161D2B",
                      border: "1px solid #1E2D45",
                      borderRadius: 16,
                      padding: 28,
                      animation: `fadeInUp 0.5s ${idx * 0.15}s both`,
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#3D4F6F", display: "block", marginBottom: 4 }}>
                          רעיון #{idx + 1}
                        </span>
                        <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, direction: "ltr", textAlign: "right" }}>
                          {idea.name}
                        </h3>
                        <p style={{ color: "#00FF88", fontSize: 14, fontWeight: 500 }}>
                          {idea.tagline}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          fontWeight: 600,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: dc.bg,
                          color: dc.color,
                          textTransform: "uppercase",
                        }}
                      >
                        {difficultyLabel(idea.difficulty)}
                      </span>
                    </div>

                    {/* Info Sections Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 16 }}>
                      <Section title="הבעיה" text={idea.problem} />
                      <Section title="הפתרון" text={idea.solution} />
                      <Section title="קהל יעד" text={idea.target_audience} />
                      <Section title="מודל הכנסות" text={idea.monetization} />
                      <Section title="יתרון תחרותי" text={idea.competitive_edge} />
                      <Section title="גודל שוק" text={idea.market_size} highlight />
                    </div>

                    {/* API Combinations — NEW RUBRIC */}
                    {idea.apis_used && idea.apis_used.length > 0 && (
                      <div
                        style={{
                          marginBottom: 16,
                          padding: 16,
                          borderRadius: 10,
                          background: "rgba(0,255,136,0.04)",
                          border: "1px solid rgba(0,255,136,0.2)",
                          borderRight: "3px solid #00FF88",
                        }}
                      >
                        <p style={{ fontSize: 11, fontFamily: "monospace", color: "#00FF88", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                          שילובי API מומלצים ליישום
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, direction: "ltr" }}>
                          {idea.apis_used.map((api, j) => (
                            <span
                              key={j}
                              style={{
                                fontSize: 11,
                                fontFamily: "monospace",
                                padding: "3px 10px",
                                borderRadius: 6,
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
                        <p style={{ fontSize: 13, color: "#B0BEC5", lineHeight: 1.6 }}>
                          {idea.api_explanation}
                        </p>
                      </div>
                    )}

                    {/* MVP Scope */}
                    {idea.mvp_scope && idea.mvp_scope.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, fontFamily: "monospace", color: "#6B7FA3", marginBottom: 8, textTransform: "uppercase" }}>
                          היקף MVP
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {idea.mvp_scope.map((item, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: 12,
                                padding: "4px 10px",
                                borderRadius: 6,
                                background: "rgba(0,255,136,0.08)",
                                border: "1px solid rgba(0,255,136,0.2)",
                                color: "#00FF88",
                              }}
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Activate Idea CTA */}
                    <button
                      onClick={() => handleActivateIdea(idea)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: 10,
                        border: "1.5px solid rgba(0,255,136,0.3)",
                        background: "linear-gradient(135deg, rgba(0,255,136,0.12), rgba(0,255,136,0.04))",
                        color: "#00FF88",
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      הוצא את הרעיון הזה לפועל
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Try again */}
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button
                onClick={() => { setStage("select"); setIdeas([]); }}
                style={{
                  background: "transparent",
                  border: "1px solid #1E2D45",
                  color: "#6B7FA3",
                  padding: "10px 24px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                נסה קטגוריה אחרת
              </button>
            </div>
          </>
        )}
      </main>

      {/* ── LEAD CAPTURE MODAL ── */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 520,
              borderRadius: 16,
              overflow: "hidden",
              background: "#0D1117",
              border: "1.5px solid #1E2D45",
              boxShadow: "0 0 60px rgba(0,255,136,0.1), 0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                zIndex: 10,
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid #1E2D45",
                color: "#6B7FA3",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              X
            </button>

            {/* Modal Header */}
            <div style={{ padding: "24px 24px 16px", textAlign: "center", borderBottom: "1px solid #1E2D45" }} dir="rtl">
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gtm-logo.svg" alt="GTM" style={{ height: 48, width: 48 }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                מוכן להפוך את הרעיון{" "}
                <span style={{ color: "#00FF88" }}>לעסק רווחי?</span>
              </h3>
              <p style={{ fontSize: 14, color: "#6B7FA3" }}>
                הצטרף ל-GTM BootCamp — קבל אסטרטגיית Go-To-Market מלאה, מסגרת ולידציה, ותוכנית השקה ל-90 יום.
              </p>
            </div>

            {/* GoHighLevel Form */}
            <div style={{ padding: 16, maxHeight: "60vh", overflowY: "auto" }}>
              <iframe
                src="https://api.leadconnectorhq.com/widget/form/VY7Wpt7X70ijeluHvP8D"
                style={{ width: "100%", height: 691, border: "none", borderRadius: 8 }}
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

/* ── Reusable section component ── */
function Section({ title, text, highlight }: { title: string; text: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        background: highlight ? "rgba(0,255,136,0.05)" : "rgba(8,10,15,0.5)",
        border: `1px solid ${highlight ? "rgba(0,255,136,0.15)" : "rgba(30,45,69,0.5)"}`,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontFamily: "monospace",
          color: highlight ? "#00FF88" : "#6B7FA3",
          marginBottom: 4,
          textTransform: "uppercase",
        }}
      >
        {title}
      </p>
      <p style={{ fontSize: 13, color: "#F0F6FF", lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}
