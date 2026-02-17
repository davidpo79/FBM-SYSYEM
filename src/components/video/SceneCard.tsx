"use client";

import type { VideoScene } from "@/lib/video-types";

interface SceneCardProps {
  scene: VideoScene;
  imageUrl?: string;
  imageLoading?: boolean;
  voiceOverUrl?: string;
  voiceOverLoading?: boolean;
  onRegenerateImage?: () => void;
  onRegenerateVoice?: () => void;
  format: "9:16" | "1:1";
}

export default function SceneCard({
  scene,
  imageUrl,
  imageLoading,
  voiceOverUrl,
  voiceOverLoading,
  onRegenerateImage,
  onRegenerateVoice,
  format,
}: SceneCardProps) {
  const aspectClass = format === "9:16" ? "aspect-[9/16]" : "aspect-square";

  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            color: "#3B82F6",
          }}
        >
          {"\u{1F3A5}"}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--text-primary)]">
            {`\u05E1\u05E6\u05E0\u05D4 ${scene.number}`}
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            {`${scene.duration} \u05E9\u05E0\u05D9\u05D5\u05EA`}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Image preview */}
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: "rgba(59, 130, 246, 0.04)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">{"\u{1F4F8}"}</span>
              <strong className="text-sm text-[var(--text-primary)]">
                {"\u05EA\u05DE\u05D5\u05E0\u05D4"}
              </strong>
            </div>
            {onRegenerateImage && (
              <button
                type="button"
                onClick={onRegenerateImage}
                disabled={imageLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all"
                style={{
                  backgroundColor: "rgba(212, 168, 67, 0.08)",
                  color: "#D4A843",
                  border: "1px solid rgba(212, 168, 67, 0.2)",
                  opacity: imageLoading ? 0.5 : 1,
                }}
              >
                {imageLoading ? (
                  <span className="w-3 h-3 border border-[#D4A843]/40 border-t-[#D4A843] rounded-full animate-spin" />
                ) : (
                  <span>{"\u{1F504}"}</span>
                )}
                {"\u05D7\u05D3\u05E9 \u05EA\u05DE\u05D5\u05E0\u05D4"}
              </button>
            )}
          </div>

          {imageUrl ? (
            <div className="flex justify-center">
              <div
                className={`${aspectClass} max-h-[280px] w-auto rounded-lg overflow-hidden bg-black`}
              >
                <img
                  src={imageUrl}
                  alt={`Scene ${scene.number}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : imageLoading ? (
            <div
              className={`${aspectClass} max-h-[200px] rounded-lg flex items-center justify-center`}
              style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
            >
              <div className="text-center">
                <span className="w-6 h-6 border-2 border-[var(--gold)]/30 border-t-[var(--gold)] rounded-full animate-spin inline-block mb-2" />
                <p className="text-xs text-[var(--text-muted)]">
                  {"\u05D9\u05D5\u05E6\u05E8 \u05EA\u05DE\u05D5\u05E0\u05D4"}...
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] italic">
              {scene.imagePrompt}
            </p>
          )}
        </div>

        {/* Voice Over section */}
        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: "rgba(212, 168, 67, 0.06)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">{"\u{1F399}\uFE0F"}</span>
              <strong className="text-sm text-[var(--text-primary)]">
                Voice Over
              </strong>
            </div>
          </div>

          {/* Voice over text */}
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            {scene.voiceOverText}
          </p>

          <div className="space-y-2">
            {voiceOverUrl ? (
              <audio
                controls
                src={voiceOverUrl}
                className="w-full"
                style={{ height: 32 }}
              />
            ) : voiceOverLoading ? (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="w-3 h-3 border border-[var(--gold)]/40 border-t-[var(--gold)] rounded-full animate-spin" />
                {"\u05D9\u05D5\u05E6\u05E8 \u05E7\u05D5\u05DC"}...
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                {"\u05DC\u05D7\u05E5 \"\u05E6\u05D5\u05E8 \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA + Voice Over\" \u05DC\u05D9\u05E6\u05D9\u05E8\u05EA \u05D4\u05E7\u05D5\u05DC"}
              </p>
            )}
            {voiceOverUrl && onRegenerateVoice && (
              <button
                type="button"
                onClick={onRegenerateVoice}
                disabled={voiceOverLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: "rgba(212, 168, 67, 0.08)",
                  color: "#D4A843",
                  border: "1px solid rgba(212, 168, 67, 0.2)",
                }}
              >
                {"\u{1F504} \u05D7\u05D3\u05E9 \u05E7\u05D5\u05DC"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {scene.notes && (
        <div className="mt-3 flex items-start gap-2">
          <span className="text-xs mt-0.5">{"\u{1F4A1}"}</span>
          <p className="text-xs text-[var(--text-muted)]">{scene.notes}</p>
        </div>
      )}
    </div>
  );
}
