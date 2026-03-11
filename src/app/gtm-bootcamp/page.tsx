"use client";

import { useEffect, useRef } from "react";

export default function GTMBootcampPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
          מוכנים לצאת לשוק?{" "}
          <span style={{ color: "#00FF88" }}>בואו נבדוק התאמה.</span>
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
          // ללא עלות · 15 דקות · אונליין
        </p>
      </main>
    </div>
  );
}
