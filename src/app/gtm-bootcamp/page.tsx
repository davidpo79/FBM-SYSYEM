"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/track-event";
import { fbLead, fbViewContent } from "@/lib/fbpixel";

export default function GTMBootcampPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Track page view + FB Pixel
  useEffect(() => {
    trackEvent({ eventType: "page_view", eventName: "gtm_bootcamp_page", stepName: "gtm-bootcamp" });
    fbViewContent("GTM Bootcamp Page");
  }, []);

  // Listen for GHL form submission via postMessage to fire FB Lead event
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // GHL iframe sends postMessage on form events
      if (typeof event.data === "string" && event.data.includes("formSubmitted")) {
        fbLead("GTM Bootcamp Booking");
        trackEvent({ eventType: "step_complete", eventName: "gtm_bootcamp_booking", stepName: "gtm-bootcamp" });
      }
      // Also check for object-style messages from GHL
      if (event.data && typeof event.data === "object" && (event.data.type === "formSubmitted" || event.data.event === "formSubmitted")) {
        fbLead("GTM Bootcamp Booking");
        trackEvent({ eventType: "step_complete", eventName: "gtm_bootcamp_booking", stepName: "gtm-bootcamp" });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  /* Auto-resize iframe height based on content */
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://link.msgsndr.com/js/form_embed.js";
    script.type = "text/javascript";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#080A0F", color: "#F0F6FF", direction: "rtl" }}>
      {/* ── Header ── */}
      <header style={{
        padding: "20px 24px",
        borderBottom: "1px solid rgba(0,255,136,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "monospace",
          fontSize: 18,
          fontWeight: 700,
          color: "#00FF88",
          letterSpacing: 1,
          direction: "ltr",
        }}>
          &lt;GTM Bootcamp /&gt;
        </span>
      </header>

      {/* ── Hero Section ── */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 64px" }}>
        {/* Tagline badge */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{
            display: "inline-block",
            fontFamily: "monospace",
            fontSize: 13,
            color: "#00FF88",
            background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.2)",
            borderRadius: 20,
            padding: "6px 18px",
            letterSpacing: 0.5,
          }}>
            משורת קוד לשורת רווח
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          textAlign: "center",
          fontSize: "clamp(24px, 5vw, 36px)",
          fontWeight: 800,
          lineHeight: 1.3,
          marginBottom: 16,
          color: "#F0F6FF",
        }}>
          Go-To-Market Bootcamp for AI Startups{" "}
          <span style={{ color: "#00FF88" }}>— בואו נבדוק התאמה.</span>
        </h1>

        {/* Description */}
        <p style={{
          textAlign: "center",
          fontSize: "clamp(15px, 2.5vw, 18px)",
          lineHeight: 1.8,
          color: "#94A3B8",
          maxWidth: 560,
          margin: "0 auto 40px",
        }}>
          קבעו שיחת אבחון קצרה של 15 דקות. ננתח את רעיון ה-AI שלכם ונראה איך
          אפשר לבנות לו מנוע שיווקי שמביא משתמשים משלמים.
        </p>

        {/* Decorative line */}
        <div style={{
          width: 60,
          height: 3,
          background: "linear-gradient(90deg, #00FF88, #00CC6A)",
          borderRadius: 2,
          margin: "0 auto 40px",
        }} />

        {/* ── Calendar Widget ── */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(0,255,136,0.12)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 0 40px rgba(0,255,136,0.04)",
        }}>
          <iframe
            ref={iframeRef}
            src="https://api.leadconnectorhq.com/widget/booking/IE5MfAX8MxwCPFRpUw8v"
            style={{
              width: "100%",
              minHeight: 700,
              border: "none",
              overflow: "hidden",
              display: "block",
            }}
            scrolling="no"
            id="IE5MfAX8MxwCPFRpUw8v_1773261671064"
          />
        </div>

        {/* Footer note */}
        <p style={{
          textAlign: "center",
          fontSize: 13,
          color: "#3D4F6F",
          marginTop: 32,
          fontFamily: "monospace",
        }}>
          {/* ללא עלות · 15 דקות · אונליין */}
        </p>

        {/* ══════════════════════════════════════════════════════════
            SEO Content — crawlable by search engines and LLMs
            ══════════════════════════════════════════════════════════ */}
        <section style={{ marginTop: 80 }}>
          <h2 style={{
            fontSize: "clamp(20px, 4vw, 28px)",
            fontWeight: 700,
            color: "#F0F6FF",
            marginBottom: 24,
            textAlign: "center",
          }}>
            What is a Go-To-Market Strategy for AI Startups?
          </h2>
          <p style={{ color: "#94A3B8", lineHeight: 1.9, fontSize: 16, marginBottom: 20 }}>
            A Go-To-Market (GTM) strategy is the step-by-step plan that takes your AI product
            from idea to paying customers. For AI startups, this means defining your Ideal Customer
            Profile (ICP), positioning your product against both AI and non-AI alternatives,
            selecting the right acquisition channels, and building a repeatable sales motion.
          </p>
          <p style={{ color: "#94A3B8", lineHeight: 1.9, fontSize: 16, marginBottom: 20 }}>
            Unlike traditional SaaS, AI products face unique GTM challenges: building trust with
            users who are skeptical of AI accuracy, explaining complex technology in simple terms,
            and navigating integration requirements. The GTM Bootcamp at FBM Studio addresses all
            of these with a framework built specifically for AI founders.
          </p>

          <h3 style={{ fontSize: 20, fontWeight: 600, color: "#00FF88", marginBottom: 16, marginTop: 40 }}>
            How the GTM Bootcamp Works
          </h3>
          <ol style={{ color: "#94A3B8", lineHeight: 2, fontSize: 15, paddingRight: 20 }}>
            <li><strong style={{ color: "#F0F6FF" }}>Generate your AI startup idea</strong> — Use the free Ideator tool to discover validated business concepts with target audience and API integrations.</li>
            <li><strong style={{ color: "#F0F6FF" }}>Answer the GTM questionnaire</strong> — 10 focused questions that help the AI engine understand your product, market, and goals.</li>
            <li><strong style={{ color: "#F0F6FF" }}>Get your personalized strategy</strong> — ICP analysis, competitive positioning, marketing channel recommendations, and a 90-day launch plan.</li>
            <li><strong style={{ color: "#F0F6FF" }}>Create ad creatives</strong> — AI-generated scripts, visuals, and hooks tailored to your ICP and chosen channels.</li>
            <li><strong style={{ color: "#F0F6FF" }}>Book a diagnostic call</strong> — 15-minute session with a GTM expert to refine your strategy and prioritize next steps.</li>
          </ol>

          <h3 style={{ fontSize: 20, fontWeight: 600, color: "#00FF88", marginBottom: 16, marginTop: 40 }}>
            Who Is This For?
          </h3>
          <ul style={{ color: "#94A3B8", lineHeight: 2, fontSize: 15, paddingRight: 20 }}>
            <li>AI founders who have a product but struggle to find paying customers</li>
            <li>Technical builders who want a structured marketing framework</li>
            <li>Solo founders launching their first AI SaaS</li>
            <li>Teams transitioning from B2C to B2B AI products</li>
            <li>Anyone exploring AI startup ideas and wanting a clear path to market</li>
          </ul>

          <h3 style={{ fontSize: 20, fontWeight: 600, color: "#00FF88", marginBottom: 16, marginTop: 40 }}>
            Frequently Asked Questions
          </h3>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              What is a Go-To-Market strategy for an AI startup?
            </h4>
            <p style={{ color: "#94A3B8", lineHeight: 1.8, fontSize: 15 }}>
              A GTM strategy for AI startups is a structured plan that defines your Ideal Customer
              Profile (ICP), positions your AI product in the market, selects the right marketing
              channels, and creates a repeatable process for acquiring paying customers. AI GTM
              strategies must also address trust, explainability, and integration complexity.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              How do I find my first paying customers for my AI product?
            </h4>
            <p style={{ color: "#94A3B8", lineHeight: 1.8, fontSize: 15 }}>
              Start by identifying your ICP — who has the pain your AI solves, the budget to pay,
              and the technical ability to adopt. Then validate with discovery calls, build a landing
              page with a clear value proposition, and use targeted ads or community outreach to
              drive qualified leads.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              How long does it take to build a GTM strategy?
            </h4>
            <p style={{ color: "#94A3B8", lineHeight: 1.8, fontSize: 15 }}>
              With the FBM Studio GTM Bootcamp, you can have a complete go-to-market strategy in
              under a week. The platform uses AI to analyze your product, identify your ICP, suggest
              marketing channels, and generate ad creatives.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              What is the FBM Ideator tool?
            </h4>
            <p style={{ color: "#94A3B8", lineHeight: 1.8, fontSize: 15 }}>
              FBM Ideator is a free AI startup idea generator. Pick a niche and market, and the
              tool generates complete startup ideas with target audience analysis, API integrations,
              and go-to-market strategy — all powered by AI.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
