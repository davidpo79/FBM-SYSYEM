"use client";

import { useState, useEffect } from "react";
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
type Market = "israel" | "international";

export default function IdeatorPage() {
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [market, setMarket] = useState<Market>("international");
  const [adminKey, setAdminKey] = useState("");
  const [stage, setStage] = useState<Stage>("select");

  // Check for admin key in URL (e.g., /ideator?admin=YOUR_SECRET)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("admin");
    if (key) setAdminKey(key);
  }, []);
  const [ideas, setIdeas] = useState<IdeaResult[]>([]);
  const [error, setError] = useState("");
  const [buildStep, setBuildStep] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const toggleExpand = (idx: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const cardAccents = [
    "linear-gradient(90deg, #00FF88, #00CC6A)",
    "linear-gradient(90deg, #FF6B35, #FF8F6B)",
    "linear-gradient(90deg, #00D4FF, #0099CC)",
  ];

  const buildSteps = [
    "סורק מגמות שוק...",
    "מנתח פערים תחרותיים...",
    "מזהה נקודות כאב...",
    "מרכיב קונספטים...",
    "מאמת מודלים עסקיים...",
    "מסיים ומלטש...",
  ];

  const selectedCategory = category === "custom" ? customCategory.trim() : category;
  const canGenerate = category && (category !== "custom" || customCategory.trim().length > 1);

  const handleGenerate = async () => {
    if (!canGenerate) return;
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
        body: JSON.stringify({ category: selectedCategory, market, ...(adminKey ? { admin_key: adminKey } : {}) }),
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
          padding: isMobile ? "14px 16px" : "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #1E2D45",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gtm-logo.svg" alt="GTM" style={{ height: isMobile ? 32 : 40, width: isMobile ? 32 : 40, flexShrink: 0 }} />
          <span style={{ fontSize: isMobile ? 15 : 20, fontWeight: 700, fontFamily: "monospace", whiteSpace: "nowrap" }}>&lt;GTM&gt; BootCamp</span>
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
            padding: isMobile ? "6px 14px" : "8px 20px",
            borderRadius: 8,
            background: "linear-gradient(135deg, #00FF88, #00CC6A)",
            color: "#080A0F",
            fontSize: isMobile ? 12 : 14,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 2px 12px rgba(0,255,136,0.25)",
            whiteSpace: "nowrap" as const,
            flexShrink: 0,
          }}
        >
          הצטרף לבוטקאמפ
        </a>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "32px 16px" : "48px 24px" }}>
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
                <br />
                <span style={{ fontSize: "clamp(16px, 2.5vw, 22px)", fontWeight: 500, color: "#CBD5E1" }}>
                  בעזרת כלי AI
                </span>
              </h1>
              <p style={{ fontSize: 18, color: "#CBD5E1", maxWidth: 600, margin: "0 auto 8px" }}>
                בחר קטגוריה וקבל 3 רעיונות מאומתים למיקרו-SaaS שאפשר לבנות ולהשיק תוך שבועות.
              </p>
              <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: "monospace" }}>
                Powered by GTM BootCamp AI Engine
              </p>
            </div>

            {/* Category Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(200px, 1fr))",
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

            {/* Custom category tile — centered, separated */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
              <button
                onClick={() => setCategory("custom")}
                style={{
                  padding: "14px 32px",
                  borderRadius: 12,
                  border: `1.5px dashed ${category === "custom" ? "#00FF88" : "#1E2D45"}`,
                  background: category === "custom" ? "rgba(0,255,136,0.08)" : "#161D2B",
                  color: category === "custom" ? "#00FF88" : "#CBD5E1",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 20 }}>✏️</span>
                קטגוריה מותאמת אישית
              </button>
            </div>

            {/* Custom category input — shown when "custom" is selected */}
            {category === "custom" && (
              <div style={{ maxWidth: 480, margin: "0 auto 24px" }}>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && customCategory.trim()) handleGenerate(); }}
                  placeholder='לדוגמה: "ניהול מרפאות שיניים" או "אוטומציה למלונות בוטיק"'
                  style={{
                    width: "100%",
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: "2px solid #00FF88",
                    background: "#0D1117",
                    color: "#F0F6FF",
                    fontSize: 15,
                    outline: "none",
                  }}
                />
                <p style={{ fontSize: 11, color: "#94A3B8", fontFamily: "monospace", marginTop: 6 }}>
                  תאר את הקטגוריה, הנישה, או התחום שמעניין אותך
                </p>
              </div>
            )}

            {/* Market Selection */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
              <button
                onClick={() => setMarket("israel")}
                style={{
                  padding: isMobile ? "10px 18px" : "10px 24px",
                  borderRadius: 10,
                  border: `1.5px solid ${market === "israel" ? "#00FF88" : "#1E2D45"}`,
                  background: market === "israel" ? "rgba(0,255,136,0.1)" : "#161D2B",
                  color: market === "israel" ? "#00FF88" : "#CBD5E1",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                🇮🇱 שוק ישראלי
              </button>
              <button
                onClick={() => setMarket("international")}
                style={{
                  padding: "10px 24px",
                  borderRadius: 10,
                  border: `1.5px solid ${market === "international" ? "#00FF88" : "#1E2D45"}`,
                  background: market === "international" ? "rgba(0,255,136,0.1)" : "#161D2B",
                  color: market === "international" ? "#00FF88" : "#CBD5E1",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontSize: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                🌍 שוק בינלאומי
              </button>
            </div>

            {error && (
              <p style={{ color: "#EF4444", textAlign: "center", marginBottom: 16 }}>{error}</p>
            )}

            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                style={{
                  padding: "14px 48px",
                  borderRadius: 12,
                  border: "none",
                  background: canGenerate
                    ? "linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)"
                    : "#1E2D45",
                  color: canGenerate ? "#080A0F" : "#94A3B8",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: canGenerate ? "pointer" : "not-allowed",
                  transition: "all 0.3s",
                  boxShadow: canGenerate ? "0 4px 16px rgba(0,255,136,0.3)" : "none",
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
            <p style={{ fontSize: 13, color: "#94A3B8" }}>
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
            <div style={{ textAlign: "center", marginBottom: 56, animation: "fadeInUp 0.6s both" }}>
              <h2 style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, marginBottom: 10, letterSpacing: "-0.02em" }}>
                <span style={{ color: "#00FF88" }}>3 שרטוטי SaaS</span> מוכנים
              </h2>
              <p style={{ color: "#D1D5DB", fontSize: 15, maxWidth: 500, margin: "0 auto" }}>
                כל רעיון אומת עבור התאמה לשוק, יכולת בנייה, ופוטנציאל הכנסות.
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12,
                padding: "6px 16px", borderRadius: 20,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                fontSize: 12, fontFamily: "monospace", color: "#D1D5DB",
              }}>
                {market === "israel" ? "🇮🇱 שוק ישראלי" : "🌍 שוק בינלאומי"}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              {ideas.map((idea, idx) => {
                const dc = difficultyColor(idea.difficulty);
                const isExpanded = expandedCards.has(idx);
                return (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(22, 29, 43, 0.55)",
                      backdropFilter: "blur(24px) saturate(1.3)",
                      WebkitBackdropFilter: "blur(24px) saturate(1.3)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 20,
                      position: "relative",
                      overflow: "hidden",
                      animation: `fadeInUp 0.6s ${idx * 0.2}s both`,
                      boxShadow: "0 4px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)",
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    }}
                  >
                    {/* ── Top Glow Bar (card identity color) ── */}
                    <div style={{
                      position: "absolute", top: 0, right: 0, left: 0, height: 2,
                      background: cardAccents[idx % 3], opacity: 0.8,
                    }} />

                    {/* ── Zone A: Hero Header ── */}
                    <div style={{
                      padding: isMobile ? "24px 20px 20px" : "32px 32px 24px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#94A3B8", letterSpacing: "0.05em" }}>
                          IDEA #{idx + 1}
                        </span>
                        <span style={{
                          fontSize: 11, fontFamily: "monospace", fontWeight: 600,
                          padding: "2px 8px", borderRadius: 4, background: dc.bg, color: dc.color,
                        }}>
                          {difficultyLabel(idea.difficulty)}
                        </span>
                      </div>
                      <h3 style={{
                        fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#F1F5F9",
                        direction: "ltr", textAlign: "right",
                        letterSpacing: "-0.01em", lineHeight: 1.2, marginBottom: 10,
                      }}>
                        {idea.name}
                      </h3>
                      <p style={{ color: "#FF6B35", fontSize: 16, fontWeight: 500, lineHeight: 1.6 }}>
                        {idea.tagline}
                      </p>
                    </div>

                    {/* ── Divider ── */}
                    <div style={{
                      height: 1, margin: "0 32px",
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
                    }} />

                    {/* ── Zone B: Bento Grid ── */}
                    <div style={{
                      padding: isMobile ? "20px 20px" : "24px 32px",
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: 12,
                    }}>
                      {/* Market Size + Target Audience — top row */}
                      <div style={{
                        background: "rgba(0,255,136,0.04)", borderRadius: 14,
                        padding: "18px 20px", border: "1px solid rgba(0,255,136,0.1)",
                      }}>
                        <p style={{
                          fontSize: 10, fontFamily: "monospace", color: "#00FF88",
                          marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase",
                        }}>גודל שוק</p>
                        <p style={{ fontSize: 14, color: "#F1F5F9", fontWeight: 600, lineHeight: 1.5 }}>{idea.market_size}</p>
                      </div>

                      <div style={{
                        background: "rgba(167,139,250,0.04)", borderRadius: 14,
                        padding: "18px 20px", border: "1px solid rgba(167,139,250,0.1)",
                      }}>
                        <p style={{
                          fontSize: 10, fontFamily: "monospace", color: "#A78BFA",
                          marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase",
                        }}>קהל יעד</p>
                        <p style={{ fontSize: 14, color: "#F1F5F9", fontWeight: 600, lineHeight: 1.5 }}>{idea.target_audience}</p>
                      </div>

                      {/* Problem — full width */}
                      <div style={{
                        gridColumn: isMobile ? "1" : "1 / -1",
                        background: "rgba(8,10,15,0.5)", borderRadius: 14,
                        padding: "18px 20px", border: "1px solid rgba(239,68,68,0.08)",
                      }}>
                        <p style={{
                          fontSize: 10, fontFamily: "monospace", color: "#EF4444",
                          marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase",
                        }}>הבעיה</p>
                        <p style={{ fontSize: 14, color: "#E2E8F0", lineHeight: 1.7 }}>{idea.problem}</p>
                      </div>

                      {/* Solution — full width */}
                      <div style={{
                        gridColumn: isMobile ? "1" : "1 / -1",
                        background: "rgba(0,255,136,0.03)", borderRadius: 14,
                        padding: "18px 20px", border: "1px solid rgba(0,255,136,0.06)",
                      }}>
                        <p style={{
                          fontSize: 10, fontFamily: "monospace", color: "#00FF88",
                          marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase",
                        }}>הפתרון</p>
                        <p style={{ fontSize: 14, color: "#E2E8F0", lineHeight: 1.7 }}>{idea.solution}</p>
                      </div>

                      {/* Monetization */}
                      <div style={{
                        background: "rgba(255,107,53,0.04)", borderRadius: 14,
                        padding: "18px 20px", border: "1px solid rgba(255,107,53,0.1)",
                      }}>
                        <p style={{
                          fontSize: 10, fontFamily: "monospace", color: "#FF6B35",
                          marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase",
                        }}>מונטיזציה</p>
                        <p style={{ fontSize: 14, color: "#F1F5F9", fontWeight: 500, lineHeight: 1.5 }}>{idea.monetization}</p>
                      </div>

                      {/* Competitive Edge */}
                      <div style={{
                        background: "rgba(0,212,255,0.04)", borderRadius: 14,
                        padding: "18px 20px", border: "1px solid rgba(0,212,255,0.1)",
                      }}>
                        <p style={{
                          fontSize: 10, fontFamily: "monospace", color: "#00D4FF",
                          marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase",
                        }}>יתרון תחרותי</p>
                        <p style={{ fontSize: 14, color: "#F1F5F9", fontWeight: 500, lineHeight: 1.6 }}>{idea.competitive_edge}</p>
                      </div>
                    </div>

                    {/* ── Zone D: Expandable Toggle ── */}
                    <button
                      onClick={() => toggleExpand(idx)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                        width: "100%", padding: "14px 20px",
                        background: "rgba(0,212,255,0.04)",
                        border: "none",
                        borderTop: "1px solid rgba(0,212,255,0.1)",
                        borderBottom: isExpanded ? "1px solid rgba(0,212,255,0.1)" : "none",
                        color: "#00D4FF", fontSize: 14, fontWeight: 600,
                        cursor: "pointer", transition: "all 0.2s",
                      }}
                    >
                      <span style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.3s ease", display: "inline-block",
                      }}>▼</span>
                      {isExpanded ? "הסתר פרטים טכניים" : "פרטים טכניים ו-MVP"}
                    </button>

                    {/* ── Expandable Content ── */}
                    <div style={{
                      maxHeight: isExpanded ? 500 : 0,
                      overflow: "hidden",
                      transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}>
                      <div style={{ padding: isMobile ? "0 20px 20px" : "0 32px 20px" }}>
                        {/* API Tags — Cyan theme */}
                        {idea.apis_used && idea.apis_used.length > 0 && (
                          <div style={{ marginBottom: 16, marginTop: 8 }}>
                            <p style={{
                              fontSize: 10, fontFamily: "monospace", color: "#00D4FF",
                              marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase",
                            }}>APIs</p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, direction: "ltr", marginBottom: 10 }}>
                              {idea.apis_used.map((api, j) => (
                                <span key={j} style={{
                                  fontSize: 11, fontFamily: "monospace", padding: "4px 10px",
                                  borderRadius: 6, background: "rgba(0,212,255,0.08)",
                                  border: "1px solid rgba(0,212,255,0.2)", color: "#00D4FF",
                                }}>
                                  {api}
                                </span>
                              ))}
                            </div>
                            <p style={{ fontSize: 13, color: "#D1D5DB", lineHeight: 1.6 }}>
                              {idea.api_explanation}
                            </p>
                          </div>
                        )}

                        {/* MVP Scope — bullet list */}
                        {idea.mvp_scope && idea.mvp_scope.length > 0 && (
                          <div>
                            <p style={{
                              fontSize: 10, fontFamily: "monospace", color: "#A78BFA",
                              marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase",
                            }}>היקף MVP</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {idea.mvp_scope.map((item, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E2E8F0" }}>
                                  <span style={{
                                    width: 6, height: 6, borderRadius: "50%",
                                    background: "#A78BFA", flexShrink: 0,
                                  }} />
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Zone E: CTA Button ── */}
                    <div style={{ padding: isMobile ? "0 20px 24px" : "0 32px 28px" }}>
                      <button
                        onClick={() => handleActivateIdea(idea)}
                        style={{
                          width: "100%", padding: "14px", borderRadius: 14,
                          border: "none",
                          background: "linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)",
                          color: "#080A0F", fontSize: 15, fontWeight: 700,
                          cursor: "pointer", transition: "all 0.25s ease",
                          boxShadow: "0 4px 20px rgba(0,255,136,0.25)",
                          letterSpacing: "-0.01em",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,255,136,0.4)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,255,136,0.25)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        הוצא את הרעיון לפועל
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Try again */}
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <button
                onClick={() => { setStage("select"); setIdeas([]); setExpandedCards(new Set()); }}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#D1D5DB", padding: "10px 28px",
                  borderRadius: 10, cursor: "pointer",
                  fontSize: 13, fontFamily: "monospace",
                  transition: "all 0.2s",
                }}
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
                color: "#CBD5E1",
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
              <p style={{ fontSize: 14, color: "#CBD5E1" }}>
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

