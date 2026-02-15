"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface TokenData {
  valid: boolean;
  studentName?: string;
  studentEmail?: string;
  reason?: string;
}

const CHECKLIST_ITEMS = [
  {
    icon: "\uD83C\uDFAF",
    title: "אסטרטגיית FBM מותאמת אישית",
    description: "בניית אסטרטגיה מלאה לפרסום ממומן על בסיס מתודולוגיית FBM",
  },
  {
    icon: "\uD83D\uDD0D",
    title: "מחקר נישות ו ניתוח כאבים",
    description: "זיהוי קהלי יעד מדויקים וניתוח נקודות הכאב שלהם",
  },
  {
    icon: "\uD83D\uDCDD",
    title: "תסריטים וקריאייטיב",
    description: "יצירת תסריטים מקצועיים וקריאייטיבים מנצחים בעזרת AI",
  },
  {
    icon: "\uD83E\uDD16",
    title: "מומחה FBM אישי",
    description: "גישה למומחה AI שמבין את המתודולוגיה ועוזר לך בכל שלב",
  },
];

export default function WelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--content-bg)" }} dir="rtl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full animate-spin" style={{ border: "3px solid rgba(212, 168, 67, 0.3)", borderTopColor: "#D4A843" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>טוען...</span>
          </div>
        </div>
      }
    >
      <WelcomeContent />
    </Suspense>
  );
}

function WelcomeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenData({ valid: false, reason: "לא סופק טוקן הזמנה" });
      setLoading(false);
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch("/api/admin/welcome/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setTokenData({
            valid: false,
            reason: data.error || "טוקן לא תקין",
          });
        } else {
          setTokenData({
            valid: true,
            studentName: data.studentName,
            studentEmail: data.studentEmail,
          });
          // Flag this user as token-based so questionnaire shows booking
          localStorage.setItem("fbm_is_token_user", "true");
        }
      } catch {
        setTokenData({ valid: false, reason: "שגיאה באימות הטוקן" });
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--content-bg)" }}
        dir="rtl"
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full animate-spin"
            style={{
              border: "3px solid rgba(212, 168, 67, 0.3)",
              borderTopColor: "#D4A843",
            }}
          />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            מאמת טוקן...
          </span>
        </div>
      </div>
    );
  }

  // Invalid / expired token
  if (!tokenData?.valid) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "var(--content-bg)" }}
        dir="rtl"
      >
        <div className="card-elevated p-8 max-w-md w-full text-center animate-in">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
          >
            {"\u274C"}
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            קישור לא תקין
          </h1>
          <p className="text-[var(--text-secondary)] mb-6">
            {tokenData?.reason || "הקישור אינו תקף או שפג תוקפו."}
          </p>
          <Link href="/login" className="btn-outline inline-block text-sm">
            עבור לדף ההתחברות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-12 px-4"
      style={{ backgroundColor: "var(--content-bg)" }}
      dir="rtl"
    >
      <div className="max-w-2xl mx-auto">
        {/* Logo + Welcome Header */}
        <div className="text-center mb-8 animate-in">
          {/* FBM Studio Logo */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <Image
              src="/fbm-logo-gold.svg"
              alt="FBM Studio Logo"
              width={80}
              height={80}
              priority
            />
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              FBM Studio
            </span>
          </div>

          <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">
            !{tokenData.studentName && (
              <span style={{ color: "var(--gold)" }}>
                {tokenData.studentName}
              </span>
            )}{" "}
            ברוך הבא ל-FBM Studio
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">
            המערכת שתלווה אותך לאורך הקמת העסק שלך
            <br />
            <span style={{ color: "var(--gold)" }}>ויצירת הכנסה בתוך 30 ימים!</span>
          </p>
        </div>

        {/* Main Card */}
        <div className="card-elevated p-8 mb-6 animate-in delay-1">
          {/* Checklist */}
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5">
            מה מחכה לך במערכת?
          </h2>
          <div className="space-y-4 mb-8">
            {CHECKLIST_ITEMS.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 p-4 rounded-xl transition-all animate-in delay-${i + 2}`}
                style={{
                  backgroundColor: "var(--content-bg)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ backgroundColor: "var(--gold-soft)" }}
                >
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {item.description}
                  </p>
                </div>
                <div className="flex-shrink-0 mt-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="text-center pt-4">
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              מלא את שאלון התדר וקבע פגישת היכרות אישית
            </p>
            <Link
              href="/signup"
              className="btn-gold inline-block text-lg !py-3.5 !px-10"
            >
              בואו נתחיל!
            </Link>
          </div>
        </div>

        {/* Developer credits */}
        <p className="text-center text-sm text-[var(--text-secondary)] animate-in delay-7 mt-2 mb-1">
          המערכת פותחה על ידי דוד פופוביץ
        </p>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)] animate-in delay-8">
          FBM Studio &mdash; Frequency Based Marketing
          <br />
          &copy; כל הזכויות שמורות | דוד פופוביץ
        </p>
      </div>
    </div>
  );
}
