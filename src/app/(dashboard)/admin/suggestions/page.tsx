"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admin";

type SuggestionStatus = "new" | "in_review" | "done" | "rejected";

interface Suggestion {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  suggestion: string;
  category: string | null;
  status: SuggestionStatus;
  adminNotes?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<
  SuggestionStatus,
  { label: string; color: string; bgColor: string }
> = {
  new: {
    label: "חדש",
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.1)",
  },
  in_review: {
    label: "בבדיקה",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.1)",
  },
  done: {
    label: "בוצע",
    color: "#22C55E",
    bgColor: "rgba(34, 197, 94, 0.1)",
  },
  rejected: {
    label: "נדחה",
    color: "#EF4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
  },
};

export default function AdminSuggestionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    async function init() {
      const admin = await isAdmin();
      if (!admin) {
        router.replace("/dashboard");
        return;
      }
      fetchSuggestions();
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function fetchSuggestions() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/suggestions");
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setError("שגיאה בטעינת הצעות");
    } finally {
      setLoading(false);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleStatusChange(id: string, newStatus: SuggestionStatus) {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)),
    );

    try {
      await fetch("/api/admin/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
    } catch {
      fetchSuggestions();
    }
  }

  function handleNotesChange(id: string, value: string) {
    setNotes((prev) => ({ ...prev, [id]: value }));
  }

  async function handleNotesSave(id: string) {
    try {
      await fetch("/api/admin/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, adminNotes: notes[id] }),
      });
    } catch {
      // Silent fail
    }
  }

  const newCount = suggestions.filter((s) => s.status === "new").length;

  if (loading) {
    return (
      <div dir="rtl">
        <div className="mb-8 animate-in">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card-static p-6 space-y-3">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-full" />
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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            הצעות לשיפור
          </h1>
          {newCount > 0 && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                color: "#3B82F6",
              }}
            >
              {newCount} חדשות
            </span>
          )}
        </div>
        <p className="text-[var(--text-secondary)] mt-1">
          {suggestions.length} הצעות במערכת
        </p>
      </div>

      {/* Suggestions List */}
      {suggestions.length === 0 ? (
        <div className="card-elevated p-12 text-center animate-in delay-1">
          <p className="text-[var(--text-muted)] text-lg">
            אין הצעות לשיפור כרגע
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion, i) => {
            const statusConfig = STATUS_CONFIG[suggestion.status] || STATUS_CONFIG.new;
            const isExpanded = expandedIds.has(suggestion.id);

            return (
              <div
                key={suggestion.id}
                className={`card-elevated p-6 animate-in delay-${Math.min(i + 1, 8)}`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 text-xs text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--text-secondary)]">
                        {suggestion.userName || suggestion.userEmail || "משתמש"}
                      </span>
                      <span>&middot;</span>
                      <span>
                        {new Date(suggestion.createdAt).toLocaleDateString(
                          "he-IL",
                        )}
                      </span>
                      {suggestion.category && (
                        <>
                          <span>&middot;</span>
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: "var(--gold-soft)",
                              color: "var(--gold)",
                            }}
                          >
                            {suggestion.category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className="text-xs font-medium px-3 py-1 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color,
                    }}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                {/* Suggestion preview / full text */}
                <div className="mb-4">
                  <p
                    className={`text-sm text-[var(--text-primary)] leading-relaxed ${
                      !isExpanded ? "line-clamp-2" : ""
                    }`}
                  >
                    {suggestion.suggestion}
                  </p>
                  {suggestion.suggestion.length > 150 && (
                    <button
                      onClick={() => toggleExpanded(suggestion.id)}
                      className="text-sm text-[var(--gold)] hover:underline cursor-pointer mt-1 flex items-center gap-1"
                    >
                      <span
                        className="transition-transform inline-block"
                        style={{
                          transform: isExpanded
                            ? "rotate(90deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        &#9654;
                      </span>
                      {isExpanded ? "הצג פחות" : "הצג עוד"}
                    </button>
                  )}
                </div>

                {/* Admin Notes (visible when expanded) */}
                {isExpanded && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                      הערות מנהל
                    </label>
                    <textarea
                      value={notes[suggestion.id] ?? suggestion.adminNotes ?? ""}
                      onChange={(e) =>
                        handleNotesChange(suggestion.id, e.target.value)
                      }
                      onBlur={() => handleNotesSave(suggestion.id)}
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] resize-none outline-none transition-colors"
                      style={{
                        border: "1.5px solid var(--card-border)",
                        backgroundColor: "var(--content-bg)",
                      }}
                      placeholder="הוסף הערות..."
                    />
                  </div>
                )}

                {/* Status Change */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-[var(--text-muted)]">
                    שנה סטטוס:
                  </label>
                  <select
                    value={suggestion.status}
                    onChange={(e) =>
                      handleStatusChange(
                        suggestion.id,
                        e.target.value as SuggestionStatus,
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-sm text-[var(--text-primary)] outline-none cursor-pointer"
                    style={{
                      border: "1.5px solid var(--card-border)",
                      backgroundColor: "var(--content-bg)",
                    }}
                  >
                    <option value="new">חדש</option>
                    <option value="in_review">בבדיקה</option>
                    <option value="done">בוצע</option>
                    <option value="rejected">נדחה</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
