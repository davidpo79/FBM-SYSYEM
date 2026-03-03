"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import InviteStudentModal from "@/components/admin/InviteStudentModal";
import SendMessageModal from "@/components/admin/SendMessageModal";

interface Student {
  id: string;
  email: string;
  fullName: string;
  niche: string;
  currentStep: string;
  totalSteps: number;
  stepNumber: number;
  lastLogin: string;
  status: "active" | "at_risk" | "inactive";
  plan: string;
  trialDays: number;
  trialDaysLeft: number | null;
}

function getPlanBadge(plan: string, daysLeft: number | null): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (plan) {
    case "premium":
      return { label: "פרימיום", color: "#9333EA", bgColor: "rgba(147, 51, 234, 0.1)" };
    case "standard":
      return { label: "סטנדרט", color: "#2563EB", bgColor: "rgba(37, 99, 235, 0.1)" };
    case "expired":
      return { label: "פג תוקף", color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.1)" };
    case "trial":
    default:
      if (daysLeft !== null && daysLeft <= 3) {
        return { label: `ניסיון (${daysLeft} ימים)`, color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.1)" };
      }
      return { label: daysLeft !== null ? `ניסיון (${daysLeft} ימים)` : "ניסיון", color: "#10B981", bgColor: "rgba(16, 185, 129, 0.1)" };
  }
}

