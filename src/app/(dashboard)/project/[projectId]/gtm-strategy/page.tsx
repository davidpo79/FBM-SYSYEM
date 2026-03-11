"use client";

import { useEffect, useState, useRef } from "react";
import { useProject } from "../layout";

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

const TABS = [
  { key: "icp", label: "קהל יעד ומיצוב", icon: "\u{1F3AF}", locked: false },
  { key: "validation", label: "\u05D5\u05DC\u05D9\u05D3\u05E6\u05D9\u05D4", icon: "\u{1F9EA}", locked: false },
  { key: "funnel", label: "\u05DE\u05E9\u05E4\u05DA \u05D5\u05DE\u05DB\u05D9\u05E8\u05D5\u05EA", icon: "\u{1F4CA}", locked: false },
  { key: "channels", label: "\u05E2\u05E8\u05D5\u05E6\u05D9\u05DD", icon: "\u{1F4E1}", locked: true },
  { key: "paid", label: "\u05E4\u05E8\u05E1\u05D5\u05DD \u05DE\u05DE\u05D5\u05DE\u05DF", icon: "\u{1F4B0}", locked: true },
  { key: "creatives", label: "\u05EA\u05D5\u05DB\u05DF", icon: "\u{1F3A8}", locked: true },
  { key: "weekly_routine", label: "\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA 90 \u05D9\u05D5\u05DD", icon: "\u{1F4C5}", locked: true },
] as const;

