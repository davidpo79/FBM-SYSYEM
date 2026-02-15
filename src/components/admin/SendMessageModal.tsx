"use client";

import { useState } from "react";

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  userId: string;
}

interface QuickTemplate {
  label: string;
  title: string;
  message: string;
}

export default function SendMessageModal({
  isOpen,
  onClose,
  studentName,
  userId,
}: SendMessageModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const quickTemplates: QuickTemplate[] = [
    {
      label: "\u05EA\u05E7\u05D5\u05E2 \u05D1\u05E9\u05DC\u05D1?",
      title: "\u05E6\u05E8\u05D9\u05DA \u05E2\u05D6\u05E8\u05D4?",
      message: `\u05D4\u05D9\u05D9 ${studentName}, \u05E8\u05D0\u05D9\u05EA\u05D9 \u05E9\u05D0\u05EA\u05D4 \u05D1\u05E9\u05DC\u05D1 \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9 \u05DB\u05D1\u05E8 \u05DB\u05DE\u05D4 \u05D9\u05DE\u05D9\u05DD. \u05E6\u05E8\u05D9\u05DA \u05E2\u05D6\u05E8\u05D4? \u05D0\u05E0\u05D9 \u05DB\u05D0\u05DF \uD83D\uDCAA`,
    },
    {
      label: "\u05D1\u05E8\u05DB\u05EA \u05D4\u05E6\u05DC\u05D7\u05D4",
      title: "\u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3!",
      message: `\u05D4\u05D9\u05D9 ${studentName}, \u05D4\u05E9\u05DC\u05DE\u05EA \u05D0\u05EA \u05D4-Pipeline! \u05DB\u05DC \u05D4\u05DB\u05D1\u05D5\u05D3 \uD83C\uDF89 \u05D0\u05D9\u05DA \u05D4\u05E8\u05D2\u05E9\u05EA?`,
    },
    {
      label: "\u05EA\u05D6\u05DB\u05D5\u05E8\u05EA",
      title: "\u05DE\u05D4 \u05E9\u05DC\u05D5\u05DE\u05DA?",
      message: `\u05D4\u05D9\u05D9 ${studentName}, \u05DC\u05D0 \u05E8\u05D0\u05D9\u05EA\u05D9 \u05D0\u05D5\u05EA\u05DA \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA \u05DB\u05D1\u05E8 \u05E9\u05D1\u05D5\u05E2. \u05D4\u05DB\u05DC \u05D1\u05E1\u05D3\u05E8? \uD83E\uDD14`,
    },
  ];

  const applyTemplate = (template: QuickTemplate) => {
    setTitle(template.title);
    setMessage(template.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: title.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      setSent(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch {
      setError("\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05D4\u05D5\u05D3\u05E2\u05D4. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setMessage("");
    setSent(false);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="card-elevated animate-in w-full max-w-lg mx-4 p-6 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {"\u05E9\u05DC\u05D7 \u05D4\u05D5\u05D3\u05E2\u05D4 \u05DC-"}{studentName}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            &#10005;
          </button>
        </div>

        {sent ? (
          /* Success State */
          <div className="text-center py-8 animate-in">
            <div className="text-4xl mb-3">{"\u2705"}</div>
            <p
              className="text-lg font-bold mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              {"\u05D4\u05D4\u05D5\u05D3\u05E2\u05D4 \u05E0\u05E9\u05DC\u05D7\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4!"}
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {studentName} {"\u05D9\u05E7\u05D1\u05DC \u05D0\u05D5\u05EA\u05D4 \u05D1\u05E7\u05E8\u05D5\u05D1"}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quick Templates */}
            <div>
              <p
                className="text-xs font-medium mb-2"
                style={{ color: "var(--text-muted)" }}
              >
                {"\u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05DE\u05D4\u05D9\u05E8\u05D5\u05EA"}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickTemplates.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="btn-outline text-xs"
                    style={{ padding: "6px 12px", borderRadius: "8px" }}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {"\u05DB\u05D5\u05EA\u05E8\u05EA"}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={"\u05DB\u05D5\u05EA\u05E8\u05EA \u05D4\u05D4\u05D5\u05D3\u05E2\u05D4"}
                required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={{
                  border: "1.5px solid var(--card-border)",
                  color: "var(--text-primary)",
                  backgroundColor: "var(--card-bg)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--card-border)";
                }}
              />
            </div>

            {/* Message */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {"\u05EA\u05D5\u05DB\u05DF"}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={"\u05EA\u05D5\u05DB\u05DF \u05D4\u05D4\u05D5\u05D3\u05E2\u05D4..."}
                required
                rows={4}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors resize-none"
                style={{
                  border: "1.5px solid var(--card-border)",
                  color: "var(--text-primary)",
                  backgroundColor: "var(--card-bg)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--gold)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--card-border)";
                }}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !title.trim() || !message.trim()}
              className="btn-gold w-full text-sm"
            >
              {isLoading ? "\u05E9\u05D5\u05DC\u05D7..." : "\u05E9\u05DC\u05D7 \u05D4\u05D5\u05D3\u05E2\u05D4"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
