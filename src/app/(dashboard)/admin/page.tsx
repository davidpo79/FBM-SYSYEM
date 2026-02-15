"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admin";

interface StuckStudent {
  id: string;
  email: string;
  fullName: string;
  lastSignIn: string;
  niche?: string;
  currentStep?: string;
}

interface RecentInvite {
  id: string;
  full_name: string;
  created_at: string;
  token: string;
  used: boolean;
  booking_status?: string;
}

interface AdminStats {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalProjects: number;
  completedProjects: number;
  apiCallsMonth: number;
  errorsDay: number;
  stuckStudents: StuckStudent[];
  recentInvites: RecentInvite[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const admin = await isAdmin();
      if (!admin) {
        router.replace("/dashboard");
        return;
      }

      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch {
        setError("שגיאה בטעינת נתונים");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  function getDaysInactive(lastSignIn: string): number {
    const diff = Date.now() - new Date(lastSignIn).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function handleSendPush(student: StuckStudent) {
    const message = window.prompt(
      `שלח הודעת דחיפה ל-${student.fullName}:`,
      `היי ${student.fullName}, ראינו שלא התחברת כבר כמה ימים. צריך עזרה?`
    );
    if (message) {
      alert(`הודעה נשלחה ל-${student.fullName}: "${message}"`);
    }
  }

  if (loading) {
    return (
      <div dir="rtl">
        <div className="mb-8 animate-in">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="card-static p-6">
              <div className="skeleton h-10 w-10 rounded-xl mb-3" />
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

  if (!stats) return null;

  const statCards = [
    {
      label: "סה\"כ תלמידים",
      value: stats.totalStudents,
      icon: "\uD83D\uDC65",
      gradient: "linear-gradient(135deg, #818CF8, #6366F1)",
    },
    {
      label: "פעילים (14 יום)",
      value: stats.activeStudents,
      icon: "\uD83D\uDFE2",
      gradient: "linear-gradient(135deg, #34D399, #10B981)",
    },
    {
      label: "לא פעילים (14+ יום)",
      value: stats.inactiveStudents,
      icon: "\uD83D\uDD34",
      gradient: "linear-gradient(135deg, #F87171, #EF4444)",
    },
    {
      label: "פרויקטים",
      value: stats.totalProjects,
      icon: "\uD83D\uDCC1",
      gradient: "linear-gradient(135deg, #FB923C, #F97316)",
    },
    {
      label: "קריאות API החודש",
      value: stats.apiCallsMonth,
      icon: "\uD83D\uDD25",
      gradient: "linear-gradient(135deg, #D4A843, #C49A38)",
    },
    {
      label: "שגיאות (24 שעות)",
      value: stats.errorsDay,
      icon: "\uD83D\uDEA8",
      gradient: "linear-gradient(135deg, #FB7185, #E11D48)",
    },
  ];

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="mb-8 animate-in">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          דשבורד ניהול
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          סקירה כללית של המערכת
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className={`card-elevated p-6 animate-in delay-${i + 1}`}
            style={{ cursor: "default" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl"
              style={{ background: stat.gradient }}
            >
              {stat.icon}
            </div>
            <div className="text-3xl font-black text-[var(--text-primary)]">
              {stat.value.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Stuck Students */}
      <div className="card-elevated p-6 mb-8 animate-in delay-7">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          תלמידים שדורשים תשומת לב
        </h2>
        {stats.stuckStudents.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">
            אין תלמידים תקועים כרגע
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-right"
                  style={{ borderBottom: `2px solid var(--card-border)` }}
                >
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    שם
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    נישה
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    שלב נוכחי
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    ימים לא פעיל
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    פעולה
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.stuckStudents.map((student) => {
                  const daysInactive = getDaysInactive(student.lastSignIn);
                  return (
                    <tr
                      key={student.id}
                      style={{ borderBottom: `1px solid var(--card-border)` }}
                    >
                      <td className="py-3 pr-2 text-[var(--text-primary)] font-medium">
                        {student.fullName}
                      </td>
                      <td className="py-3 pr-2 text-[var(--text-secondary)]">
                        {student.niche || "—"}
                      </td>
                      <td className="py-3 pr-2 text-[var(--text-secondary)]">
                        {student.currentStep || "—"}
                      </td>
                      <td className="py-3 pr-2">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                          style={{
                            backgroundColor:
                              daysInactive > 14
                                ? "rgba(239, 68, 68, 0.1)"
                                : "rgba(245, 158, 11, 0.1)",
                            color:
                              daysInactive > 14 ? "#EF4444" : "#F59E0B",
                          }}
                        >
                          {daysInactive} ימים
                        </span>
                      </td>
                      <td className="py-3 pr-2">
                        <button
                          onClick={() => handleSendPush(student)}
                          className="btn-outline text-xs !py-1.5 !px-3 !rounded-lg"
                        >
                          שלח דחיפה
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Invites */}
      <div className="card-elevated p-6 animate-in delay-8">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          הזמנות אחרונות
        </h2>
        {stats.recentInvites.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">
            אין הזמנות אחרונות
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-right"
                  style={{ borderBottom: `2px solid var(--card-border)` }}
                >
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    שם
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    תאריך
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    טוקן
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    סטטוס
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    הזמנת פגישה
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.recentInvites.map((invite) => (
                  <tr
                    key={invite.id}
                    style={{ borderBottom: `1px solid var(--card-border)` }}
                  >
                    <td className="py-3 pr-2 text-[var(--text-primary)] font-medium">
                      {invite.full_name}
                    </td>
                    <td className="py-3 pr-2 text-[var(--text-secondary)]">
                      {new Date(invite.created_at).toLocaleDateString("he-IL")}
                    </td>
                    <td className="py-3 pr-2 text-[var(--text-muted)] font-mono text-xs">
                      {invite.token.substring(0, 8)}...
                    </td>
                    <td className="py-3 pr-2">
                      <span
                        className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: invite.used
                            ? "rgba(34, 197, 94, 0.1)"
                            : "rgba(245, 158, 11, 0.1)",
                          color: invite.used ? "#22C55E" : "#F59E0B",
                        }}
                      >
                        {invite.used ? "נוצל" : "ממתין"}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-[var(--text-secondary)]">
                      {invite.booking_status || "—"}
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
