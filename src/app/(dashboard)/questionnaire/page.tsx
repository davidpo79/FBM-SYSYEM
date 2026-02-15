"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getQuestions, type QuestionnaireAnswers } from "@/lib/questions";
import StepIndicator from "@/components/questionnaire/StepIndicator";
import QuestionCard from "@/components/questionnaire/QuestionCard";
import AudioRecorder from "@/components/questionnaire/AudioRecorder";
import AudioUploader from "@/components/questionnaire/AudioUploader";
import TranscriptionProgress from "@/components/questionnaire/TranscriptionProgress";
import AnswerReview from "@/components/questionnaire/AnswerReview";

const STORAGE_KEY = "fbm_questionnaire_progress";

type Mode = "manual" | "record" | "upload";
type FlowStage =
  | "name"
  | "niche"
  | "modeSelect"
  | "recording"
  | "uploading"
  | "processing"
  | "review"
  | "manual";

export default function QuestionnairePage() {
  const router = useRouter();

  // Core state
  const [ownerName, setOwnerName] = useState("");
  const [ownerNiche, setOwnerNiche] = useState("");
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Flow state
  const [flowStage, setFlowStage] = useState<FlowStage>("name");
  const [mode, setMode] = useState<Mode | null>(null);
  const [manualStep, setManualStep] = useState(0); // 0-based index into questions

  // Audio/transcription state
  const [transcript, setTranscript] = useState("");
  const [processingStage, setProcessingStage] = useState<
    "transcribing" | "extracting" | "filling" | "done"
  >("transcribing");
  const [processingError, setProcessingError] = useState("");
  const [extractedData, setExtractedData] = useState<{
    answers: Record<string, string>;
    confidence: Record<string, number>;
    summary: string;
  } | null>(null);

  const questions = getQuestions(ownerNiche);

  // Compute step indicator progress
  const getProgress = () => {
    switch (flowStage) {
      case "name":
        return { current: 1, total: questions.length + 3 };
      case "niche":
        return { current: 2, total: questions.length + 3 };
      case "modeSelect":
        return { current: 3, total: questions.length + 3 };
      case "recording":
      case "uploading":
        return { current: 4, total: questions.length + 3 };
      case "processing":
        return { current: 5, total: questions.length + 3 };
      case "review":
        return { current: questions.length + 2, total: questions.length + 3 };
      case "manual":
        return {
          current: manualStep + 4,
          total: questions.length + 3,
        };
      default:
        return { current: 1, total: questions.length + 3 };
    }
  };

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setOwnerName(data.ownerName ?? "");
        setOwnerNiche(data.ownerNiche ?? "");
        setAnswers(data.answers ?? {});
        if (data.flowStage) setFlowStage(data.flowStage);
        if (data.manualStep !== undefined) setManualStep(data.manualStep);
        if (data.mode) setMode(data.mode);
      } catch {
        // ignore
      }
    }
  }, []);

  // Save progress
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ownerName,
        ownerNiche,
        answers,
        flowStage:
          flowStage === "processing" || flowStage === "recording" || flowStage === "uploading"
            ? "modeSelect"
            : flowStage,
        manualStep,
        mode,
      }),
    );
  }, [ownerName, ownerNiche, answers, flowStage, manualStep, mode]);

  // Handle audio processing (transcribe -> extract)
  const processAudio = useCallback(
    async (audioData: Blob | File) => {
      setFlowStage("processing");
      setProcessingError("");
      setProcessingStage("transcribing");

      try {
        // Step 1: Transcribe
        const formData = new FormData();
        formData.append("audio", audioData);

        const transRes = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!transRes.ok) {
          const err = await transRes.json().catch(() => ({}));
          throw new Error(err.error || "שגיאה בתמלול");
        }

        const { transcript: text } = await transRes.json();
        setTranscript(text);
        setProcessingStage("extracting");

        // Step 2: Extract answers
        const extractRes = await fetch("/api/extract-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: text,
            ownerName,
            ownerNiche,
          }),
        });

        if (!extractRes.ok) {
          const err = await extractRes.json().catch(() => ({}));
          throw new Error(err.error || "שגיאה בחילוץ");
        }

        const extracted = await extractRes.json();
        setExtractedData(extracted);
        setProcessingStage("filling");

        // Brief delay to show filling stage
        await new Promise((r) => setTimeout(r, 800));
        setProcessingStage("done");

        // Move to review
        setFlowStage("review");
      } catch (err) {
        setProcessingError(
          err instanceof Error ? err.message : "שגיאה בעיבוד ההקלטה",
        );
      }
    },
    [ownerName, ownerNiche],
  );

  // Submit project
  const handleSubmit = async (finalAnswers?: QuestionnaireAnswers) => {
    const answersToUse = finalAnswers || answers;
    setSubmitting(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const userName = ownerName.trim();
      const niche = ownerNiche.trim() || null;

      // Build answers map
      const answersMap: Record<string, string> = {};
      questions.forEach((q) => {
        answersMap[q.id] = answersToUse[q.id] ?? "";
      });

      // Build answers array
      const answersArray = questions.map((q) => ({
        question_id: q.id,
        section: q.section,
        title: q.title,
        text: q.text,
        answer: answersToUse[q.id] ?? "",
      }));

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        name: answersToUse["1"]?.slice(0, 60) || "פרויקט חדש",
        answers: answersArray,
        user_name: userName,
        answers_map: answersMap,
        owner_niche: niche,
        status: "pending",
      };

      // Save transcript if available
      if (transcript) {
        insertData.transcript = transcript;
      }

      const { data, error: dbError } = await supabase
        .from("projects")
        .insert(insertData)
        .select("id")
        .single();

      if (dbError) throw dbError;

      localStorage.removeItem(STORAGE_KEY);
      router.push(`/project/${data.id}/strategy`);
    } catch (err) {
      console.error("Submit error:", err);
      setError("אירעה שגיאה בשמירה. נסה שוב.");
      setSubmitting(false);
    }
  };

  // Manual mode navigation
  const currentQuestion = flowStage === "manual" ? questions[manualStep] : null;
  const currentAnswer = currentQuestion
    ? (answers[currentQuestion.id] ?? "")
    : "";
  const isLastManualStep = manualStep === questions.length - 1;

  const validateManual = (): boolean => {
    if (currentAnswer.trim().length < 10) {
      setError("התשובה חייבת להכיל לפחות 10 תווים");
      return false;
    }
    setError("");
    return true;
  };

  const handleManualNext = () => {
    if (!validateManual()) return;
    if (isLastManualStep) {
      handleSubmit();
    } else {
      setManualStep((s) => s + 1);
      setError("");
    }
  };

  const handleManualPrev = () => {
    setError("");
    if (manualStep === 0) {
      setFlowStage("modeSelect");
    } else {
      setManualStep((s) => s - 1);
    }
  };

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    if (error) setError("");
  };

  const progress = getProgress();

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator current={progress.current} total={progress.total} />

      {/* ─── Step: Name ─── */}
      {flowStage === "name" && (
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 animate-in"
          dir="rtl"
        >
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
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={() => {
                if (ownerName.trim().length < 2) {
                  setError("נא להזין שם מלא");
                  return;
                }
                setError("");
                setFlowStage("niche");
              }}
              className="px-6 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer"
            >
              → הבא
            </button>
          </div>
        </div>
      )}

      {/* ─── Step: Niche ─── */}
      {flowStage === "niche" && (
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 animate-in"
          dir="rtl"
        >
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            התאמה אישית
          </span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-2 mb-2">
            מה בעל העסק עושה?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            הנישה תשמש להתאמת השאלות לתחום הספציפי שלך
          </p>
          <input
            type="text"
            value={ownerNiche}
            onChange={(e) => {
              setOwnerNiche(e.target.value);
              if (error) setError("");
            }}
            placeholder="למשל: מאמן כושר, יועצת משכנתאות, קוסמטיקאית, עורך דין..."
            dir="rtl"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1">
            <span>💡</span>
            <span>
              אם אתה משווק FBM שממלא עבור עצמו — השאר ריק
            </span>
          </p>

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={() => setFlowStage("name")}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              הקודם ←
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setFlowStage("modeSelect");
              }}
              className="px-6 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer"
            >
              → הבא
            </button>
          </div>
        </div>
      )}

      {/* ─── Step: Mode Select ─── */}
      {flowStage === "modeSelect" && (
        <div dir="rtl" className="space-y-4 animate-in">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              🎙️ איך תרצה למלא את השאלון?
            </h2>
          </div>

          {/* Record */}
          <button
            type="button"
            onClick={() => {
              setMode("record");
              setFlowStage("recording");
            }}
            className="w-full text-right card-elevated p-5 cursor-pointer transition-all hover:!border-[var(--gold)] group"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">🎙️</div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--gold)] transition-colors">
                  הקלטה בזמן אמת
                </h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  לחץ הקלט ודבר עם בעל העסק. המערכת תתמלל ותמלא
                  אוטומטית
                </p>
              </div>
            </div>
          </button>

          {/* Upload */}
          <button
            type="button"
            onClick={() => {
              setMode("upload");
              setFlowStage("uploading");
            }}
            className="w-full text-right card-elevated p-5 cursor-pointer transition-all hover:!border-[var(--gold)] group"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">📁</div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--gold)] transition-colors">
                  העלאת הקלטה
                </h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  כבר הקלטת? העלה mp3/wav/m4a
                </p>
              </div>
            </div>
          </button>

          {/* Manual */}
          <button
            type="button"
            onClick={() => {
              setMode("manual");
              setManualStep(0);
              setFlowStage("manual");
            }}
            className="w-full text-right card-elevated p-5 cursor-pointer transition-all hover:!border-[var(--gold)] group"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">⌨️</div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--gold)] transition-colors">
                  הקלדה ידנית
                </h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  מלא את השאלון שאלה-שאלה
                </p>
              </div>
            </div>
          </button>

          <div className="flex justify-start mt-4">
            <button
              type="button"
              onClick={() => setFlowStage("niche")}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              הקודם ←
            </button>
          </div>
        </div>
      )}

      {/* ─── Recording mode ─── */}
      {flowStage === "recording" && (
        <div className="animate-in">
          <AudioRecorder
            ownerNiche={ownerNiche}
            onRecordingComplete={(blob) => processAudio(blob)}
          />
          <div className="flex justify-start mt-4">
            <button
              type="button"
              onClick={() => setFlowStage("modeSelect")}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              הקודם ←
            </button>
          </div>
        </div>
      )}

      {/* ─── Upload mode ─── */}
      {flowStage === "uploading" && (
        <div className="animate-in">
          <AudioUploader
            onFileSelected={(file) => processAudio(file)}
          />
          <div className="flex justify-start mt-4">
            <button
              type="button"
              onClick={() => setFlowStage("modeSelect")}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              הקודם ←
            </button>
          </div>
        </div>
      )}

      {/* ─── Processing ─── */}
      {flowStage === "processing" && (
        <TranscriptionProgress
          stage={processingStage}
          error={processingError}
          onRetry={() => {
            setFlowStage(mode === "record" ? "recording" : "uploading");
          }}
          onSwitchToManual={() => {
            setMode("manual");
            setManualStep(0);
            setFlowStage("manual");
          }}
        />
      )}

      {/* ─── Review extracted answers ─── */}
      {flowStage === "review" && extractedData && (
        <AnswerReview
          ownerNiche={ownerNiche}
          extractedData={extractedData}
          onApprove={(finalAnswers) => handleSubmit(finalAnswers)}
          onRecordMore={() => {
            setFlowStage(
              mode === "record" ? "recording" : "uploading",
            );
          }}
        />
      )}

      {/* ─── Manual mode — question-by-question ─── */}
      {flowStage === "manual" && currentQuestion && (
        <>
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            value={currentAnswer}
            onChange={handleAnswerChange}
            error={error}
          />

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={handleManualPrev}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              הקודם ←
            </button>

            <button
              type="button"
              onClick={handleManualNext}
              disabled={submitting}
              className={`flex items-center gap-1 px-6 py-2.5 rounded-xl font-semibold text-white transition-all cursor-pointer ${
                isLastManualStep
                  ? "bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg"
                  : "bg-blue-600 hover:bg-blue-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting
                ? "שומר..."
                : isLastManualStep
                  ? "סיום ושליחה ל-AI 🚀"
                  : "→ הבא"}
            </button>
          </div>
        </>
      )}

      {/* Global error */}
      {error &&
        flowStage !== "name" &&
        flowStage !== "manual" && (
          <p className="text-red-500 text-sm mt-3 text-center">{error}</p>
        )}
    </div>
  );
}
