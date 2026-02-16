"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { PLAN_LABELS } from "@/lib/plan-limits";

interface Subscription {
  userId: string;
  fullName: string;
  email: string;
  plan: string;
  trialStart: string | null;
  trialDays: number;
  subscriptionStatus: string;
  planPrice: number;
  hasSumitId: boolean;
}

const PLAN_OPTIONS = ["trial", "standard", "premium", "coaching"];

export default function AdminSubscriptionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const admin = await isAdmin();
      if (!admin) {
        router.replace("/dashboard");
        return;
      }
      await loadSubscriptions();
    }
    init();
  }, [router]);

  async function loadSubscriptions() {
    try {
      const res = await fetch("/api/admin/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch {
      setError("שגיאה בטעינת נתוני מנויים");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePlan(userId: string, newPlan: string) {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "change-plan", plan: newPlan }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadSubscriptions();
    } catch {
      alert("שגיאה בעדכון תוכנית");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExtendTrial(userId: string) {
    const days = window.prompt("כמה ימים להוסיף?", "7");
    if (!days) return;
    const extraDays = parseInt(days);
    if (isNaN(extraDays) || extraDays <= 0) return;

    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "extend-trial", extraDays }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadSubscriptions();
    } catch {
      alert("שגיאה בהארכת ניסיון");
    } finally {
      setActionLoading(null);
    }
  }

  function getTrialDaysLeft(sub: Subscription): number | null {
    if (sub.plan !== "trial" || !sub.trialStart) return null;
    const start = new Date(sub.trialStart);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, sub.trialDays - diff);
  }

  function getPlanBadgeStyle(plan: string) {
    switch (plan) {
      case "premium":
        return { backgroundColor: "rgba(212, 168, 67, 0.15)", color: "#D4A843" };
      case "standard":
        return { backgroundColor: "rgba(99, 102, 241, 0.15)", color: "#818CF8" };
      case "coaching":
        return { backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#22C55E" };
      case "expired":
        return { backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#EF4444" };
      default:
        return { backgroundColor: "rgba(156, 163, 175, 0.15)", color: "#9CA3AF" };
    }
  }

  // Filter and search
  let filtered = subscriptions;
  if (filter !== "all") {
    filtered = filtered.filter((s) => s.plan === filter);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }

  // Stats
  const planCounts = subscriptions.reduce<Record<string, number>>((acc, s) => {
    acc[s.plan] = (acc[s.plan] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = subscriptions
    .filter((s) => s.subscriptionStatus === "active")
    .reduce((sum, s) => sum + s.planPrice, 0);

  if (loading) {
    return (
      <div dir="rtl">
        <div className="mb-8 animate-in">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="card-static p-6">
              <div className="skeleton h-8 w-16 mb-1" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
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

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="mb-8 animate-in">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          מנויים ותשלומים
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          ניהול תוכניות משתמשים ומנויים
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card-elevated p-5 animate-in delay-1">
          <div className="text-2xl font-black text-[var(--text-primary)]">
            {subscriptions.length}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">סה&quot;כ משתמשים</div>
        </div>
        <div className="card-elevated p-5 animate-in delay-2">
          <div className="text-2xl font-black" style={{ color: "#22C55E" }}>
            {(planCounts["standard"] || 0) + (planCounts["premium"] || 0)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">מנויים פעילים</div>
        </div>
        <div className="card-elevated p-5 animate-in delay-3">
          <div className="text-2xl font-black" style={{ color: "#F59E0B" }}>
            {planCounts["trial"] || 0}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">בניסיון</div>
        </div>
        <div className="card-elevated p-5 animate-in delay-4">
          <div className="text-2xl font-black" style={{ color: "#D4A843" }}>
            {totalRevenue.toLocaleString()}₪
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">הכנסה חודשית</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-elevated p-4 mb-6 animate-in delay-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="חיפוש לפי שם או אימייל..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--content-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
          <div className="flex gap-2 flex-wrap">
            {["all", "trial", "standard", "premium", "expired", "coaching"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all"
                style={{
                  backgroundColor: filter === f ? "var(--gold)" : "var(--content-bg)",
                  color: filter === f ? "#0F1117" : "var(--text-secondary)",
                  border: `1px solid ${filter === f ? "var(--gold)" : "var(--card-border)"}`,
                }}
              >
                {f === "all" ? "הכל" : PLAN_LABELS[f] || f}
                {f !== "all" && planCounts[f] ? ` (${planCounts[f]})` : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="card-elevated p-6 animate-in delay-6">
        {filtered.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm text-center py-8">
            לא נמצאו תוצאות
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--card-border)" }}>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">שם</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">אימייל</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">תוכנית</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">סטטוס</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">מחיר</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => {
                  const daysLeft = getTrialDaysLeft(sub);
                  return (
                    <tr key={sub.userId} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td className="py-3 pr-2 text-[var(--text-primary)] font-medium">
                        {sub.fullName || "—"}
                      </td>
                      <td className="py-3 pr-2 text-[var(--text-secondary)] text-xs font-mono">
                        {sub.email}
                      </td>
                      <td className="py-3 pr-2">
                        <span
                          className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full"
                          style={getPlanBadgeStyle(sub.plan)}
                        >
                          {PLAN_LABELS[sub.plan] || sub.plan}
                        </span>
                        {daysLeft !== null && (
                          <span className="text-[10px] text-[var(--text-muted)] mr-2">
                            ({daysLeft} ימים)
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-2">
                        <span
                          className="inline-flex items-center text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor:
                              sub.subscriptionStatus === "active"
                                ? "rgba(34, 197, 94, 0.1)"
                                : "rgba(156, 163, 175, 0.1)",
                            color:
                              sub.subscriptionStatus === "active"
                                ? "#22C55E"
                                : "#9CA3AF",
                          }}
                        >
                          {sub.subscriptionStatus === "active" ? "פעיל" : sub.subscriptionStatus === "none" ? "—" : sub.subscriptionStatus}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-[var(--text-secondary)]">
                        {sub.planPrice > 0 ? `${sub.planPrice}₪` : "—"}
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={sub.plan}
                            onChange={(e) => handleChangePlan(sub.userId, e.target.value)}
                            disabled={actionLoading === sub.userId}
                            className="text-xs px-2 py-1.5 rounded-lg cursor-pointer"
                            style={{
                              backgroundColor: "var(--content-bg)",
                              border: "1px solid var(--card-border)",
                              color: "var(--text-primary)",
                            }}
                          >
                            {PLAN_OPTIONS.map((p) => (
                              <option key={p} value={p}>
                                {PLAN_LABELS[p] || p}
                              </option>
                            ))}
                          </select>
                          {(sub.plan === "trial" || sub.plan === "expired") && (
                            <button
                              onClick={() => handleExtendTrial(sub.userId)}
                              disabled={actionLoading === sub.userId}
                              className="text-xs px-2.5 py-1.5 rounded-lg font-medium cursor-pointer transition-all disabled:opacity-50"
                              style={{
                                backgroundColor: "rgba(245, 158, 11, 0.1)",
                                color: "#F59E0B",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                              }}
                            >
                              {actionLoading === sub.userId ? "..." : "הארך ניסיון"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
