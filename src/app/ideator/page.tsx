"use client";

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { captureUTM, getUTMForPayload } from "@/lib/utm";
import { fbLead, fbViewContent } from "@/lib/fbpixel";
import { trackEvent } from "@/lib/track-event";
import { validateEmail } from "@/lib/validation";

/* ── Brainstorm particles config ── */
const BINARY_SNIPPETS = ["01", "10", "001", "110", "0101", "1010", "{ }", "< >", "=>", "AI", "//", "&&", "$$", "**"];
const PARTICLE_COUNT = 28;

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
  { value: "proptech", label: 'נדל"ן וטכנולוגיה', emoji: "🏠" },
  { value: "legaltech", label: "משפטי וטכנולוגיה", emoji: "⚖️" },
  { value: "hrtech", label: "HR וגיוס", emoji: "👥" },
];

const CATEGORY_LABELS: Record<string, string> = {};
CATEGORIES.forEach((c) => { CATEGORY_LABELS[c.value] = c.label; });

interface IdeaResult {
  name: string;
  tagline: string;
  pitch?: string;
  architecture?: string;
  monetization: string;
  audience_bullets?: string[];
  potential_mrr?: string;
  generated_apis?: string[];
  difficulty: "easy" | "medium" | "hard";
  market_size?: string;
  // Legacy fields for backwards compatibility
  problem?: string;
  solution?: string;
  target_audience?: string;
  mvp_scope?: string[];
  apis_used?: string[];
  api_explanation?: string;
  value_bullets?: string[];
}

type Stage = "select" | "building" | "results";
type Market = "israel" | "international";

