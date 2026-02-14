"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { questions, type QuestionnaireAnswers } from "@/lib/questions";
import StepIndicator from "@/components/questionnaire/StepIndicator";
import QuestionCard from "@/components/questionnaire/QuestionCard";

const STORAGE_KEY = "fbm_questionnaire_progress";

export default function QuestionnairePage() {
  const router = useRouter();
  const [step, setStep] = useState(-1); // -1 = name step, 0+ = questions
  const [ownerName, setOwnerName] = useState("");
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { step: savedStep, answers: savedAnswers, ownerName: savedName } = JSON.parse(saved);
        setStep(savedStep ?? -1);
        setAnswers(savedAnswers ?? {});
        setOwnerName(savedName ?? "");
      } catch {
        // ignore corrupted data
      }
    }
  }, []);

  // Save progress to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, answers, ownerName }));
  }, [step, answers, ownerName]);

  const isNameStep = step === -1;
  const currentQuestion = isNameStep ? null : questions[step];
  const currentAnswer = currentQuestion ? (answers[currentQuestion.id] ?? "") : "";
  const isLast = step === questions.length - 1;

  const validate = (): boolean => {
    if (isNameStep) {
      if (ownerName.trim().length < 2) {
        setError("נא להזין שם מלא");
        return false;
      }
      setError("");
      return true;
    }
    if (currentAnswer.trim().length < 10) {
      setError("התשובה חייבת להכיל לפחות 10 תווים");
      return false;
    }
    setError("");
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (isLast) {
      handleSubmit();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setError("");
    setStep((s) => Math.max(-1, s - 1));
  };

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    if (error) setError("");
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const userName = ownerName.trim();

      // Build answers map for AI prompts (id → answer text)
      const answersMap: Record<string, string> = {};
      questions.forEach((q) => {
        answersMap[q.id] = answers[q.id] ?? "";
      });

      // Build answers array for storage
      const answersArray = questions.map((q) => ({
        question_id: q.id,
        section: q.section,
        title: q.title,
        text: q.text,
        answer: answers[q.id] ?? "",
      }));

      const { data, error: dbError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: answers["1"]?.slice(0, 60) || "פרויקט חדש",
          answers: answersArray,
          user_name: userName,
          answers_map: answersMap,
          status: "pending",
        })
        .select("id")
        .single();

      if (dbError) throw dbError;

      // Clear saved progress
      localStorage.removeItem(STORAGE_KEY);

      // Redirect to results page
      router.push(`/results/${data.id}`);
    } catch (err) {
      console.error("Submit error:", err);
      setError("אירעה שגיאה בשמירה. נסה שוב.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator current={step + 2} total={questions.length + 1} />

      {isNameStep ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6" dir="rtl">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            לפני שמתחילים
          </span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-2 mb-2">
            מה השם של בעל העסק?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            השם ישמש לבניית מסמך האסטרטגיה האישי
          </p>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => {
              setOwnerName(e.target.value);
              if (error) setError("");
            }}
            placeholder="לדוגמה: דודי כהן"
            dir="rtl"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg"
          />
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>
      ) : (
        <QuestionCard
          key={currentQuestion!.id}
          question={currentQuestion!}
          value={currentAnswer}
          onChange={handleAnswerChange}
          error={error}
        />
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handlePrev}
          disabled={step === -1}
          className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          הקודם ←
        </button>

        <button
          onClick={handleNext}
          disabled={submitting}
          className={`flex items-center gap-1 px-6 py-2.5 rounded-xl font-semibold text-white transition-all cursor-pointer ${
            isLast
              ? "bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg"
              : "bg-blue-600 hover:bg-blue-700"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {submitting
            ? "שומר..."
            : isLast
              ? "סיום ושליחה ל-AI 🚀"
              : "→ הבא"}
        </button>
      </div>
    </div>
  );
}
