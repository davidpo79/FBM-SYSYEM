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

interface DailyStat {
  date: string;
  calls: number;
  errors: number;
}

interface EndpointStat {
  endpoint: string;
  calls: number;
  errors: number;
  avgDuration: number;
}

interface TopUser {
  userId: string;
  email: string;
  calls: number;
}

interface RecentError {
  endpoint: string;
  errorMessage: string;
  userId: string;
  email: string;
  createdAt: string;
}

interface AnalyticsData {
  period: number;
  dailyStats: DailyStat[];
  endpointStats: EndpointStat[];
  topUsers: TopUser[];
  recentErrors: RecentError[];
  totalCalls: number;
  totalErrors: number;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(7);

  useEffect(() => {
    async function init() {
      const admin = await isAdmin();
      if (!admin) {
        router.replace("/dashboard");
        return;
      }
      fetchAnalytics(period);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function fetchAnalytics(days: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
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
    fetchAnalytics(days);
  }

  if (loading) {
    return (
      <div dir="rtl">
        <div className="mb-8 animate-in">
          <div className="skeleton h-8 w-40 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="card-static p-5">
              <div className="skeleton h-10 w-10 rounded-xl mb-3" />
              <div className="skeleton h-8 w-16 mb-1" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card-static p-6">
            <div className="skeleton h-6 w-36 mb-4" />
            <div className="skeleton h-[300px] w-full rounded-xl" />
          </div>
          <div className="card-static p-6">
            <div className="skeleton h-6 w-36 mb-4" />
            <div className="skeleton h-[300px] w-full rounded-xl" />
          </div>
        </div>
        <div className="card-static p-6">
          <div className="skeleton h-6 w-40 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="skeleton h-10 w-full" />
            ))}
          </div>
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

  const successRate =
    data.totalCalls > 0
      ? (
          ((data.totalCalls - data.totalErrors) / data.totalCalls) *
          100
        ).toFixed(1)
      : "0";

  const summaryCards = [
    {
      label: 'קריאות API סה"כ',
      value: data.totalCalls.toLocaleString(),
      icon: "\uD83D\uDD25",
      gradient: "linear-gradient(135deg, #D4A843, #C49A38)",
    },
    {
      label: "שגיאות",
      value: data.totalErrors.toLocaleString(),
      icon: "\uD83D\uDEA8",
      gradient: "linear-gradient(135deg, #FB7185, #E11D48)",
    },
    {
      label: "אחוז הצלחה",
      value: `${successRate}%`,
      icon: "\u2705",
      gradient: "linear-gradient(135deg, #34D399, #10B981)",
    },
    {
      label: "אנדפוינטים פעילים",
      value: data.endpointStats.length.toString(),
      icon: "\uD83D\uDD17",
      gradient: "linear-gradient(135deg, #818CF8, #6366F1)",
    },
  ];

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-in">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            אנליטיקס
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            ניטור ביצועי API ושימוש במערכת
          </p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[10px] p-1">
          {[
            { days: 7, label: "7 ימים" },
            { days: 30, label: "30 ימים" },
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card, i) => (
          <div
            key={i}
            className={`card-elevated p-5 animate-in delay-${i + 1}`}
            style={{ cursor: "default" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl"
              style={{ background: card.gradient }}
            >
              {card.icon}
            </div>
            <div className="text-2xl font-black text-[var(--text-primary)]">
              {card.value}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* API Calls Over Time - Area Chart */}
        <div className="card-elevated p-6 animate-in delay-5">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            קריאות API לאורך זמן
          </h2>
          {data.dailyStats.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm py-12 text-center">
              אין נתונים לתקופה זו
            </p>
          ) : (
            <div style={{ width: "100%", height: 300, direction: "ltr" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailyStats}>
                  <defs>
                    <linearGradient
                      id="colorCalls"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#D4A843"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#D4A843"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="colorErrors"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#EF4444"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#EF4444"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--card-border)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                    tickFormatter={(val: string) => {
                      const d = new Date(val);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(val) =>
                      new Date(String(val)).toLocaleDateString("he-IL")
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="calls"
                    name="קריאות"
                    stroke="#D4A843"
                    fillOpacity={1}
                    fill="url(#colorCalls)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="errors"
                    name="שגיאות"
                    stroke="#EF4444"
                    fillOpacity={1}
                    fill="url(#colorErrors)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Endpoint Breakdown - Bar Chart */}
        <div className="card-elevated p-6 animate-in delay-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            חלוקה לפי אנדפוינט
          </h2>
          {data.endpointStats.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm py-12 text-center">
              אין נתונים לתקופה זו
            </p>
          ) : (
            <div style={{ width: "100%", height: 300, direction: "ltr" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.endpointStats.slice(0, 8)}
                  layout="vertical"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--card-border)"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="endpoint"
                    width={120}
                    tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
                    tickFormatter={(val: string) => {
                      const parts = val.split("/").filter(Boolean);
                      return parts.length > 1
                        ? `/${parts[parts.length - 1]}`
                        : val;
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                  />
                  <Bar
                    dataKey="calls"
                    name="קריאות"
                    fill="#D4A843"
                    radius={[0, 6, 6, 0]}
                  />
                  <Bar
                    dataKey="errors"
                    name="שגיאות"
                    fill="#EF4444"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Users Table */}
      <div className="card-elevated p-6 mb-8 animate-in delay-7">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          משתמשים מובילים
        </h2>
        {data.topUsers.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">אין נתונים</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-right"
                  style={{ borderBottom: "2px solid var(--card-border)" }}
                >
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    #
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    משתמש
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    קריאות
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    אחוז מסה&quot;כ
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((user, i) => (
                  <tr
                    key={user.userId}
                    style={{
                      borderBottom: "1px solid var(--card-border)",
                    }}
                    className="hover:bg-[var(--gold-soft)] transition-colors"
                  >
                    <td className="py-3 pr-2 text-[var(--text-muted)] font-medium">
                      {i + 1}
                    </td>
                    <td className="py-3 pr-2 text-[var(--text-primary)] font-medium">
                      {user.email}
                    </td>
                    <td className="py-3 pr-2 text-[var(--text-secondary)]">
                      {user.calls.toLocaleString()}
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              (user.calls / data.totalCalls) * 100,
                              100,
                            )}%`,
                            minWidth: "4px",
                            maxWidth: "120px",
                            background:
                              "linear-gradient(135deg, #D4A843, #C49A38)",
                          }}
                        />
                        <span className="text-xs text-[var(--text-muted)]">
                          {(
                            (user.calls / data.totalCalls) *
                            100
                          ).toFixed(1)}
                          %
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

      {/* Recent Errors */}
      <div className="card-elevated p-6 animate-in delay-8">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          שגיאות אחרונות
        </h2>
        {data.recentErrors.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">
            אין שגיאות בתקופה זו
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-right"
                  style={{ borderBottom: "2px solid var(--card-border)" }}
                >
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    תאריך
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    אנדפוינט
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    משתמש
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    שגיאה
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentErrors.slice(0, 10).map((err, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid var(--card-border)",
                    }}
                  >
                    <td className="py-3 pr-2 text-[var(--text-muted)] text-xs">
                      {new Date(err.createdAt).toLocaleDateString("he-IL")}{" "}
                      {new Date(err.createdAt).toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 pr-2 text-[var(--text-primary)] font-mono text-xs">
                      {err.endpoint}
                    </td>
                    <td className="py-3 pr-2 text-[var(--text-secondary)] text-xs">
                      {err.email}
                    </td>
                    <td className="py-3 pr-2 text-red-500 text-xs max-w-[200px] truncate">
                      {err.errorMessage || "Unknown error"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
