"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface AudioRecorderProps {
  onRecorded: (audioBlob: Blob) => void;
  existingAudioUrl?: string;
}

export default function AudioRecorder({
  onRecorded,
  existingAudioUrl,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        setRecordedUrl(url);
        onRecorded(blob);
      };

      mediaRecorderRef.current = mr;
      mr.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch {
      alert("\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D2\u05E9\u05EA \u05DC\u05DE\u05D9\u05E7\u05E8\u05D5\u05E4\u05D5\u05DF. \u05D0\u05E0\u05D0 \u05D0\u05E9\u05E8 \u05D2\u05D9\u05E9\u05D4.");
    }
  }, [onRecorded, recordedUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              color: "#EF4444",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            {"\u05D4\u05E7\u05DC\u05D8 \u05E7\u05D5\u05DC"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all animate-pulse"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#EF4444",
              border: "1px solid rgba(239, 68, 68, 0.4)",
            }}
          >
            <span className="w-3 h-3 rounded bg-red-500" />
            {"\u05E2\u05E6\u05D5\u05E8"} ({formatTime(duration)})
          </button>
        )}
      </div>

      {/* Playback of recorded audio */}
      {(recordedUrl || existingAudioUrl) && (
        <audio
          controls
          src={recordedUrl || existingAudioUrl}
          className="w-full"
          style={{ height: 32 }}
        />
      )}
    </div>
  );
}
