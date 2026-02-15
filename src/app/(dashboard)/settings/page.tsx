"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Tab = "general" | "plan" | "invoices";

const plans = [
  {
    name: "Free",
    price: "0",
    period: "",
    features: ["פרויקט אחד", "3 קריאייטיבים", "ייצוא PDF"],
    current: false,
  },
  {
    name: "Pro",
    price: "149",
    period: "/חודש",
    features: ["פרויקטים ללא הגבלה", "קריאייטיבים ללא הגבלה", "ייצוא ZIP", "תמיכה בעדיפות"],
    current: true,
  },
  {
    name: "Agency",
    price: "449",
    period: "/חודש",
    features: ["White Label", "ניהול לקוחות", "גישת API", "לוח בקרה מתקדם"],
    current: false,
  },
];

const invoices = [
  { date: "01/02/2026", description: "תוכנית Pro - פברואר 2026", amount: "149", status: "שולם" },
  { date: "01/01/2026", description: "תוכנית Pro - ינואר 2026", amount: "149", status: "שולם" },
  { date: "01/12/2025", description: "תוכנית Pro - דצמבר 2025", amount: "149", status: "שולם" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      if (data?.full_name) {
        setFullName(data.full_name);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save full name
      await supabase.from("user_profiles").upsert({
        user_id: user.id,
        full_name: fullName.trim(),
      });

      // Update password if provided
      if (password.trim()) {
        await supabase.auth.updateUser({ password: password.trim() });
        setPassword("");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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
            </div>
          </div>
        </div>
      )}

      {/* Plan tab */}
      {tab === "plan" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-[var(--card-bg)] border rounded-[16px] p-6 relative ${
                plan.current
                  ? "border-[var(--gold)] gold-glow"
                  : "border-[var(--card-border)]"
              }`}
            >
              {plan.current && (
                <span className="absolute -top-3 right-4 bg-[var(--gold)] text-white text-xs font-bold px-3 py-1 rounded-full">
                  התוכנית שלך
                </span>
              )}
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-[var(--text-primary)]">&#8362;{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-[var(--text-muted)]">{plan.period}</span>
                )}
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={plan.current ? "var(--gold)" : "var(--success)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-2.5 rounded-[10px] font-semibold text-sm transition-opacity cursor-pointer ${
                  plan.current
                    ? "bg-[var(--content-bg)] text-[var(--text-muted)] cursor-default"
                    : "bg-[var(--gold)] text-white hover:opacity-90"
                }`}
                disabled={plan.current}
              >
                {plan.current ? "התוכנית הנוכחית" : "שדרג"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Invoices tab */}
      {tab === "invoices" && (
        <div className="card-static overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-right px-6 py-4 font-semibold text-[var(--text-secondary)]">תאריך</th>
                <th className="text-right px-6 py-4 font-semibold text-[var(--text-secondary)]">תיאור</th>
                <th className="text-right px-6 py-4 font-semibold text-[var(--text-secondary)]">סכום</th>
                <th className="text-right px-6 py-4 font-semibold text-[var(--text-secondary)]">סטטוס</th>
                <th className="text-right px-6 py-4 font-semibold text-[var(--text-secondary)]">הורדה</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={i} className={i % 2 === 1 ? "bg-[var(--content-bg)]" : ""}>
                  <td className="px-6 py-4 text-[var(--text-primary)]">{inv.date}</td>
                  <td className="px-6 py-4 text-[var(--text-primary)]">{inv.description}</td>
                  <td className="px-6 py-4 text-[var(--text-primary)] font-medium">&#8362;{inv.amount}</td>
                  <td className="px-6 py-4">
                    <span className="bg-green-50 text-[var(--success)] text-xs font-medium px-2 py-1 rounded-full">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-[var(--gold)] hover:opacity-80 text-xs font-medium cursor-pointer">
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