export default function IdeatorPage() {
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [market, setMarket] = useState<Market>("israel");
  const [adminKey, setAdminKey] = useState("");
  const [stage, setStage] = useState<Stage>("select");

  // Track page view
  useEffect(() => {
    trackEvent({ eventType: "page_view", eventName: "ideator_page", stepName: "ideator" });
  }, []);

  useEffect(() => {
    captureUTM();
    const params = new URLSearchParams(window.location.search);
    const key = params.get("admin");
    if (key) setAdminKey(key); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const [ideas, setIdeas] = useState<IdeaResult[]>([]);
  const [error, setError] = useState("");
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [rateLimitName, setRateLimitName] = useState("");
  const [rateLimitPhone, setRateLimitPhone] = useState("");
  const [rateLimitEmail, setRateLimitEmail] = useState("");
  const [rateLimitSubmitted, setRateLimitSubmitted] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [buildProgress, setBuildProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Generate brainstorm particles (stable across renders)
  const [particles] = useState(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.round((i / PARTICLE_COUNT) * 90 + (((i * 7 + 3) % 10))),
      text: BINARY_SNIPPETS[i % BINARY_SNIPPETS.length],
      duration: 6 + ((i * 3 + 5) % 8),
      delay: (i * 7) % 10,
    })),
  );

  // Inline form state per card
  const [openFormIdx, setOpenFormIdx] = useState<number | null>(null);
  const [formEmail, setFormEmail] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const ideatorCodeLines = [
    { text: "$ ideator init --scan=market", color: "#00FF88", delay: 0 },
    { text: "  Scanning market trends...", color: "#6B7FA3", delay: 400 },
    { text: "  ✓ Trend analysis complete", color: "#3B82F6", delay: 1200 },
    { text: "  ✓ Competitive gaps found", color: "#3B82F6", delay: 2000 },
    { text: "$ ideator analyze --pain-points", color: "#00FF88", delay: 3000 },
    { text: "  Identifying pain points...", color: "#6B7FA3", delay: 3400 },
    { text: "  ✓ Pain points mapped", color: "#3B82F6", delay: 4200 },
    { text: "  ✓ Concepts assembled", color: "#3B82F6", delay: 5000 },
    { text: "$ ideator validate --models", color: "#00FF88", delay: 5800 },
    { text: "  Validating business models...", color: "#6B7FA3", delay: 6200 },
    { text: "  ✓ Revenue models verified", color: "#3B82F6", delay: 7000 },
    { text: "  ✓ Market fit confirmed", color: "#3B82F6", delay: 7800 },
    { text: "$ ideator compile --output=ideas.json", color: "#00FF88", delay: 8600 },
    { text: "  Polishing final results...", color: "#6B7FA3", delay: 9000 },
    { text: "  ⟳ Compiling idea documents...", color: "#FF6B35", delay: 10000 },
  ];

  const selectedCategory = category === "custom" ? customCategory.trim() : category;
  const canGenerate = category && (category !== "custom" || customCategory.trim().length > 1);

  const getCategoryLabel = () => {
    if (category === "custom") return customCategory.trim();
    return CATEGORY_LABELS[category] || category;
  };

  const getMarketLabel = () => market === "israel" ? "ישראלי" : "גלובלי";

  const handleGenerate = async () => {
    if (!canGenerate) return;
    trackEvent({ eventType: "button_click", eventName: "ideator_generate_click", stepName: "ideator", metadata: { category: selectedCategory, market } });
    setStage("building");
    setError("");
    setVisibleLines(0);
    setCursorVisible(true);
    setBuildProgress(0);

    // Reveal lines one by one
    const timers = ideatorCodeLines.map((line, i) =>
      setTimeout(() => setVisibleLines(i + 1), line.delay)
    );
    // Cursor blink
    const cursorInterval = setInterval(() => setCursorVisible((v) => !v), 530);
    // Progress bar
    const progressInterval = setInterval(() => {
      setBuildProgress((p) => {
        if (p >= 95) return 95;
        return p + Math.random() * 3 + 0.5;
      });
    }, 400);

    try {
      const res = await fetch("/api/public/ideator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: selectedCategory, market, ...(adminKey ? { admin_key: adminKey } : {}) }),
      });
      const data = await res.json();
      timers.forEach(clearTimeout);
      clearInterval(cursorInterval);
      clearInterval(progressInterval);

      if (data.error) {
        if (res.status === 429) {
          setShowRateLimitModal(true);
          setStage("select");
          trackEvent({ eventType: "interaction", eventName: "ideator_rate_limit_hit", stepName: "ideator", metadata: { category: selectedCategory, market } });
        } else {
          setError(data.error);
          setStage("select");
        }
        return;
      }

      setIdeas(data.ideas || []);
      setStage("results");
      fbViewContent("Ideator Results");
      trackEvent({ eventType: "generation_complete", eventName: "ideator_ideas_generated", stepName: "ideator", metadata: { category: selectedCategory, market, ideaCount: data.ideas?.length, ideaNames: data.ideas?.map((i: IdeaResult) => i.name) } });
    } catch {
      timers.forEach(clearTimeout);
      clearInterval(cursorInterval);
      clearInterval(progressInterval);
      setError("משהו השתבש. נסה שוב.");
      setStage("select");
    }
  };

  const handleRateLimitSubmit = () => {
    if (!rateLimitName.trim() || !rateLimitPhone.trim()) return;
    fbLead("Ideator Rate Limit Call");
    trackEvent({ eventType: "step_complete", eventName: "ideator_rate_limit_lead", stepName: "ideator", metadata: { name: rateLimitName, phone: rateLimitPhone, email: rateLimitEmail, category: selectedCategory, market } });

    // Send lead to GHL webhook (EVENT_BOOTCAMP_APPLICATION)
    // Use keepalive so the request survives page navigation
    fetch("/api/webhooks/bootcamp-apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: rateLimitEmail.trim() || `${rateLimitPhone.trim()}@phone.lead`,
        name: rateLimitName.trim(),
        phone: rateLimitPhone.trim(),
        idea_context: getCategoryLabel(),
        source: "ideator_rate_limit",
        ...getUTMForPayload(),
      }),
      keepalive: true,
    }).catch(() => { /* best-effort */ });

    setRateLimitSubmitted(true);
  };

  const [formEmailError, setFormEmailError] = useState("");

  const handleInlineSubmit = (idea: IdeaResult) => {
    if (!formEmail.trim()) return;
    const emailCheck = validateEmail(formEmail);
    if (!emailCheck.valid) {
      setFormEmailError(emailCheck.error!);
      return;
    }
    setFormEmailError("");
    fbLead("Ideator Entry");
    trackEvent({ eventType: "step_complete", eventName: "ideator_lead_submitted", stepName: "ideator", metadata: { ideaName: idea.name, category: selectedCategory } });
    try {
      localStorage.setItem("gtm-ideator-selected", JSON.stringify({
        name: idea.name,
        pitch: idea.tagline,
        niche: idea.audience_bullets?.join(", ") || idea.target_audience || "",
        apisUsed: idea.generated_apis || idea.apis_used || [],
      }));
    } catch { /* ignore */ }

    // EVENT_LEAD_START: fire abandonment recovery webhook with UTM
    // Use keepalive so the request survives page navigation
    fetch("/api/webhooks/gtm-lead-start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formEmail.trim(),
        ideaName: idea.name,
        category: selectedCategory,
        source: "gtm_ideator",
        ...getUTMForPayload(),
      }),
      keepalive: true,
    }).catch(() => { /* best-effort */ });

    const encodedEmail = encodeURIComponent(formEmail.trim());
    const encodedIdea = encodeURIComponent(idea.name);
    // Carry UTM params forward to signup
    const utmParams = getUTMForPayload();
    const utmQuery = Object.entries(utmParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    window.location.assign(`/signup?track=gtm&email=${encodedEmail}&idea=${encodedIdea}${utmQuery ? "&" + utmQuery : ""}`);
  };

  // Helpers for backwards-compatible field access
  const getApis = (idea: IdeaResult) => idea.generated_apis || idea.apis_used || [];
  const getPitch = (idea: IdeaResult) => idea.pitch || idea.problem || "";
  const getArchitecture = (idea: IdeaResult) => idea.architecture || idea.api_explanation || idea.solution || "";
  const getAudienceBullets = (idea: IdeaResult) => {
    if (idea.audience_bullets && idea.audience_bullets.length > 0) return idea.audience_bullets;
    if (idea.target_audience) return [idea.target_audience];
    return [];
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#080A0F",
        color: "#F0F6FF",
        paddingBottom: 80,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Brainstorm: Floating binary particles ── */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="ideator-particle"
          style={{
            left: `${p.x}%`,
            top: `-30px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {p.text}
        </div>
      ))}

      {/* ── Glowing orbs ── */}
      <div className="ideator-orb ideator-orb-1" />
      <div className="ideator-orb ideator-orb-2" />
      <div className="ideator-orb ideator-orb-3" />

      {/* ── Neural network SVG lines ── */}
      <svg
        viewBox="0 0 1000 1000"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
        preserveAspectRatio="none"
      >
        <path className="ideator-neural-line" d="M 100,50 Q 300,250 500,500 T 500,950" />
        <path className="ideator-neural-line" d="M 900,50 Q 700,250 500,500 T 500,950" />
        <path className="ideator-neural-line" d="M 500,0 Q 500,300 500,500 T 500,950" />
        <path className="ideator-neural-line" d="M 250,80 Q 400,350 500,550 T 500,950" />
        <path className="ideator-neural-line" d="M 750,80 Q 600,350 500,550 T 500,950" />
      </svg>


      {/* ── Subtle grid overlay ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        pointerEvents: "none",
        zIndex: 0,
        maskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 70%)",
      }} />

      {/* Header */}
      <header
        style={{
          padding: isMobile ? "14px 16px" : "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          borderBottom: "1px solid #1E2D45",
          gap: 8,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gtm-logo.svg" alt="GTM Bootcamp" style={{ height: isMobile ? 24 : 32, width: "auto", flexShrink: 0 }} />
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "32px 16px" : "48px 24px", position: "relative", zIndex: 1 }}>
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
                {/* AI icon + subtitle row */}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10, justifyContent: "center", marginTop: 8 }}>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "1.5px solid rgba(0,255,136,0.4)",
                    background: "rgba(0,255,136,0.08)",
                    fontSize: 16,
                  }}>
                    🧠
                  </span>
                  <span style={{ fontSize: "clamp(16px, 2.5vw, 22px)", fontWeight: 500, color: "#CBD5E1" }}>
                    בעזרת כלי AI
                  </span>
                  <span className="ideator-badge" style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: "#00FF88",
                    padding: "4px 12px",
                    borderRadius: 6,
                    border: "1px solid rgba(0,255,136,0.4)",
                    background: "rgba(0,255,136,0.1)",
                    letterSpacing: "0.05em",
                  }}>
                    IDEAS UNLOCKED
                  </span>
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

            {/* Custom category tile */}
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

            {/* Converging glow above button */}
            <div style={{ position: "relative" }}>
              <div className="ideator-converge-glow" style={{ bottom: 0 }} />
              <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className={canGenerate ? "ideator-btn-glow" : ""}
                  style={{
                    padding: "16px 56px",
                    borderRadius: 14,
                    border: canGenerate ? "1.5px solid rgba(0,255,136,0.5)" : "1.5px solid transparent",
                    background: canGenerate
                      ? "linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)"
                      : "#1E2D45",
                    color: canGenerate ? "#080A0F" : "#94A3B8",
                    fontSize: 18,
                    fontWeight: 800,
                    cursor: canGenerate ? "pointer" : "not-allowed",
                    transition: "all 0.3s",
                    boxShadow: canGenerate
                      ? "0 4px 24px rgba(0,255,136,0.35), 0 0 60px rgba(0,255,136,0.15)"
                      : "none",
                    letterSpacing: "-0.01em",
                  }}
                >
                  ⚡ ייצר לי רעיונות
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── BUILDING ANIMATION (Code Terminal) ── */}
        {stage === "building" && (
          <div style={{ padding: "40px 0", direction: "ltr" }}>
            {/* Terminal window */}
            <div style={{
              background: "#0A0E17",
              border: "1px solid #1E2D45",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}>
              {/* Terminal header bar */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 16px",
                background: "#111827",
                borderBottom: "1px solid #1E2D45",
              }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#EF4444" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#F59E0B" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22C55E" }} />
                <span style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 12, marginRight: 12 }}>
                  ideator-engine v2.0
                </span>
              </div>

              {/* Terminal body */}
              <div style={{ padding: "20px 24px", minHeight: 340, fontFamily: "monospace", fontSize: 13, lineHeight: 2 }}>
                {ideatorCodeLines.slice(0, visibleLines).map((line, i) => (
                  <div key={i} style={{
                    color: line.color,
                    opacity: 0,
                    animation: "gtm-line-appear 0.3s ease forwards",
                  }}>
                    {line.text}
                  </div>
                ))}
                {/* Blinking cursor */}
                <span style={{
                  color: "#00FF88",
                  opacity: cursorVisible ? 1 : 0,
                  transition: "opacity 0.1s",
                }}>
                  ▋
                </span>
              </div>

              {/* Progress bar at bottom */}
              <div style={{ padding: "0 24px 16px" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}>
                  <span style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11 }}>
                    Generating ideas...
                  </span>
                  <span style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 11 }}>
                    {Math.round(buildProgress)}%
                  </span>
                </div>
                <div style={{ height: 4, background: "#1E2D45", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${buildProgress}%`,
                    background: "linear-gradient(90deg, #00FF88, #3B82F6)",
                    borderRadius: 2,
                    transition: "width 0.4s ease",
                  }} />
                </div>
              </div>
            </div>

            {/* Hebrew status below terminal */}
            <div dir="rtl" style={{ textAlign: "center", marginTop: 24 }}>
              <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 15, fontWeight: 600 }}>
                מייצר רעיונות עסקיים...
              </p>
              <p style={{ color: "#6B7FA3", fontSize: 13, marginTop: 6 }}>
                סורק שוק, מגמות ופערים תחרותיים
              </p>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {stage === "results" && (
          <>
            {/* Reframed Header */}
            <div style={{ textAlign: "center", marginBottom: 56, animation: "fadeInUp 0.6s both" }}>
              <h2 style={{
                fontSize: isMobile ? 22 : 32,
                fontWeight: 800,
                marginBottom: 12,
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
              }}>
                <span style={{ color: "#00FF88" }}>מנוע הרעיונות:</span>{" "}
                3 הזדמנויות SaaS שכבר הוכחו בשטח
              </h2>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                marginTop: 8,
                padding: "8px 20px",
                borderRadius: 20,
                background: "rgba(0,255,136,0.06)",
                border: "1px solid rgba(0,255,136,0.15)",
                fontSize: 13,
                fontFamily: "monospace",
                color: "#CBD5E1",
              }}>
                <span style={{ color: "#00FF88", fontWeight: 600 }}>Playbook Context:</span>
                {getCategoryLabel()}
                <span style={{ color: "#3D4F6F" }}>|</span>
                <span>שוק: {getMarketLabel()}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              {ideas.map((idea, idx) => {
                const isFormOpen = openFormIdx === idx;
                const apis = getApis(idea);
                const pitch = getPitch(idea);
                const architecture = getArchitecture(idea);
                const audienceBullets = getAudienceBullets(idea);

                return (
                  <div
                    key={idx}
                    style={{
                      background: "#161D2B",
                      border: "1px solid #1E2D45",
                      borderRadius: 16,
                      position: "relative",
                      overflow: "hidden",
                      animation: `fadeInUp 0.6s ${idx * 0.2}s both`,
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    }}
                  >
                    {/* Top accent line */}
                    <div style={{
                      position: "absolute", top: 0, right: 0, left: 0, height: 2,
                      background: "linear-gradient(90deg, #00FF88, #00CC6A)",
                      opacity: 0.7,
                    }} />

                    <div style={{ padding: isMobile ? "24px 20px" : "32px 32px" }}>

                      {/* ── Card Header: Name + MRR ── */}
                      <div style={{
                        display: "flex",
                        alignItems: isMobile ? "flex-start" : "center",
                        justifyContent: "space-between",
                        flexDirection: isMobile ? "column" : "row",
                        gap: 12,
                        marginBottom: 20,
                      }}>
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontSize: 11,
                            fontFamily: "monospace",
                            color: "#00FF88",
                            marginBottom: 6,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}>
                            Breach Playbook #{idx + 1}
                          </p>
                          <h3 style={{
                            fontSize: isMobile ? 22 : 28,
                            fontWeight: 800,
                            color: "#F1F5F9",
                            direction: "ltr",
                            textAlign: "right",
                            letterSpacing: "-0.01em",
                            lineHeight: 1.2,
                            marginBottom: 4,
                          }}>
                            {idea.name}
                          </h3>
                          <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.5 }}>
                            {idea.tagline}
                          </p>
                        </div>
                        {/* Large MRR metric */}
                        <div style={{
                          background: "rgba(0,255,136,0.06)",
                          border: "1px solid rgba(0,255,136,0.15)",
                          borderRadius: 12,
                          padding: "14px 20px",
                          textAlign: "center",
                          flexShrink: 0,
                          minWidth: isMobile ? "100%" : 180,
                        }}>
                          <p style={{
                            fontSize: isMobile ? 26 : 32,
                            fontWeight: 800,
                            color: "#00FF88",
                            fontFamily: "monospace",
                            lineHeight: 1.2,
                            direction: "ltr",
                          }}>
                            {idea.potential_mrr || idea.monetization}
                          </p>
                          <p style={{
                            fontSize: 10,
                            color: "#94A3B8",
                            fontFamily: "monospace",
                            marginTop: 2,
                            letterSpacing: "0.05em",
                          }}>
                            POTENTIAL MRR
                          </p>
                        </div>
                      </div>

                      {/* ── API Tags ── */}
                      {apis.length > 0 && (
                        <div style={{ direction: "rtl", marginBottom: 20 }}>
                          <span style={{
                            display: "inline-block",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#00D4FF",
                            marginBottom: 8,
                            padding: "4px 12px",
                            borderRadius: 6,
                            background: "rgba(0,212,255,0.12)",
                            border: "1px solid rgba(0,212,255,0.25)",
                          }}>
                            &#x1F517; שילוב מערכות API
                          </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, direction: "ltr" }}>
                          {apis.map((api, j) => (
                            <span key={j} style={{
                              fontSize: 11,
                              fontFamily: "monospace",
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: "rgba(0,212,255,0.08)",
                              border: "1px solid rgba(0,212,255,0.2)",
                              color: "#00D4FF",
                              fontWeight: 600,
                              boxShadow: "0 0 6px rgba(0,212,255,0.1)",
                            }}>
                              {api}
                            </span>
                          ))}
                        </div>
                        </div>
                      )}

                      {/* ── Dashboard Grid ── */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: 12,
                        marginBottom: 20,
                      }}>
                        {/* Pitch Section — full width */}
                        {pitch && (
                          <div style={{
                            gridColumn: isMobile ? "1" : "1 / -1",
                            background: "rgba(255,255,255,0.03)",
                            borderRadius: 12,
                            padding: "16px 18px",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}>
                            <p className="text-lg font-bold text-[#00FF88] border-b border-[#00FF88]/30 pb-1 mb-2">
                              הזדמנות
                            </p>
                            <p style={{ fontSize: 14, color: "#E2E8F0", lineHeight: 1.7 }}>
                              {pitch}
                            </p>
                          </div>
                        )}

                        {/* Architecture Section — full width */}
                        {architecture && (
                          <div style={{
                            gridColumn: isMobile ? "1" : "1 / -1",
                            background: "rgba(0,212,255,0.03)",
                            borderRadius: 12,
                            padding: "16px 18px",
                            border: "1px solid rgba(0,212,255,0.08)",
                          }}>
                            <p className="text-lg font-bold text-[#00FF88] border-b border-[#00FF88]/30 pb-1 mb-2">
                              איך זה עובד?
                            </p>
                            <p style={{ fontSize: 14, color: "#E2E8F0", lineHeight: 1.7 }}>
                              {architecture}
                            </p>
                          </div>
                        )}

                        {/* Bottom Split: Monetization (left) | Audience (right) */}
                        <div style={{
                          background: "rgba(255,107,53,0.04)",
                          borderRadius: 12,
                          padding: "16px 18px",
                          border: "1px solid rgba(255,107,53,0.1)",
                        }}>
                          <p className="text-lg font-bold text-[#00FF88] border-b border-[#00FF88]/30 pb-1 mb-2">
                            מודל עסקי
                          </p>
                          <p style={{ fontSize: 14, color: "#F1F5F9", fontWeight: 500, lineHeight: 1.6 }}>
                            {idea.monetization}
                          </p>
                        </div>

                        <div style={{
                          background: "rgba(167,139,250,0.04)",
                          borderRadius: 12,
                          padding: "16px 18px",
                          border: "1px solid rgba(167,139,250,0.1)",
                        }}>
                          <p className="text-lg font-bold text-[#00FF88] border-b border-[#00FF88]/30 pb-1 mb-2">
                            קהל יעד
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {audienceBullets.map((bullet, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14, color: "#E2E8F0" }}>
                                <span style={{
                                  width: 5, height: 5, borderRadius: "50%",
                                  background: "#A78BFA", flexShrink: 0, marginTop: 7,
                                }} />
                                {bullet}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── CTA Button — Inline Lead Capture ── */}
                      <div>
                        <button
                          onClick={() => {
                            setOpenFormIdx(isFormOpen ? null : idx);
                            setFormEmail("");
                          }}
                          style={{
                            width: "100%",
                            padding: "14px",
                            borderRadius: 12,
                            border: "none",
                            background: isFormOpen
                              ? "rgba(0,255,136,0.1)"
                              : "linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)",
                            color: isFormOpen ? "#00FF88" : "#080A0F",
                            fontSize: 15,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.25s ease",
                            boxShadow: isFormOpen ? "none" : "0 4px 20px rgba(0,255,136,0.25)",
                          }}
                          onMouseEnter={(e) => {
                            if (!isFormOpen) {
                              e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,255,136,0.4)";
                              e.currentTarget.style.transform = "translateY(-1px)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isFormOpen) {
                              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,255,136,0.25)";
                              e.currentTarget.style.transform = "translateY(0)";
                            }
                          }}
                        >
                          {isFormOpen
                            ? "סגור"
                            : "איך מביאים לזה לקוחות משלמים? (בניית אסטרטגיית GTM) 🚀"}
                        </button>

                        {/* ── Inline Form (revealed on click) ── */}
                        <div style={{
                          maxHeight: isFormOpen ? 320 : 0,
                          overflow: "hidden",
                          transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}>
                          <div style={{
                            marginTop: 16,
                            padding: "20px",
                            borderRadius: 12,
                            background: "rgba(0,255,136,0.04)",
                            border: "1px solid rgba(0,255,136,0.12)",
                          }}>
                            <p style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: "#F1F5F9",
                              marginBottom: 4,
                              lineHeight: 1.6,
                            }}>
                              רוצה להפוך את הרעיון הזה לעסק חי?
                            </p>
                            <p style={{
                              fontSize: 13,
                              color: "#94A3B8",
                              marginBottom: 14,
                              lineHeight: 1.6,
                            }}>
                              בוא נבנה לו אסטרטגיית חדירה לשוק צעד אחר צעד.
                            </p>
                            <div style={{
                              display: "flex",
                              gap: 8,
                              flexDirection: isMobile ? "column" : "row",
                            }}>
                              <input
                                type="email"
                                value={formEmail}
                                onChange={(e) => { setFormEmail(e.target.value); if (formEmailError) setFormEmailError(""); }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && formEmail.trim()) handleInlineSubmit(idea);
                                }}
                                placeholder="הכנס אימייל (לשמירת התוכנית שלך)..."
                                dir="ltr"
                                style={{
                                  flex: 1,
                                  padding: "12px 16px",
                                  borderRadius: 10,
                                  border: "1.5px solid #1E2D45",
                                  background: "#0D1117",
                                  color: "#F0F6FF",
                                  fontSize: 14,
                                  outline: "none",
                                }}
                              />
                              <button
                                onClick={() => handleInlineSubmit(idea)}
                                disabled={!formEmail.trim()}
                                className={formEmail.trim() ? "bg-[#00FF88] text-black font-bold text-lg hover:bg-[#00cc6a] transition-all shadow-[0_0_15px_rgba(0,255,136,0.4)]" : ""}
                                style={{
                                  padding: "12px 20px",
                                  borderRadius: 10,
                                  border: "none",
                                  ...(!formEmail.trim() ? {
                                    background: "#1E2D45",
                                    color: "#94A3B8",
                                    fontSize: 14,
                                    fontWeight: 700,
                                  } : {}),
                                  cursor: formEmail.trim() ? "pointer" : "not-allowed",
                                  whiteSpace: "nowrap",
                                  transition: "all 0.2s",
                                }}
                              >
                                צור לי תוכנית עסקית ושיווקית
                              </button>
                            </div>
                            {formEmailError && (
                              <p style={{ color: "#FF6B6B", fontSize: 13, marginTop: 6, textAlign: "right" }}>{formEmailError}</p>
                            )}
                            {/* Animated Stepper */}
                            <div className="flex items-center justify-center gap-0 mt-4" dir="rtl">
                              {/* Step 1 - Completed */}
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-[#00FF88]/20 border-2 border-[#00FF88] flex items-center justify-center text-[#00FF88] font-bold text-sm">
                                  ✓
                                </div>
                                <span className="text-[#00FF88] text-xs font-semibold mt-1 font-mono">רעיון</span>
                              </div>
                              {/* Line 1-2 */}
                              <div className="w-12 h-0.5 bg-[#00FF88]/40 mx-1" />
                              {/* Step 2 - Active */}
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-[#00FF88]/10 border-2 border-[#00FF88] flex items-center justify-center animate-pulse" style={{ textShadow: "0 0 8px #00FF88" }}>
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#00FF88]" />
                                </div>
                                <span className="text-[#00FF88] text-xs font-semibold mt-1 font-mono animate-pulse" style={{ textShadow: "0 0 6px rgba(0,255,136,0.5)" }}>משתמש</span>
                              </div>
                              {/* Line 2-3 */}
                              <div className="w-12 h-0.5 bg-gray-600 mx-1" />
                              {/* Step 3 - Future */}
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full border-2 border-gray-600 flex items-center justify-center text-gray-500 text-sm">
                                  3
                                </div>
                                <span className="text-gray-500 text-xs font-semibold mt-1 font-mono">GTM</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Try again */}
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <button
                onClick={() => { setStage("select"); setIdeas([]); setOpenFormIdx(null); }}
                className="border-2 border-[#00FF88] text-[#00FF88] hover:bg-[#00FF88]/10 px-8 py-3 rounded-lg font-bold transition-all inline-flex items-center gap-2"
                style={{ cursor: "pointer", fontSize: 15 }}
              >
                <RefreshCw size={18} />
                נסה שילוב אחר
              </button>
            </div>

          </>
        )}
      </main>

      {/* ── Rate Limit Modal ── */}
      {showRateLimitModal && (
        <div
          onClick={() => { setShowRateLimitModal(false); setRateLimitSubmitted(false); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(135deg, #0F1729 0%, #131B2E 100%)",
              border: "1.5px solid rgba(0,255,136,0.3)",
              borderRadius: 20,
              padding: "36px 28px",
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              position: "relative",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,255,136,0.1)",
              animation: "fadeInUp 0.3s ease-out",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => { setShowRateLimitModal(false); setRateLimitSubmitted(false); }}
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                background: "none",
                border: "none",
                color: "#94A3B8",
                fontSize: 22,
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            {!rateLimitSubmitted ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F0F6FF", marginBottom: 4 }}>
                  הגעת למגבלת הרעיונות היומית
                </h2>
                <p style={{ color: "#64748B", fontSize: 13, marginBottom: 12 }}>
                  (המגבלה היומית היא 3)
                </p>
                <p style={{ color: "#94A3B8", fontSize: 15, marginBottom: 24, lineHeight: 1.6 }}>
                  השאר פרטים ונחזור אליך
                  <br />
                  על הרעיונות שמצאת ואיך להפוך אותם לעסק
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                  <input
                    type="text"
                    placeholder="שם מלא *"
                    value={rateLimitName}
                    onChange={(e) => setRateLimitName(e.target.value)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1.5px solid #1E2D45",
                      background: "#0A0E17",
                      color: "#F0F6FF",
                      fontSize: 15,
                      outline: "none",
                      direction: "rtl",
                    }}
                  />
                  <input
                    type="tel"
                    placeholder="טלפון *"
                    value={rateLimitPhone}
                    onChange={(e) => setRateLimitPhone(e.target.value)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1.5px solid #1E2D45",
                      background: "#0A0E17",
                      color: "#F0F6FF",
                      fontSize: 15,
                      outline: "none",
                      direction: "ltr",
                      textAlign: "right",
                    }}
                  />
                  <input
                    type="email"
                    placeholder="אימייל (אופציונלי)"
                    value={rateLimitEmail}
                    onChange={(e) => setRateLimitEmail(e.target.value)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1.5px solid #1E2D45",
                      background: "#0A0E17",
                      color: "#F0F6FF",
                      fontSize: 15,
                      outline: "none",
                      direction: "ltr",
                      textAlign: "right",
                    }}
                  />
                </div>

                <button
                  onClick={handleRateLimitSubmit}
                  disabled={!rateLimitName.trim() || !rateLimitPhone.trim()}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    borderRadius: 12,
                    border: "none",
                    background: rateLimitName.trim() && rateLimitPhone.trim()
                      ? "linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)"
                      : "#1E2D45",
                    color: rateLimitName.trim() && rateLimitPhone.trim() ? "#080A0F" : "#94A3B8",
                    fontSize: 17,
                    fontWeight: 800,
                    cursor: rateLimitName.trim() && rateLimitPhone.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.2s",
                    boxShadow: rateLimitName.trim() && rateLimitPhone.trim()
                      ? "0 4px 20px rgba(0,255,136,0.3)"
                      : "none",
                  }}
                >
                  שלח פרטים ←
                </button>

                <p style={{ color: "#475569", fontSize: 12, marginTop: 12 }}>
                  ללא עלות • ללא התחייבות
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#00FF88", marginBottom: 8 }}>
                  הפרטים נשלחו בהצלחה!
                </h2>
                <p style={{ color: "#94A3B8", fontSize: 15, lineHeight: 1.6 }}>
                  דוד יחזור אליך בהקדם לתיאום שיחה קצרה
                  <br />
                  על הרעיונות שמצאת 🚀
                </p>
                <button
                  onClick={() => { setShowRateLimitModal(false); setRateLimitSubmitted(false); }}
                  style={{
                    marginTop: 20,
                    padding: "12px 32px",
                    borderRadius: 10,
                    border: "1.5px solid #00FF88",
                    background: "transparent",
                    color: "#00FF88",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  סגור
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
