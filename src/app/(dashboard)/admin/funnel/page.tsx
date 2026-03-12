"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ─── Types ─── */

interface FunnelStep {
  step: string;
  label: string;
  uniqueUsers: number;
  uniqueSessions: number;
  dropoffPercent: number;
  conversionFromStart: number;
}

interface GenerationStat {
  step: string;
  label: string;
  starts: number;
  completes: number;
  errors: number;
  successRate: number;
}

interface DailyActivity {
  date: string;
  users: number;
  sessions: number;
}

interface TopEvent {
  type: string;
  name: string;
  count: number;
}

interface NicheAnalytic {
  name: string;
  generated: number;
  selected: number;
  toggled: number;
}

interface LeakPoint {
  from: string;
  fromLabel: string;
  toLabel: string;
  dropoffPercent: number;
  usersLost: number;
}

interface HourlyData {
  hour: number;
  views: number;
}

interface FunnelData {
  period: number;
  summary: {
    totalUniqueUsers: number;
    totalSessions: number;
    totalEvents: number;
    completedProjects: number;
    overallConversion: number;
  };
  funnelSteps: FunnelStep[];
  gtmFunnelSteps?: FunnelStep[];
  stepCompletions: Record<string, number>;
  generationStats: GenerationStat[];
  dailyActivity: DailyActivity[];
  topEvents: TopEvent[];
  nicheAnalytics: NicheAnalytic[];
  stuckAt: Record<string, number>;
  leakPoints: LeakPoint[];
  hourlyHeatmap: HourlyData[];
}

/* ─── Colors ─── */
const FUNNEL_COLORS = [
  "#D4A843", "#C49A38", "#B8902F", "#A68028",
  "#947020", "#826018", "#705010", "#5E4008",
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  page_view: "#818CF8",
  button_click: "#D4A843",
  generation_start: "#34D399",
  generation_complete: "#10B981",
  step_complete: "#22C55E",
  error: "#EF4444",
  interaction: "#FB923C",
};

