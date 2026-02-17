"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { PLAN_LABELS, PLAN_PRICES, CONSULTING_PRODUCT } from "@/lib/plan-limits";
import PaymentModal from "@/components/PaymentModal";
import type { CustomerDetails } from "@/components/PaymentModal";

type Tab = "general" | "plan" | "invoices";
type CancelStep = "confirm" | "retention" | null;

const plans = [
  {
    key: "standard",
    name: "סטנדרט",
    price: String(PLAN_PRICES.standard),
    period: "/חודש",
    features: [
      "10 פרויקטים",
      "30 תמונות AI בחודש",
      "3 תסריטים לפרויקט",
      "20 שיחות ביום עם מומחה FBM",
      "קופי בסיסי",
    ],
  },
  {
    key: "premium",
    name: "פרימיום",
    price: String(PLAN_PRICES.premium),
    period: "/חודש",
    popular: true,
    features: [
      "פרויקטים ללא הגבלה",
      "תמונות AI ללא הגבלה",
      "5 תסריטים לפרויקט",
      "שיחות ללא הגבלה עם מומחה FBM",
      "3 וריאציות קופי",
      "דוחות PDF ללקוח",
      "בנק תסריטים",
    ],
  },
];

// Simple confetti effect using canvas
function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#D4A843", "#22C55E", "#3B82F6", "#EF4444", "#A855F7", "#F59E0B", "#EC4899"];
    const particles: Array<{
      x: number; y: number; w: number; h: number;
      color: string; vx: number; vy: number;
      rotation: number; rotationSpeed: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    let animId: number;
    let frame = 0;
    const maxFrames = 180; // ~3 seconds at 60fps

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      const fadeStart = maxFrames * 0.7;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rotation += p.rotationSpeed;
        if (frame > fadeStart) {
          p.opacity = Math.max(0, 1 - (frame - fadeStart) / (maxFrames - fadeStart));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (frame < maxFrames) {
        animId = requestAnimationFrame(animate);
      }
    }

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 10001 }}
    />
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [currentPlan, setCurrentPlan] = useState<string>("trial");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("none");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentType, setPaymentType] = useState<"plan" | "consulting">("plan");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Success popup state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Cancel flow state
  const [cancelStep, setCancelStep] = useState<CancelStep>(null);
  const [discountLoading, setDiscountLoading] = useState(false);

  // Reset loading state when user navigates back
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setPaymentLoading(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const fetchBillingStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    try {
      const res = await fetch("/api/billing/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.plan) {
        setCurrentPlan(data.plan);
        setSubscriptionStatus(data.subscriptionStatus || "none");
        // Notify layout to update sidebar plan badge
        window.dispatchEvent(
          new CustomEvent("billing-plan-changed", { detail: data.plan }),
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("user_profiles")
        .select("full_name, plan")
        .eq("user_id", user.id)
        .single();

      if (data?.full_name) {
        setFullName(data.full_name);
      }
      if (data?.plan) {
        setCurrentPlan(data.plan);
      }
    }
    loadProfile();
    fetchBillingStatus();
  }, [fetchBillingStatus]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const handleUpgrade = (planKey: string) => {
    setSelectedPlan(planKey);
    setPaymentType("plan");
    setPaymentUrl(null);
    setShowPayment(true);
    setError("");
  };

  const handleConsulting = () => {
    setPaymentType("consulting");
    setPaymentUrl(null);
    setShowPayment(true);
    setError("");
  };

  const handleSubmitDetails = async (details: CustomerDetails) => {
    setPaymentLoading(true);
    setError("");
    try {
      const headers = await getAuthHeaders();
      const endpoint = paymentType === "consulting"
        ? "/api/billing/consulting-checkout"
        : "/api/billing/create-checkout";
      const body = paymentType === "consulting"
        ? { customerName: details.customerName, customerIdNumber: details.customerIdNumber }
        : { plan: selectedPlan, customerName: details.customerName, customerIdNumber: details.customerIdNumber };

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.paymentUrl) {
        throw new Error(json.error || "Failed to create checkout");
      }
      setPaymentUrl(json.paymentUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`שגיאה ביצירת קישור תשלום: ${msg}`);
      setShowPayment(false);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Cancel flow: step 1 - show confirmation dialog
  const handleCancelClick = () => {
    setCancelStep("confirm");
    setError("");
  };

  // Cancel flow: user confirmed cancellation -> show retention offer
  const handleCancelConfirmed = () => {
    setCancelStep("retention");
  };

  // Cancel flow: user took the 50% discount offer
  const handleTakeDiscount = async () => {
    setDiscountLoading(true);
    setError("");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/billing/apply-discount", {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to apply discount");
      }
      setCancelStep(null);
      // Refresh billing status
      await fetchBillingStatus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`שגיאה בהפעלת ההנחה: ${msg}`);
      setCancelStep(null);
    } finally {
      setDiscountLoading(false);
    }
  };

  // Cancel flow: user declined the offer -> actually cancel
  const handleDeclineOffer = async () => {
    setCancelLoading(true);
    setError("");
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to cancel subscription");
      }
      setCancelStep(null);
      // Refresh billing status
      await fetchBillingStatus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`שגיאה בביטול המנוי: ${msg}`);
      setCancelStep(null);
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePaymentComplete = useCallback(() => {
    setShowPayment(false);
    setPaymentUrl(null);

    // Show success popup with confetti
    setShowSuccess(true);
    setShowConfetti(true);

    // Update plan after a short delay to allow webhook to process
    const pollPlan = async (attempts: number) => {
      for (let i = 0; i < attempts; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) continue;
        try {
          const res = await fetch("/api/billing/status", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.plan && data.plan !== "trial" && data.plan !== "expired") {
            setCurrentPlan(data.plan);
            setSubscriptionStatus(data.subscriptionStatus || "active");
            setSelectedPlan(null);
            window.dispatchEvent(
              new CustomEvent("billing-plan-changed", { detail: data.plan }),
            );
            return;
          }
        } catch {
          // retry
        }
      }
      // Fallback: if selectedPlan was set, use it
      if (selectedPlan) {
        setCurrentPlan(selectedPlan);
        setSubscriptionStatus("active");
        window.dispatchEvent(
          new CustomEvent("billing-plan-changed", { detail: selectedPlan }),
        );
      }
      setSelectedPlan(null);
    };

    pollPlan(5);

    // Stop confetti after 3s
    setTimeout(() => setShowConfetti(false), 3000);
  }, [selectedPlan]);

  const handlePaymentClose = useCallback(() => {
    setShowPayment(false);
    setPaymentUrl(null);
    setSelectedPlan(null);
    setPaymentLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const trimmedName = fullName.trim();
      let saveSuccess = false;

      // Try 1: upsert with explicit onConflict
      const { error: upsertError } = await supabase
        .from("user_profiles")
        .upsert(
          { user_id: user.id, full_name: trimmedName },
          { onConflict: "user_id" }
        );

      if (!upsertError) {
        saveSuccess = true;
      } else {
        console.error("upsert failed:", upsertError.message);

        // Try 2: check if row exists, then update or insert accordingly
        const { data: existing } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("user_id", user.id)
          .single();

        if (existing) {
          // Row exists -> update
          const { error: updateError } = await supabase
            .from("user_profiles")
            .update({ full_name: trimmedName, updated_at: new Date().toISOString() })
            .eq("user_id", user.id);

          if (!updateError) {
            saveSuccess = true;
          } else {
            console.error("update failed:", updateError.message);
          }
        } else {
          // No row -> insert
          const { error: insertError } = await supabase
            .from("user_profiles")
            .insert({ user_id: user.id, full_name: trimmedName });

          if (!insertError) {
            saveSuccess = true;
          } else {
            console.error("insert failed:", insertError.message);
          }
        }
      }

      if (!saveSuccess) {
        setError("שגיאה בשמירת השם — בדוק שטבלת user_profiles קיימת ב-Supabase");
        return;
      }

      // Update password if provided
      if (password.trim()) {
        const { error: pwError } = await supabase.auth.updateUser({ password: password.trim() });
        if (pwError) {
          setError("השם נשמר, אך שגיאה בעדכון הסיסמה.");
        }
        setPassword("");
      }

      // Notify layout & dashboard to update the displayed name
      window.dispatchEvent(
        new CustomEvent("profile-name-changed", { detail: trimmedName }),
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("אירעה שגיאה. נסה שוב.");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "general", label: "כללי" },
    { key: "plan", label: "תוכנית" },
    { key: "invoices", label: "חשבוניות" },
  ];

  const isActivePlan = currentPlan === "standard" || currentPlan === "premium";

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">הגדרות</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[10px] p-1 mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 text-sm font-medium rounded-[8px] transition-all cursor-pointer ${
              tab === t.key
                ? "bg-[var(--gold)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--content-bg)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {tab === "general" && (
        <div className="card-static p-6 max-w-lg">
          <h2 className="font-bold text-[var(--text-primary)] mb-4">פרטים אישיים</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">שם מלא</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ישראל ישראלי"
                className="w-full px-4 py-2.5 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">אימייל</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full px-4 py-2.5 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-muted)] text-right text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">סיסמה חדשה</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="השאר ריק אם אין שינוי"
                dir="ltr"
                className="w-full px-4 py-2.5 rounded-[10px] border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-right placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-colors text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-[var(--gold)] text-white font-semibold rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {saving ? "שומר..." : "שמור שינויים"}
              </button>
              {saved && (
                <span className="text-sm text-[var(--success)] font-medium animate-in">
                  נשמר בהצלחה
                </span>
              )}
              {error && (
                <span className="text-sm text-red-500 font-medium animate-in">
                  {error}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan tab */}
      {tab === "plan" && (
        <div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-600 text-right">
              {error}
            </div>
          )}

          {/* Current plan info */}
          <div className="card-static p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-[var(--text-secondary)]">
              התוכנית הנוכחית שלך: <span className="font-bold text-[var(--gold)]">{PLAN_LABELS[currentPlan] || currentPlan}</span>
              {subscriptionStatus === "cancelling" && (
                <span className="text-xs text-red-500 mr-2">(בתהליך ביטול)</span>
              )}
            </p>
            {isActivePlan && subscriptionStatus === "active" && (
              <button
                onClick={handleCancelClick}
                disabled={cancelLoading}
                className="px-4 py-2 text-sm font-medium text-red-500 border border-red-300 rounded-[10px] hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelLoading ? "מבטל..." : "בטל מנוי"}
              </button>
            )}
          </div>

          {/* Subscription plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              const isHigher = plan.key === "premium" && currentPlan === "premium";
              return (
                <div
                  key={plan.key}
                  className="bg-[var(--card-bg)] border rounded-[16px] p-6 relative flex flex-col"
                  style={{ minHeight: "380px" }}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 right-4 bg-[var(--gold)] text-white text-xs font-bold px-3 py-1 rounded-full">
                      התוכנית שלך
                    </span>
                  )}
                  {!isCurrent && plan.key === "premium" && (
                    <span className="absolute -top-3 right-4 bg-[var(--gold)] text-white text-xs font-bold px-3 py-1 rounded-full">
                      מומלץ
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold text-[var(--text-primary)]">&#8362;{plan.price}</span>
                    <span className="text-sm text-[var(--text-muted)]">{plan.period}</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mb-4">*המחירים לא כוללים מע&quot;מ</p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isCurrent ? "var(--gold)" : "var(--success)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-[10px] font-semibold text-sm bg-[var(--content-bg)] text-[var(--text-muted)] cursor-default mt-auto"
                    >
                      התוכנית הנוכחית
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={isHigher || showPayment}
                      className="w-full py-2.5 rounded-[10px] font-semibold text-sm bg-[var(--gold)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer disabled:cursor-default mt-auto"
                    >
                      הפעל מנוי חודשי
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Consulting one-time purchase */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[16px] p-6 relative">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{CONSULTING_PRODUCT.description}</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  שעת ייעוץ אישית 1-על-1 עם דוד — אסטרטגיה, קופי, קמפיינים, ואופטימיזציה
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">&#8362;{CONSULTING_PRODUCT.priceWithVAT.toLocaleString()}</span>
                  <span className="text-xs text-[var(--text-muted)]">כולל מע&quot;מ</span>
                </div>
              </div>
              <button
                onClick={handleConsulting}
                disabled={showPayment}
                className="px-6 py-2.5 rounded-[10px] font-semibold text-sm cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
                  color: "#0F1117",
                  boxShadow: "0 2px 8px rgba(212, 168, 67, 0.3)",
                }}
              >
                רכוש שעת ייעוץ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoices tab */}
      {tab === "invoices" && (
        <div className="card-static p-8 text-center">
          <p className="text-[var(--text-muted)] text-sm">
            החשבוניות שלך יופיעו כאן לאחר ביצוע תשלום
          </p>
        </div>
      )}

      {showPayment && (
        <PaymentModal
          url={paymentUrl}
          onSubmitDetails={handleSubmitDetails}
          loading={paymentLoading}
          onComplete={handlePaymentComplete}
          onClose={handlePaymentClose}
        />
      )}

      {/* Success popup after payment */}
      {showSuccess && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl p-8 text-center"
            dir="rtl"
            style={{ background: "#fff", animation: "scaleIn 0.3s ease-out" }}
          >
            <div
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">תודה רבה על הרשמתך!</h2>
            <p className="text-gray-600 mb-2">המנוי שלך הופעל בהצלחה</p>
            <p className="text-sm text-gray-500 mb-6">חשבונית מס נשלחה לכתובת המייל שלך</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all"
              style={{
                background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
                color: "#0F1117",
                boxShadow: "0 4px 16px rgba(212,168,67,0.3)",
              }}
            >
              מעולה, בואו נתחיל!
            </button>
          </div>
        </div>
      )}

      {/* Confetti effect */}
      {showConfetti && <ConfettiCanvas />}

      {/* Cancel confirmation dialog */}
      {cancelStep === "confirm" && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl p-8 text-center"
            dir="rtl"
            style={{ background: "#fff" }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.1)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">האם אתה בטוח שברצונך לבטל את המנוי?</h2>
            <p className="text-sm text-gray-500 mb-6">
              לאחר הביטול תוכל להמשיך להשתמש עד סוף תקופת החיוב הנוכחית
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelConfirmed}
                className="flex-1 py-3 rounded-xl font-bold text-sm cursor-pointer transition-all bg-red-500 text-white hover:bg-red-600"
              >
                כן, בטל מנוי
              </button>
              <button
                onClick={() => setCancelStep(null)}
                className="flex-1 py-3 rounded-xl font-bold text-sm cursor-pointer transition-all border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                לא, המשך מנוי
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retention offer dialog */}
      {cancelStep === "retention" && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl p-8 text-center"
            dir="rtl"
            style={{ background: "#fff" }}
          >
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, rgba(212,168,67,0.15) 0%, rgba(212,168,67,0.05) 100%)" }}
            >
              <span className="text-3xl">
                &#127873;
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">רגע לפני שעוזבים!</h2>
            <p className="text-gray-600 mb-1">יש לנו הצעה חד פעמית במיוחד בשבילך:</p>
            <div
              className="my-4 p-4 rounded-xl"
              style={{ background: "linear-gradient(135deg, rgba(212,168,67,0.1) 0%, rgba(212,168,67,0.05) 100%)", border: "1px solid rgba(212,168,67,0.3)" }}
            >
              <p className="text-2xl font-bold" style={{ color: "#D4A843" }}>50% הנחה</p>
              <p className="text-sm text-gray-600">על החיוב החודשי הקרוב</p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleTakeDiscount}
                disabled={discountLoading}
                className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
                  color: "#0F1117",
                  boxShadow: "0 4px 16px rgba(212,168,67,0.3)",
                }}
              >
                {discountLoading ? "מפעיל הנחה..." : "אקח את ההצעה!"}
              </button>
              <button
                onClick={handleDeclineOffer}
                disabled={cancelLoading}
                className="w-full py-3 rounded-xl font-bold text-sm cursor-pointer transition-all text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {cancelLoading ? "מבטל מנוי..." : "אוותר על ההצעה"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
