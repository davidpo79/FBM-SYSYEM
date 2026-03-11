"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
import { getQuestions, getGTMQuestions, type QuestionnaireAnswers } from "@/lib/questions";
import StepIndicator from "@/components/questionnaire/StepIndicator";
import QuestionCard from "@/components/questionnaire/QuestionCard";
import QuestionRecordCard from "@/components/questionnaire/QuestionRecordCard";
import AudioUploader from "@/components/questionnaire/AudioUploader";
import TranscriptionProgress from "@/components/questionnaire/TranscriptionProgress";
import AnswerReview from "@/components/questionnaire/AnswerReview";

const STORAGE_KEY = "fbm_questionnaire_progress";

type Mode = "manual" | "record" | "upload";
type ProjectMode = "self" | "client" | "owner";
type FlowStage =
  | "projectMode"
  | "name"
  | "niche"
  | "modeSelect"
  | "recording"
  | "uploading"
  | "uploadDoc"
  | "analyzingDoc"
  | "processing"
  | "review"
  | "manual"
  | "booking";

export default function QuestionnairePage() {
  const router = useRouter();

  // Core state
  const [projectMode, setProjectMode] = useState<ProjectMode>("client");
  const [ownerName, setOwnerName] = useState("");
  const [ownerNiche, setOwnerNiche] = useState("");
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Booking state (token users only)
  const [isTokenUser, setIsTokenUser] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Flow state
  const [flowStage, setFlowStage] = useState<FlowStage>("projectMode");
  const [mode, setMode] = useState<Mode | null>(null);
  const [manualStep, setManualStep] = useState(0); // 0-based index into questions

  // Track state (fbm or gtm)
  const [track, setTrack] = useState<"fbm" | "gtm">("fbm");
  const [ideaName, setIdeaName] = useState("");

  // Document upload state
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docAnalyzing, setDocAnalyzing] = useState(false);
  const [docError, setDocError] = useState("");

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

  const isGtm = track === "gtm";
  const questions = isGtm ? getGTMQuestions() : getQuestions(ownerNiche, projectMode);

  // Listen for GHL booking confirmation from iframe
  useEffect(() => {
    if (flowStage !== "booking") return;
    function handleMessage(event: MessageEvent) {
      if (
        event.data &&
        (event.data.type === "booking_confirmed" ||
          event.data === "booking_confirmed")
      ) {
        setBookingConfirmed(true);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [flowStage]);

  // Compute step indicator progress
  const getProgress = (): { current: number; total: number; label?: string } => {
    const total = questions.length + 4;
    switch (flowStage) {
      case "projectMode":
        return { current: 1, total, label: "סוג פרויקט" };
      case "name":
        return { current: 2, total, label: "שלב 1 מתוך 3" };
      case "niche":
        return { current: 3, total, label: "שלב 2 מתוך 3" };
      case "modeSelect":
        return { current: 4, total, label: "שלב 3 מתוך 3 — בחירת שיטה" };
      case "recording":
      case "uploading":
      case "uploadDoc":
        return { current: 5, total };
      case "analyzingDoc":
      case "processing":
        return { current: 6, total, label: "מעבד..." };
      case "review":
        return { current: questions.length + 3, total, label: "סקירת תשובות" };
      case "booking":
        return { current: total, total, label: "קביעת פגישה" };
      case "manual": {
        const q = questions[manualStep];
        return {
          current: manualStep + 5,
          total,
          label: `שאלה ${manualStep + 1} מתוך ${questions.length} | ${q?.sectionTitle ?? ""}`,
        };
      }
      default:
        return { current: 1, total };
    }
  };

  // Load saved progress (or clear if ?new=true)
  useEffect(() => {
    // Check if user came via welcome token
    if (localStorage.getItem("fbm_is_token_user") === "true") {
      setIsTokenUser(true);
    }

    const params = new URLSearchParams(window.location.search);

    // Detect GTM track from URL
    if (params.get("track") === "gtm") {
      setTrack("gtm");
      setProjectMode("owner"); // GTM is always the entrepreneur themselves
      setFlowStage("name"); // Skip projectMode selection for GTM

      // Read idea name from URL param
      const ideaParam = params.get("idea");
      if (ideaParam) {
        const decoded = decodeURIComponent(ideaParam);
        setIdeaName(decoded);
        // Pre-fill question 2 (Product/Solution) with the idea name from URL
        setAnswers((prev) => ({ ...prev, "2": prev["2"] || decoded }));
      }

      // Pre-fill from Ideator lead magnet if available
      try {
        const ideatorData = localStorage.getItem("gtm-ideator-selected");
        if (ideatorData) {
          const idea = JSON.parse(ideatorData);
          if (idea.name && !ideaParam) setIdeaName(idea.name);
          setAnswers((prev) => ({
            ...prev,
            // Question 1: "הבעיה" — pre-fill with the idea's niche/pitch
            ...(idea.niche ? { "1": prev["1"] || `הבעיה שאני פותר: ${idea.pitch}\nקהל יעד: ${idea.niche}` } : {}),
            // Question 2: "הפתרון שלך" — pre-fill with the idea name and APIs
            ...(idea.name ? { "2": prev["2"] || `${idea.name}${idea.apisUsed ? ` — פתרון המבוסס על ${idea.apisUsed.join(", ")}` : ""}` } : {}),
          }));
          // Clean up so it doesn't pre-fill again on next visit
          localStorage.removeItem("gtm-ideator-selected");
        }
      } catch { /* ignore */ }
    }

    if (params.get("new") === "true") {
      localStorage.removeItem(STORAGE_KEY);
      window.history.replaceState({}, "", "/questionnaire");
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.projectMode) setProjectMode(data.projectMode);
        setOwnerName(data.ownerName ?? "");
        setOwnerNiche(data.ownerNiche ?? "");
        setAnswers(data.answers ?? {});
        if (data.flowStage && data.flowStage !== "booking") setFlowStage(data.flowStage);
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
        projectMode,
        ownerName,
        ownerNiche,
        answers,
        flowStage:
          flowStage === "processing" || flowStage === "recording" || flowStage === "uploading" || flowStage === "uploadDoc" || flowStage === "analyzingDoc"
            ? "modeSelect"
            : flowStage,
        manualStep,
        mode,
      }),
    );
  }, [projectMode, ownerName, ownerNiche, answers, flowStage, manualStep, mode]);

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
            projectMode,
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

  // Handle document upload and analysis
  const processDocument = useCallback(
    async (file: File) => {
      setFlowStage("analyzingDoc");
      setDocAnalyzing(true);
      setDocError("");

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("ownerName", ownerName);
        formData.append("ownerNiche", ownerNiche);
        formData.append("projectMode", projectMode);

        const res = await fetch("/api/analyze-questionnaire", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "שגיאה בניתוח השאלון");
        }

        const extracted = await res.json();
        setExtractedData(extracted);

        if (extracted.documentText) {
          setTranscript(extracted.documentText);
        }

        // Go directly to review
        setFlowStage("review");
      } catch (err) {
        setDocError(
          err instanceof Error ? err.message : "שגיאה בניתוח השאלון"
        );
        setFlowStage("uploadDoc");
      } finally {
        setDocAnalyzing(false);
      }
    },
    [ownerName, ownerNiche, projectMode],
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

      // Build answers map (include project mode as metadata)
      const answersMap: Record<string, string> = {
        _project_mode: projectMode,
      };
      questions.forEach((q) => {
        answersMap[q.id] = answersToUse[q.id] ?? "";
      });

      // Build answers array (use sectionTitle for human-readable section names in DB)
      const answersArray = questions.map((q) => ({
        question_id: q.id,
        section: q.sectionTitle,
        title: q.title,
        text: q.text,
        answer: answersToUse[q.id] ?? "",
      }));

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        name: answersToUse["1"]?.slice(0, 60) || (track === "gtm" ? "GTM Project" : "פרויקט חדש"),
        answers: answersArray,
        user_name: userName,
        answers_map: answersMap,
        owner_niche: niche,
        status: "pending",
        track,
      };

      // For GTM track: extract structured onboarding data for the AI strategy generator
      if (isGtm) {
        insertData.gtm_onboarding_data = {
          idea_name: ideaName || answersToUse["2"]?.slice(0, 120) || "",
          pain_point: answersToUse["1"] || "",
          uvp: answersToUse["2"] || "",
          origin_story: answersToUse["3"] || "",
          icp: answersToUse["4"] || "",
          market_size: answersToUse["5"] || "",
          competitive_landscape: answersToUse["6"] || "",
          revenue_model: answersToUse["7"] || "",
          distribution_channels: answersToUse["8"] || "",
          validation_status: answersToUse["9"] || "",
          launch_goals: answersToUse["10"] || "",
        };
      }

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

      // Token users see booking after questionnaire
      if (isTokenUser) {
        setSavedProjectId(data.id);
        setFlowStage("booking");
        setSubmitting(false);
        return;
      }

      router.push(track === "gtm" ? `/project/${data.id}/gtm-strategy` : `/project/${data.id}/strategy`);
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
      <StepIndicator current={progress.current} total={progress.total} label={progress.label} track={track} ideaName={ideaName} />

      {/* ─── Step: Project Mode ─── */}
      {flowStage === "projectMode" && (
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6 animate-in"
          dir="rtl"
        >
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            לפני שמתחילים
          </span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-2 mb-2">
            למי בונים את הפרויקט?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            בחר את סוג הפרויקט כדי שנתאים את כל התהליך
          </p>

          <div className="space-y-3">
            {/* Client mode */}
            <button
              type="button"
              onClick={() => {
                setProjectMode("client");
                setFlowStage("name");
              }}
              className={`w-full text-right p-5 rounded-xl border-2 transition-all cursor-pointer ${
                projectMode === "client"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">👤</div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    בניית פרויקט ללקוח
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    אני משווק FBM ובונה פרויקט עבור בעל עסק (לקוח שלי)
                  </p>
                </div>
              </div>
            </button>

            {/* Self mode */}
            <button
              type="button"
              onClick={() => {
                setProjectMode("self");
                setFlowStage("name");
              }}
              className={`w-full text-right p-5 rounded-xl border-2 transition-all cursor-pointer ${
                projectMode === "self"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">🚀</div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    בניית פרויקט לעצמי
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    אני משווק FBM ובונה את העסק השיווקי שלי — מוכר שירותי שיווק
                  </p>
                </div>
              </div>
            </button>

            {/* Owner mode */}
            <button
              type="button"
              onClick={() => {
                setProjectMode("owner");
                setFlowStage("name");
              }}
              className={`w-full text-right p-5 rounded-xl border-2 transition-all cursor-pointer ${
                projectMode === "owner"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">💼</div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    אני בעל עסק שירות
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    אני בעל עסק ורוצה לבנות לעצמי שיווק מבוסס תדר
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ─── Step: Name ─── */}
      {flowStage === "name" && (
        <div
          className={`rounded-2xl shadow-lg border p-6 animate-in ${
            isGtm ? "bg-[#0D1117] border-[#1E2D45]" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          }`}
          dir="rtl"
        >
          <span className={`text-xs font-semibold uppercase tracking-wide ${isGtm ? "text-[#00FF88]" : "text-blue-600"}`}>
            {isGtm ? "שלב אחרון לפני האסטרטגיה" : projectMode === "client" ? "לפני שמתחילים" : "הפרטים שלך"}
          </span>
          <h2 className={`text-xl font-bold mt-2 mb-2 ${isGtm ? "text-[#F0F6FF]" : "text-gray-900 dark:text-gray-100"}`}>
            {projectMode === "client" ? "מה השם של בעל העסק?" : "מה השם שלך?"}
          </h2>
          <p className={`text-sm mb-4 ${isGtm ? "text-[#B0BEC5]" : "text-gray-500 dark:text-gray-400"}`}>
            {isGtm
              ? "השם שלך ישמש לבניית תוכנית ה-GTM האישית"
              : projectMode === "client"
                ? "השם ישמש לבניית מסמך האסטרטגיה האישי"
                : "השם שלך ישמש לבניית מסמך האסטרטגיה האישי"}
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
            className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-lg ${
              isGtm
                ? "border-[#1E2D45] bg-[#161D2B] text-[#F0F6FF] focus:border-[#00FF88] placeholder:text-[#3D4F6F]"
                : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <div className="flex items-center justify-between mt-6">
            {!isGtm ? (
              <button
                type="button"
                onClick={() => setFlowStage("projectMode")}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                הקודם ←
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={() => {
                if (ownerName.trim().length < 2) {
                  setError("נא להזין שם מלא");
                  return;
                }
                setError("");
                if (isGtm) {
                  setFlowStage("modeSelect");
                } else {
                  setFlowStage(projectMode === "self" ? "modeSelect" : "niche");
                }
              }}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all cursor-pointer ${
                isGtm
                  ? "text-[#080A0F] font-bold"
                  : "text-white bg-blue-600 hover:bg-blue-700"
              }`}
              style={isGtm ? { background: "linear-gradient(135deg, #00FF88, #00CC6A)", boxShadow: "0 2px 12px rgba(0,255,136,0.3)" } : undefined}
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
            {projectMode === "self"
              ? "מה תחום השיווק שלך?"
              : projectMode === "owner"
                ? "מה אתה עושה?"
                : "מה בעל העסק עושה?"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {projectMode === "self"
              ? "הנישה תשמש להתאמת האסטרטגיה לתחום שלך"
              : projectMode === "owner"
                ? "התחום שלך ישמש להתאמת כל התהליך עבורך"
                : "הנישה תשמש להתאמת השאלות לתחום הספציפי שלך"}
          </p>
          <input
            type="text"
            value={ownerNiche}
            onChange={(e) => {
              setOwnerNiche(e.target.value);
              if (error) setError("");
            }}
            placeholder={projectMode === "self"
              ? "למשל: מאמני כושר, יועצי משכנתאות, עורכי דין..."
              : "למשל: מאמן כושר, יועצת משכנתאות, קוסמטיקאית, עורך דין..."
            }
            dir="rtl"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg"
          />

          {projectMode === "self" && (
            <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                הזן את תחום היעד שלך — למי אתה מוכר את שירותי השיווק שלך
              </p>
            </div>
          )}

          {projectMode === "owner" && (
            <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                הזן את התחום שלך — מה העסק שלך עושה. למשל: מאמן כושר, יועץ משכנתאות, מעצבת פנים
              </p>
            </div>
          )}

          {ownerNiche.trim() && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center gap-1">
              <span>💡</span>
              <span>
                {projectMode === "self"
                  ? `האסטרטגיה תותאם למכירת שירותי שיווק ל${ownerNiche.trim()}`
                  : projectMode === "owner"
                    ? `התהליך יותאם עבורך כ${ownerNiche.trim()}`
                    : `השאלון יותאם ל${ownerNiche.trim()} — מלא את התשובות כאילו בעל העסק מדבר`}
              </span>
            </p>
          )}

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
            <h2 className={`text-xl font-bold ${isGtm ? "text-[#F0F6FF]" : "text-[var(--text-primary)]"}`}>
              {isGtm
                ? `איך תרצה למלא את שאלון ה-GTM${ideaName ? ` עבור ${ideaName}` : ""}?`
                : "🎙️ איך תרצה למלא את השאלון?"}
            </h2>
            {isGtm && (
              <p className="text-sm text-[#6B7FA3] mt-2">
                10 שאלות קצרות שיעזרו ל-AI לייצר לך תוכנית GTM מותאמת אישית
              </p>
            )}
          </div>

          {/* Record */}
          <button
            type="button"
            onClick={() => {
              setMode("record");
              setManualStep(0);
              setFlowStage("manual");
            }}
            className={`w-full text-right p-5 cursor-pointer transition-all group rounded-2xl border ${
              isGtm
                ? "bg-[#0D1117] border-[#1E2D45] hover:border-[#00FF88]"
                : "card-elevated hover:!border-[var(--gold)]"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">🎙️</div>
              <div>
                <h3 className={`text-base font-bold transition-colors ${
                  isGtm ? "text-[#F0F6FF] group-hover:text-[#00FF88]" : "text-[var(--text-primary)] group-hover:text-[var(--gold)]"
                }`}>
                  הקלטה שאלה-שאלה
                </h3>
                <p className={`text-sm mt-0.5 ${isGtm ? "text-[#6B7FA3]" : "text-[var(--text-muted)]"}`}>
                  הקלט תשובה לכל שאלה בנפרד. התמלול נשמר אוטומטית
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
            className={`w-full text-right p-5 cursor-pointer transition-all group rounded-2xl border ${
              isGtm
                ? "bg-[#0D1117] border-[#1E2D45] hover:border-[#00FF88]"
                : "card-elevated hover:!border-[var(--gold)]"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">📁</div>
              <div>
                <h3 className={`text-base font-bold transition-colors ${
                  isGtm ? "text-[#F0F6FF] group-hover:text-[#00FF88]" : "text-[var(--text-primary)] group-hover:text-[var(--gold)]"
                }`}>
                  העלאת הקלטה
                </h3>
                <p className={`text-sm mt-0.5 ${isGtm ? "text-[#6B7FA3]" : "text-[var(--text-muted)]"}`}>
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
            className={`w-full text-right p-5 cursor-pointer transition-all group rounded-2xl border ${
              isGtm
                ? "bg-[#0D1117] border-[#1E2D45] hover:border-[#00FF88]"
                : "card-elevated hover:!border-[var(--gold)]"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">⌨️</div>
              <div>
                <h3 className={`text-base font-bold transition-colors ${
                  isGtm ? "text-[#F0F6FF] group-hover:text-[#00FF88]" : "text-[var(--text-primary)] group-hover:text-[var(--gold)]"
                }`}>
                  הקלדה ידנית
                </h3>
                <p className={`text-sm mt-0.5 ${isGtm ? "text-[#6B7FA3]" : "text-[var(--text-muted)]"}`}>
                  מלא את השאלון שאלה-שאלה
                </p>
              </div>
            </div>
          </button>

          {/* Upload existing questionnaire */}
          <button
            type="button"
            onClick={() => {
              setFlowStage("uploadDoc");
            }}
            className={`w-full text-right p-5 cursor-pointer transition-all group rounded-2xl border ${
              isGtm
                ? "bg-[#0D1117] border-[#1E2D45] border-dashed hover:border-[#00FF88]"
                : "card-elevated hover:!border-[var(--gold)]"
            }`}
            style={isGtm ? undefined : { borderStyle: "dashed" }}
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">📄</div>
              <div>
                <h3 className={`text-base font-bold transition-colors ${
                  isGtm ? "text-[#F0F6FF] group-hover:text-[#00FF88]" : "text-[var(--text-primary)] group-hover:text-[var(--gold)]"
                }`}>
                  העלאת שאלון קיים
                </h3>
                <p className={`text-sm mt-0.5 ${isGtm ? "text-[#6B7FA3]" : "text-[var(--text-muted)]"}`}>
                  כבר מילאת שאלון? העלה PDF/Word/טקסט ונדלג ישר לאסטרטגיה
                </p>
              </div>
            </div>
          </button>

          <div className="flex justify-start mt-4">
            <button
              type="button"
              onClick={() => setFlowStage(isGtm ? "name" : projectMode === "self" ? "name" : "niche")}
              className={`flex items-center gap-1 px-5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                isGtm ? "text-[#6B7FA3] hover:bg-[#161D2B]" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              הקודם ←
            </button>
          </div>
        </div>
      )}

      {/* ─── Recording mode (legacy — kept for uploaded audio retry) ─── */}

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
              className={`flex items-center gap-1 px-5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                isGtm ? "text-[#6B7FA3] hover:bg-[#161D2B]" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              הקודם ←
            </button>
          </div>
        </div>
      )}

      {/* ─── Upload Document mode ─── */}
      {flowStage === "uploadDoc" && (
        <div className="animate-in" dir="rtl">
          <div className={`p-6 rounded-2xl border ${isGtm ? "bg-[#0D1117] border-[#1E2D45]" : "card-elevated"}`}>
            <h2 className={`text-xl font-bold mb-2 ${isGtm ? "text-[#F0F6FF]" : "text-[var(--text-primary)]"}`}>
              📄 העלאת שאלון קיים
            </h2>
            <p className={`text-sm mb-5 ${isGtm ? "text-[#6B7FA3]" : "text-[var(--text-muted)]"}`}>
              העלה שאלון שמילאת בעבר — המערכת תנתח אותו אוטומטית ותעביר ישר למסמך האסטרטגיה
            </p>

            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                isGtm ? "hover:border-[#00FF88]" : "hover:border-[var(--gold)]"
              }`}
              style={{ borderColor: docFile ? (isGtm ? "#00FF88" : "var(--gold)") : (isGtm ? "#1E2D45" : "var(--card-border)") }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const f = e.dataTransfer.files[0];
                if (f) { setDocFile(f); setDocError(""); }
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".pdf,.doc,.docx,.txt,.md";
                input.onchange = (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (f) { setDocFile(f); setDocError(""); }
                };
                input.click();
              }}
            >
              {docFile ? (
                <div>
                  <div className="text-4xl mb-3">📄</div>
                  <p className={`text-base font-bold ${isGtm ? "text-[#F0F6FF]" : "text-[var(--text-primary)]"}`}>{docFile.name}</p>
                  <p className={`text-sm mt-1 ${isGtm ? "text-[#6B7FA3]" : "text-[var(--text-muted)]"}`}>
                    {(docFile.size / 1024).toFixed(0)} KB
                  </p>
                  <p className={`text-xs mt-2 ${isGtm ? "text-[#00FF88]" : "text-[var(--gold)]"}`}>
                    לחץ לבחירת קובץ אחר
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">📂</div>
                  <p className={`text-base font-bold ${isGtm ? "text-[#F0F6FF]" : "text-[var(--text-primary)]"}`}>
                    גרור קובץ לכאן או לחץ לבחירה
                  </p>
                  <p className={`text-sm mt-2 ${isGtm ? "text-[#6B7FA3]" : "text-[var(--text-muted)]"}`}>
                    PDF, Word, טקסט — עד 10MB
                  </p>
                </div>
              )}
            </div>

            {docError && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
                {docError}
              </div>
            )}

            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => { setFlowStage("modeSelect"); setDocFile(null); setDocError(""); }}
                className={`flex items-center gap-1 px-5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                  isGtm ? "text-[#6B7FA3] hover:bg-[#161D2B]" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                הקודם ←
              </button>
              <button
                type="button"
                disabled={!docFile}
                onClick={() => { if (docFile) processDocument(docFile); }}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isGtm ? "text-[#080A0F] font-bold" : "text-white bg-[var(--gold)] hover:opacity-90"
                }`}
                style={isGtm ? { background: "linear-gradient(135deg, #00FF88, #00CC6A)", boxShadow: "0 2px 12px rgba(0,255,136,0.3)" } : undefined}
              >
                נתח שאלון ועבור לאסטרטגיה →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Analyzing Document ─── */}
      {flowStage === "analyzingDoc" && (
        <div className="animate-in" dir="rtl">
          <div className={`p-8 text-center rounded-2xl border ${isGtm ? "bg-[#0D1117] border-[#1E2D45]" : "card-elevated"}`}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: isGtm ? "rgba(0,255,136,0.1)" : "rgba(212, 168, 67, 0.1)" }}>
              <div
                className="w-8 h-8 rounded-full animate-spin"
                style={{
                  border: isGtm ? "3px solid rgba(0,255,136,0.3)" : "3px solid rgba(212, 168, 67, 0.3)",
                  borderTopColor: isGtm ? "#00FF88" : "#D4A843",
                }}
              />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${isGtm ? "text-[#F0F6FF]" : "text-[var(--text-primary)]"}`}>
              מנתח את השאלון...
            </h2>
            <p className={`text-sm ${isGtm ? "text-[#6B7FA3]" : "text-[var(--text-muted)]"}`}>
              {isGtm ? "קורא את המסמך, מזהה תשובות ומתאים אותן לתוכנית GTM" : "קורא את המסמך, מזהה תשובות ומתאים אותן למערכת FBM"}
            </p>
            <div className={`mt-4 space-y-2 text-sm ${isGtm ? "text-[#B0BEC5]" : "text-[var(--text-secondary)]"}`}>
              <p>📖 קורא את המסמך...</p>
              <p>🧠 מנתח תשובות...</p>
              <p>✍️ {isGtm ? "ממפה לשאלות GTM..." : "ממפה לשאלות FBM..."}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Processing ─── */}
      {flowStage === "processing" && (
        <TranscriptionProgress
          stage={processingStage}
          error={processingError}
          onRetry={() => {
            setFlowStage("uploading");
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
          projectMode={projectMode}
          extractedData={extractedData}
          onApprove={(finalAnswers) => handleSubmit(finalAnswers)}
          onRecordMore={() => {
            setFlowStage("uploading");
          }}
        />
      )}

      {/* ─── Manual / Record mode — question-by-question ─── */}
      {flowStage === "manual" && currentQuestion && (
        <>
          {mode === "record" ? (
            <QuestionRecordCard
              key={currentQuestion.id}
              question={currentQuestion}
              value={currentAnswer}
              onChange={handleAnswerChange}
              error={error}
              track={track}
            />
          ) : (
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              value={currentAnswer}
              onChange={handleAnswerChange}
              error={error}
              track={track}
            />
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              type="button"
              onClick={handleManualPrev}
              className={`flex items-center gap-1 px-5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                isGtm ? "text-[#6B7FA3] hover:bg-[#161D2B]" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              הקודם ←
            </button>

            <button
              type="button"
              onClick={handleManualNext}
              disabled={submitting}
              className={`flex items-center gap-1 px-6 py-2.5 rounded-xl font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                isGtm
                  ? "text-[#080A0F] font-bold"
                  : isLastManualStep
                    ? "text-white bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg"
                    : "text-white bg-blue-600 hover:bg-blue-700"
              }`}
              style={isGtm ? {
                background: submitting ? "#1E2D45" : "linear-gradient(135deg, #00FF88, #00CC6A)",
                boxShadow: submitting ? "none" : "0 2px 12px rgba(0,255,136,0.3)",
              } : undefined}
            >
              {submitting
                ? "שומר..."
                : isLastManualStep
                  ? isGtm ? "סיום ויצירת תוכנית GTM 🚀" : "סיום ושליחה ל-AI 🚀"
                  : "→ הבא"}
            </button>
          </div>
        </>
      )}

      {/* ─── Booking stage (token users only) ─── */}
      {flowStage === "booking" && savedProjectId && (
        <div className="animate-in" dir="rtl">
          <Script src="https://link.msgsndr.com/js/form_embed.js" strategy="lazyOnload" />
          <div className="card-elevated p-6 text-center mb-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
              style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
              {"\u2705"}
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              השאלון נשמר בהצלחה!
            </h2>
            <p className="text-[var(--text-secondary)] text-sm">
              עכשיו בוא נקבע פגישת היכרות 1 על 1
            </p>
          </div>

          <div className="card-elevated p-6 mb-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              קבע פגישת היכרות
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              בחר תאריך ושעה שנוחים לך
            </p>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid var(--card-border)" }}
            >
              <iframe
                src="https://api.leadconnectorhq.com/widget/booking/I9YTJwxQRHHZbW0E07EA"
                style={{
                  width: "100%",
                  height: "700px",
                  border: "none",
                  overflow: "hidden",
                }}
                scrolling="no"
                title="קביעת פגישה"
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            {bookingConfirmed && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22C55E" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                הפגישה נקבעה בהצלחה!
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("fbm_is_token_user");
                router.push(`/project/${savedProjectId}/strategy`);
              }}
              className={`px-8 py-3 rounded-xl font-bold text-white transition-all cursor-pointer ${
                bookingConfirmed
                  ? "bg-green-600 hover:bg-green-700 text-lg"
                  : "bg-[var(--gold)] hover:opacity-90 text-sm"
              }`}
            >
              {bookingConfirmed ? "המשך לבניית האסטרטגיה" : "דלג והמשך לאסטרטגיה"}
            </button>
          </div>
        </div>
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
