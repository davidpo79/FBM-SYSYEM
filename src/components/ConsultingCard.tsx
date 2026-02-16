"use client";

import { useState } from "react";
import { CONSULTING_PRODUCT } from "@/lib/plan-limits";

export default function ConsultingCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBookConsulting = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/billing/consulting-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok || !json.paymentUrl) {
        throw new Error(json.error || "Failed to create checkout");
      }

      window.location.href = json.paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת קישור תשלום");
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-2xl p-6 text-right"
      style={{
        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.06) 0%, rgba(34, 197, 94, 0.02) 100%)",
        border: "1px solid rgba(34, 197, 94, 0.2)",
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
            שעת ייעוץ עם דוד
          </h3>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-2xl font-bold" style={{ color: "#22C55E" }}>
              {CONSULTING_PRODUCT.priceWithVAT.toLocaleString()}₪
            </span>
            <span className="text-xs text-[var(--text-muted)]">(כולל מע&quot;מ)</span>
          </div>

          <ul className="space-y-1.5 mb-4">
            {[
              "ייעוץ אישי 1:1",
              "אסטרטגיה מותאמת אישית",
              "מענה לכל השאלות",
            ].map((feature, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
              >
                <span className="flex-shrink-0" style={{ color: "#22C55E" }}>&#10003;</span>
                {feature}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}

          <button
            onClick={handleBookConsulting}
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
              color: "#FFFFFF",
              boxShadow: "0 4px 16px rgba(34, 197, 94, 0.3)",
            }}
          >
            {loading ? "מעבד..." : "הזמן עכשיו"}
          </button>
        </div>
      </div>
    </div>
  );
}
