"use client";

import { useState } from "react";
import type { VideoScene } from "@/lib/video-types";

interface SceneCardProps {
  scene: VideoScene;
  imageUrl?: string;
  voiceOverUrl?: string;
  onUpdateScene?: (updates: Partial<VideoScene>) => void;
  isEditing?: boolean;
}

export default function SceneCard({
  scene,
  imageUrl,
  voiceOverUrl,
  onUpdateScene,
  isEditing = false,
}: SceneCardProps) {
  const [editingField, setEditingField] = useState<"imagePrompt" | "voiceOverText" | null>(null);

  const sceneLabels: Record<number, string> = {
    1: "Hook",
    2: "הזדהות",
    3: "פתרון",
    4: "הוכחה",
    5: "CTA",
  };

  const sceneLabel = sceneLabels[scene.number] || `סצנה ${scene.number}`;

  return (
    <div
      className="rounded-xl overflow-hidden mb-3"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--card-border)" }}>
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            color: "#3B82F6",
          }}
        >
          {scene.number}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">
            {sceneLabel}
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            {scene.duration} שניות
          </span>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            color: "#3B82F6",
          }}
        >
          B-Roll
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Image section */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "rgba(59, 130, 246, 0.03)" }}>
          {imageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`Scene ${scene.number}`}
                className="w-full rounded-lg"
                style={{ maxHeight: 180, objectFit: "cover" }}
              />
              {/* Voice over text overlay on image */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-white text-xs leading-relaxed text-right" dir="rtl">
                  {scene.voiceOverText}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs">🎥</span>
                <strong className="text-xs text-[var(--text-primary)]">תיאור ויזואלי:</strong>
              </div>
              {isEditing && editingField === "imagePrompt" ? (
                <textarea
                  value={scene.imagePrompt}
                  onChange={(e) => onUpdateScene?.({ imagePrompt: e.target.value })}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                  dir="ltr"
                />
              ) : (
                <p
                  className={`text-xs text-[var(--text-secondary)] leading-relaxed ${isEditing ? "cursor-pointer hover:bg-[var(--content-bg)] rounded px-1 py-0.5 -mx-1" : ""}`}
                  dir="ltr"
                  onClick={() => isEditing && setEditingField("imagePrompt")}
                  title={isEditing ? "לחץ לעריכה" : ""}
                >
                  {scene.imagePrompt}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Voice Over text */}
        <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(212, 168, 67, 0.05)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs">🎙️</span>
            <strong className="text-xs text-[var(--text-primary)]">קריינות:</strong>
          </div>
          {isEditing && editingField === "voiceOverText" ? (
            <textarea
              value={scene.voiceOverText}
              onChange={(e) => onUpdateScene?.({ voiceOverText: e.target.value })}
              onBlur={() => setEditingField(null)}
              autoFocus
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-sm text-right resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
              dir="rtl"
            />
          ) : (
            <p
              className={`text-sm text-[var(--text-secondary)] leading-relaxed ${isEditing ? "cursor-pointer hover:bg-[var(--content-bg)] rounded px-1 py-0.5 -mx-1" : ""}`}
              onClick={() => isEditing && setEditingField("voiceOverText")}
              title={isEditing ? "לחץ לעריכה" : ""}
            >
              {scene.voiceOverText}
            </p>
          )}
          {voiceOverUrl && (
            <audio controls className="mt-2 w-full" style={{ height: 32 }}>
              <source src={voiceOverUrl} type="audio/mpeg" />
            </audio>
          )}
        </div>

        {/* Notes */}
        {scene.notes && (
          <div className="flex items-start gap-2 px-1">
            <span className="text-[10px] mt-0.5">💡</span>
            <p className="text-[10px] text-[var(--text-muted)]">{scene.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
