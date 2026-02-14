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
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load saved progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { step: savedStep, answers: savedAnswers } = JSON.parse(saved);
        setStep(savedStep ?? 0);
        setAnswers(savedAnswers ?? {});
      } catch {
        // ignore corrupted data
      }
    }
  }, []);

  // Save progress to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, answers }));
  }, [step, answers]);

  const currentQuestion = questions[step];
  const currentAnswer = answers[currentQuestion.id] ?? "";
  const isLast = step === questions.length - 1;

  const validate = (): boolean => {
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
    setStep((s) => Math.max(0, s - 1));
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
          name: answers[1]?.slice(0, 60) || "פרויקט חדש",
          answers: answersArray,
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
      <StepIndicator current={step + 1} total={questions.length} />

      <QuestionCard
        key={currentQuestion.id}
        question={currentQuestion}
        value={currentAnswer}
        onChange={handleAnswerChange}
        error={error}
      />

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handlePrev}
          disabled={step === 0}
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
