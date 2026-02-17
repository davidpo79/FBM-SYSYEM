"use client";

import type { VoiceSettings as VoiceSettingsType } from "@/lib/video-types";

interface VoiceSettingsProps {
  settings: VoiceSettingsType;
  onChange: (settings: VoiceSettingsType) => void;
  onPreview?: () => void;
  isPreviewLoading?: boolean;
}

export default function VoiceSettingsComponent({
  settings,
  onChange,
  onPreview,
  isPreviewLoading,
}: VoiceSettingsProps) {
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
          {"\u{05E1}\u{05D5}\u{05D2} \u{05E7}\u{05D5}\u{05DC}"}:
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
            <span>{"\u{05D2}\u{05D1}\u{05E8}"}</span>
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
            <span>{"\u{05D0}\u{05D9}\u{05E9}\u{05D4}"}</span>
          </button>
        </div>
      </div>

      {/* Speaking rate */}
      <div className="mb-5">
        <label className="font-semibold text-sm text-[var(--text-primary)] mb-2 block">
          {"\u{05DE}\u{05D4}\u{05D9}\u{05E8}\u{05D5}\u{05EA} \u{05D3}\u{05D9}\u{05D1}\u{05D5}\u{05E8}"}: {settings.rate.toFixed(1)}x
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
          <span>{"\u{05D0}\u{05D9}\u{05D8}\u{05D9}"}</span>
          <span>{"\u{05E8}\u{05D2}\u{05D9}\u{05DC}"}</span>
          <span>{"\u{05DE}\u{05D4}\u{05D9}\u{05E8}"}</span>
        </div>
      </div>

      {/* Pitch */}
      <div className="mb-5">
        <label className="font-semibold text-sm text-[var(--text-primary)] mb-2 block">
          {"\u{05D2}\u{05D5}\u{05D1}\u{05D4} \u{05D4}\u{05E7}\u{05D5}\u{05DC}"}: {settings.pitch > 0 ? "+" : ""}
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
          <span>{"\u{05E0}\u{05DE}\u{05D5}\u{05DA}"}</span>
          <span>{"\u{05E8}\u{05D2}\u{05D9}\u{05DC}"}</span>
          <span>{"\u{05D2}\u{05D1}\u{05D5}\u{05D4}"}</span>
        </div>
      </div>

      {/* Preview button */}
      {onPreview && (
        <button
          type="button"
          onClick={onPreview}
          disabled={isPreviewLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer transition-all"
          style={{
            backgroundColor: "var(--content-bg)",
            color: "var(--text-primary)",
            border: "1px solid var(--card-border)",
            opacity: isPreviewLoading ? 0.6 : 1,
          }}
        >
          {isPreviewLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-[var(--gold)] rounded-full animate-spin" />
              {"\u{05D9}\u{05D5}\u{05E6}\u{05E8} \u{05D3}\u{05D5}\u{05D2}\u{05DE}\u{05D4}"}...
            </>
          ) : (
            <>
              <span>{"\u{1F3A4}"}</span>
              {"\u{05E9}\u{05DE}\u{05E2} \u{05D3}\u{05D5}\u{05D2}\u{05DE}\u{05D4}"}
            </>
          )}
        </button>
      )}
    </div>
  );
}
