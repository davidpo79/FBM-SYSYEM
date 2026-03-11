"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useProject } from "../layout";
import { getUTMForPayload } from "@/lib/utm";
import PaymentModal from "@/components/PaymentModal";
import type { CustomerDetails } from "@/components/PaymentModal";
import { supabase } from "@/lib/supabase";
import { fbInitiateCheckout, fbPurchase, fbContact } from "@/lib/fbpixel";

interface GTMStrategy {
  icp: {
    title: string;
    persona_name: string;
    demographics: string;
    psychographics: string;
    jobs_to_be_done: string[];
    watering_holes: string[];
    budget_authority: string;
  };
  positioning: {
    title: string;
    oneliner: string;
    value_proposition: string;
    category: string;
    differentiators: string[];
    alternatives: string;
    positioning_statement: string;
  };
  validation: {
    title: string;
    current_stage: string;
    validation_score: number;
    evidence: string[];
    gaps: string[];
    experiments: {
      name: string;
      hypothesis: string;
      method: string;
      success_metric: string;
      timeline: string;
    }[];
    risk_assessment: string;
  };
  funnel: {
    title: string;
    model: string;
    stages: {
      stage: string;
      goal: string;
      tactics: string[];
      metrics: string;
    }[];
    pricing_recommendation: {
      model: string;
      tiers: string;
      rationale: string;
    };
    sales_motion: string;
  };
  channels: {
    title: string;
    primary: {
      channel: string;
      why: string;
      tactics: string[];
      expected_cac: string;
      timeline_to_results: string;
    }[];
    secondary: {
      channel: string;
      why: string;
      when_to_start: string;
    }[];
  };
  paid: {
    title: string;
    recommended_budget: string;
    platforms: {
      platform: string;
      budget_split: string;
      targeting: string;
      creative_angles: string[];
      expected_metrics: string;
    }[];
    scaling_plan: string;
  };
  creatives: {
    title: string;
    content_pillars: string[];
    content_calendar: {
      type: string;
      frequency: string;
      topics: string[];
      distribution: string;
    }[];
    launch_assets: string[];
  };
  weekly_routine: {
    title: string;
    weeks: {
      week: string;
      theme: string;
      tasks: string[];
      milestone: string;
    }[];
  };
  summary: string;
}

type StrategyStage = "core" | "validation" | "marketing";

