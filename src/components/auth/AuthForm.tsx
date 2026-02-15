"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup">(mode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

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
          setError(authError.message);
          return;
        }
        router.push("/dashboard");
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) {
          setError(authError.message);
          return;
        }

        // Save full name to user_profiles
        if (data.user) {
          await supabase.from("user_profiles").upsert({
            user_id: data.user.id,
            full_name: fullName.trim(),
          });
        }

        // If session exists, user is immediately logged in (no email confirmation needed)
        if (data.session) {
          router.push("/dashboard");
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

  const switchTab = (tab: "login" | "signup") => {
    setActiveTab(tab);
    setError("");
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

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Image src="/logo-fbm.png" alt="FBM Studio" width={80} height={80} className="rounded" />
          </div>
          <h1 className="text-3xl font-bold mb-1">FBM Studio</h1>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-6">
          <button
            type="button"
            onClick={() => switchTab("signup")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              !isLogin
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
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
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            התחברות
          </button>
        </div>

        {/* Subtitle */}
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-5">
          {isLogin
            ? "התחבר לחשבון הקיים שלך"
            : "צור חשבון חדש ב-FBM Studio — בחינם!"}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300"
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
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300"
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
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300"
            >
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
            />
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
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loading
              ? "..."
              : isLogin
                ? "התחבר"
                : "הירשם חינם"}
          </button>
        </form>

        {/* Bottom toggle */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {isLogin ? "עדיין אין לך חשבון?" : "כבר יש לך חשבון?"}{" "}
          <button
            type="button"
            onClick={() => switchTab(isLogin ? "signup" : "login")}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium cursor-pointer"
          >
            {isLogin ? "הרשמה חינם" : "התחבר"}
          </button>
        </p>
      </div>
    </div>
  );
}