function getStatusInfo(lastLogin: string): {
  status: "active" | "at_risk" | "inactive";
  label: string;
  icon: string;
  color: string;
  bgColor: string;
} {
  const daysSinceLogin = Math.floor(
    (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLogin < 7) {
    return {
      status: "active",
      label: "פעיל",
      icon: "\uD83D\uDFE2",
      color: "#22C55E",
      bgColor: "rgba(34, 197, 94, 0.1)",
    };
  } else if (daysSinceLogin < 14) {
    return {
      status: "at_risk",
      label: "בסיכון",
      icon: "\uD83D\uDFE1",
      color: "#F59E0B",
      bgColor: "rgba(245, 158, 11, 0.1)",
    };
  } else {
    return {
      status: "inactive",
      label: "לא פעיל",
      icon: "\uD83D\uDD34",
      color: "#EF4444",
      bgColor: "rgba(239, 68, 68, 0.1)",
    };
  }
}

export default function StudentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nicheFilter, setNicheFilter] = useState("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [messageModal, setMessageModal] = useState<{
    open: boolean;
    studentName: string;
    userId: string;
  }>({ open: false, studentName: "", userId: "" });
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [resetResult, setResetResult] = useState<{
    userId: string;
    link: string;
    email: string;
    emailSent: boolean;
  } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [extendOpen, setExtendOpen] = useState<string | null>(null);
  const [extendLoading, setExtendLoading] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const admin = await isAdmin();
      if (!admin) {
        router.replace("/dashboard");
        return;
      }
      fetchStudents();
    }
    init();
  }, [router]);

  async function fetchStudents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (nicheFilter !== "all") params.set("niche", nicheFilter);

      const res = await fetch(`/api/admin/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setStudents(data.students || []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, nicheFilter]);

  async function handleResetPassword(userId: string, studentName: string) {
    if (!confirm(`לשלוח איפוס סיסמה ל-${studentName}?`)) return;
    setResetLoading(userId);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setResetResult({ userId, link: data.resetLink || "", email: data.email, emailSent: false });
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה בשליחת איפוס סיסמה");
    } finally {
      setResetLoading(null);
    }
  }

  async function handleSendResetEmail(userId: string) {
    setSendingEmail(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sendEmail: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      if (data.emailSent) {
        setResetResult((prev) => prev ? { ...prev, emailSent: true } : prev);
      } else {
        alert("לא הצלחנו לשלוח את המייל. ודא ש-RESEND_API_KEY מוגדר.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה בשליחת מייל");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleExtendTrial(userId: string, extraDays: number) {
    setExtendLoading(userId);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "extend-trial", extraDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      // Update locally
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== userId) return s;
          const newTrialDays = s.trialDays + extraDays;
          const newDaysLeft = (s.trialDaysLeft ?? 0) + extraDays;
          return {
            ...s,
            plan: s.plan === "expired" ? "trial" : s.plan,
            trialDays: newTrialDays,
            trialDaysLeft: newDaysLeft,
          };
        })
      );
      setExtendOpen(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה בהארכת ניסיון");
    } finally {
      setExtendLoading(null);
    }
  }

  const uniqueNiches = Array.from(
    new Set(students.map((s) => s.niche).filter(Boolean))
  );

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-in">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            ניהול תלמידים
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {students.length} תלמידים במערכת
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-gold text-sm !py-2.5 !px-5"
        >
          + הזמן תלמיד חדש
        </button>
      </div>

      {/* Filters */}
      <div className="card-elevated p-4 mb-6 animate-in delay-1">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם או אימייל..."
              className="w-full px-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] outline-none transition-colors"
              style={{
                border: "1.5px solid var(--card-border)",
                backgroundColor: "var(--content-bg)",
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] outline-none cursor-pointer"
            style={{
              border: "1.5px solid var(--card-border)",
              backgroundColor: "var(--content-bg)",
            }}
          >
            <option value="all">כל הסטטוסים</option>
            <option value="active">פעילים</option>
            <option value="at_risk">בסיכון</option>
            <option value="inactive">לא פעילים</option>
          </select>

          {/* Niche Filter */}
          <select
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] outline-none cursor-pointer"
            style={{
              border: "1.5px solid var(--card-border)",
              backgroundColor: "var(--content-bg)",
            }}
          >
            <option value="all">כל הנישות</option>
            {uniqueNiches.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="card-elevated p-6 animate-in delay-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex gap-4 items-center">
                <div className="skeleton h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)] text-lg mb-2">
              לא נמצאו תלמידים
            </p>
            <p className="text-[var(--text-muted)] text-sm">
              נסה לשנות את הפילטרים או להזמין תלמיד חדש
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-right"
                  style={{ borderBottom: "2px solid var(--card-border)" }}
                >
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    שם
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    אימייל
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    נישה
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    שלב
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    סטטוס
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    תוכנית
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    התחברות אחרונה
                  </th>
                  <th className="pb-3 pr-2 font-semibold text-[var(--text-secondary)]">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const statusInfo = getStatusInfo(student.lastLogin);
                  return (
                    <tr
                      key={student.id}
                      style={{
                        borderBottom: "1px solid var(--card-border)",
                      }}
                      className="hover:bg-[var(--gold-soft)] transition-colors"
                    >
                      <td className="py-3 pr-2 text-[var(--text-primary)] font-medium">
                        {student.fullName}
                      </td>
                      <td className="py-3 pr-2 text-[var(--text-secondary)]">
                        {student.email}
                      </td>
                      <td className="py-3 pr-2 text-[var(--text-secondary)]">
                        {student.niche || "—"}
                      </td>
                      <td className="py-3 pr-2 text-[var(--text-secondary)]">
                        {student.stepNumber}/{student.totalSteps}{" "}
                        {student.currentStep}
                      </td>
                      <td className="py-3 pr-2">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: statusInfo.bgColor,
                            color: statusInfo.color,
                          }}
                        >
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap"
                            style={{
                              backgroundColor: getPlanBadge(student.plan, student.trialDaysLeft).bgColor,
                              color: getPlanBadge(student.plan, student.trialDaysLeft).color,
                            }}
                          >
                            {getPlanBadge(student.plan, student.trialDaysLeft).label}
                          </span>
                          {(student.plan === "trial" || student.plan === "expired") && (
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setExtendOpen(extendOpen === student.id ? null : student.id)
                                }
                                className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors text-xs font-bold"
                                style={{
                                  backgroundColor: "var(--gold-soft)",
                                  color: "var(--gold)",
                                  border: "1px solid var(--gold)",
                                }}
                                title="הארך ניסיון"
                              >
                                +
                              </button>
                              {extendOpen === student.id && (
                                <div
                                  className="absolute top-full mt-1 right-0 z-50 rounded-xl shadow-lg p-2 min-w-[140px]"
                                  style={{
                                    backgroundColor: "var(--card-bg)",
                                    border: "1px solid var(--card-border)",
                                  }}
                                >
                                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-2 px-1">
                                    הארך ניסיון ב:
                                  </p>
                                  {[7, 14, 30].map((days) => (
                                    <button
                                      key={days}
                                      onClick={() => handleExtendTrial(student.id, days)}
                                      disabled={extendLoading === student.id}
                                      className="w-full text-right px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors hover:bg-[var(--gold-soft)] text-[var(--text-primary)] disabled:opacity-50"
                                    >
                                      {extendLoading === student.id ? "..." : `+${days} ימים`}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-2 text-[var(--text-muted)] text-xs">
                        {new Date(student.lastLogin).toLocaleDateString(
                          "he-IL"
                        )}
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/students/${student.id}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--gold-soft)]"
                            title="צפה בפרופיל"
                          >
                            <span role="img" aria-label="view">
                              {"\uD83D\uDC41"}
                            </span>
                          </Link>
                          <button
                            onClick={() =>
                              setMessageModal({
                                open: true,
                                studentName: student.fullName,
                                userId: student.id,
                              })
                            }
                            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--gold-soft)]"
                            title="שלח הודעה"
                          >
                            <span role="img" aria-label="message">
                              {"\u2709"}
                            </span>
                          </button>
                          <button
                            onClick={() =>
                              handleResetPassword(student.id, student.fullName)
                            }
                            disabled={resetLoading === student.id}
                            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--gold-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
                            title="איפוס סיסמה"
                          >
                            {resetLoading === student.id ? (
                              <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin inline-block" />
                            ) : (
                              <span role="img" aria-label="reset password">
                                {"\uD83D\uDD11"}
                              </span>
                            )}
                          </button>
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

      {/* Reset Password Result Modal */}
      {resetResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-xl"
            style={{
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">
              {"\uD83D\uDD11"} קישור איפוס סיסמה
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              קישור איפוס נוצר עבור <strong>{resetResult.email}</strong>
            </p>

            {resetResult.link ? (
              <div className="mb-4">
                <div
                  className="p-3 rounded-lg text-xs break-all"
                  dir="ltr"
                  style={{
                    backgroundColor: "var(--gold-soft)",
                    border: "1px solid var(--gold)",
                    color: "var(--text-primary)",
                  }}
                >
                  {resetResult.link}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resetResult.link);
                      alert("הקישור הועתק!");
                    }}
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-lg cursor-pointer transition-colors"
                    style={{
                      backgroundColor: "var(--gold)",
                      color: "#000",
                    }}
                  >
                    העתק קישור
                  </button>
                  <button
                    onClick={() => {
                      const text = `היי, הנה קישור לאיפוס הסיסמה שלך ב-FBM Studio:\n${resetResult.link}`;
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(text)}`,
                        "_blank"
                      );
                    }}
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-lg cursor-pointer transition-colors bg-green-500 hover:bg-green-600 text-white"
                  >
                    שלח בוואטסאפ
                  </button>
                </div>
                <button
                  onClick={() => handleSendResetEmail(resetResult.userId)}
                  disabled={sendingEmail || resetResult.emailSent}
                  className="w-full mt-2 py-2 px-3 text-sm font-medium rounded-lg cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: resetResult.emailSent ? "#10B981" : "#2563EB",
                    color: "#fff",
                  }}
                >
                  {sendingEmail
                    ? "שולח..."
                    : resetResult.emailSent
                      ? "נשלח בהצלחה!"
                      : "שלח מייל ממותג למשתמש"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                אימייל איפוס סיסמה נשלח ל-{resetResult.email}
              </p>
            )}

            <p className="text-xs text-[var(--text-muted)] mb-4">
              * הסיסמאות מוצפנות במערכת ולא ניתן לצפות בהן. המשתמש יבחר סיסמה חדשה דרך הקישור.
            </p>

            <button
              onClick={() => setResetResult(null)}
              className="w-full py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors text-[var(--text-secondary)] hover:bg-[var(--gold-soft)]"
              style={{ border: "1px solid var(--card-border)" }}
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <InviteStudentModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
      <SendMessageModal
        isOpen={messageModal.open}
        onClose={() =>
          setMessageModal({ open: false, studentName: "", userId: "" })
        }
        studentName={messageModal.studentName}
        userId={messageModal.userId}
      />
    </div>
  );
}
