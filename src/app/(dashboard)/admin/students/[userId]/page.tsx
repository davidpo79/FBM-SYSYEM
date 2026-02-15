"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import SendMessageModal from "@/components/admin/SendMessageModal";

interface ProjectInfo {
  id: string;
  name: string;
  pipelineStep: string;
  stepNumber: number;
  totalSteps: number;
}

interface OutputInfo {
  strategyWordCount: number;
  niche: string;
  scriptsCount: number;
  creativesCount: number;
  strategyPreview?: string;
  scriptsPreview?: string;
}

interface ApiUsage {
  totalCalls: number;
  errors: number;
  estimatedCost: number;
}

interface StudentDetail {
  id: string;
  email: string;
  fullName: string;
  avatarLetter: string;
  registeredAt: string;
  lastLogin: string;
  projects: ProjectInfo[];
  pipelineSteps: {
    name: string;
    label: string;
    status: "completed" | "current" | "future";
  }[];
  outputs: OutputInfo;
  apiUsage: ApiUsage;
}

const PIPELINE_STEPS = [
  { name: "strategy", label: "אסטרטגיה" },
  { name: "niches", label: "נישות" },
  { name: "pains", label: "כאבים" },
  { name: "scripts", label: "תסריטים" },
  { name: "creative", label: "קריאייטיב" },
  { name: "album", label: "אלבום" },
];

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [outputModal, setOutputModal] = useState<{
    open: boolean;
    title: string;
    content: string;
  }>({ open: false, title: "", content: "" });

  useEffect(() => {
    async function init() {
      const admin = await isAdmin();
      if (!admin) {
        router.replace("/dashboard");
        return;
      }

      try {
        const res = await fetch(`/api/admin/students/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch student");
        const data = await res.json();
        setStudent(data);
      } catch {
        setError("שגיאה בטעינת פרטי התלמיד");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, userId]);

  if (loading) {
    return (
      <div dir="rtl">
        <div className="mb-6 animate-in">
          <div className="skeleton h-4 w-32 mb-6" />
          <div className="card-static p-6 flex items-center gap-4">
            <div className="skeleton h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-6 w-48" />
              <div className="skeleton h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div dir="rtl" className="text-center py-20">
        <p className="text-red-500 text-lg mb-4">
          {error || "תלמיד לא נמצא"}
        </p>
        <Link
          href="/admin/students"
          className="text-[var(--gold)] hover:underline"
        >
          חזור לרשימת תלמידים
        </Link>
      </div>
    );
  }

  return (
    <div dir="rtl">
      {/* Back Button */}
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors mb-6 animate-in"
      >
        <span>&larr;</span>
        <span>חזור לרשימת תלמידים</span>
      </Link>

      {/* Profile Header Card */}
      <div className="card-elevated p-6 mb-6 animate-in delay-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #D4A843, #C49A38)",
              color: "#0F1117",
            }}
          >
            {student.avatarLetter ||
              student.fullName?.[0]?.toUpperCase() ||
              "?"}
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {student.fullName}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {student.email}
            </p>
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-[var(--text-muted)]">
              <span>
                נרשם:{" "}
                {new Date(student.registeredAt).toLocaleDateString("he-IL")}
              </span>
              <span>
                התחברות אחרונה:{" "}
                {new Date(student.lastLogin).toLocaleDateString("he-IL")}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowMessageModal(true)}
              className="btn-gold text-sm !py-2 !px-4"
            >
              שלח הודעה
            </button>
            <button
              className="btn-outline text-sm !py-2 !px-4"
              style={{ color: "#EF4444", borderColor: "#EF4444" }}
              onClick={() =>
                alert("פונקציונליות השעיה תתווסף בהמשך")
              }
            >
              השעה משתמש
            </button>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="card-elevated p-6 mb-6 animate-in delay-2">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          פרויקטים
        </h2>
        {student.projects.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm">
            אין פרויקטים עדיין
          </p>
        ) : (
          <div className="space-y-3">
            {student.projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 rounded-xl transition-colors"
                style={{
                  backgroundColor: "var(--content-bg)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {project.name}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    {project.stepNumber}/{project.totalSteps} &mdash;{" "}
                    {project.pipelineStep}
                  </p>
                </div>
                <Link
                  href={`/project/${project.id}/strategy`}
                  className="btn-outline text-xs !py-1.5 !px-3 !rounded-lg"
                >
                  צפה בפרויקט
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline Progress */}
      <div className="card-elevated p-6 mb-6 animate-in delay-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          התקדמות בתהליך
        </h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {(student.pipelineSteps.length > 0
            ? student.pipelineSteps
            : PIPELINE_STEPS.map((s) => ({
                ...s,
                status: "future" as const,
              }))
          ).map((step, i, arr) => (
            <div
              key={step.name}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={
                    step.status === "completed"
                      ? {
                          background:
                            "linear-gradient(135deg, #22C55E, #16A34A)",
                          color: "#fff",
                        }
                      : step.status === "current"
                        ? {
                            background:
                              "linear-gradient(135deg, #D4A843, #C49A38)",
                            color: "#0F1117",
                            boxShadow:
                              "0 0 0 4px rgba(212, 168, 67, 0.2)",
                          }
                        : {
                            backgroundColor: "var(--content-bg)",
                            border: "2px solid var(--card-border)",
                            color: "var(--text-muted)",
                          }
                  }
                >
                  {step.status === "completed"
                    ? "\u2705"
                    : step.status === "current"
                      ? "\u23F3"
                      : "\u25CB"}
                </div>
                <span
                  className="text-[10px] font-medium whitespace-nowrap"
                  style={{
                    color:
                      step.status === "current"
                        ? "var(--gold)"
                        : step.status === "completed"
                          ? "#22C55E"
                          : "var(--text-muted)",
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < arr.length - 1 && (
                <div
                  className="w-8 h-0.5 mt-[-14px]"
                  style={{
                    backgroundColor:
                      step.status === "completed"
                        ? "#22C55E"
                        : "var(--card-border)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Outputs Section */}
      <div className="card-elevated p-6 mb-6 animate-in delay-4">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          תוצרים
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="p-4 rounded-xl text-center"
            style={{
              backgroundColor: "var(--content-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {student.outputs.strategyWordCount.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              מילים באסטרטגיה
            </div>
            {student.outputs.strategyPreview && (
              <button
                onClick={() =>
                  setOutputModal({
                    open: true,
                    title: "אסטרטגיה",
                    content: student.outputs.strategyPreview || "",
                  })
                }
                className="text-xs text-[var(--gold)] mt-2 hover:underline cursor-pointer"
              >
                צפה
              </button>
            )}
          </div>

          <div
            className="p-4 rounded-xl text-center"
            style={{
              backgroundColor: "var(--content-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {student.outputs.niche || "\u2014"}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              נישה
            </div>
          </div>

          <div
            className="p-4 rounded-xl text-center"
            style={{
              backgroundColor: "var(--content-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {student.outputs.scriptsCount}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              תסריטים
            </div>
            {student.outputs.scriptsPreview && (
              <button
                onClick={() =>
                  setOutputModal({
                    open: true,
                    title: "תסריטים",
                    content: student.outputs.scriptsPreview || "",
                  })
                }
                className="text-xs text-[var(--gold)] mt-2 hover:underline cursor-pointer"
              >
                צפה
              </button>
            )}
          </div>

          <div
            className="p-4 rounded-xl text-center"
            style={{
              backgroundColor: "var(--content-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {student.outputs.creativesCount}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              קריאייטיבים
            </div>
          </div>
        </div>
      </div>

      {/* API Usage Stats */}
      <div className="card-elevated p-6 mb-6 animate-in delay-5">
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
          שימוש ב-API
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div
            className="p-4 rounded-xl text-center"
            style={{
              backgroundColor: "var(--content-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {student.apiUsage.totalCalls.toLocaleString()}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              קריאות סה&quot;כ
            </div>
          </div>
          <div
            className="p-4 rounded-xl text-center"
            style={{
              backgroundColor: "var(--content-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div
              className="text-2xl font-bold"
              style={{
                color:
                  student.apiUsage.errors > 0
                    ? "#EF4444"
                    : "var(--text-primary)",
              }}
            >
              {student.apiUsage.errors}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              שגיאות
            </div>
          </div>
          <div
            className="p-4 rounded-xl text-center"
            style={{
              backgroundColor: "var(--content-bg)",
              border: "1px solid var(--card-border)",
            }}
          >
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              ${student.apiUsage.estimatedCost.toFixed(2)}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              עלות משוערת
            </div>
          </div>
        </div>
      </div>

      {/* Output Content Modal */}
      {outputModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          dir="rtl"
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={() =>
              setOutputModal({ open: false, title: "", content: "" })
            }
          />
          <div
            className="card-elevated p-6 w-full max-w-2xl max-h-[80vh] relative z-10 animate-in mx-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {outputModal.title}
              </h2>
              <button
                onClick={() =>
                  setOutputModal({
                    open: false,
                    title: "",
                    content: "",
                  })
                }
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                style={{ color: "var(--text-muted)" }}
              >
                &times;
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed p-4 rounded-xl"
              style={{
                backgroundColor: "var(--content-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              {outputModal.content}
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      <SendMessageModal
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        studentName={student.fullName}
        userId={student.id}
      />
    </div>
  );
}
