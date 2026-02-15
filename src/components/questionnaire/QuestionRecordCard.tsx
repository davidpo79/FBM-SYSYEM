"use client";

import { useState, useRef, useEffect } from "react";
import type { Question } from "@/lib/questions";

interface QuestionRecordCardProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function QuestionRecordCard({
  question,
  value,
  onChange,
  error,
}: QuestionRecordCardProps) {
  const [recStatus, setRecStatus] = useState<
    "idle" | "recording" | "transcribing"
  >("idle");
  const [recError, setRecError] = useState("");
  const [seconds, setSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const transcribeAudio = async (blob: Blob) => {
    setRecStatus("transcribing");
    try {
      const formData = new FormData();
      formData.append("audio", blob);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "שגיאה בתמלול");
      }

      const { transcript } = await res.json();
      onChange(transcript);
      setRecStatus("idle");
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "שגיאה בתמלול");
      setRecStatus("idle");
    }
  };

  const startRecording = async () => {
    setRecError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        transcribeAudio(blob);
      };

      recorder.start(1000);
      setRecStatus("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setRecError("לא ניתן לגשת למיקרופון. ודא שנתת הרשאה בדפדפן.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 p-6 sm:p-8"
      dir="rtl"
    >
      {/* Section badge */}
      <span className="inline-block text-xs font-semibold text-[var(--gold)] bg-[var(--gold-soft)] px-3 py-1 rounded-full mb-4">
        {question.sectionTitle}
      </span>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
        {question.title}
      </h2>

      {/* Question text */}
      <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
        {question.text}
      </p>

      {/* Record controls */}
      <div className="flex items-center gap-3 mb-4">
        {recStatus === "idle" && (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="12" cy="12" r="8" />
            </svg>
            הקלט תשובה
          </button>
        )}

        {recStatus === "recording" && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-800 text-white font-medium transition-colors cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              עצור הקלטה
            </button>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full bg-red-500"
                style={{ animation: "pulse-gold 1s ease-in-out infinite" }}
              />
              <span className="text-sm font-mono text-red-500 font-medium">
                {formatTime(seconds)}
              </span>
            </div>
          </div>
        )}

        {recStatus === "transcribing" && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 font-medium">
            <svg
              className="animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            מתמלל...
          </div>
        )}
      </div>

      {recError && <p className="text-sm text-red-500 mb-3">{recError}</p>}

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="התמלול יופיע כאן... ניתן גם להקליד ידנית"
        rows={5}
        className={`w-full rounded-xl border px-4 py-3 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-red-400 focus:ring-red-400"
            : "border-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500"
        }`}
      />

      {/* Error */}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {/* Character count */}
      <p className="mt-2 text-xs text-gray-400 text-left" dir="ltr">
        {value.length} / 10 min
      </p>
    </div>
  );
}
