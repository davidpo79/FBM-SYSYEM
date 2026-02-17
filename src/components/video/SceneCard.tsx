"use client";

import type { VideoScene } from "@/lib/video-types";

interface SceneCardProps {
  scene: VideoScene;
  imageUrl?: string;
  voiceOverUrl?: string;
}

export default function SceneCard({ scene, imageUrl, voiceOverUrl }: SceneCardProps) {
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
            backgroundColor:
              scene.type === "b-roll"
                ? "rgba(59, 130, 246, 0.1)"
                : "rgba(34, 197, 94, 0.1)",
            color: scene.type === "b-roll" ? "#3B82F6" : "#22C55E",
          }}
        >
          {scene.type === "b-roll" ? "🎥" : "📹"}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--text-primary)]">
            {scene.type === "b-roll"
              ? `B-Roll סצנה ${scene.number}`
              : `סלפי-וידאו סצנה ${scene.number}`}
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            {scene.duration} שניות
          </span>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{
            backgroundColor:
              scene.type === "b-roll"
                ? "rgba(59, 130, 246, 0.1)"
                : "rgba(34, 197, 94, 0.1)",
            color: scene.type === "b-roll" ? "#3B82F6" : "#22C55E",
          }}
        >
          {scene.type === "b-roll" ? "B-Roll" : "Selfie"}
        </span>
      </div>

      {/* B-Roll content */}
      {scene.type === "b-roll" && (
        <div className="space-y-3">
          {/* Image section */}
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: "rgba(59, 130, 246, 0.04)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">📸</span>
              <strong className="text-sm text-[var(--text-primary)]">
                תמונה:
              </strong>
            </div>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`Scene ${scene.number} B-Roll`}
                className="w-full rounded-lg"
                style={{ maxHeight: 200, objectFit: "cover" }}
              />
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                {scene.imagePrompt}
              </p>
            )}
          </div>

          {/* Voice Over text */}
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: "rgba(212, 168, 67, 0.06)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🎙️</span>
              <strong className="text-sm text-[var(--text-primary)]">
                Voice Over:
              </strong>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {scene.voiceOverText}
            </p>
            {voiceOverUrl && (
              <audio controls className="mt-2 w-full" style={{ height: 36 }}>
                <source src={voiceOverUrl} type="audio/mpeg" />
              </audio>
            )}
          </div>
        </div>
      )}

      {/* Selfie content */}
      {scene.type === "selfie" && (
        <div className="space-y-3">
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: "rgba(34, 197, 94, 0.04)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">📹</span>
              <strong className="text-sm text-[var(--text-primary)]">
                כאן תצלם את עצמך מדבר
              </strong>
            </div>
          </div>
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: "rgba(245, 158, 11, 0.08)",
              border: "1px dashed rgba(245, 158, 11, 0.3)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">📝</span>
              <strong className="text-sm text-[var(--text-primary)]">
                טקסט לקריאה:
              </strong>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-primary)]">
              {scene.teleprompterText}
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      {scene.notes && (
        <div className="mt-3 flex items-start gap-2">
          <span className="text-xs mt-0.5">💡</span>
          <p className="text-xs text-[var(--text-muted)]">{scene.notes}</p>
        </div>
      )}
    </div>
  );
}
