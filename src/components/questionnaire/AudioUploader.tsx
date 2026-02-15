"use client";

import { useState, useRef, useCallback } from "react";

interface AudioUploaderProps {
  onFileSelected: (file: File) => void;
}

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
];
const ACCEPTED_EXT = ".mp3,.wav,.m4a,.webm,.ogg";
const MAX_SIZE = 60 * 1024 * 1024; // 60MB

export default function AudioUploader({ onFileSelected }: AudioUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = useCallback((f: File): boolean => {
    setError("");
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.match(/\.(mp3|wav|m4a|webm|ogg)$/i)) {
      setError("פורמט לא נתמך. השתמש ב-mp3, wav, m4a, webm או ogg");
      return false;
    }
    if (f.size > MAX_SIZE) {
      setError("הקובץ גדול מדי. מקסימום 60MB");
      return false;
    }
    return true;
  }, []);

  const handleFile = useCallback(
    (f: File) => {
      if (!validateFile(f)) return;
      setFile(f);
      setAudioUrl(URL.createObjectURL(f));
    },
    [validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleSend = () => {
    if (file) onFileSelected(file);
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="card-elevated p-6 animate-in">
        {!file ? (
          <div
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-[var(--gold)] bg-[var(--gold-soft)]"
                : "border-[var(--card-border)] hover:border-[var(--gold)]/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            <div className="flex flex-col items-center gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                style={{
                  backgroundColor: "rgba(212, 168, 67, 0.08)",
                }}
              >
                📁
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">
                גרור קובץ הקלטה לכאן
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                או לחץ לבחירת קובץ
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                mp3, wav, m4a, webm, ogg — עד 60MB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--sidebar-hover)" }}>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: "rgba(212, 168, 67, 0.12)" }}
              >
                🎵
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {file.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {formatSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setAudioUrl(null);
                }}
                className="text-xs text-red-500 hover:underline cursor-pointer"
              >
                הסר
              </button>
            </div>

            {audioUrl && (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <audio controls src={audioUrl} className="w-full" />
            )}

            <button
              type="button"
              onClick={handleSend}
              className="btn-gold w-full !py-3 text-base"
            >
              שלח לניתוח
            </button>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
