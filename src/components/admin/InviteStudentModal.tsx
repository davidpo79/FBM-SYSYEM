"use client";

import { useState } from "react";
import { validateEmail } from "@/lib/validation";

interface InviteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteStudentModal({
  isOpen,
  onClose,
}: InviteStudentModalProps) {
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    if (studentEmail.trim()) {
      const emailCheck = validateEmail(studentEmail);
      if (!emailCheck.valid) {
        setError(emailCheck.error!);
        return;
      }
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: studentName.trim(),
          studentEmail: studentEmail.trim(),
          studentPhone: studentPhone.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to create invite");

      const data = await res.json();
      const link = `${window.location.origin}/welcome?token=${data.token}`;
      setGeneratedLink(link);
    } catch {
      setError("שגיאה ביצירת הלינק. נסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("לא הצלחתי להעתיק. נסה ידנית.");
    }
  };

  const handleSendWhatsApp = () => {
    const message = encodeURIComponent(
      `שלום ${studentName}! 👋 ברוך הבא לתהליך FBM! הנה הלינק האישי שלך למערכת: ${generatedLink} תכנס, תמלא את השאלון, ונקבע פגישה 1 על 1 🚀`
    );
    const phoneNumber = studentPhone.replace(/[^0-9]/g, "");
    const waUrl = phoneNumber
      ? `https://wa.me/${phoneNumber}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(waUrl, "_blank");
  };

  const handleClose = () => {
    setStudentName("");
    setStudentEmail("");
    setStudentPhone("");
    setGeneratedLink("");
    setCopied(false);
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={handleClose}
    >
      <div
        className="card-elevated animate-in w-full max-w-md mx-4 p-6"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            הזמנת תלמיד חדש
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>

        {!generatedLink ? (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                שם *
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="שם התלמיד"
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

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                אימייל
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="student@email.com"
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

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                טלפון
              </label>
              <input
                type="tel"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                placeholder="050-1234567"
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

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !studentName.trim()}
              className="btn-gold w-full text-sm"
            >
              {isLoading ? "יוצר לינק..." : "צור לינק הזמנה"}
            </button>
          </form>
        ) : (
          /* Success - Generated Link */
          <div className="space-y-4 animate-in">
            <div
              className="p-4 rounded-xl text-sm break-all"
              style={{
                backgroundColor: "var(--gold-soft)",
                color: "var(--text-primary)",
                border: "1px solid var(--gold)",
              }}
            >
              {generatedLink}
            </div>

            <p
              className="text-xs text-center"
              style={{ color: "var(--text-muted)" }}
            >
              תקף ל-7 ימים
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-outline flex-1 text-sm"
              >
                {copied ? "הועתק! ✓" : "העתק לינק"}
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="btn-gold flex-1 text-sm"
              >
                שלח בWA
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
