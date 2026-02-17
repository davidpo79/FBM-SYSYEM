"use client";

import { useState } from "react";
import type { VoiceSettings as VoiceSettingsType } from "@/lib/video-types";

interface VoiceSettingsProps {
  settings: VoiceSettingsType;
  onChange: (settings: VoiceSettingsType) => void;
  onPreview?: () => Promise<void>;
}

export default function VoiceSettingsComponent({
  settings,
  onChange,
  onPreview,
}: VoiceSettingsProps) {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const handlePreview = async () => {
    if (!onPreview || isPreviewLoading) return;
    setIsPreviewLoading(true);
    try {
      await onPreview();
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
    >
      {/* Voice selection */}
      <div className="mb-5">
        <label className="font-semibold text-sm text-[var(--text-primary)] mb-3 block">
          {"\u05E1\u05D5\u05D2 \u05E7\u05D5\u05DC"}:
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...settings, voice: "male" })}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all"
            style={{
              backgroundColor:
                settings.voice === "male"
                  ? "rgba(212, 168, 67, 0.12)"
                  : "var(--content-bg)",
              color:
                settings.voice === "male"
                  ? "#D4A843"
                  : "var(--text-secondary)",
              border:
                settings.voice === "male"
                  ? "2px solid #D4A843"
                  : "2px solid var(--card-border)",
            }}
          >
            <span>{"\u{1F468}"}</span>
            <span>{"\u05D2\u05D1\u05E8"}</span>
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...settings, voice: "female" })}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium cursor-pointer transition-all"
            style={{
              backgroundColor:
                settings.voice === "female"
                  ? "rgba(212, 168, 67, 0.12)"
                  : "var(--content-bg)",
              color:
                settings.voice === "female"
                  ? "#D4A843"
                  : "var(--text-secondary)",
              border:
                settings.voice === "female"
                  ? "2px solid #D4A843"
                  : "2px solid var(--card-border)",
            }}
          >
            <span>{"\u{1F469}"}</span>
            <span>{"\u05D0\u05D9\u05E9\u05D4"}</span>
          </button>
        </div>
      </div>

      {/* Speaking rate */}
      <div className="mb-5">
        <label className="font-semibold text-sm text-[var(--text-primary)] mb-2 block">
          {"\u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05D3\u05D9\u05D1\u05D5\u05E8"}: {settings.rate.toFixed(1)}x
        </label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={settings.rate}
          onChange={(e) =>
            onChange({ ...settings, rate: parseFloat(e.target.value) })
          }
          className="w-full accent-[#D4A843]"
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>{"\u05D0\u05D9\u05D8\u05D9"}</span>
          <span>{"\u05E8\u05D2\u05D9\u05DC"}</span>
          <span>{"\u05DE\u05D4\u05D9\u05E8"}</span>
        </div>
      </div>

      {/* Pitch */}
      <div className="mb-5">
        <label className="font-semibold text-sm text-[var(--text-primary)] mb-2 block">
          {"\u05D2\u05D5\u05D1\u05D4 \u05D4\u05E7\u05D5\u05DC"}: {settings.pitch > 0 ? "+" : ""}
          {settings.pitch}
        </label>
        <input
          type="range"
          min="-10"
          max="10"
          step="1"
          value={settings.pitch}
          onChange={(e) =>
            onChange({ ...settings, pitch: parseInt(e.target.value) })
          }
          className="w-full accent-[#D4A843]"
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>{"\u05E0\u05DE\u05D5\u05DA"}</span>
          <span>{"\u05E8\u05D2\u05D9\u05DC"}</span>
          <span>{"\u05D2\u05D1\u05D5\u05D4"}</span>
        </div>
      </div>

      {/* Preview button */}
      {onPreview && (
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPreviewLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition-all"
          style={{
            backgroundColor: isPreviewLoading
              ? "rgba(212, 168, 67, 0.12)"
              : "var(--content-bg)",
            color: isPreviewLoading ? "#D4A843" : "var(--text-primary)",
            border: isPreviewLoading
              ? "1px solid rgba(212, 168, 67, 0.3)"
              : "1px solid var(--card-border)",
            opacity: isPreviewLoading ? 0.8 : 1,
          }}
        >
          {isPreviewLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-[#D4A843]/30 border-t-[#D4A843] rounded-full animate-spin" />
              {"\u05D8\u05D5\u05E2\u05DF \u05E7\u05D5\u05DC \u05DE\u05D2\u05D5\u05D2\u05DC..."}
            </>
          ) : (
            <>
              <span>{"\u{1F50A}"}</span>
              {"\u05E9\u05DE\u05E2 \u05D3\u05D5\u05D2\u05DE\u05D4"}
            </>
          )}
        </button>
      )}
    </div>
  );
}