export default function GTMStrategyPage() {
  const { project } = useProject();
  const [strategy, setStrategy] = useState<GTMStrategy | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [currentStage, setCurrentStage] = useState<StrategyStage>("core");
  const [showBootcampModal, setShowBootcampModal] = useState(false);
  const generationAttempted = useRef(false);

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"diy" | "pro" | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Check if already purchased
  useEffect(() => {
    try {
      const unlocked = localStorage.getItem("gtm-marketing-unlocked");
      if (unlocked === "true") setIsUnlocked(true);
    } catch { /* ignore */ }
  }, []);

  const handleTierSelect = (tier: "diy" | "pro") => {
    setSelectedTier(tier);
    setPaymentUrl(null);
    setShowPayment(true);
    fbInitiateCheckout(`GTM ${tier.toUpperCase()}`);
  };

  const handlePaymentSubmit = async (details: CustomerDetails) => {
    setPaymentLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const tierPlan = selectedTier === "diy" ? "gtm_diy" : "gtm_pro";
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          plan: tierPlan,
          customerName: details.customerName,
          customerIdNumber: details.customerIdNumber,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.paymentUrl) {
        throw new Error(json.error || "שגיאה ביצירת קישור תשלום");
      }
      setPaymentUrl(json.paymentUrl);
    } catch {
      setShowPayment(false);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentComplete = useCallback(() => {
    setShowPayment(false);
    setPaymentUrl(null);
    setIsUnlocked(true);
    try {
      localStorage.setItem("gtm-marketing-unlocked", "true");
    } catch { /* ignore */ }
    // Track purchase
    const price = selectedTier === "diy" ? 290 : 99;
    fbPurchase(price, "ILS");
  }, [selectedTier]);

  const handlePaymentClose = useCallback(() => {
    setShowPayment(false);
    setPaymentUrl(null);
    setSelectedTier(null);
    setPaymentLoading(false);
  }, []);

  const generateStrategy = async () => {
    if (!project) return;
    setIsGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-gtm-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: project.user_name,
          answers: project.answers_map,
          gtmOnboardingData: project.gtm_onboarding_data || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStrategy(json.strategy);
      try {
        localStorage.setItem(`gtm-strategy-${project.id}`, JSON.stringify(json.strategy));
      } catch { /* ignore */ }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "נכשל ביצירת האסטרטגיה");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!project || generationAttempted.current) return;
    generationAttempted.current = true;
    try {
      const saved = localStorage.getItem(`gtm-strategy-${project.id}`);
      if (saved) {
        setStrategy(JSON.parse(saved));
        return;
      }
    } catch { /* ignore */ }
    generateStrategy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  if (isGenerating) {
    return (
      <div style={{ padding: "80px 0", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "linear-gradient(135deg, #00FF88, #00CC6A)",
                animation: `fadeInUp 0.5s ${i * 0.15}s both`,
                opacity: 0.3 + i * 0.15,
              }}
            />
          ))}
        </div>
        <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 16, fontWeight: 600 }}>
          ...GTM מייצר אסטרטגיית
        </p>
        <p style={{ color: "#6B7FA3", fontSize: 13, marginTop: 8 }}>
          מנתח את המוצר, השוק והיעדים שלך
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p style={{ color: "#EF4444", marginBottom: 16 }}>{error}</p>
        <button
          onClick={generateStrategy}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            background: "linear-gradient(135deg, #00FF88, #00CC6A)",
            color: "#080A0F",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!strategy) return null;

  const isLocked = currentStage === "marketing" && !isUnlocked;

  return (
    <div style={{ marginTop: 24, direction: "rtl" }}>
      {/* Summary Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(0,255,136,0.08), rgba(255,107,53,0.05))",
          border: "1px solid #1E2D45",
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>
          תקציר מנהלים
        </p>
        <p style={{ color: "#F0F6FF", fontSize: 17, lineHeight: 1.7, fontWeight: 500 }}>{strategy.summary}</p>
      </div>

      {/* Interactive Stage Navigation */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          padding: 4,
          background: "#0D1117",
          borderRadius: 12,
          border: "1px solid #1E2D45",
        }}
      >
        {[
          { key: "core" as const, label: "קהל יעד ומיצוב", icon: "🎯" },
          { key: "validation" as const, label: "ולידציה ומשפך", icon: "🧪" },
          { key: "marketing" as const, label: "שיווק ומכירות", icon: "📈", locked: true },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCurrentStage(tab.key)}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 8,
              border: "none",
              background: currentStage === tab.key ? "#161D2B" : "transparent",
              color: currentStage === tab.key ? "#00FF88" : "#6B7FA3",
              fontSize: 14,
              fontWeight: currentStage === tab.key ? 700 : 400,
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.locked && <span style={{ fontSize: 12, opacity: 0.6 }}>🔒</span>}
          </button>
        ))}
      </div>

      {/* Stage Content */}
      <div style={{ position: "relative" }}>
        {/* Paywall overlay for locked stage */}
        {isLocked && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(8,10,15,0.92)",
              backdropFilter: "blur(10px)",
              borderRadius: 16,
              padding: 32,
              minHeight: 400,
            }}
          >
            <span style={{ fontSize: 48, marginBottom: 16 }}>🔒</span>
            <h3 style={{ color: "#F0F6FF", fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
              פתח את האסטרטגיה המלאה
            </h3>
            <p style={{ color: "#6B7FA3", fontSize: 15, marginBottom: 32, textAlign: "center", maxWidth: 520, lineHeight: 1.7 }}>
              קהל יעד וולידציה זמינים בחינם. שדרג כדי לגשת לערוצי צמיחה, פרסום ממומן, אסטרטגיית תוכן ותוכנית השקה ל-90 יום.
            </p>

            {/* 2-Tier Pricing: DIY + PRO */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 560, direction: "ltr" }}>
              {/* DIY Tier */}
              <div style={{
                flex: "1 1 230px",
                maxWidth: 260,
                background: "#161D2B",
                border: "1px solid #1E2D45",
                borderRadius: 14,
                padding: 24,
                textAlign: "center",
              }}>
                <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>DIY</p>
                <p style={{ color: "#F0F6FF", fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
                  290<span style={{ fontSize: 14, color: "#6B7FA3" }}>&#8362;</span>
                </p>
                <p style={{ color: "#6B7FA3", fontSize: 12, marginBottom: 20 }}>תשלום חד פעמי</p>
                <ul style={{ textAlign: "right", color: "#9DA3B4", fontSize: 13, lineHeight: 2.2, listStyle: "none", padding: 0, direction: "rtl" }}>
                  <li>&#10003; מסמך אסטרטגיה מלא</li>
                  <li>&#10003; כל 7 הסעיפים פתוחים</li>
                  <li>&#10003; תוכנית השקה ל-90 יום</li>
                  <li style={{ color: "#3D4F6F" }}>&#10007; ללא שיחות ליווי</li>
                </ul>
                <button
                  onClick={() => handleTierSelect("diy")}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 20,
                    padding: "12px 0",
                    borderRadius: 10,
                    border: "1px solid #1E2D45",
                    background: "transparent",
                    color: "#F0F6FF",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  קבל גישת DIY
                </button>
              </div>

              {/* Pro Tier */}
              <div style={{
                flex: "1 1 230px",
                maxWidth: 260,
                background: "linear-gradient(180deg, rgba(0,255,136,0.08) 0%, #161D2B 100%)",
                border: "1.5px solid #00FF88",
                borderRadius: 14,
                padding: 24,
                textAlign: "center",
                position: "relative",
                boxShadow: "0 0 24px rgba(0,255,136,0.12)",
              }}>
                <span style={{
                  position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                  background: "linear-gradient(135deg, #00FF88, #00CC6A)",
                  color: "#080A0F", fontSize: 10, fontWeight: 800,
                  padding: "3px 14px", borderRadius: 20, fontFamily: "monospace", textTransform: "uppercase",
                }}>
                  הכי פופולרי
                </span>
                <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>Pro</p>
                <p style={{ color: "#F0F6FF", fontSize: 32, fontWeight: 800, marginBottom: 4 }}>
                  99<span style={{ fontSize: 14, color: "#6B7FA3" }}>&#8362;/חודש</span>
                </p>
                <p style={{ color: "#6B7FA3", fontSize: 12, marginBottom: 20 }}>ביטול בכל עת</p>
                <ul style={{ textAlign: "right", color: "#9DA3B4", fontSize: 13, lineHeight: 2.2, listStyle: "none", padding: 0, direction: "rtl" }}>
                  <li style={{ color: "#00FF88" }}>&#10003; הכל ב-DIY</li>
                  <li style={{ color: "#00FF88" }}>&#10003; יצירות ללא הגבלה</li>
                  <li style={{ color: "#00FF88" }}>&#10003; עוזר אסטרטגי AI</li>
                  <li style={{ color: "#00FF88" }}>&#10003; שיחת ליווי חודשית</li>
                </ul>
                <button
                  onClick={() => handleTierSelect("pro")}
                  style={{
                    display: "block", width: "100%", marginTop: 20, padding: "12px 0", borderRadius: 10,
                    background: "linear-gradient(135deg, #00FF88, #00CC6A)",
                    color: "#080A0F", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(0,255,136,0.3)",
                  }}
                >
                  התחל Pro
                </button>
              </div>
            </div>

            {/* ── Bootcamp Hero Section (Burn Orange) ── */}
            <div style={{
              width: "100%",
              maxWidth: 560,
              marginTop: 32,
              background: "linear-gradient(135deg, rgba(255,107,53,0.1) 0%, rgba(255,107,53,0.03) 100%)",
              border: "1.5px solid rgba(255,107,53,0.35)",
              borderRadius: 16,
              padding: "32px 28px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Burn Orange accent line */}
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #FF6B35, #E55A2B)" }} />

              <p style={{ color: "#FF6B35", fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.1em" }}>
                GTM BOOTCAMP
              </p>
              <h3 style={{ color: "#F0F6FF", fontSize: 22, fontWeight: 800, lineHeight: 1.4, marginBottom: 12 }}>
                מהרעיון ללקוח המשלם הראשון ב-90 יום
              </h3>
              <p style={{ color: "#9DA3B4", fontSize: 14, lineHeight: 1.7, marginBottom: 20, maxWidth: 460, margin: "0 auto 20px" }}>
                הליווי האישי של דוד פופוביץ למפתחים ויזמים שלא מוכנים להשאיר את ההצלחה שלהם ליד המקרה.
              </p>
              <button
                onClick={() => setShowBootcampModal(true)}
                style={{
                  padding: "14px 28px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #FF6B35, #E55A2B)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(255,107,53,0.35)",
                  transition: "all 0.2s",
                }}
              >
                תיאום שיחת אבחון אסטרטגית של 15 דקות עם דוד פופוביץ (ללא עלות)
              </button>
            </div>
          </div>
        )}

        <div style={{ filter: isLocked ? "blur(6px)" : "none", pointerEvents: isLocked ? "none" : "auto" }}>
          {/* Stage 1: Core Strategy (ICP + Positioning) */}
          {currentStage === "core" && (
            <div>
              <ICPTab strategy={strategy} />
              {/* Navigation to next stage */}
              <div style={{ textAlign: "center", marginTop: 32 }}>
                <button
                  onClick={() => setCurrentStage("validation")}
                  style={{
                    padding: "14px 32px",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, #00FF88, #00CC6A)",
                    color: "#080A0F",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(0,255,136,0.3)",
                    transition: "all 0.2s",
                  }}
                >
                  הבא: תוכנית ולידציה (אימות הרעיון) &#10132;
                </button>
              </div>
            </div>
          )}

          {/* Stage 2: Validation + Funnel */}
          {currentStage === "validation" && (
            <div>
              <ValidationTab strategy={strategy} />
              <FunnelTab strategy={strategy} />
              {/* Navigation to next stage */}
              <div style={{ textAlign: "center", marginTop: 32 }}>
                <button
                  onClick={() => setCurrentStage("marketing")}
                  style={{
                    padding: "14px 32px",
                    borderRadius: 12,
                    border: "none",
                    background: "linear-gradient(135deg, #00FF88, #00CC6A)",
                    color: "#080A0F",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(0,255,136,0.3)",
                    transition: "all 0.2s",
                  }}
                >
                  הבא: אסטרטגיית שיווק ומכירות &#10132;
                </button>
              </div>
            </div>
          )}

          {/* Stage 3: Marketing (Channels, Paid, Creatives, Weekly) */}
          {currentStage === "marketing" && (
            <div>
              <ChannelsTab strategy={strategy} />
              <PaidTab strategy={strategy} />
              <CreativesTab strategy={strategy} />
              <WeeklyTab strategy={strategy} />
            </div>
          )}
        </div>
      </div>

      {/* Regenerate button */}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button
          onClick={() => {
            generationAttempted.current = false;
            generateStrategy();
          }}
          style={{
            padding: "10px 24px",
            borderRadius: 8,
            border: "1px solid #1E2D45",
            background: "transparent",
            color: "#6B7FA3",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          צור אסטרטגיה מחדש
        </button>
      </div>

      {/* Payment Modal (modern checkout) */}
      {showPayment && (
        <PaymentModal
          url={paymentUrl}
          onSubmitDetails={handlePaymentSubmit}
          loading={paymentLoading}
          onComplete={handlePaymentComplete}
          onClose={handlePaymentClose}
        />
      )}

      {/* Bootcamp Application Modal */}
      {showBootcampModal && (
        <BootcampModal
          userName={project?.user_name || ""}
          onClose={() => setShowBootcampModal(false)}
        />
      )}
    </div>
  );
}

/* ──── Bootcamp Application Modal ──── */

function BootcampModal({ userName, onClose }: { userName: string; onClose: () => void }) {
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill email from auth
  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.email) setEmail(user.email);
      });
    });
  }, []);

  const handleSubmit = async () => {
    if (!phone.trim() || phone.trim().length < 9) {
      setError("נא להזין מספר טלפון תקין");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await fetch("/api/webhooks/bootcamp-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          source: "gtm-strategy-page",
          ...getUTMForPayload(),
        }),
      });
      setSubmitted(true);
      fbContact("Bootcamp Application");
    } catch {
      setError("שגיאה בשליחת המועמדות. נסה שוב.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        dir="rtl"
        style={{
          width: "100%",
          maxWidth: 440,
          margin: "0 16px",
          borderRadius: 20,
          overflow: "hidden",
          background: "#0D1117",
          border: "1px solid rgba(255,107,53,0.3)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          animation: "modalIn 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "24px 24px 16px",
          background: "linear-gradient(135deg, rgba(255,107,53,0.12), rgba(255,107,53,0.04))",
          borderBottom: "1px solid rgba(255,107,53,0.15)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: "#FF6B35", fontFamily: "monospace", fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>
                GTM BOOTCAMP
              </p>
              <h3 style={{ color: "#F0F6FF", fontSize: 22, fontWeight: 800 }}>
                הגש מועמדות
              </h3>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(255,255,255,0.05)", border: "none",
                color: "#6B7FA3", fontSize: 18, cursor: "pointer",
              }}
            >
              &times;
            </button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <h4 style={{ color: "#F0F6FF", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                המועמדות נשלחה!
              </h4>
              <p style={{ color: "#6B7FA3", fontSize: 14, marginBottom: 20 }}>
                ניצור איתך קשר בקרוב מאוד
              </p>
              <button
                onClick={onClose}
                style={{
                  padding: "12px 32px", borderRadius: 10,
                  background: "linear-gradient(135deg, #FF6B35, #E55A2B)",
                  color: "#fff", fontWeight: 700, border: "none", cursor: "pointer",
                }}
              >
                סגור
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#6B7FA3", fontSize: 12, fontFamily: "monospace", display: "block", marginBottom: 6 }}>שם מלא</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 10,
                    background: "#161D2B", border: "1px solid #1E2D45",
                    color: "#F0F6FF", fontSize: 15, outline: "none",
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#6B7FA3", fontSize: 12, fontFamily: "monospace", display: "block", marginBottom: 6 }}>אימייל</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 10,
                    background: "#161D2B", border: "1px solid #1E2D45",
                    color: "#F0F6FF", fontSize: 15, outline: "none",
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ color: "#FF6B35", fontSize: 12, fontFamily: "monospace", display: "block", marginBottom: 6 }}>
                  מספר טלפון *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (error) setError(""); }}
                  placeholder="050-1234567"
                  dir="ltr"
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 10,
                    background: "#161D2B", border: `1px solid ${error ? "#EF4444" : "#1E2D45"}`,
                    color: "#F0F6FF", fontSize: 15, outline: "none",
                  }}
                />
                {error && <p style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{error}</p>}
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: "100%", padding: "14px 0", borderRadius: 10,
                  background: submitting ? "#1E2D45" : "linear-gradient(135deg, #FF6B35, #E55A2B)",
                  color: submitting ? "#6B7FA3" : "#fff",
                  fontSize: 16, fontWeight: 700, border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: submitting ? "none" : "0 4px 16px rgba(255,107,53,0.3)",
                  transition: "all 0.2s",
                }}
              >
                {submitting ? "שולח..." : "שלח מועמדות"}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ──── Tab Components ──── */

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div style={{ background: "#161D2B", border: "1px solid #1E2D45", borderRadius: 14, padding: 24, marginBottom: 16 }}>
      {title && (
        <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 11, marginBottom: 12 }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: 6,
        background: "rgba(0,255,136,0.08)",
        border: "1px solid rgba(0,255,136,0.2)",
        color: "#00FF88",
        fontSize: 12,
        fontFamily: "monospace",
        marginLeft: 6,
        marginBottom: 6,
      }}
    >
      {children}
    </span>
  );
}

