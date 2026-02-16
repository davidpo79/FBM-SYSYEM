"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PLAN_LABELS, PLAN_PRICES, CONSULTING_PRODUCT } from "@/lib/plan-limits";

type Tab = "general" | "plan" | "invoices";

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

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [currentPlan, setCurrentPlan] = useState<string>("trial");
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [consultingLoading, setConsultingLoading] = useState(false);

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
  }, []);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const handleUpgrade = async (planKey: string) => {
    setUpgradeLoading(planKey);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({ plan: planKey }),
      });
      const json = await res.json();
      if (!res.ok || !json.paymentUrl) {
        throw new Error(json.error || "Failed to create checkout");
      }
      window.location.href = json.paymentUrl;
    } catch {
      setError("שגיאה ביצירת קישור תשלום");
      setUpgradeLoading(null);
    }
  };

  const handleConsulting = async () => {
    setConsultingLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/billing/consulting-checkout", {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok || !json.paymentUrl) {
        throw new Error(json.error || "Failed to create checkout");
      }
      window.location.href = json.paymentUrl;
    } catch {
      setError("שגיאה ביצירת קישור תשלום לייעוץ");
      setConsultingLoading(false);
    }
  };

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
          // Row exists → update
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
          // No row → insert
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
          {/* Current plan info */}
          <div className="card-static p-4 mb-6">
            <p className="text-sm text-[var(--text-secondary)]">
              התוכנית הנוכחית שלך: <span className="font-bold text-[var(--gold)]">{PLAN_LABELS[currentPlan] || currentPlan}</span>
            </p>
          </div>

          {/* Subscription plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              const isHigher = plan.key === "premium" && currentPlan === "premium";
              return (
                <div
                  key={plan.key}
                  className={`bg-[var(--card-bg)] border rounded-[16px] p-6 relative ${
                    isCurrent
                      ? "border-[var(--gold)] gold-glow"
                      : plan.key === "premium"
                        ? "border-[var(--gold)]"
                        : "border-[var(--card-border)]"
                  }`}
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
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold text-[var(--text-primary)]">&#8362;{plan.price}</span>
                    <span className="text-sm text-[var(--text-muted)]">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isCurrent ? "var(--gold)" : "var(--success)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => !isCurrent && handleUpgrade(plan.key)}
                    disabled={isCurrent || isHigher || upgradeLoading !== null}
                    className={`w-full py-2.5 rounded-[10px] font-semibold text-sm transition-opacity cursor-pointer disabled:cursor-default ${
                      isCurrent
                        ? "bg-[var(--content-bg)] text-[var(--text-muted)]"
                        : "bg-[var(--gold)] text-white hover:opacity-90 disabled:opacity-50"
                    }`}
                  >
                    {upgradeLoading === plan.key ? "מעבד..." : isCurrent ? "התוכנית הנוכחית" : "שדרג"}
                  </button>
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
                disabled={consultingLoading}
                className="px-6 py-2.5 rounded-[10px] font-semibold text-sm cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #D4A843 0%, #C49A38 100%)",
                  color: "#0F1117",
                  boxShadow: "0 2px 8px rgba(212, 168, 67, 0.3)",
                }}
              >
                {consultingLoading ? "מעבד..." : "רכוש שעת ייעוץ"}
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
    </div>
  );
}
