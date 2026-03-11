"use client";

import { useState } from "react";

const CATEGORIES = [
  { value: "ai-automation", label: "AI & Automation", emoji: "🤖" },
  { value: "fintech", label: "FinTech", emoji: "💰" },
  { value: "healthtech", label: "HealthTech", emoji: "🏥" },
  { value: "edtech", label: "EdTech", emoji: "📚" },
  { value: "ecommerce", label: "E-Commerce & Retail", emoji: "🛒" },
  { value: "devtools", label: "Developer Tools", emoji: "⚙️" },
  { value: "saas-b2b", label: "SaaS B2B", emoji: "🏢" },
  { value: "creator-economy", label: "Creator Economy", emoji: "🎬" },
  { value: "sustainability", label: "Sustainability", emoji: "🌱" },
  { value: "proptech", label: "PropTech", emoji: "🏠" },
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
}

type Stage = "select" | "building" | "results";

export default function IdeatorPage() {
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState<Stage>("select");
  const [ideas, setIdeas] = useState<IdeaResult[]>([]);
  const [error, setError] = useState("");
  const [buildStep, setBuildStep] = useState(0);

  const buildSteps = [
    "Scanning market trends...",
    "Analyzing competitor gaps...",
    "Identifying pain points...",
    "Assembling product concepts...",
    "Validating business models...",
    "Finalizing ideas...",
  ];

  const handleGenerate = async () => {
    if (!category) return;
    setStage("building");
    setError("");
    setBuildStep(0);

    // Animate build steps
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
      setError("Something went wrong. Please try again.");
      setStage("select");
    }
  };

  const difficultyColor = (d: string) => {
    if (d === "easy") return { bg: "rgba(0,255,136,0.15)", color: "#00FF88" };
    if (d === "medium") return { bg: "rgba(255,107,53,0.15)", color: "#FF6B35" };
    return { bg: "rgba(239,68,68,0.15)", color: "#EF4444" };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #080A0F 0%, #0D1117 50%, #080A0F 100%)",
        color: "#F0F6FF",
        fontFamily: "'Rubik', -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "24px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #1E2D45",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: "#00FF88", fontFamily: "monospace" }}>
            GTM
          </span>
          <span style={{ fontSize: 20, fontWeight: 600, color: "#F0F6FF" }}>BootCamp</span>
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
          href="/login?track=gtm"
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: "1px solid #1E2D45",
            color: "#6B7FA3",
            fontSize: 14,
            textDecoration: "none",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#00FF88";
            e.currentTarget.style.color = "#00FF88";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#1E2D45";
            e.currentTarget.style.color = "#6B7FA3";
          }}
        >
          Sign In
        </a>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
        {/* Hero Section */}
        {stage === "select" && (
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1
              style={{
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              Micro-SaaS{" "}
              <span style={{ color: "#00FF88" }}>Idea Generator</span>
            </h1>
            <p style={{ fontSize: 18, color: "#6B7FA3", maxWidth: 560, margin: "0 auto 8px" }}>
              Pick a category. Get 3 validated micro-SaaS ideas you can build and launch in weeks.
            </p>
            <p style={{ fontSize: 13, color: "#3D4F6F", fontFamily: "monospace" }}>
              Powered by GTM BootCamp AI Engine
            </p>
          </div>
        )}

        {/* Category Selector */}
        {stage === "select" && (
          <>
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
                    padding: "16px",
                    borderRadius: 12,
                    border: `1.5px solid ${category === cat.value ? "#00FF88" : "#1E2D45"}`,
                    background: category === cat.value ? "rgba(0,255,136,0.08)" : "#161D2B",
                    color: category === cat.value ? "#00FF88" : "#F0F6FF",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
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
                  boxShadow: category
                    ? "0 4px 16px rgba(0,255,136,0.3)"
                    : "none",
                }}
              >
                Generate Ideas
              </button>
            </div>
          </>
        )}

        {/* Building Animation (Lego Assembly) */}
        {stage === "building" && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            {/* Animated blocks */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                marginBottom: 40,
              }}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 40,
                    height: buildStep >= i ? 40 + i * 12 : 8,
                    borderRadius: 6,
                    background:
                      buildStep >= i
                        ? `linear-gradient(135deg, #00FF88 ${20 + i * 15}%, #00CC6A 100%)`
                        : "#1E2D45",
                    transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    opacity: buildStep >= i ? 1 : 0.3,
                    boxShadow:
                      buildStep >= i
                        ? "0 0 12px rgba(0,255,136,0.3)"
                        : "none",
                  }}
                />
              ))}
            </div>

            <p
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "#00FF88",
                fontFamily: "monospace",
                marginBottom: 8,
              }}
            >
              {buildSteps[buildStep]}
            </p>
            <p style={{ fontSize: 13, color: "#3D4F6F" }}>
              Step {buildStep + 1} of {buildSteps.length}
            </p>

            {/* Progress bar */}
            <div
              style={{
                maxWidth: 300,
                margin: "24px auto 0",
                height: 4,
                borderRadius: 2,
                background: "#1E2D45",
                overflow: "hidden",
              }}
            >
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

        {/* Results */}
        {stage === "results" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                Your <span style={{ color: "#00FF88" }}>3 Ideas</span> Are Ready
              </h2>
              <p style={{ color: "#6B7FA3", fontSize: 14 }}>
                Each idea is validated for market fit, buildability, and monetization potential.
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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 16,
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: "monospace",
                            color: "#3D4F6F",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          IDEA #{idx + 1}
                        </span>
                        <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
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
                        {idea.difficulty}
                      </span>
                    </div>

                    {/* Grid sections */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: 16,
                      }}
                    >
                      <Section title="Problem" text={idea.problem} />
                      <Section title="Solution" text={idea.solution} />
                      <Section title="Target Audience" text={idea.target_audience} />
                      <Section title="Monetization" text={idea.monetization} />
                      <Section title="Competitive Edge" text={idea.competitive_edge} />
                      <Section title="Market Size" text={idea.market_size} />
                    </div>

                    {/* MVP Scope */}
                    {idea.mvp_scope && idea.mvp_scope.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <p
                          style={{
                            fontSize: 11,
                            fontFamily: "monospace",
                            color: "#6B7FA3",
                            marginBottom: 8,
                            textTransform: "uppercase",
                          }}
                        >
                          MVP Scope
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
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div
              style={{
                marginTop: 48,
                textAlign: "center",
                padding: 32,
                background: "linear-gradient(135deg, rgba(0,255,136,0.05), rgba(255,107,53,0.05))",
                border: "1px solid #1E2D45",
                borderRadius: 16,
              }}
            >
              <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                Ready to Build Your Micro-SaaS?
              </h3>
              <p style={{ color: "#6B7FA3", fontSize: 14, marginBottom: 20 }}>
                Join GTM BootCamp to get a full Go-To-Market strategy, validation framework, and launch playbook.
              </p>
              <a
                href="/login?track=gtm"
                style={{
                  display: "inline-block",
                  padding: "14px 40px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)",
                  color: "#080A0F",
                  fontSize: 16,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 4px 16px rgba(0,255,136,0.3)",
                }}
              >
                Join GTM BootCamp
              </a>
            </div>

            {/* Try again */}
            <div style={{ textAlign: "center", marginTop: 24 }}>
              <button
                onClick={() => {
                  setStage("select");
                  setIdeas([]);
                }}
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
                Try Another Category
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        background: "rgba(8,10,15,0.5)",
        border: "1px solid rgba(30,45,69,0.5)",
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontFamily: "monospace",
          color: "#6B7FA3",
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
