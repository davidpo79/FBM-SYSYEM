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

interface GanttTimeline {
  phases: {
    name: string;
    weeks: string;
    tasks: {
      week: string;
      task: string;
      owner: string;
      deliverable: string;
    }[];
    milestone: string;
  }[];
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
  const [purchasedTier, setPurchasedTier] = useState<"diy" | "pro" | null>(null);

  // Post-payment state
  const [showPostPayment, setShowPostPayment] = useState(false);
  const [refineMode, setRefineMode] = useState(false);
  const [refinementProgress, setRefinementProgress] = useState(0);

  // 90-Day Gantt state
  const [ganttTimeline, setGanttTimeline] = useState<GanttTimeline | null>(null);
  const [ganttGenerating, setGanttGenerating] = useState(false);
  const [ganttConfirmed, setGanttConfirmed] = useState(false);

  // Check if already purchased
  useEffect(() => {
    try {
      const unlocked = localStorage.getItem("gtm-marketing-unlocked");
      if (unlocked === "true") {
        setIsUnlocked(true);
        const tier = localStorage.getItem("gtm-purchased-tier") as "diy" | "pro" | null;
        if (tier) setPurchasedTier(tier);
      }
      const confirmed = localStorage.getItem("gtm-gantt-confirmed");
      if (confirmed === "true") setGanttConfirmed(true);
      const savedGantt = localStorage.getItem(`gtm-gantt-${project?.id}`);
      if (savedGantt) setGanttTimeline(JSON.parse(savedGantt));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate refinement progress based on answer completeness
  useEffect(() => {
    if (!project?.answers_map) return;
    const answers = project.answers_map;
    const totalQuestions = 10;
    let filled = 0;
    for (let i = 1; i <= totalQuestions; i++) {
      if (answers[String(i)] && answers[String(i)].trim().length > 20) filled++;
    }
    setRefinementProgress(Math.round((filled / totalQuestions) * 100));
  }, [project?.answers_map]);

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
    const tier = selectedTier || "diy";
    setPurchasedTier(tier);
    setShowPostPayment(true);
    try {
      localStorage.setItem("gtm-marketing-unlocked", "true");
      localStorage.setItem("gtm-purchased-tier", tier);
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

  const handleStartRefine = () => {
    setShowPostPayment(false);
    setRefineMode(true);
    // Navigate to questionnaire for editing
    window.location.href = `/questionnaire?track=gtm&refine=true&projectId=${project?.id}`;
  };

  const handleConfirmAnswers = async () => {
    setGanttConfirmed(true);
    try {
      localStorage.setItem("gtm-gantt-confirmed", "true");
    } catch { /* ignore */ }
    // Generate the 90-day Gantt
    await generateGantt();
  };

  const generateGantt = async () => {
    if (!project || !strategy) return;
    setGanttGenerating(true);
    try {
      const res = await fetch("/api/generate-gtm-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: project.user_name,
          answers: project.answers_map,
          gtmOnboardingData: project.gtm_onboarding_data || null,
          ganttMode: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const timeline = json.strategy?.gantt || json.gantt || json.strategy;
      setGanttTimeline(timeline);
      try {
        localStorage.setItem(`gtm-gantt-${project.id}`, JSON.stringify(timeline));
      } catch { /* ignore */ }
    } catch {
      // Fallback: create a structured timeline from the existing weekly_routine
      if (strategy.weekly_routine?.weeks) {
        const weeks = strategy.weekly_routine.weeks;
        const phases: GanttTimeline["phases"] = [];
        const phase1Weeks = weeks.slice(0, 4);
        const phase2Weeks = weeks.slice(4, 8);
        const phase3Weeks = weeks.slice(8);

        if (phase1Weeks.length) {
          phases.push({
            name: "Phase 1: Validation",
            weeks: "שבועות 1-4",
            tasks: phase1Weeks.map(w => ({
              week: w.week,
              task: w.tasks.join(", "),
              owner: "Founder",
              deliverable: w.milestone,
            })),
            milestone: phase1Weeks[phase1Weeks.length - 1]?.milestone || "",
          });
        }
        if (phase2Weeks.length) {
          phases.push({
            name: "Phase 2: Launch",
            weeks: "שבועות 5-8",
            tasks: phase2Weeks.map(w => ({
              week: w.week,
              task: w.tasks.join(", "),
              owner: "Founder",
              deliverable: w.milestone,
            })),
            milestone: phase2Weeks[phase2Weeks.length - 1]?.milestone || "",
          });
        }
        if (phase3Weeks.length) {
          phases.push({
            name: "Phase 3: Scale",
            weeks: "שבועות 9-12",
            tasks: phase3Weeks.map(w => ({
              week: w.week,
              task: w.tasks.join(", "),
              owner: "Founder",
              deliverable: w.milestone,
            })),
            milestone: phase3Weeks[phase3Weeks.length - 1]?.milestone || "",
          });
        }
        const fallbackGantt: GanttTimeline = { phases };
        setGanttTimeline(fallbackGantt);
        try {
          localStorage.setItem(`gtm-gantt-${project.id}`, JSON.stringify(fallbackGantt));
        } catch { /* ignore */ }
      }
    } finally {
      setGanttGenerating(false);
    }
  };

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

  /* ──── Skeleton Shimmer Loading UI ──── */
  if (isGenerating) {
    return (
      <div style={{ padding: "40px 0", direction: "rtl" }}>
        {/* Skeleton Header */}
        <div style={{
          background: "#161D2B",
          border: "1px solid #1E2D45",
          borderRadius: 24,
          padding: 24,
          marginBottom: 24,
          overflow: "hidden",
        }}>
          <div className="gtm-skeleton" style={{ height: 12, width: 120, borderRadius: 6, marginBottom: 12 }} />
          <div className="gtm-skeleton" style={{ height: 20, width: "90%", borderRadius: 8, marginBottom: 8 }} />
          <div className="gtm-skeleton" style={{ height: 20, width: "70%", borderRadius: 8 }} />
        </div>
        {/* Skeleton Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="gtm-skeleton" style={{ flex: 1, height: 44, borderRadius: 12 }} />
          ))}
        </div>
        {/* Skeleton Cards */}
        {[1, 2].map(i => (
          <div key={i} style={{
            background: "#161D2B",
            border: "1px solid #1E2D45",
            borderRadius: 24,
            padding: 24,
            marginBottom: 16,
          }}>
            <div className="gtm-skeleton" style={{ height: 12, width: 100, borderRadius: 6, marginBottom: 16 }} />
            <div className="gtm-skeleton" style={{ height: 18, width: "80%", borderRadius: 8, marginBottom: 10 }} />
            <div className="gtm-skeleton" style={{ height: 14, width: "60%", borderRadius: 6, marginBottom: 8 }} />
            <div className="gtm-skeleton" style={{ height: 14, width: "75%", borderRadius: 6 }} />
          </div>
        ))}
        <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 14, fontWeight: 600, textAlign: "center", marginTop: 24 }}>
          ...GTM מייצר אסטרטגיית
        </p>
        <p style={{ color: "#6B7FA3", fontSize: 13, textAlign: "center", marginTop: 8 }}>
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
          className="gtm-btn-primary"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!strategy) return null;

  const isLocked = currentStage === "marketing" && !isUnlocked;

  return (
    <div className="gtm-page-container" style={{ marginTop: 24, direction: "rtl", paddingBottom: (isUnlocked && purchasedTier) ? 80 : 0 }}>
      {/* ── Post-Payment Success Modal ── */}
      {showPostPayment && (
        <div
          className="gtm-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPostPayment(false); }}
        >
          <div className="gtm-modal-card" style={{ maxWidth: 480, textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>&#10003;</div>
            <h2 style={{ color: "#00FF88", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
              !התשלום בוצע בהצלחה
            </h2>
            <p style={{ color: "#F0F6FF", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              האסטרטגיה המלאה שלך פתוחה
            </p>
            <p style={{ color: "#6B7FA3", fontSize: 14, lineHeight: 1.7, marginBottom: 24, maxWidth: 380, margin: "0 auto 24px" }}>
              עכשיו הזמן לדייק את התשובות שלך. נתונים אמיתיים יוצרים תוכנית פעולה אמיתית עם גאנט ל-90 יום.
            </p>

            {/* Refinement Progress Bar */}
            <div style={{ marginBottom: 24, padding: "0 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11 }}>דיוק האסטרטגיה</span>
                <span style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 11 }}>{refinementProgress}%</span>
              </div>
              <div style={{ height: 6, background: "#1E2D45", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${refinementProgress}%`,
                  background: "linear-gradient(90deg, #00FF88, #00CC6A)",
                  borderRadius: 3,
                  transition: "width 0.5s ease",
                }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={handleStartRefine} className="gtm-btn-primary">
                דייק את התשובות שלך
              </button>
              <button
                onClick={() => setShowPostPayment(false)}
                className="gtm-btn-outline"
              >
                המשך לאסטרטגיה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Banner */}
      <div className="gtm-card-rounded" style={{
        background: "linear-gradient(135deg, rgba(0,255,136,0.08), rgba(255,107,53,0.05))",
        padding: 24,
        marginBottom: 24,
      }}>
        <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 11, marginBottom: 8, textTransform: "uppercase" }}>
          תקציר מנהלים
        </p>
        <p style={{ color: "#F0F6FF", fontSize: 17, lineHeight: 1.7, fontWeight: 500 }}>{strategy.summary}</p>
      </div>

      {/* Refinement Progress Bar (shown after payment, outside modal) */}
      {isUnlocked && refineMode && (
        <div className="gtm-card-rounded" style={{ padding: "16px 24px", marginBottom: 24, background: "rgba(0,255,136,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#F0F6FF", fontSize: 14, fontWeight: 600 }}>מצב דיוק</span>
            <span style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 13 }}>{refinementProgress}%</span>
          </div>
          <div style={{ height: 6, background: "#1E2D45", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${refinementProgress}%`,
              background: "linear-gradient(90deg, #00FF88, #00CC6A)",
              borderRadius: 3,
              transition: "width 0.5s ease",
            }} />
          </div>
          <p style={{ color: "#6B7FA3", fontSize: 12, marginTop: 6 }}>
            נתונים אמיתיים יוצרים תוכנית פעולה אמיתית
          </p>
        </div>
      )}

      {/* Interactive Stage Navigation */}
      <div className="gtm-stage-nav">
        {[
          { key: "core" as const, label: "קהל יעד ומיצוב", icon: "\uD83C\uDFAF" },
          { key: "validation" as const, label: "ולידציה ומשפך", icon: "\uD83E\uDDEA" },
          { key: "marketing" as const, label: "שיווק ומכירות", icon: "\uD83D\uDCC8", locked: !isUnlocked },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCurrentStage(tab.key)}
            className={`gtm-stage-tab ${currentStage === tab.key ? "active" : ""}`}
          >
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.locked && <span style={{ fontSize: 12, opacity: 0.6 }}>&#x1F512;</span>}
          </button>
        ))}
      </div>

      {/* Stage Content */}
      <div style={{ position: "relative" }}>
        {/* Paywall overlay for locked stage */}
        {isLocked && (
          <div className="gtm-modal-overlay" style={{ position: "absolute", borderRadius: 24 }}>
            <div style={{ textAlign: "center", padding: 32 }}>
              <span style={{ fontSize: 48, marginBottom: 16, display: "block" }}>&#x1F512;</span>
              <h3 style={{ color: "#F0F6FF", fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
                פתח את האסטרטגיה המלאה
              </h3>
              <p style={{ color: "#6B7FA3", fontSize: 15, marginBottom: 32, textAlign: "center", maxWidth: 520, lineHeight: 1.7 }}>
                קהל יעד וולידציה זמינים בחינם. שדרג כדי לגשת לערוצי צמיחה, פרסום ממומן, אסטרטגיית תוכן ותוכנית השקה ל-90 יום.
              </p>

              {/* 2-Tier Pricing: DIY + PRO */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, maxWidth: 640, direction: "rtl", margin: "0 auto" }}>
                {/* DIY Tier */}
                <div className="gtm-pricing-card" style={{ display: "flex", flexDirection: "column" }}>
                  <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 13, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>DIY</p>
                  <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>
                    GTM BOOTCAMP
                  </h4>
                  <p style={{ color: "#9DA3B4", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                    יצירת תוכנית השקה ל-90 ימים — מסמך אסטרטגיה מלא הכולל קהל יעד, מיצוב, ולידציה, משפך מכירות, ערוצי שיווק ותוכנית פעולה שבועית.
                  </p>
                  <p style={{ color: "#F0F6FF", fontSize: 36, fontWeight: 800, marginBottom: 4 }}>
                    290<span style={{ fontSize: 16, color: "#6B7FA3" }}>&#8362;</span>
                  </p>
                  <p style={{ color: "#6B7FA3", fontSize: 13, marginBottom: 20 }}>כולל מע&quot;מ · תשלום חד פעמי</p>
                  <ul style={{ textAlign: "right", color: "#9DA3B4", fontSize: 14, lineHeight: 2.4, listStyle: "none", padding: 0, direction: "rtl", flex: 1 }}>
                    <li>&#10003; מסמך אסטרטגיה מלא</li>
                    <li>&#10003; כל 7 הסעיפים פתוחים</li>
                    <li>&#10003; תוכנית השקה ל-90 יום (גאנט)</li>
                    <li>&#10003; ייצוא וגישה לצמיתות</li>
                    <li style={{ color: "#3D4F6F" }}>&#10007; ללא שיחות ליווי</li>
                  </ul>
                  <button onClick={() => handleTierSelect("diy")} className="gtm-btn-outline" style={{ width: "100%", marginTop: 20, padding: "12px 0", fontSize: 15 }}>
                    קבל גישת DIY
                  </button>
                </div>

                {/* Pro Tier */}
                <div className="gtm-pricing-card gtm-pricing-pro" style={{ display: "flex", flexDirection: "column" }}>
                  <span className="gtm-popular-badge">הכי פופולרי</span>
                  <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 13, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>Pro</p>
                  <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>
                    GTM BOOTCAMP
                  </h4>
                  <p style={{ color: "#9DA3B4", fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                    מנוי חודשי למערכת — כל מה שב-DIY ובנוסף גישה בלתי מוגבלת לכלי AI, עוזר אסטרטגי חכם ושיחת ליווי חודשית עם מומחה.
                  </p>
                  <p style={{ color: "#F0F6FF", fontSize: 36, fontWeight: 800, marginBottom: 4 }}>
                    99<span style={{ fontSize: 16, color: "#6B7FA3" }}>&#8362;/חודש</span>
                  </p>
                  <p style={{ color: "#6B7FA3", fontSize: 13, marginBottom: 20 }}>הוראת קבע · ביטול בכל עת</p>
                  <ul style={{ textAlign: "right", color: "#9DA3B4", fontSize: 14, lineHeight: 2.4, listStyle: "none", padding: 0, direction: "rtl", flex: 1 }}>
                    <li style={{ color: "#00FF88" }}>&#10003; הכל ב-DIY</li>
                    <li style={{ color: "#00FF88" }}>&#10003; יצירות ללא הגבלה</li>
                    <li style={{ color: "#00FF88" }}>&#10003; עוזר אסטרטגי AI</li>
                    <li style={{ color: "#00FF88" }}>&#10003; שיחת ליווי חודשית</li>
                    <li style={{ color: "#00FF88" }}>&#10003; עדכונים ותכנים חדשים</li>
                  </ul>
                  <button onClick={() => handleTierSelect("pro")} className="gtm-btn-primary" style={{ width: "100%", marginTop: 20, padding: "12px 0", fontSize: 15 }}>
                    התחל Pro
                  </button>
                </div>
              </div>

              {/* ── Bootcamp Hero Section (Burn Orange) ── */}
              <div className="gtm-bootcamp-hero" style={{ marginTop: 32, maxWidth: 560, margin: "32px auto 0" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #FF6B35, #E55A2B)" }} />
                <p style={{ color: "#FF6B35", fontFamily: "monospace", fontSize: 12, marginBottom: 6 }}>
                  תוכנית הדגל של דוד פופוביץ
                </p>
                <h3 style={{ color: "#F0F6FF", fontSize: 24, fontWeight: 800, lineHeight: 1.3, marginBottom: 12 }}>
                  GTM BOOTCAMP
                </h3>
                <div style={{ color: "#9DA3B4", fontSize: 15, lineHeight: 1.8, marginBottom: 20, maxWidth: 480, margin: "0 auto 20px", textAlign: "center" }}>
                  <p>מחנה אימונים אינטנסיבי למשך 30 ימים</p>
                  <p>ליווי אישי במסגרת קבוצתית</p>
                  <p>למפתחים ויזמים שרוצים לייצר תוכנית שיווקית</p>
                  <p>חדירה לשוק ולקוחות משלמים</p>
                </div>
                <button onClick={() => setShowBootcampModal(true)} className="gtm-btn-orange">
                  תיאום שיחת אבחון אסטרטגית של 15 דקות עם דוד פופוביץ (ללא עלות)
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className="gtm-stage-content"
          style={{
            filter: isLocked ? "blur(6px)" : "none",
            pointerEvents: isLocked ? "none" : "auto",
          }}
        >
          {/* Stage 1: Core Strategy (ICP + Positioning) */}
          {currentStage === "core" && (
            <div>
              <ICPTab strategy={strategy} />
              <div style={{ textAlign: "center", marginTop: 32 }}>
                <button onClick={() => setCurrentStage("validation")} className="gtm-btn-primary gtm-btn-scale">
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
              <div style={{ textAlign: "center", marginTop: 32 }}>
                <button onClick={() => setCurrentStage("marketing")} className="gtm-btn-primary gtm-btn-scale">
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

      {/* ══════ 90-Day Gantt Chart Section ══════ */}
      {isUnlocked && (
        <div style={{ marginTop: 48 }}>
          <div className="gtm-card-rounded" style={{
            background: "linear-gradient(135deg, rgba(0,255,136,0.06), rgba(255,107,53,0.04))",
            padding: "32px 24px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>&#x1F4CA;</span>
              <div>
                <h3 style={{ color: "#F0F6FF", fontSize: 22, fontWeight: 800 }}>
                  תוכנית פעולה ל-90 יום
                </h3>
                <p style={{ color: "#6B7FA3", fontSize: 13 }}>
                  גאנט מותאם אישית מבוסס על האסטרטגיה שלך
                </p>
              </div>
            </div>

            {!ganttConfirmed ? (
              /* Locked until answers confirmed */
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  background: "rgba(255,107,53,0.1)",
                  borderRadius: 12,
                  marginBottom: 20,
                }}>
                  <span style={{ fontSize: 16 }}>&#x1F512;</span>
                  <span style={{ color: "#FF6B35", fontSize: 13, fontWeight: 600 }}>
                    נעול עד לאישור התשובות המדויקות שלך
                  </span>
                </div>
                <p style={{ color: "#6B7FA3", fontSize: 14, lineHeight: 1.7, maxWidth: 440, margin: "0 auto 24px" }}>
                  דייק את התשובות בשאלון ולחץ &#34;אישור&#34; כדי ליצור תוכנית גאנט מותאמת אישית עם שלבים, משימות ואבני דרך.
                </p>
                <button onClick={handleConfirmAnswers} className="gtm-btn-primary gtm-btn-scale">
                  אשר תשובות ויצר גאנט
                </button>
              </div>
            ) : ganttGenerating ? (
              /* Gantt loading state */
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="gtm-skeleton" style={{
                    height: 60,
                    borderRadius: 12,
                    marginBottom: 12,
                  }} />
                ))}
                <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 13, marginTop: 16 }}>
                  ...מייצר תוכנית פעולה מותאמת
                </p>
              </div>
            ) : ganttTimeline ? (
              /* Gantt Chart Display */
              <GanttChart timeline={ganttTimeline} />
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <button onClick={generateGantt} className="gtm-btn-primary">
                  צור תוכנית גאנט
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Regenerate button */}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button
          onClick={() => {
            generationAttempted.current = false;
            generateStrategy();
          }}
          className="gtm-btn-ghost"
        >
          צור אסטרטגיה מחדש
        </button>
      </div>

      {/* ══════ Expert Guidance Sticky Banner ══════ */}
      {isUnlocked && purchasedTier && (
        <div className="gtm-sticky-banner">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <p style={{ color: "#F0F6FF", fontSize: 14, fontWeight: 500, textAlign: "center" }}>
              מרגיש שהאסטרטגיה צריכה דיוק של מומחה? בוא נעבור על הגאנט שלך יחד.
            </p>
            <button
              onClick={() => setShowBootcampModal(true)}
              className="gtm-btn-orange"
              style={{ padding: "8px 20px", fontSize: 13, whiteSpace: "nowrap" }}
            >
              תיאום שיחת אבחון ללא עלות &#10132;
            </button>
          </div>
        </div>
      )}

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
          paymentLevel={purchasedTier}
          onClose={() => setShowBootcampModal(false)}
        />
      )}
    </div>
  );
}

/* ──── 90-Day Gantt Chart Component ──── */

function GanttChart({ timeline }: { timeline: GanttTimeline }) {
  const phaseColors = ["#00FF88", "#3B82F6", "#FF6B35"];

  return (
    <div style={{ marginTop: 16 }}>
      {timeline.phases?.map((phase, pi) => (
        <div key={pi} style={{ marginBottom: 24 }}>
          {/* Phase Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
            padding: "10px 16px",
            background: `${phaseColors[pi]}10`,
            borderRadius: 12,
            borderRight: `4px solid ${phaseColors[pi]}`,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${phaseColors[pi]}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: phaseColors[pi],
              fontWeight: 800,
              fontFamily: "monospace",
              fontSize: 16,
            }}>
              {pi + 1}
            </div>
            <div>
              <h4 style={{ color: phaseColors[pi], fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>
                {phase.name}
              </h4>
              <span style={{ color: "#6B7FA3", fontSize: 12 }}>{phase.weeks}</span>
            </div>
          </div>

          {/* Phase Tasks */}
          {phase.tasks?.map((task, ti) => (
            <div key={ti} style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "10px 16px",
              marginBottom: 4,
              borderRadius: 8,
              background: ti % 2 === 0 ? "rgba(22,29,43,0.5)" : "transparent",
            }}>
              <span style={{ color: phaseColors[pi], fontFamily: "monospace", fontSize: 12, minWidth: 60, flexShrink: 0 }}>
                {task.week}
              </span>
              <span style={{ color: "#F0F6FF", fontSize: 14, flex: 1, lineHeight: 1.6 }}>
                {task.task}
              </span>
              <span style={{ color: "#6B7FA3", fontSize: 11, fontFamily: "monospace", flexShrink: 0 }}>
                {task.deliverable}
              </span>
            </div>
          ))}

          {/* Phase Milestone */}
          {phase.milestone && (
            <div style={{
              marginTop: 8,
              padding: "8px 16px",
              borderRadius: 8,
              background: `${phaseColors[pi]}08`,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{ color: phaseColors[pi], fontSize: 14 }}>&#x1F3AF;</span>
              <span style={{ color: phaseColors[pi], fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>
                אבן דרך: {phase.milestone}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ──── Bootcamp Application Modal ──── */

function BootcampModal({ userName, paymentLevel, onClose }: { userName: string; paymentLevel?: "diy" | "pro" | null; onClose: () => void }) {
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
          payment_level: paymentLevel || "free",
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
      className="gtm-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div dir="rtl" className="gtm-modal-card" style={{ maxWidth: 440 }}>
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
            <button onClick={onClose} className="gtm-close-btn">&times;</button>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>&#x1F389;</div>
              <h4 style={{ color: "#F0F6FF", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                המועמדות נשלחה!
              </h4>
              <p style={{ color: "#6B7FA3", fontSize: 14, marginBottom: 20 }}>
                ניצור איתך קשר בקרוב מאוד
              </p>
              <button onClick={onClose} className="gtm-btn-orange">סגור</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label className="gtm-label">שם מלא</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="gtm-input" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="gtm-label">אימייל</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="gtm-input" />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="gtm-label" style={{ color: "#FF6B35" }}>מספר טלפון *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (error) setError(""); }}
                  placeholder="050-1234567"
                  dir="ltr"
                  className="gtm-input"
                  style={error ? { borderColor: "#EF4444" } : {}}
                />
                {error && <p style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{error}</p>}
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="gtm-btn-orange gtm-btn-scale"
                style={{ width: "100%", opacity: submitting ? 0.5 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
              >
                {submitting ? "שולח..." : "שלח מועמדות"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──── Tab Components ──── */

function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="gtm-card-rounded" style={{ padding: 24, marginBottom: 16 }}>
      {title && (
        <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: "uppercase" }}>
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
        padding: "6px 14px",
        borderRadius: 8,
        background: "rgba(0,255,136,0.08)",
        border: "1px solid rgba(0,255,136,0.2)",
        color: "#00FF88",
        fontSize: 14,
        fontFamily: "monospace",
        marginLeft: 6,
        marginBottom: 8,
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
      <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 13, marginBottom: 3 }}>{label}</p>
      <p style={{ color: "#F0F6FF", fontSize: 16, lineHeight: 1.7 }}>{text}</p>
    </div>
  );
}
