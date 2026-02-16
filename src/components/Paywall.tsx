"use client";

import { useState } from "react";

interface PaywallProps {
  daysLeft?: number | null;
  currentPlan?: string;
}

const plans = [
  {
    key: "standard",
    name: "סטנדרט",
    price: 97,
    features: [
      "10 פרויקטים",
      "30 תמונות AI בחודש",
      "3 תסריטים לפרויקט",
      "קופי בסיסי",
      "20 הודעות צ'אט ביום",
    ],
    highlight: false,
  },
  {
    key: "premium",
    name: "פרימיום",
    price: 197,
    features: [
      "פרויקטים ללא הגבלה",
      "תמונות AI ללא הגבלה",
      "5 תסריטים לפרויקט",
      "3 וריאציות קופי",
      "צ'אט ללא הגבלה",
      "דוחות PDF ללקוח",
      "בנק תסריטים",
    ],
    highlight: true,
  },
];

export default function Paywall({ daysLeft, currentPlan }: PaywallProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSelectPlan = async (planKey: string) => {
    setLoading(planKey);
    setError("");

    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      const json = await res.json();
      if (!res.ok || !json.paymentUrl) {
        throw new Error(json.error || "Failed to create checkout");
      }

      // Redirect to Sumit payment page
      window.location.href = json.paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת קישור תשלום");
      setLoading(null);
    }
  };

  const isExpired = currentPlan === "expired" || daysLeft === 0;

  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12"
      dir="rtl"
    >
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">
          {isExpired ? "⏰" : "🚀"}
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          {isExpired
            ? "תקופת הניסיון הסתיימה"
            : "שדרג את התוכנית שלך"}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
          {isExpired
            ? "כל הפרויקטים שלך שמורים ומחכים לך! בחר תוכנית כדי להמשיך."
            : `נשארו לך ${daysLeft} ימי ניסיון. שדרג עכשיו כדי להמשיך בלי הפרעות.`}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 max-w-lg w-full text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 max-w-2xl w-full">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className="flex-1 rounded-2xl p-6 relative overflow-hidden"
            style={{
              background: plan.highlight
                ? "linear-gradient(135deg, rgba(212,168,67,0.08) 0%, rgba(212,168,67,0.02) 100%)"
                : "rgba(255,255,255,0.9)",
              backdropFilter: "blur(12px)",
              border: plan.highlight
                ? "2px solid var(--gold)"
                : "1px solid var(--card-border)",
              boxShadow: plan.highlight
                ? "0 8px 32px rgba(212,168,67,0.15)"
                : "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {plan.highlight && (
              <div
                className="absolute top-0 left-0 right-0 text-center py-1 text-xs font-bold"
                style={{
                  background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
                  color: "#0F1117",
                }}
              >
                מומלץ
              </div>
            )}

            <div className={plan.highlight ? "mt-4" : ""}>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                {plan.name} {plan.highlight && "⭐"}
              </h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold" style={{ color: plan.highlight ? "#D4A843" : "var(--text-primary)" }}>
                  {plan.price}₪
                </span>
                <span className="text-sm text-[var(--text-muted)]">/חודש</span>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                  >
                    <span className="text-[var(--success)] flex-shrink-0">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.key)}
                disabled={loading !== null}
                className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: plan.highlight
                    ? "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)"
                    : "var(--content-bg)",
                  color: plan.highlight ? "#0F1117" : "var(--text-primary)",
                  border: plan.highlight ? "none" : "1px solid var(--card-border)",
                  boxShadow: plan.highlight
                    ? "0 4px 16px rgba(212,168,67,0.3)"
                    : "none",
                }}
              >
                {loading === plan.key ? "⏳ מעבד..." : "💳 הפעל תוכנית"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-8 text-center">
        יש שאלות? דברו איתנו בוואטסאפ
      </p>
    </div>
  );
}