function ICPTab({ strategy }: { strategy: GTMStrategy }) {
  const { icp, positioning } = strategy;
  return (
    <div>
      <Card title="פרופיל לקוח אידיאלי">
        <h3 style={{ color: "#F0F6FF", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>{icp.persona_name}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <InfoBlock label="דמוגרפיה" text={icp.demographics} />
          <InfoBlock label="פסיכוגרפיה" text={icp.psychographics} />
          <InfoBlock label="תקציב וסמכות החלטה" text={icp.budget_authority} />
        </div>
        <div style={{ marginTop: 16 }}>
          <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>משימות שצריך לבצע</p>
          {icp.jobs_to_be_done.map((j, i) => <Chip key={i}>{j}</Chip>)}
        </div>
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>איפה הם נמצאים</p>
          {icp.watering_holes.map((w, i) => <Chip key={i}>{w}</Chip>)}
        </div>
      </Card>

      <Card title="מיצוב">
        <div style={{ background: "rgba(0,255,136,0.05)", borderRadius: 10, padding: 16, marginBottom: 16, borderRight: "3px solid #00FF88" }}>
          <p style={{ color: "#F0F6FF", fontSize: 18, fontWeight: 600, lineHeight: 1.5 }}>{positioning.oneliner}</p>
        </div>
        <InfoBlock label="הצעת ערך" text={positioning.value_proposition} />
        <InfoBlock label="קטגוריה" text={positioning.category} />
        <InfoBlock label="חלופות קיימות" text={positioning.alternatives} />
        <div style={{ marginTop: 12 }}>
          <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>מבדלים</p>
          {positioning.differentiators.map((d, i) => <Chip key={i}>{d}</Chip>)}
        </div>
        <div style={{ marginTop: 16 }}>
          <InfoBlock label="הצהרת מיצוב" text={positioning.positioning_statement} />
        </div>
      </Card>
    </div>
  );
}

function ValidationTab({ strategy }: { strategy: GTMStrategy }) {
  const { validation } = strategy;
  return (
    <div>
      <Card title="סטטוס ולידציה">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11 }}>שלב</p>
            <p style={{ color: "#F0F6FF", fontSize: 18, fontWeight: 600 }}>{validation.current_stage}</p>
          </div>
          <div>
            <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11 }}>ציון</p>
            <p style={{ color: "#00FF88", fontSize: 28, fontWeight: 800, fontFamily: "monospace" }}>{validation.validation_score}/10</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>ראיות</p>
            <ul style={{ color: "#F0F6FF", fontSize: 15, lineHeight: 1.9, listStyle: "disc", paddingInlineStart: 16 }}>
              {validation.evidence.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
          <div>
            <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>פערים</p>
            <ul style={{ color: "#FF6B35", fontSize: 15, lineHeight: 1.9, listStyle: "disc", paddingInlineStart: 16 }}>
              {validation.gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        </div>
        <InfoBlock label="הערכת סיכונים" text={validation.risk_assessment} />
      </Card>

      <Card title="ניסויי ולידציה">
        {validation.experiments.map((exp, i) => (
          <div key={i} style={{ background: "rgba(8,10,15,0.5)", border: "1px solid rgba(30,45,69,0.5)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <h4 style={{ color: "#00FF88", fontSize: 16, fontWeight: 600, marginBottom: 8, fontFamily: "monospace" }}>{exp.name}</h4>
            <InfoBlock label="השערה" text={exp.hypothesis} />
            <InfoBlock label="שיטה" text={exp.method} />
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <InfoBlock label="מדד הצלחה" text={exp.success_metric} />
              <InfoBlock label="לוח זמנים" text={exp.timeline} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function FunnelTab({ strategy }: { strategy: GTMStrategy }) {
  const { funnel } = strategy;
  return (
    <div>
      <Card title={`מודל משפך: ${funnel.model}`}>
        {funnel.stages.map((stage, i) => (
          <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(0,255,136,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00FF88", fontWeight: 800, fontFamily: "monospace", fontSize: 16, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{stage.stage}</h4>
              <p style={{ color: "#6B7FA3", fontSize: 15, marginBottom: 6, lineHeight: 1.6 }}>{stage.goal}</p>
              <div>{stage.tactics.map((t, j) => <Chip key={j}>{t}</Chip>)}</div>
              <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 12, marginTop: 6 }}>מדד: {stage.metrics}</p>
            </div>
          </div>
        ))}
      </Card>

      <Card title="המלצת תמחור">
        <InfoBlock label="מודל" text={funnel.pricing_recommendation.model} />
        <InfoBlock label="שכבות" text={funnel.pricing_recommendation.tiers} />
        <InfoBlock label="הנמקה" text={funnel.pricing_recommendation.rationale} />
      </Card>

      <Card title="תהליך מכירות">
        <p style={{ color: "#F0F6FF", fontSize: 16, lineHeight: 1.8 }}>{funnel.sales_motion}</p>
      </Card>
    </div>
  );
}

function ChannelsTab({ strategy }: { strategy: GTMStrategy }) {
  const { channels } = strategy;
  return (
    <div>
      <Card title="ערוצים ראשיים">
        {channels.primary.map((ch, i) => (
          <div key={i} style={{ background: "rgba(8,10,15,0.5)", border: "1px solid rgba(30,45,69,0.5)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <h4 style={{ color: "#00FF88", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{ch.channel}</h4>
            <InfoBlock label="למה" text={ch.why} />
            <div>{ch.tactics.map((t, j) => <Chip key={j}>{t}</Chip>)}</div>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <InfoBlock label="CAC צפוי" text={ch.expected_cac} />
              <InfoBlock label="לוח זמנים" text={ch.timeline_to_results} />
            </div>
          </div>
        ))}
      </Card>
      <Card title="ערוצים משניים">
        {channels.secondary.map((ch, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{ch.channel}</h4>
            <InfoBlock label="למה" text={ch.why} />
            <InfoBlock label="מתי להתחיל" text={ch.when_to_start} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function PaidTab({ strategy }: { strategy: GTMStrategy }) {
  const { paid } = strategy;
  return (
    <div>
      <Card title={`תקציב: ${paid.recommended_budget}`}>
        {paid.platforms.map((p, i) => (
          <div key={i} style={{ background: "rgba(8,10,15,0.5)", border: "1px solid rgba(30,45,69,0.5)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h4 style={{ color: "#00FF88", fontSize: 16, fontWeight: 600 }}>{p.platform}</h4>
              <span style={{ color: "#FF6B35", fontFamily: "monospace", fontSize: 15, fontWeight: 600 }}>{p.budget_split}</span>
            </div>
            <InfoBlock label="טרגוט" text={p.targeting} />
            <div>{p.creative_angles.map((a, j) => <Chip key={j}>{a}</Chip>)}</div>
            <InfoBlock label="מדדים צפויים" text={p.expected_metrics} />
          </div>
        ))}
      </Card>
      <Card title="תוכנית סקיילינג">
        <p style={{ color: "#F0F6FF", fontSize: 16, lineHeight: 1.8 }}>{paid.scaling_plan}</p>
      </Card>
    </div>
  );
}

function CreativesTab({ strategy }: { strategy: GTMStrategy }) {
  const { creatives } = strategy;
  return (
    <div>
      <Card title="עמודי תוכן">
        {creatives.content_pillars.map((p, i) => <Chip key={i}>{p}</Chip>)}
      </Card>
      <Card title="לוח שנה תוכן">
        {creatives.content_calendar.map((c, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 600 }}>{c.type}</h4>
              <span style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 13 }}>{c.frequency}</span>
            </div>
            <div style={{ marginTop: 4 }}>{c.topics.map((t, j) => <Chip key={j}>{t}</Chip>)}</div>
            <p style={{ color: "#6B7FA3", fontSize: 13, marginTop: 4 }}>הפצה: {c.distribution}</p>
          </div>
        ))}
      </Card>
      <Card title="נכסים נדרשים להשקה">
        {creatives.launch_assets.map((a, i) => <Chip key={i}>{a}</Chip>)}
      </Card>
    </div>
  );
}

function WeeklyTab({ strategy }: { strategy: GTMStrategy }) {
  const { weekly_routine } = strategy;
  return (
    <div>
      <Card title="תוכנית השקה ל-90 יום">
        {weekly_routine.weeks.map((w, i) => (
          <div
            key={i}
            style={{
              background: "rgba(8,10,15,0.5)",
              border: "1px solid rgba(30,45,69,0.5)",
              borderRadius: 10,
              padding: 16,
              marginBottom: 12,
              borderRight: "3px solid #00FF88",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h4 style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 16, fontWeight: 600 }}>{w.week}</h4>
              <span style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 13 }}>{w.theme}</span>
            </div>
            <ul style={{ color: "#F0F6FF", fontSize: 15, lineHeight: 1.9, listStyle: "disc", paddingInlineStart: 16 }}>
              {w.tasks.map((t, j) => <li key={j}>{t}</li>)}
            </ul>
            <div style={{ marginTop: 8, padding: "6px 12px", borderRadius: 6, background: "rgba(255,107,53,0.1)", display: "inline-block" }}>
              <span style={{ color: "#FF6B35", fontFamily: "monospace", fontSize: 12 }}>אבן דרך: </span>
              <span style={{ color: "#F0F6FF", fontSize: 13 }}>{w.milestone}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function InfoBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#F0F6FF", fontSize: 15, lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}
