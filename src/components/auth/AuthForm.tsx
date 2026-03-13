"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { captureUTM, getUTMForPayload } from "@/lib/utm";
import { fbCompleteRegistration, fbLead, fbSetUserData } from "@/lib/fbpixel";
import Image from "next/image";

interface AuthFormProps {
  mode: "login" | "signup";
}

function translateAuthError(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "אימייל או סיסמה שגויים";
  if (msg.includes("Email not confirmed")) return "האימייל לא אומת. בדוק את תיבת הדואר";
  if (msg.includes("User already registered")) return "משתמש כבר רשום עם אימייל זה";
  if (msg.includes("Password should be")) return "הסיסמה חייבת להכיל לפחות 6 תווים";
  if (msg.includes("rate limit")) return "נסיונות התחברות רבים מדי. נסה שוב בעוד דקה";
  if (msg.includes("Email rate limit")) return "נשלחו יותר מדי מיילים. נסה שוב בעוד דקה";
  return msg;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup">(mode);
  const [isGtmTrack, setIsGtmTrack] = useState(false);
  const [gtmIdeaName, setGtmIdeaName] = useState("");

  useEffect(() => {
    captureUTM(); // Persist UTM params from URL
    const params = new URLSearchParams(window.location.search);
    const isGtm = params.get("track") === "gtm";
    if (isGtm) {
      setIsGtmTrack(true);
    }
    const prefillEmail = params.get("email");
    if (prefillEmail) {
      setEmail(prefillEmail);
    }
    const ideaParam = params.get("idea");
    if (ideaParam) {
      setGtmIdeaName(decodeURIComponent(ideaParam));
    }

    // Zero friction: if user already has a session on GTM track, skip auth
    if (isGtm) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          const ideaQ = ideaParam ? "&idea=" + encodeURIComponent(decodeURIComponent(ideaParam)) : "";
          router.push("/questionnaire?track=gtm" + ideaQ);
        }
      });
    }
  }, [router]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const isLogin = activeTab === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isLogin && fullName.trim().length < 2) {
      setError("נא להזין שם מלא");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) {
          setError(translateAuthError(authError.message));
          return;
        }
        if (isGtmTrack) {
          const ideaParam = gtmIdeaName ? "&idea=" + encodeURIComponent(gtmIdeaName) : "";
          router.push("/questionnaire?track=gtm" + ideaParam);
        } else {
          router.push("/dashboard");
        }
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) {
          setError(translateAuthError(authError.message));
          return;
        }

        // Advanced Matching + registration tracking
        fbSetUserData(email);
        fbLead("Signup", isGtmTrack ? "gtm" : "fbm");
        fbCompleteRegistration("email", isGtmTrack ? "gtm" : "fbm");

        // Save full name (and track for GTM) to user_profiles
        if (data.user) {
          const profileData: Record<string, string> = {
            user_id: data.user.id,
            full_name: fullName.trim(),
          };
          if (isGtmTrack) {
            profileData.track = "gtm";
          }
          await supabase.from("user_profiles").upsert(profileData);
        }

        // Fire EVENT_USER_REGISTERED webhook for all signups (with UTM)
        if (data.user) {
          const utmData = getUTMForPayload();
          fetch("/api/webhooks/gtm-user-registered", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              name: fullName.trim(),
              user_id: data.user.id,
              registration_date: new Date().toISOString(),
              track: isGtmTrack ? "gtm" : "fbm",
              ideaName: gtmIdeaName || "",
              ...utmData,
            }),
          }).catch(() => { /* fire and forget */ });
        }

        // If session exists, user is immediately logged in (no email confirmation needed)
        if (data.session) {
          if (isGtmTrack) {
            const ideaParam = gtmIdeaName ? "&idea=" + encodeURIComponent(gtmIdeaName) : "";
            router.push("/questionnaire?track=gtm" + ideaParam);
          } else {
            router.push("/dashboard");
          }
        } else {
          // Email confirmation required
          setConfirmEmail(true);
        }
      }
    } catch {
      setError("אירעה שגיאה. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback${isGtmTrack ? "?track=gtm" + (gtmIdeaName ? "&idea=" + encodeURIComponent(gtmIdeaName) : "") : ""}`,
        },
      });
      if (authError) {
        setError(translateAuthError(authError.message));
        setGoogleLoading(false);
      }
    } catch {
      setError("שגיאה בהתחברות עם Google. נסה שוב.");
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError("נא להזין כתובת אימייל");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!res.ok) {
        const data = await res.json();
        setForgotError(data.error || "אירעה שגיאה. נסה שוב.");
        return;
      }
      setForgotSent(true);
    } catch {
      setForgotError("אירעה שגיאה. נסה שוב.");
    } finally {
      setForgotLoading(false);
    }
  };

  const switchTab = (tab: "login" | "signup") => {
    setActiveTab(tab);
    setError("");
    setForgotMode(false);
    setForgotSent(false);
    setForgotError("");
  };

  if (confirmEmail) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800 text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            בדוק את האימייל שלך
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            שלחנו קישור אימות ל-<strong dir="ltr">{email}</strong>.
            <br />
            לחץ על הקישור כדי להפעיל את החשבון.
          </p>
          <button
            onClick={() => { setConfirmEmail(false); switchTab("login"); }}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            חזור לדף ההתחברות
          </button>
        </div>
      </div>
    );
  }

  if (forgotMode) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Image src="/logo-fbm.png" alt="FBM Studio" width={100} height={100} className="rounded" />
            </div>
            <h1 className="text-3xl font-bold mb-1">FBM Studio</h1>
          </div>

          {forgotSent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                בדוק את האימייל שלך
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                שלחנו קישור לאיפוס סיסמה ל-<strong dir="ltr">{forgotEmail}</strong>.
                <br />
                לחץ על הקישור כדי לבחור סיסמה חדשה.
              </p>
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium cursor-pointer"
              >
                חזור לדף ההתחברות
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
                שכחת סיסמה?
              </h2>
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-5">
                הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label
                    htmlFor="forgotEmail"
                    className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300"
                  >
                    אימייל
                  </label>
                  <input
                    id="forgotEmail"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    dir="ltr"
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                  />
                </div>

                {forgotError && (
                  <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800">
                    {forgotError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {forgotLoading ? "..." : "שלח קישור איפוס"}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setForgotError(""); }}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium cursor-pointer"
                >
                  חזור לדף ההתחברות
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className={`rounded-2xl shadow-xl p-8 border ${isGtmTrack ? "bg-[#0D1117] border-[#1E2D45]" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"}`}>
        {/* Logo & Branding */}
        {isGtmTrack ? (
          <div className="text-center mb-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-1 mb-4" dir="rtl" style={{ fontFamily: "monospace", fontSize: 11 }}>
              <span className="px-2 py-1 rounded" style={{ background: "rgba(0,255,136,0.15)", color: "#00FF88" }}>[1] רעיון ✓</span>
              <span style={{ color: "#3D4F6F" }}>←</span>
              <span className="px-2 py-1 rounded" style={{ background: "rgba(0,255,136,0.15)", color: "#00FF88", border: "1px solid rgba(0,255,136,0.3)" }}>[2] משתמש (אתה כאן)</span>
              <span style={{ color: "#3D4F6F" }}>←</span>
              <span className="px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.03)", color: "#6B7FA3" }}>[3] תוכנית</span>
            </div>
            <div className="flex justify-center mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gtm-logo.svg" alt="GTM BootCamp" style={{ height: 36, width: "auto" }} />
            </div>
            <h1 className="text-xl font-bold mb-1 text-[#F0F6FF]" style={{ fontFamily: "monospace" }}>
              כמעט סיימנו! מתכוננים לייצור האסטרטגיה...
            </h1>
            <div className="mt-3 mx-auto max-w-sm rounded-xl p-4" style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.15)" }}>
              <p className="text-sm text-[#B0BEC5] leading-relaxed">
                בוא ניצור משתמש (חינם) כדי שה-AI יוכל להתחיל לרנדר את{" "}
                <span className="text-[#00FF88] font-semibold">תוכנית ה-GTM</span>
                {gtmIdeaName ? (
                  <> עבור <span className="text-[#00D4FF] font-semibold" dir="ltr">{gtmIdeaName}</span></>
                ) : null}.
              </p>
              <p className="text-xs text-[#6B7FA3] mt-2">
                אחרי ההרשמה תעבור לשאלון קצר שיעזור ל-AI לייצר לך תוכנית GTM מותאמת אישית — כולל קהל יעד, ולידציה, תסריטי מכירה, וקמפיינים.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Image src="/logo-fbm.png" alt="FBM Studio" width={100} height={100} className="rounded" />
            </div>
            <h1 className="text-3xl font-bold mb-1">FBM Studio</h1>
            <p className="text-xs tracking-wide text-gray-400">
              <span className="font-bold text-yellow-600 dark:text-yellow-500">F</span>requency{" "}
              <span className="font-bold text-yellow-600 dark:text-yellow-500">B</span>ased{" "}
              <span className="font-bold text-yellow-600 dark:text-yellow-500">M</span>arketing
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className={`flex rounded-xl p-1 mb-6 ${isGtmTrack ? "bg-[#161D2B]" : "bg-gray-100 dark:bg-gray-800"}`}>
          <button
            type="button"
            onClick={() => switchTab("signup")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              !isLogin
                ? isGtmTrack
                  ? "bg-[#0D1117] text-[#00FF88] shadow-sm"
                  : "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : isGtmTrack
                  ? "text-[#6B7FA3] hover:text-[#B0BEC5]"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            הרשמה חינם
          </button>
          <button
            type="button"
            onClick={() => switchTab("login")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              isLogin
                ? isGtmTrack
                  ? "bg-[#0D1117] text-[#00FF88] shadow-sm"
                  : "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : isGtmTrack
                  ? "text-[#6B7FA3] hover:text-[#B0BEC5]"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            התחברות
          </button>
        </div>

        {/* Subtitle */}
        <p className={`text-center text-sm mb-5 ${isGtmTrack ? "text-[#6B7FA3]" : "text-gray-500 dark:text-gray-400"}`}>
          {isLogin
            ? "התחבר לחשבון הקיים שלך"
            : isGtmTrack
              ? "צור חשבון חינם כדי שנוכל לשמור את תוכנית ה-GTM שלך"
              : "צור חשבון חדש ב-FBM Studio — בחינם!"}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label
                htmlFor="fullName"
                className={`block text-sm font-medium mb-1.5 ${isGtmTrack ? "text-[#B0BEC5]" : "text-gray-700 dark:text-gray-300"}`}
              >
                שם מלא
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="ישראל ישראלי"
                className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all placeholder:text-gray-400 ${
                  isGtmTrack
                    ? "border-[#1E2D45] bg-[#161D2B] text-[#F0F6FF] focus:border-[#00FF88]"
                    : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                }`}
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className={`block text-sm font-medium mb-1.5 ${isGtmTrack ? "text-[#B0BEC5]" : "text-gray-700 dark:text-gray-300"}`}
            >
              אימייל
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
              placeholder="you@example.com"
              className={`w-full px-4 py-2.5 rounded-lg border outline-none transition-all placeholder:text-gray-400 ${
                isGtmTrack
                  ? "border-[#1E2D45] bg-[#161D2B] text-[#F0F6FF] focus:border-[#00FF88]"
                  : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              }`}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className={`block text-sm font-medium mb-1.5 ${isGtmTrack ? "text-[#B0BEC5]" : "text-gray-700 dark:text-gray-300"}`}
            >
              סיסמה
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 pl-11 rounded-lg border outline-none transition-all placeholder:text-gray-400 ${
                  isGtmTrack
                    ? "border-[#1E2D45] bg-[#161D2B] text-[#F0F6FF] focus:border-[#00FF88]"
                    : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 px-4 font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed ${
              isGtmTrack
                ? "text-[#080A0F] font-bold disabled:opacity-60"
                : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white"
            }`}
            style={isGtmTrack ? {
              background: loading ? "#1E2D45" : "linear-gradient(135deg, #00FF88, #00CC6A)",
              boxShadow: loading ? "none" : "0 2px 12px rgba(0,255,136,0.3)",
            } : undefined}
          >
            {loading
              ? "..."
              : isLogin
                ? "התחבר"
                : isGtmTrack
                  ? "הירשם והתחל את מסע ה-GTM"
                  : "הירשם חינם"}
          </button>

          {/* Forgot Password Link */}
          {isLogin && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setForgotMode(true); setForgotEmail(email); }}
                className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                שכחת סיסמה?
              </button>
            </div>
          )}
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className={`flex-1 h-px ${isGtmTrack ? "bg-[#1E2D45]" : "bg-gray-200 dark:bg-gray-700"}`} />
          <span className={`text-xs ${isGtmTrack ? "text-[#3D4F6F]" : "text-gray-400 dark:text-gray-500"}`}>או</span>
          <div className={`flex-1 h-px ${isGtmTrack ? "bg-[#1E2D45]" : "bg-gray-200 dark:bg-gray-700"}`} />
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
            isGtmTrack
              ? "bg-[#161D2B] hover:bg-[#1E2D45] border border-[#1E2D45] text-[#B0BEC5]"
              : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
          }`}
        >
          {googleLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          {isLogin ? "התחבר עם Google" : "הירשם עם Google"}
        </button>

        {/* Bottom toggle */}
        <p className={`text-center text-sm mt-6 ${isGtmTrack ? "text-[#6B7FA3]" : "text-gray-500 dark:text-gray-400"}`}>
          {isLogin ? "עדיין אין לך חשבון?" : "כבר יש לך חשבון?"}{" "}
          <button
            type="button"
            onClick={() => switchTab(isLogin ? "signup" : "login")}
            className={`font-medium cursor-pointer ${isGtmTrack ? "text-[#00FF88] hover:text-[#00CC6A]" : "text-blue-600 hover:text-blue-700 dark:text-blue-400"}`}
          >
            {isLogin ? "הרשמה חינם" : "התחבר"}
          </button>
        </p>
      </div>
    </div>
  );
}
