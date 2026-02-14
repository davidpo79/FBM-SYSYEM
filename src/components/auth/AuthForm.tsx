"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface AuthFormProps {
  mode: "login" | "signup";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            חזור לדף ההתחברות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🎯 FBM Studio</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isLogin ? "התחבר לחשבון שלך" : "צור חשבון חדש"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
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
                : "הירשם"}
          </button>
        </form>

        {/* Toggle link */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {isLogin ? "עדיין אין לך חשבון?" : "כבר יש לך חשבון?"}{" "}
          <Link
            href={isLogin ? "/signup" : "/login"}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
          >
            {isLogin ? "הירשם" : "התחבר"}
          </Link>
        </p>
      </div>
    </div>
  );
}
