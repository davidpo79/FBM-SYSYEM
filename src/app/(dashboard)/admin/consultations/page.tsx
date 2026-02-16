"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admin";

interface Consultation {
  id: string;
  user_id: string;
  userName: string;
  userEmail: string;
  transaction_id: string | null;
  amount: number;
  status: "pending" | "scheduled" | "completed" | "cancelled";
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS = ["pending", "scheduled", "completed", "cancelled"] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתין",
  scheduled: "נקבע",
  completed: "הושלם",
  cancelled: "בוטל",
};

function getStatusStyle(status: string) {
  switch (status) {
    case "completed":
      return { backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#22C55E" };
    case "scheduled":
      return { backgroundColor: "rgba(99, 102, 241, 0.15)", color: "#818CF8" };
    case "cancelled":
      return { backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#EF4444" };
    default:
      return { backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#F59E0B" };
  }
}

export default function AdminConsultationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const admin = await isAdmin();
      if (!admin) {
        router.replace("/dashboard");
        return;
      }
      await loadConsultations();
    }
    init();
  }, [router]);

  async function loadConsultations() {
    try {
      const res = await fetch("/api/admin/consultations");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setConsultations(data.consultations || []);
    } catch {
      setError("שגיאה בטעינת נתוני ייעוצים");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/consultations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadConsultations();
    } catch {
      alert("שגיאה בעדכון סטטוס");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSchedule(id: string) {
    const dateStr = window.prompt("הזן תאריך ושעה (YYYY-MM-DD HH:MM):", "");
    if (!dateStr) return;

    setActionLoading(id);
    try {
      const scheduledDate = new Date(dateStr).toISOString();
      const res = await fetch("/api/admin/consultations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "scheduled", scheduled_date: scheduledDate }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadConsultations();
    } catch {
      alert("שגיאה בקביעת תאריך");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddNotes(id: string) {
    const existing = consultations.find((c) => c.id === id)?.notes || "";
    const notes = window.prompt("הערות:", existing);
    if (notes === null) return;

    setActionLoading(id);
    try {
      const res = await fetch("/api/admin/consultations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
      });
      if (!res.ok) throw new Error("Failed");
      await loadConsultations();
    } catch {
      alert("שגיאה בשמירת הערות");
    } finally {
      setActionLoading(null);
    }
  }

  // Filter
  let filtered = consultations;
  if (filter !== "all") {
    filtered = filtered.filter((c) => c.status === filter);
  }

  // Stats
  const statusCounts = consultations.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = consultations
    .filter((c) => c.status !== "cancelled")
    .reduce((sum, c) => sum + Number(c.amount), 0);

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
          שעות ייעוץ
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          ניהול שעות ייעוץ שנרכשו
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card-elevated p-5 animate-in delay-1">
          <div className="text-2xl font-black text-[var(--text-primary)]">
            {consultations.length}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">סה&quot;כ ייעוצים</div>
        </div>
        <div className="card-elevated p-5 animate-in delay-2">
          <div className="text-2xl font-black" style={{ color: "#F59E0B" }}>
            {statusCounts["pending"] || 0}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">ממתינים</div>
        </div>
        <div className="card-elevated p-5 animate-in delay-3">
          <div className="text-2xl font-black" style={{ color: "#818CF8" }}>
            {statusCounts["scheduled"] || 0}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">נקבעו</div>
        </div>
        <div className="card-elevated p-5 animate-in delay-4">
          <div className="text-2xl font-black" style={{ color: "#22C55E" }}>
            {totalRevenue.toLocaleString()}&#8362;
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">הכנסות ייעוץ</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-elevated p-4 mb-6 animate-in delay-5">
        <div className="flex gap-2 flex-wrap">
          {["all", ...STATUS_OPTIONS].map((f) => (
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
              {f === "all" ? "הכל" : STATUS_LABELS[f] || f}
              {f !== "all" && statusCounts[f] ? ` (${statusCounts[f]})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Consultations Table */}
      <div className="card-elevated p-6 animate-in delay-6">
        {filtered.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm text-center py-8">
            {consultations.length === 0 ? "עוד אין שעות ייעוץ שנרכשו" : "לא נמצאו תוצאות"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--card-border)" }}>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">תאריך רכישה</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">לקוח</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">סכום</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">סטטוס</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">תאריך מתוכנן</th>
                  <th className="pb-3 pr-2 text-right font-semibold text-[var(--text-secondary)]">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <td className="py-3 pr-2 text-[var(--text-secondary)] text-xs">
                      {new Date(c.created_at).toLocaleDateString("he-IL")}
                    </td>
                    <td className="py-3 pr-2">
                      <div className="text-[var(--text-primary)] font-medium text-sm">
                        {c.userName || "—"}
                      </div>
                      <div className="text-[var(--text-muted)] text-xs font-mono">
                        {c.userEmail}
                      </div>
                    </td>
                    <td className="py-3 pr-2 text-[var(--text-secondary)]">
                      {Number(c.amount).toLocaleString()}&#8362;
                    </td>
                    <td className="py-3 pr-2">
                      <span
                        className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full"
                        style={getStatusStyle(c.status)}
                      >
                        {STATUS_LABELS[c.status] || c.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-[var(--text-secondary)] text-xs">
                      {c.scheduled_date
                        ? new Date(c.scheduled_date).toLocaleString("he-IL", {
                            day: "numeric",
                            month: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={c.status}
                          onChange={(e) => handleStatusChange(c.id, e.target.value)}
                          disabled={actionLoading === c.id}
                          className="text-xs px-2 py-1.5 rounded-lg cursor-pointer"
                          style={{
                            backgroundColor: "var(--content-bg)",
                            border: "1px solid var(--card-border)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                        {c.status === "pending" && (
                          <button
                            onClick={() => handleSchedule(c.id)}
                            disabled={actionLoading === c.id}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-medium cursor-pointer transition-all disabled:opacity-50"
                            style={{
                              backgroundColor: "rgba(99, 102, 241, 0.1)",
                              color: "#818CF8",
                              border: "1px solid rgba(99, 102, 241, 0.3)",
                            }}
                          >
                            {actionLoading === c.id ? "..." : "קבע תאריך"}
                          </button>
                        )}
                        <button
                          onClick={() => handleAddNotes(c.id)}
                          disabled={actionLoading === c.id}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-medium cursor-pointer transition-all disabled:opacity-50"
                          style={{
                            backgroundColor: "var(--content-bg)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--card-border)",
                          }}
                        >
                          {c.notes ? "ערוך הערות" : "הוסף הערות"}
                        </button>
                      </div>
                      {c.notes && (
                        <p className="text-[10px] text-[var(--text-muted)] mt-1 max-w-[200px] truncate">
                          {c.notes}
                        </p>
                      )}
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