export default function GTMStrategyPage() {
  const { project } = useProject();
  const [strategy, setStrategy] = useState<GTMStrategy | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("icp");
  const generationAttempted = useRef(false);

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
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStrategy(json.strategy);

      // Save to localStorage
      try {
        localStorage.setItem(
          `gtm-strategy-${project.id}`,
          JSON.stringify(json.strategy)
        );
      } catch { /* ignore */ }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "\u05E0\u05DB\u05E9\u05DC \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05D4\u05D0\u05E1\u05D8\u05E8\u05D8\u05D2\u05D9\u05D4");
    } finally {
      setIsGenerating(false);
    }
  };

  // Load from localStorage or generate
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

  const currentTabInfo = TABS.find((t) => t.key === activeTab);
  const isLocked = currentTabInfo?.locked ?? false;

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
        <p style={{ color: "#F0F6FF", fontSize: 15, lineHeight: 1.6 }}>{strategy.summary}</p>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          marginBottom: 24,
          padding: 4,
          background: "#0D1117",
          borderRadius: 12,
          border: "1px solid #1E2D45",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: "1 1 auto",
              minWidth: 100,
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: activeTab === tab.key ? "#161D2B" : "transparent",
              color: activeTab === tab.key ? "#00FF88" : "#6B7FA3",
              fontSize: 12,
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontFamily: "monospace",
              cursor: "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              position: "relative",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.locked && (
              <span style={{ fontSize: 10 }}>🔒</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ position: "relative" }}>
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
              background: "rgba(8,10,15,0.9)",
              backdropFilter: "blur(10px)",
              borderRadius: 16,
              padding: 32,
            }}
          >
            <span style={{ fontSize: 40, marginBottom: 12 }}>🔒</span>
            <h3 style={{ color: "#F0F6FF", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
              פתח את האסטרטגיה המלאה
            </h3>
            <p style={{ color: "#6B7FA3", fontSize: 13, marginBottom: 28, textAlign: "center", maxWidth: 480 }}>
              קהל יעד וולידציה זמינים בחינם. שדרג כדי לגשת ל{currentTabInfo?.label}, ערוצי צמיחה, פרסום ממומן, אסטרטגיית תוכן ותוכנית השקה ל-90 יום.
            </p>

            {/* 3-Tier Pricing */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 780, direction: "ltr" }}>
              {/* DIY Tier */}
              <div
                style={{
                  flex: "1 1 220px",
                  maxWidth: 250,
                  background: "#161D2B",
                  border: "1px solid #1E2D45",
                  borderRadius: 14,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>DIY</p>
                <p style={{ color: "#F0F6FF", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                  290<span style={{ fontSize: 14, color: "#6B7FA3" }}>&#8362;</span>
                </p>
                <p style={{ color: "#6B7FA3", fontSize: 11, marginBottom: 16 }}>תשלום חד פעמי</p>
                <ul style={{ textAlign: "right", color: "#9DA3B4", fontSize: 12, lineHeight: 2, listStyle: "none", padding: 0, direction: "rtl" }}>
                  <li>&#10003; מסמך אסטרטגיה מלא</li>
                  <li>&#10003; כל 7 הסעיפים פתוחים</li>
                  <li>&#10003; תוכנית השקה ל-90 יום</li>
                  <li style={{ color: "#3D4F6F" }}>&#10007; ללא שיחות ליווי</li>
                </ul>
                <a
                  href="/settings?tab=plan&tier=diy"
                  style={{
                    display: "block",
                    marginTop: 16,
                    padding: "10px 0",
                    borderRadius: 8,
                    border: "1px solid #1E2D45",
                    color: "#F0F6FF",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  קבל גישת DIY
                </a>
              </div>

              {/* Pro Tier - Highlighted */}
              <div
                style={{
                  flex: "1 1 220px",
                  maxWidth: 250,
                  background: "linear-gradient(180deg, rgba(0,255,136,0.08) 0%, #161D2B 100%)",
                  border: "1.5px solid #00FF88",
                  borderRadius: 14,
                  padding: 20,
                  textAlign: "center",
                  position: "relative",
                  boxShadow: "0 0 24px rgba(0,255,136,0.12)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -10,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #00FF88, #00CC6A)",
                    color: "#080A0F",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "3px 12px",
                    borderRadius: 20,
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                  }}
                >
                  הכי פופולרי
                </span>
                <p style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>Pro</p>
                <p style={{ color: "#F0F6FF", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
                  99<span style={{ fontSize: 14, color: "#6B7FA3" }}>&#8362;/חודש</span>
                </p>
                <p style={{ color: "#6B7FA3", fontSize: 11, marginBottom: 16 }}>ביטול בכל עת</p>
                <ul style={{ textAlign: "right", color: "#9DA3B4", fontSize: 12, lineHeight: 2, listStyle: "none", padding: 0, direction: "rtl" }}>
                  <li style={{ color: "#00FF88" }}>&#10003; הכל ב-DIY</li>
                  <li style={{ color: "#00FF88" }}>&#10003; יצירות ללא הגבלה</li>
                  <li style={{ color: "#00FF88" }}>&#10003; עוזר אסטרטגי AI</li>
                  <li style={{ color: "#00FF88" }}>&#10003; שיחת ליווי חודשית</li>
                </ul>
                <a
                  href="/settings?tab=plan&tier=pro"
                  style={{
                    display: "block",
                    marginTop: 16,
                    padding: "10px 0",
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #00FF88, #00CC6A)",
                    color: "#080A0F",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 700,
                    boxShadow: "0 4px 16px rgba(0,255,136,0.3)",
                  }}
                >
                  התחל Pro
                </a>
              </div>

              {/* BootCamp Tier */}
              <div
                style={{
                  flex: "1 1 220px",
                  maxWidth: 250,
                  background: "linear-gradient(180deg, rgba(255,107,53,0.06) 0%, #161D2B 100%)",
                  border: "1px solid rgba(255,107,53,0.3)",
                  borderRadius: 14,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#FF6B35", fontFamily: "monospace", fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>BootCamp</p>
                <p style={{ color: "#F0F6FF", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                  הגש מועמדות
                </p>
                <p style={{ color: "#FF6B35", fontSize: 11, marginBottom: 16, fontWeight: 600 }}>מקומות מוגבלים</p>
                <ul style={{ textAlign: "right", color: "#9DA3B4", fontSize: 12, lineHeight: 2, listStyle: "none", padding: 0, direction: "rtl" }}>
                  <li style={{ color: "#FF6B35" }}>&#10003; הכל ב-Pro</li>
                  <li style={{ color: "#FF6B35" }}>&#10003; תוכנית לייב של 8 שבועות</li>
                  <li style={{ color: "#FF6B35" }}>&#10003; ליווי קבוצתי שבועי</li>
                  <li style={{ color: "#FF6B35" }}>&#10003; קהילה פרטית</li>
                </ul>
                <a
                  href="/settings?tab=plan&tier=bootcamp"
                  style={{
                    display: "block",
                    marginTop: 16,
                    padding: "10px 0",
                    borderRadius: 8,
                    border: "1px solid rgba(255,107,53,0.4)",
                    color: "#FF6B35",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  הגש מועמדות
                </a>
              </div>
            </div>
          </div>
        )}

        <div style={{ filter: isLocked ? "blur(6px)" : "none", pointerEvents: isLocked ? "none" : "auto" }}>
          {activeTab === "icp" && <ICPTab strategy={strategy} />}
          {activeTab === "validation" && <ValidationTab strategy={strategy} />}
          {activeTab === "funnel" && <FunnelTab strategy={strategy} />}
          {activeTab === "channels" && <ChannelsTab strategy={strategy} />}
          {activeTab === "paid" && <PaidTab strategy={strategy} />}
          {activeTab === "creatives" && <CreativesTab strategy={strategy} />}
          {activeTab === "weekly_routine" && <WeeklyTab strategy={strategy} />}
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
        <h3 style={{ color: "#F0F6FF", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{icp.persona_name}</h3>
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
          <p style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>{positioning.oneliner}</p>
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
            <p style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 600 }}>{validation.current_stage}</p>
          </div>
          <div>
            <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11 }}>ציון</p>
            <p style={{ color: "#00FF88", fontSize: 24, fontWeight: 800, fontFamily: "monospace" }}>{validation.validation_score}/10</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>ראיות</p>
            <ul style={{ color: "#F0F6FF", fontSize: 13, lineHeight: 1.8, listStyle: "disc", paddingInlineStart: 16 }}>
              {validation.evidence.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
          <div>
            <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>פערים</p>
            <ul style={{ color: "#FF6B35", fontSize: 13, lineHeight: 1.8, listStyle: "disc", paddingInlineStart: 16 }}>
              {validation.gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        </div>
        <InfoBlock label="הערכת סיכונים" text={validation.risk_assessment} />
      </Card>

      <Card title="ניסויי ולידציה">
        {validation.experiments.map((exp, i) => (
          <div key={i} style={{ background: "rgba(8,10,15,0.5)", border: "1px solid rgba(30,45,69,0.5)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
            <h4 style={{ color: "#00FF88", fontSize: 14, fontWeight: 600, marginBottom: 8, fontFamily: "monospace" }}>{exp.name}</h4>
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
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,255,136,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00FF88", fontWeight: 800, fontFamily: "monospace", fontSize: 14, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: "#F0F6FF", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{stage.stage}</h4>
              <p style={{ color: "#6B7FA3", fontSize: 13, marginBottom: 6 }}>{stage.goal}</p>
              <div>{stage.tactics.map((t, j) => <Chip key={j}>{t}</Chip>)}</div>
              <p style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 11, marginTop: 6 }}>מדד: {stage.metrics}</p>
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
        <p style={{ color: "#F0F6FF", fontSize: 14, lineHeight: 1.7 }}>{funnel.sales_motion}</p>
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
            <h4 style={{ color: "#00FF88", fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{ch.channel}</h4>
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
            <h4 style={{ color: "#F0F6FF", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{ch.channel}</h4>
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
              <h4 style={{ color: "#00FF88", fontSize: 14, fontWeight: 600 }}>{p.platform}</h4>
              <span style={{ color: "#FF6B35", fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>{p.budget_split}</span>
            </div>
            <InfoBlock label="טרגוט" text={p.targeting} />
            <div>{p.creative_angles.map((a, j) => <Chip key={j}>{a}</Chip>)}</div>
            <InfoBlock label="מדדים צפויים" text={p.expected_metrics} />
          </div>
        ))}
      </Card>
      <Card title="תוכנית סקיילינג">
        <p style={{ color: "#F0F6FF", fontSize: 14, lineHeight: 1.7 }}>{paid.scaling_plan}</p>
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
              <h4 style={{ color: "#F0F6FF", fontSize: 14, fontWeight: 600 }}>{c.type}</h4>
              <span style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 12 }}>{c.frequency}</span>
            </div>
            <div style={{ marginTop: 4 }}>{c.topics.map((t, j) => <Chip key={j}>{t}</Chip>)}</div>
            <p style={{ color: "#6B7FA3", fontSize: 12, marginTop: 4 }}>הפצה: {c.distribution}</p>
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
              <h4 style={{ color: "#00FF88", fontFamily: "monospace", fontSize: 14, fontWeight: 600 }}>{w.week}</h4>
              <span style={{ color: "#6B7FA3", fontFamily: "monospace", fontSize: 12 }}>{w.theme}</span>
            </div>
            <ul style={{ color: "#F0F6FF", fontSize: 13, lineHeight: 1.8, listStyle: "disc", paddingInlineStart: 16 }}>
              {w.tasks.map((t, j) => <li key={j}>{t}</li>)}
            </ul>
            <div style={{ marginTop: 8, padding: "6px 12px", borderRadius: 6, background: "rgba(255,107,53,0.1)", display: "inline-block" }}>
              <span style={{ color: "#FF6B35", fontFamily: "monospace", fontSize: 11 }}>אבן דרך: </span>
              <span style={{ color: "#F0F6FF", fontSize: 12 }}>{w.milestone}</span>
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
      <p style={{ color: "#F0F6FF", fontSize: 13, lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}
