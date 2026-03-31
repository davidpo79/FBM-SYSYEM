"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getQuestions, type ProjectMode } from "@/lib/questions";

interface AudioRecorderProps {
  ownerNiche: string;
  projectMode?: ProjectMode;
  onRecordingComplete: (blob: Blob) => void;
}

export default function AudioRecorder({
  ownerNiche,
  projectMode,
  onRecordingComplete,
}: AudioRecorderProps) {
  const [status, setStatus] = useState<
    "idle" | "recording" | "paused" | "done"
  >("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(true);
  const [levels, setLevels] = useState<number[]>(new Array(24).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  const MAX_SECONDS = 30 * 60; // 30 minutes
  const WARN_SECONDS = 25 * 60; // 25 minutes

  const questions = getQuestions(ownerNiche, projectMode);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const updateLevelsRef = useRef<(() => void) | null>(null);
  const updateLevels = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const step = Math.floor(data.length / 24);
    const bars = Array.from({ length: 24 }, (_, i) => {
      const val = data[i * step] ?? 0;
      return Math.max(4, Math.floor((val / 255) * 48));
    });
    setLevels(bars);
    animFrameRef.current = requestAnimationFrame(() => updateLevelsRef.current?.());
  }, []);
  useEffect(() => { updateLevelsRef.current = updateLevels; }, [updateLevels]);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup analyser
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

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
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        audioBlobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        setStatus("done");
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      recorder.start(1000);
      setStatus("recording");
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);

      updateLevels();
    } catch {
      setError(
        "לא ניתן לגשת למיקרופון. ודא שנתת הרשאה בדפדפן.",
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setStatus("paused");
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setStatus("recording");
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
      updateLevels();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSend = () => {
    if (audioBlobRef.current) {
      onRecordingComplete(audioBlobRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div dir="rtl" className="space-y-4">
      {/* Recorder card */}
      <div className="card-elevated p-6 text-center animate-in">
        {status === "idle" && (
          <>
            <button
              type="button"
              onClick={startRecording}
              className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-white text-3xl cursor-pointer transition-transform hover:scale-105"
              style={{ backgroundColor: "#EF4444" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="8" />
              </svg>
            </button>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              לחץ להתחלת הקלטה
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </>
        )}

        {(status === "recording" || status === "paused") && (
          <>
            {/* Timer */}
            <div className="text-3xl font-mono font-bold text-[var(--text-primary)] mb-3">
              {formatTime(seconds)}
            </div>

            {/* Warning at 25 minutes */}
            {seconds >= WARN_SECONDS && (
              <p className="text-xs text-orange-500 mb-2">
                נשארו פחות מ-5 דקות להקלטה
              </p>
            )}

            {/* Waveform bars */}
            <div className="flex items-end justify-center gap-[3px] h-12 mb-4">
              {levels.map((h, i) => (
                <div
                  key={i}
                  className="w-[6px] rounded-full transition-all duration-75"
                  style={{
                    height: `${status === "paused" ? 4 : h}px`,
                    backgroundColor:
                      status === "paused"
                        ? "var(--text-muted)"
                        : "#D4A843",
                    opacity: status === "paused" ? 0.3 : 0.8,
                  }}
                />
              ))}
            </div>

            {/* Recording indicator */}
            {status === "recording" && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: "#EF4444",
                    animation: "pulse-gold 1s ease-in-out infinite",
                  }}
                />
                <span className="text-sm text-red-500 font-medium">
                  מקליט...
                </span>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              {status === "recording" ? (
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                  style={{
                    backgroundColor: "var(--sidebar-hover)",
                    color: "var(--text-primary)",
                  }}
                  title="השהה"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                  style={{
                    backgroundColor: "var(--sidebar-hover)",
                    color: "var(--text-primary)",
                  }}
                  title="המשך"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </button>
              )}

              <button
                type="button"
                onClick={stopRecording}
                className="w-14 h-14 rounded-full flex items-center justify-center text-white cursor-pointer transition-transform hover:scale-105"
                style={{ backgroundColor: "#EF4444" }}
                title="סיים הקלטה"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
            </div>
          </>
        )}

        {status === "done" && audioUrl && (
          <>
            <div className="flex items-center justify-center gap-2 mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--success)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm font-semibold text-[var(--success)]">
                הקלטה הושלמה — {formatTime(seconds)}
              </span>
            </div>

            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={audioUrl} className="w-full mb-4" />

            <button
              type="button"
              onClick={handleSend}
              className="btn-gold w-full !py-3 text-base"
            >
              שלח לניתוח
            </button>
          </>
        )}
      </div>

      {/* Suggested questions */}
      <div className="card-static animate-in delay-1">
        <button
          type="button"
          onClick={() => setShowQuestions((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 cursor-pointer"
        >
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            💡 שאלות מומלצות לשאול
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--text-muted)] transition-transform"
            style={{
              transform: showQuestions ? "rotate(180deg)" : "rotate(0)",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {showQuestions && (
          <div className="px-5 pb-4 space-y-2">
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-2">
                <span className="text-xs font-bold text-[var(--gold)] mt-0.5 min-w-[20px]">
                  {i + 1}.
                </span>
                <p className="text-sm text-[var(--text-secondary)]">
                  {q.title}: {q.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
