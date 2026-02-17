"use client";

import { useState } from "react";
import type { VideoScene, PexelsVideo } from "@/lib/video-types";

interface SceneCardProps {
  scene: VideoScene;
  onUpdateScene?: (updates: Partial<VideoScene>) => void;
  onSwapClip?: (sceneNumber: number) => void;
  isEditing?: boolean;
}

const SCENE_LABELS: Record<number, string> = {
  1: "Hook",
  2: "הזדהות",
  3: "פתרון",
  4: "הוכחה",
  5: "CTA",
};

export default function SceneCard({
  scene,
  onUpdateScene,
  onSwapClip,
  isEditing = false,
}: SceneCardProps) {
  const [editingVO, setEditingVO] = useState(false);
  const [showClipOptions, setShowClipOptions] = useState(false);

  const sceneLabel = SCENE_LABELS[scene.number] || `סצנה ${scene.number}`;
  const clip = scene.selectedClip;
  const clipOptions = scene.clipOptions || [];

  const handleSelectClip = (c: PexelsVideo) => {
    onUpdateScene?.({ selectedClip: c });
    setShowClipOptions(false);
  };

  return (
    <div
      className="rounded-xl overflow-hidden mb-3"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "var(--card-border)" }}
      >
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3B82F6" }}
        >
          {scene.number}
        </span>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">{sceneLabel}</h3>
          <span className="text-xs text-[var(--text-muted)]">{scene.duration} שניות</span>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3B82F6" }}
        >
          B-Roll
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Clip thumbnail */}
        <div className="rounded-lg overflow-hidden relative" style={{ backgroundColor: "#000" }}>
          {clip ? (
            <div className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={clip.image}
                alt={`Scene ${scene.number}`}
                className="w-full"
                style={{ maxHeight: 160, objectFit: "cover" }}
              />
              {/* Visual description overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-xs leading-relaxed text-right" dir="rtl">
                  {scene.visualDescription}
                </p>
              </div>
              {/* Swap clip button */}
              {isEditing && clipOptions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowClipOptions(!showClipOptions)}
                  className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-sm cursor-pointer hover:bg-black/80 transition-all"
                  title="החלף קליפ"
                >
                  🔄
                </button>
              )}
              {isEditing && onSwapClip && (
                <button
                  type="button"
                  onClick={() => onSwapClip(scene.number)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-xs cursor-pointer hover:bg-black/80 transition-all"
                  title="חפש קליפ אחר"
                >
                  🔍
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-[var(--text-muted)] text-sm">
              {clipOptions.length > 0 ? "בחר קליפ" : "לא נמצאו קליפים"}
            </div>
          )}
        </div>

        {/* Clip options grid */}
        {showClipOptions && clipOptions.length > 1 && (
          <div className="grid grid-cols-3 gap-2">
            {clipOptions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectClip(c)}
                className="rounded-lg overflow-hidden cursor-pointer transition-all"
                style={{
                  border: c.id === clip?.id ? "2px solid #D4A843" : "2px solid transparent",
                  opacity: c.id === clip?.id ? 1 : 0.7,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={`Option ${c.id}`}
                  className="w-full"
                  style={{ height: 56, objectFit: "cover" }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Voice-over text */}
        <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(212, 168, 67, 0.05)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs">🎙️</span>
            <strong className="text-xs text-[var(--text-primary)]">קריינות:</strong>
          </div>
          {isEditing && editingVO ? (
            <textarea
              value={scene.voiceOverText}
              onChange={(e) => onUpdateScene?.({ voiceOverText: e.target.value })}
              onBlur={() => setEditingVO(false)}
              autoFocus
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--content-bg)] text-[var(--text-primary)] text-sm text-right resize-none focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
              dir="rtl"
            />
          ) : (
            <p
              className={`text-sm text-[var(--text-secondary)] leading-relaxed ${
                isEditing
                  ? "cursor-pointer hover:bg-[var(--content-bg)] rounded px-1 py-0.5 -mx-1"
                  : ""
              }`}
              onClick={() => isEditing && setEditingVO(true)}
              title={isEditing ? "לחץ לעריכה" : ""}
            >
              {scene.voiceOverText}
            </p>
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
