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
  architecture: string;
  monetization: string;
}

type Stage = "select" | "building" | "results";

export default function IdeatorPage() {
  const [selectedApis, setSelectedApis] = useState<string[]>([]);
  const [customApi, setCustomApi] = useState("");
  const [stage, setStage] = useState<Stage>("select");
  const [ideas, setIdeas] = useState<IdeaResult[]>([]);
  const [error, setError] = useState("");
  const [buildStep, setBuildStep] = useState(0);

  const buildSteps = [
    "Connecting nodes...",
    "Synthesizing architecture...",
    "Compiling SaaS models...",
    "Validating revenue streams...",
    "Assembling final blueprints...",
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
        body: JSON.stringify({ apis: selectedApis }),
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

  return (
    <div className="theme-gtm min-h-screen bg-[#080A0F] text-[#F0F6FF] pb-20">
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
          <span style={{ fontSize: 20, fontWeight: 600 }}>BootCamp</span>
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
        {/* Hero */}
        {stage === "select" && (
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
              Micro-SaaS <span style={{ color: "#00FF88" }}>Idea Engine</span>
            </h1>
            <p style={{ fontSize: 18, color: "#6B7FA3", maxWidth: 560, margin: "0 auto 8px" }}>
              Select the APIs &amp; tools you want to combine. We&apos;ll architect 3 profitable Micro-SaaS ideas.
            </p>
            <p style={{ fontSize: 13, color: "#3D4F6F", fontFamily: "monospace" }}>
              Powered by GTM BootCamp AI Engine
            </p>
          </div>
        )}

        {/* API Selector */}
        {stage === "select" && (
          <>
            {/* Selected count */}
            {selectedApis.length > 0 && (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <span style={{ fontFamily: "monospace", fontSize: 13, color: "#00FF88" }}>
                  {selectedApis.length} API{selectedApis.length !== 1 ? "s" : ""} selected
                </span>
              </div>
            )}

            {/* Badge Grid */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 20 }}>
              {API_BADGES.map((api) => {
                const isSelected = selectedApis.includes(api);
                return (
                  <button
                    key={api}
                    onClick={() => toggleApi(api)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: `1.5px solid ${isSelected ? "#00FF88" : "#1E2D45"}`,
                      background: isSelected ? "rgba(0,255,136,0.1)" : "#161D2B",
                      color: isSelected ? "#00FF88" : "#F0F6FF",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: "monospace",
                    }}
                  >
                    {isSelected ? "✓ " : ""}{api}
                  </button>
                );
              })}
            </div>

            {/* Custom API input */}
            <div style={{ display: "flex", gap: 8, maxWidth: 400, margin: "0 auto 32px" }}>
              <input
                type="text"
                value={customApi}
                onChange={(e) => setCustomApi(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCustomApi(); }}
                placeholder="Add custom API/Tool..."
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #1E2D45",
                  background: "#161D2B",
                  color: "#F0F6FF",
                  fontSize: 13,
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <button
                onClick={addCustomApi}
                disabled={!customApi.trim()}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #1E2D45",
                  background: customApi.trim() ? "rgba(0,255,136,0.15)" : "#161D2B",
                  color: customApi.trim() ? "#00FF88" : "#3D4F6F",
                  cursor: customApi.trim() ? "pointer" : "not-allowed",
                  fontSize: 13,
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              >
                + Add
              </button>
            </div>

            {error && (
              <p style={{ color: "#EF4444", textAlign: "center", marginBottom: 16 }}>{error}</p>
            )}

            <div style={{ textAlign: "center" }}>
              <button
                onClick={handleGenerate}
                disabled={selectedApis.length === 0}
                style={{
                  padding: "14px 48px",
                  borderRadius: 12,
                  border: "none",
                  background: selectedApis.length > 0
                    ? "linear-gradient(135deg, #00FF88 0%, #00CC6A 100%)"
                    : "#1E2D45",
                  color: selectedApis.length > 0 ? "#080A0F" : "#3D4F6F",
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: selectedApis.length > 0 ? "pointer" : "not-allowed",
                  transition: "all 0.3s",
                  boxShadow: selectedApis.length > 0 ? "0 4px 16px rgba(0,255,136,0.3)" : "none",
                }}
              >
                Assemble Ideas
              </button>
            </div>
          </>
        )}

        {/* Lego Stacking / Tower Assembly Animation */}
        {stage === "building" && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            {/* Stacking blocks */}
            <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center", gap: 6, marginBottom: 40, minHeight: 180 }}>
              {[0, 1, 2, 3, 4].map((i) => {
                const visible = buildStep >= i;
                return (
                  <div
                    key={i}
                    style={{
                      width: 60 + (4 - i) * 10,
                      height: visible ? 28 : 0,
                      borderRadius: 6,
                      background: visible
                        ? `linear-gradient(135deg, #00FF88 ${10 + i * 20}%, #00CC6A 100%)`
                        : "transparent",
                      transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      opacity: visible ? 1 : 0,
                      boxShadow: visible ? `0 0 ${12 + i * 4}px rgba(0,255,136,${0.2 + i * 0.05})` : "none",
                      transform: visible ? "translateY(0)" : "translateY(-40px)",
                    }}
                  />
                );
              })}
            </div>

            <p style={{ fontSize: 18, fontWeight: 600, color: "#00FF88", fontFamily: "monospace", marginBottom: 8 }}>
              {buildSteps[buildStep]}
            </p>
            <p style={{ fontSize: 13, color: "#3D4F6F", fontFamily: "monospace" }}>
              [{selectedApis.join(" + ")}]
            </p>

            {/* Progress bar */}
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

        {/* Results */}
        {stage === "results" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                Your <span style={{ color: "#00FF88" }}>3 SaaS Blueprints</span> Are Ready
              </h2>
              <p style={{ color: "#6B7FA3", fontSize: 14, fontFamily: "monospace" }}>
                Built with: {selectedApis.join(" + ")}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {ideas.map((idea, idx) => (
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
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#3D4F6F", display: "block", marginBottom: 4 }}>
                    BLUEPRINT #{idx + 1}
                  </span>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                    {idea.name}
                  </h3>
                  <p style={{ color: "#FF6B35", fontSize: 15, fontWeight: 600, marginBottom: 16, lineHeight: 1.5 }}>
                    {idea.pitch}
                  </p>

                  {/* Architecture - highlighted in green */}
                  <div style={{ marginBottom: 16, padding: 16, borderRadius: 10, background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.15)", borderLeft: "3px solid #00FF88" }}>
                    <p style={{ fontSize: 11, fontFamily: "monospace", color: "#00FF88", marginBottom: 6, textTransform: "uppercase" }}>
                      Architecture
                    </p>
                    <p style={{ fontSize: 13, color: "#F0F6FF", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {idea.architecture}
                    </p>
                  </div>

                  {/* Monetization */}
                  <div style={{ padding: 12, borderRadius: 8, background: "rgba(8,10,15,0.5)", border: "1px solid rgba(30,45,69,0.5)" }}>
                    <p style={{ fontSize: 11, fontFamily: "monospace", color: "#6B7FA3", marginBottom: 4, textTransform: "uppercase" }}>
                      Monetization
                    </p>
                    <p style={{ fontSize: 13, color: "#F0F6FF", lineHeight: 1.5 }}>
                      {idea.monetization}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* GoHighLevel Lead Capture Form */}
            <div className="w-full max-w-2xl mx-auto mt-12 bg-[#161D2B] p-4 rounded-xl border border-[#1E2D45]">
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  Want the Full <span style={{ color: "#00FF88" }}>GTM Playbook</span>?
                </h3>
                <p style={{ color: "#6B7FA3", fontSize: 13 }}>
                  Join GTM BootCamp — get a complete Go-To-Market strategy, validation framework, and 90-day launch plan.
                </p>
              </div>
              <iframe
                src="https://api.leadconnectorhq.com/widget/form/VY7Wpt7X70ijeluHvP8D"
                style={{ width: "100%", height: "691px", border: "none", borderRadius: "4px" }}
                id="inline-VY7Wpt7X70ijeluHvP8D"
                data-layout="{'id':'INLINE'}"
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
                  fontFamily: "monospace",
                }}
              >
                Try Different APIs
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
