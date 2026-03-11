"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import ConsultingCard from "@/components/ConsultingCard";
import PaymentModal from "@/components/PaymentModal";
import type { CustomerDetails } from "@/components/PaymentModal";

interface PaywallProps {
  daysLeft?: number | null;
  currentPlan?: string;
  projectCount?: number;
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
      "20 שיחות ביום עם מומחה FBM",
      "קופי בסיסי",
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
      "שיחות ללא הגבלה עם מומחה FBM",
      "3 וריאציות קופי",
      "דוחות PDF ללקוח",
      "בנק תסריטים",
    ],
    highlight: true,
  },
];

export default function Paywall({ daysLeft, currentPlan, projectCount }: PaywallProps) {
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Reset state when user navigates back
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setPaymentLoading(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const handleSelectPlan = (planKey: string) => {
    setSelectedPlan(planKey);
    setPaymentUrl(null);
    setShowPayment(true);
    setError("");
  };

  const handleSubmitDetails = async (details: CustomerDetails) => {
    setPaymentLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          plan: selectedPlan,
          customerName: details.customerName,
          customerIdNumber: details.customerIdNumber,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.paymentUrl) {
        throw new Error(json.error || "Failed to create checkout");
      }

      setPaymentUrl(json.paymentUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת קישור תשלום");
      setShowPayment(false);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentComplete = useCallback(() => {
    setShowPayment(false);
    setPaymentUrl(null);
    setSelectedPlan(null);
    window.location.reload();
  }, []);

  const handlePaymentClose = useCallback(() => {
    setShowPayment(false);
    setPaymentUrl(null);
    setSelectedPlan(null);
    setPaymentLoading(false);
  }, []);

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
            ? `${projectCount ? `כל ${projectCount} הפרויקטים שלך` : "כל הפרויקטים שלך"} שמורים ומחכים לך! בחר תוכנית כדי להמשיך.`
            : `נשארו לך ${daysLeft} ימי ניסיון. שדרג עכשיו כדי להמשיך בלי הפרעות.`}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 max-w-lg w-full text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 max-w-2xl w-full md:items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className="flex-1 rounded-2xl p-6 relative overflow-hidden flex flex-col"
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

            <div className={`flex flex-col flex-1 ${plan.highlight ? "mt-4" : ""}`}>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                {plan.name} {plan.highlight && "⭐"}
              </h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold" style={{ color: plan.highlight ? "#D4A843" : "var(--text-primary)" }}>
                  {plan.price}₪
                </span>
                <span className="text-sm text-[var(--text-muted)]">/חודש</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mb-4">*המחירים לא כוללים מע&quot;מ</p>

              <ul className="space-y-2 mb-6 flex-1">
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
                disabled={showPayment}
                className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
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
                הפעל מנוי חודשי
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* GTM motivation section */}
      <div className="max-w-2xl w-full mt-14 space-y-8">
        <div className="text-center">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            למה אסטרטגיית שיווק חשובה עוד לפני שורת קוד אחת?
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            רוב היזמים מתחילים בבניית המוצר — ורק אחר כך שואלים &quot;למי אני מוכר?&quot;.
            הגישה הזו גורמת לבזבוז חודשים של פיתוח על פיצ&apos;רים שאף אחד לא צריך.
          </p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--card-border)",
          }}
        >
          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl flex-shrink-0">🎯</span>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                קודם הלקוח, אחר כך המוצר
              </h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                אסטרטגיית שיווק אמיתית מתחילה בהבנה עמוקה של מי הלקוח שלך — מה הכאב שלו, איפה הוא נמצא, ומה גורם לו לשלוף כרטיס אשראי. רק אחרי שזה ברור, מתאימים את המוצר ללקוח — ולא הפוך.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 mb-4">
            <span className="text-2xl flex-shrink-0">🚀</span>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                GTM זה לא רק באזוורד — זה ההבדל בין הצלחה לכישלון
              </h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Go-To-Market היא התוכנית שלך להגיע ללקוח הנכון, עם המסר הנכון, בערוץ הנכון, ובתזמון הנכון. בלי GTM ברור, גם המוצר הכי טוב בעולם יישאר סוד ששמרת לעצמך.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">
                FBM עוזר לך לבנות את זה — צעד אחר צעד
              </h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                במקום לנחש, המערכת מנחה אותך לזהות קהל יעד, לבנות מסרים שיווקיים שמדברים אליו, וליצור תסריטי פרסום שעובדים. ככה חוסכים זמן, כסף, וטעויות יקרות.
              </p>
            </div>
          </div>
        </div>

        <div
          className="text-center rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, rgba(212,168,67,0.06) 0%, rgba(212,168,67,0.02) 100%)",
            border: "1px solid rgba(212,168,67,0.2)",
          }}
        >
          <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
            ⚡ 90% מהסטארטאפים נכשלים בגלל חוסר התאמה לשוק
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            אל תהיה חלק מהסטטיסטיקה. תתחיל עם אסטרטגיה — המוצר יבוא אחר כך.
          </p>
        </div>
      </div>

      {/* Consulting section */}
      <div className="text-center mt-10 max-w-md w-full">
        <div className="mx-4 h-px mb-6" style={{ background: "linear-gradient(to left, transparent, var(--card-border), transparent)" }} />
        <p className="text-sm text-[var(--text-secondary)] mb-4">מעדיף ייעוץ אישי?</p>
        <ConsultingCard />
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-8 text-center">
        יש שאלות? דברו איתנו בוואטסאפ
      </p>

      {showPayment && (
        <PaymentModal
          url={paymentUrl}
          onSubmitDetails={handleSubmitDetails}
          loading={paymentLoading}
          onComplete={handlePaymentComplete}
          onClose={handlePaymentClose}
        />
      )}
    </div>
  );
}