export default function FunnelAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FunnelData | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    async function init() {
      const admin = await isAdmin();
      if (!admin) {
        router.replace("/dashboard");
        return;
      }
      fetchData(period);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function fetchData(days: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/funnel-analytics?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result);
    } catch {
      setError("שגיאה בטעינת נתוני אנליטיקה");
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodChange(days: number) {
    setPeriod(days);
    fetchData(days);
  }

  if (loading) {
    return (
      <div dir="rtl">
        <div className="mb-8 animate-in">
          <div className="skeleton h-8 w-56 mb-2" />
          <div className="skeleton h-4 w-80" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="card-static p-5">
              <div className="skeleton h-10 w-10 rounded-xl mb-3" />
              <div className="skeleton h-8 w-16 mb-1" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="card-static p-6 mb-8">
          <div className="skeleton h-6 w-36 mb-4" />
          <div className="skeleton h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="text-center py-20">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { summary, funnelSteps, gtmFunnelSteps, generationStats, dailyActivity, topEvents, nicheAnalytics, leakPoints, stuckAt, hourlyHeatmap } = data;

  const maxHourViews = Math.max(...hourlyHeatmap.map(h => h.views), 1);

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-in">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            ניתוח משפך מלא
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            מעקב אחר כל פיקסל — מהשאלון ועד סיום הפרויקט
          </p>
        </div>
        <div className="flex gap-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[10px] p-1">
          {[
            { days: 7, label: "7 ימים" },
            { days: 30, label: "30 ימים" },
            { days: 90, label: "90 ימים" },
          ].map((opt) => (
            <button
              key={opt.days}
              onClick={() => handlePeriodChange(opt.days)}
              className={`px-4 py-2 text-sm font-medium rounded-[8px] transition-all cursor-pointer ${
                period === opt.days
                  ? "bg-[var(--gold)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--content-bg)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "משתמשים ייחודיים", value: summary.totalUniqueUsers, icon: "\uD83D\uDC64", gradient: "linear-gradient(135deg, #818CF8, #6366F1)" },
          { label: "סשנים", value: summary.totalSessions, icon: "\uD83D\uDD0D", gradient: "linear-gradient(135deg, #34D399, #10B981)" },
          { label: "אירועים", value: summary.totalEvents, icon: "\uD83D\uDCC8", gradient: "linear-gradient(135deg, #D4A843, #C49A38)" },
          { label: "פרויקטים הושלמו", value: summary.completedProjects, icon: "\u2705", gradient: "linear-gradient(135deg, #22C55E, #16A34A)" },
          { label: "המרה כוללת", value: `${summary.overallConversion}%`, icon: "\uD83C\uDFAF", gradient: "linear-gradient(135deg, #FB923C, #F97316)" },
        ].map((card, i) => (
          <div key={i} className={`card-elevated p-5 animate-in delay-${i + 1}`} style={{ cursor: "default" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl" style={{ background: card.gradient }}>
              {card.icon}
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)]">
              {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider">{card.label}</div>
          </div>
        ))}
      </div>

      {/* ── Funnel Visualization ── */}
      <div className="card-elevated p-6 mb-8 animate-in delay-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">משפך המרה</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">מספר משתמשים ייחודיים בכל שלב + אחוז נשירה</p>

        {funnelSteps.every(s => s.uniqueUsers === 0) ? (
          <div className="text-center py-16">
            <p className="text-[var(--text-muted)] text-lg mb-2">אין נתוני משפך עדיין</p>
            <p className="text-[var(--text-muted)] text-sm">נתונים יתחילו להופיע כאשר משתמשים ישתמשו במערכת</p>
          </div>
        ) : (
          <div className="space-y-2">
            {funnelSteps.map((step, i) => {
              const maxUsers = funnelSteps[0]?.uniqueUsers || 1;
              const widthPercent = Math.max((step.uniqueUsers / maxUsers) * 100, 8);
              return (
                <div key={step.step} className="flex items-center gap-3">
                  <div className="w-24 text-sm font-medium text-[var(--text-secondary)] text-left flex-shrink-0">
                    {step.label}
                  </div>
                  <div className="flex-1 relative">
                    <div
                      className="h-10 rounded-lg flex items-center px-3 transition-all duration-500"
                      style={{
                        width: `${widthPercent}%`,
                        background: `linear-gradient(135deg, ${FUNNEL_COLORS[i % FUNNEL_COLORS.length]}, ${FUNNEL_COLORS[(i + 1) % FUNNEL_COLORS.length]})`,
                        minWidth: "60px",
                      }}
                    >
                      <span className="text-white font-bold text-sm">{step.uniqueUsers}</span>
                    </div>
                  </div>
                  <div className="w-28 flex-shrink-0 text-left">
                    {i > 0 && step.dropoffPercent > 0 ? (
                      <span className="text-red-500 text-sm font-semibold">
                        &#x2193; {step.dropoffPercent}% נשירה
                      </span>
                    ) : i === 0 ? (
                      <span className="text-[var(--text-muted)] text-sm">100%</span>
                    ) : (
                      <span className="text-green-500 text-sm font-semibold">0% נשירה</span>
                    )}
                  </div>
                  <div className="w-16 text-left text-xs text-[var(--text-muted)]">
                    {step.conversionFromStart}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── GTM Funnel Visualization ── */}
      {gtmFunnelSteps && gtmFunnelSteps.length > 0 && (
        <div className="card-elevated p-6 mb-8 animate-in delay-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">משפך GTM</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">מסלול Go-To-Market — מהאידיאטור ועד הבוטקאמפ</p>

          {gtmFunnelSteps.every(s => s.uniqueUsers === 0) ? (
            <div className="text-center py-16">
              <p className="text-[var(--text-muted)] text-lg mb-2">אין נתוני GTM עדיין</p>
              <p className="text-[var(--text-muted)] text-sm">נתונים יתחילו להופיע כאשר משתמשים ישתמשו במסלול GTM</p>
            </div>
          ) : (
            <div className="space-y-2">
              {gtmFunnelSteps.map((step, i) => {
                const maxUsers = gtmFunnelSteps[0]?.uniqueUsers || 1;
                const widthPercent = Math.max((step.uniqueUsers / maxUsers) * 100, 8);
                const GTM_COLORS = ["#00FF88", "#00CC6A", "#3B82F6", "#6366F1", "#8B5CF6"];
                return (
                  <div key={step.step} className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium text-[var(--text-secondary)] text-left flex-shrink-0">
                      {step.label}
                    </div>
                    <div className="flex-1 relative">
                      <div
                        className="h-10 rounded-lg flex items-center px-3 transition-all duration-500"
                        style={{
                          width: `${widthPercent}%`,
                          background: `linear-gradient(135deg, ${GTM_COLORS[i % GTM_COLORS.length]}, ${GTM_COLORS[(i + 1) % GTM_COLORS.length]})`,
                          minWidth: "60px",
                        }}
                      >
                        <span className="text-white font-bold text-sm">{step.uniqueUsers}</span>
                      </div>
                    </div>
                    <div className="w-28 flex-shrink-0 text-left">
                      {i > 0 && step.dropoffPercent > 0 ? (
                        <span className="text-red-500 text-sm font-semibold">
                          &#x2193; {step.dropoffPercent}% נשירה
                        </span>
                      ) : i === 0 ? (
                        <span className="text-[var(--text-muted)] text-sm">100%</span>
                      ) : (
                        <span className="text-green-500 text-sm font-semibold">0% נשירה</span>
                      )}
                    </div>
                    <div className="w-16 text-left text-xs text-[var(--text-muted)]">
                      {step.conversionFromStart}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Leak Points Alert ── */}
      {leakPoints.length > 0 && (
        <div className="card-elevated p-6 mb-8 animate-in delay-7" style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}>
          <h2 className="text-lg font-bold text-red-500 mb-4 flex items-center gap-2">
            <span className="text-xl">{"\uD83D\uDEA8"}</span> נקודות דליפה במשפך
          </h2>
          <div className="grid gap-3">
            {leakPoints.map((leak, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black text-red-500">{leak.dropoffPercent}%</div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {leak.fromLabel} → {leak.toLabel}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {leak.usersLost > 0 ? `${leak.usersLost} משתמשים נשרו` : "נשירה משמעותית"}
                    </p>
                  </div>
                </div>
                <div
                  className="w-24 h-2 rounded-full overflow-hidden"
                  style={{ background: "rgba(239, 68, 68, 0.15)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${leak.dropoffPercent}%`,
                      background: "linear-gradient(90deg, #FB7185, #EF4444)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ── Daily Activity ── */}
        <div className="card-elevated p-6 animate-in delay-8">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">פעילות יומית</h2>
          {dailyActivity.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm py-12 text-center">אין נתונים</p>
          ) : (
            <div style={{ width: "100%", height: 300, direction: "ltr" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyActivity}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4A843" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4A843" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    tickFormatter={(val: string) => { const d = new Date(val); return `${d.getDate()}/${d.getMonth() + 1}`; }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", fontSize: "12px" }}
                    labelFormatter={(val) => new Date(String(val)).toLocaleDateString("he-IL")}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Area type="monotone" dataKey="users" name="משתמשים" stroke="#D4A843" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                  <Area type="monotone" dataKey="sessions" name="סשנים" stroke="#818CF8" fillOpacity={1} fill="url(#colorSessions)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Generation Success Rate ── */}
        <div className="card-elevated p-6 animate-in delay-8">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">הצלחת יצירת תוכן</h2>
          {generationStats.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm py-12 text-center">אין נתונים</p>
          ) : (
            <div style={{ width: "100%", height: 300, direction: "ltr" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={generationStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={90}
                    tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Bar dataKey="completes" name="הצלחות" fill="#22C55E" radius={[0, 6, 6, 0]} />
                  <Bar dataKey="errors" name="שגיאות" fill="#EF4444" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Where Users Get Stuck ── */}
      {Object.keys(stuckAt).length > 0 && (
        <div className="card-elevated p-6 mb-8 animate-in">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span>{"\uD83E\uDD14"}</span> איפה משתמשים נתקעים
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(stuckAt)
              .sort(([, a], [, b]) => b - a)
              .map(([step, count]) => {
                const stepLabels: Record<string, string> = {
                  questionnaire: "שאלון", strategy: "אסטרטגיה", niches: "נישות",
                  pains: "ניתוח כאבים", scripts: "תסריטים", creative: "קריאייטיב",
                  copy: "קופי", album: "אלבום",
                  ideator: "אידיאטור", "gtm-questionnaire": "שאלון GTM",
                  "gtm-strategy": "אסטרטגיית GTM", "gtm-bootcamp": "בוטקאמפ GTM",
                  results: "תוצאות",
                };
                return (
                  <div key={step} className="p-4 rounded-xl text-center" style={{ background: "var(--gold-soft)" }}>
                    <div className="text-2xl font-black text-[var(--gold)]">{count}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">נתקעו ב{stepLabels[step] || step}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ── Niche Analytics ── */}
        <div className="card-elevated p-6 animate-in">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">ניתוח נישות</h2>
          {nicheAnalytics.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">אין נתוני נישות עדיין</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--card-border)" }}>
                    <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">נישה</th>
                    <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">הוצעה</th>
                    <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">נבחרה</th>
                    <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">נלחצה</th>
                  </tr>
                </thead>
                <tbody>
                  {nicheAnalytics.slice(0, 15).map((niche, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--card-border)" }} className="hover:bg-[var(--gold-soft)] transition-colors">
                      <td className="py-2.5 pr-2 text-[var(--text-primary)] font-medium max-w-[160px] truncate">{niche.name}</td>
                      <td className="py-2.5 pr-2 text-[var(--text-secondary)]">{niche.generated}</td>
                      <td className="py-2.5 pr-2">
                        <span className={`font-bold ${niche.selected > 0 ? "text-green-500" : "text-[var(--text-muted)]"}`}>
                          {niche.selected}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-[var(--text-muted)]">{niche.toggled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Hourly Heatmap ── */}
        <div className="card-elevated p-6 animate-in">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">שעות פעילות</h2>
          <div className="grid grid-cols-6 gap-1.5">
            {hourlyHeatmap.map((h) => {
              const intensity = maxHourViews > 0 ? h.views / maxHourViews : 0;
              return (
                <div
                  key={h.hour}
                  className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs"
                  style={{
                    background: intensity > 0
                      ? `rgba(212, 168, 67, ${0.1 + intensity * 0.8})`
                      : "var(--content-bg)",
                    border: "1px solid var(--card-border)",
                  }}
                  title={`${h.hour}:00 — ${h.views} צפיות`}
                >
                  <span className="font-bold text-[var(--text-primary)]">{h.hour}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{h.views}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
            שעות (0-23) — צבע כהה = יותר פעילות
          </p>
        </div>
      </div>

      {/* ── Top Events Table ── */}
      <div className="card-elevated p-6 mb-8 animate-in">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">אירועים מובילים</h2>
        {topEvents.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">אין אירועים עדיין</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--card-border)" }}>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">#</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">סוג</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">שם אירוע</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">כמות</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">אחוז</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.map((ev, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--card-border)" }} className="hover:bg-[var(--gold-soft)] transition-colors">
                    <td className="py-2.5 pr-2 text-[var(--text-muted)]">{i + 1}</td>
                    <td className="py-2.5 pr-2">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${EVENT_TYPE_COLORS[ev.type] || "#94A3B8"}20`,
                          color: EVENT_TYPE_COLORS[ev.type] || "#94A3B8",
                        }}
                      >
                        {ev.type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-[var(--text-primary)] font-mono text-xs">{ev.name}</td>
                    <td className="py-2.5 pr-2 text-[var(--text-secondary)] font-bold">{ev.count.toLocaleString()}</td>
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full" style={{
                          width: `${Math.min((ev.count / (topEvents[0]?.count || 1)) * 80, 80)}px`,
                          background: EVENT_TYPE_COLORS[ev.type] || "#94A3B8",
                        }} />
                        <span className="text-xs text-[var(--text-muted)]">
                          {summary.totalEvents > 0 ? ((ev.count / summary.totalEvents) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Step Completions Summary ── */}
      <div className="card-elevated p-6 animate-in">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">סיכום השלמת שלבים</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(data.stepCompletions).map(([step, count]) => {
            const labels: Record<string, string> = {
              questionnaire_completed: "השלימו שאלון",
              strategy_approved: "אישרו אסטרטגיה",
              niche_selected: "בחרו נישה",
              pains_approved: "אישרו כאבים",
              scripts_approved: "אישרו תסריטים",
              project_completed: "השלימו פרויקט",
              ideator_lead_submitted: "הגישו ליד מאידיאטור",
              gtm_strategy_generated: "יצרו אסטרטגיית GTM",
              gtm_payment_complete: "שילמו GTM",
              gtm_bootcamp_applied: "הגישו מועמדות לבוטקאמפ",
              results_strategy_approved: "אישרו אסטרטגיה (תוצאות)",
            };
            return (
              <div key={step} className="p-4 rounded-xl text-center" style={{ background: "var(--content-bg)", border: "1px solid var(--card-border)" }}>
                <div className="text-xl font-black text-[var(--gold)]">{count}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{labels[step] || step}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
