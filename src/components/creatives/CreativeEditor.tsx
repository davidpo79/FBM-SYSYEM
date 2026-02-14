"use client";

import { useState } from "react";
import type { BackgroundType, ColorType, CreativeSuggestion } from "@/types";

interface CreativeEditorProps {
  suggestion: CreativeSuggestion;
  userInfo: {
    name: string;
    role: string;
    niche: string;
  };
  onGenerate: (config: {
    mainText: string;
    cta: string;
    background: BackgroundType;
    color: ColorType;
    userInfo: { name: string; role: string; niche: string };
  }) => Promise<void>;
}

const backgrounds: { value: BackgroundType; icon: string; label: string }[] = [
  { value: "lighthouse", icon: "🗼", label: "מגדלור (ניווט, ייעוץ, הדרכה)" },
  { value: "mountain", icon: "⛰️", label: "הר (השראה, הישגים, צמיחה)" },
  { value: "path", icon: "🛤️", label: "דרך (מסע, התקדמות, צמיחה)" },
  { value: "office", icon: "🏢", label: "משרד (מקצועיות, עסקים)" },
];

const colors: { value: ColorType; hex: string; label: string }[] = [
  { value: "gold", hex: "#FFD700", label: "זהב (יוקרה, איכות, מצוינות)" },
  { value: "teal", hex: "#00A3E0", label: "תכלת (מקצועיות, אמינות, טכנולוגיה)" },
];

export default function CreativeEditor({
  suggestion,
  userInfo,
  onGenerate,
}: CreativeEditorProps) {
  const [mainText, setMainText] = useState(suggestion.main_text);
  const [cta, setCta] = useState(suggestion.cta);
  const [background, setBackground] = useState<BackgroundType>(
    suggestion.background,
  );
  const [color, setColor] = useState<ColorType>(suggestion.color);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate({ mainText, cta, background, color, userInfo });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="space-y-6 p-6 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-sm"
      dir="rtl"
    >
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span className="font-semibold text-blue-600">🎯 FBM Studio</span>
          <span>מציע:</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          {suggestion.reasoning}
        </p>
      </div>

      {/* Main Text */}
      <div>
        <label className="block text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
          📝 טקסט ראשי על התמונה
        </label>
        <textarea
          value={mainText}
          onChange={(e) => setMainText(e.target.value)}
          placeholder="הטקסט שיופיע על התמונה..."
          maxLength={120}
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <p className="text-sm text-gray-500 mt-1">{mainText.length}/120 תווים</p>
      </div>

      {/* CTA */}
      <div>
        <label className="block text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
          💬 קריאה לפעולה (CTA)
        </label>
        <input
          type="text"
          value={cta}
          onChange={(e) => setCta(e.target.value)}
          maxLength={30}
          placeholder="שלח לי הודעה..."
          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <p className="text-sm text-gray-500 mt-1">{cta.length}/30 תווים</p>
      </div>

      {/* Background Type */}
      <div>
        <label className="block text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          🖼️ סוג רקע
        </label>
        <div className="space-y-2">
          {backgrounds.map((bg) => (
            <label
              key={bg.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                background === bg.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <input
                type="radio"
                name="background"
                value={bg.value}
                checked={background === bg.value}
                onChange={() => setBackground(bg.value)}
                className="accent-blue-600"
              />
              <span className="text-gray-900 dark:text-gray-100">
                {bg.icon} {bg.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          🎨 צבע טקסט
        </label>
        <div className="space-y-2">
          {colors.map((c) => (
            <label
              key={c.value}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                color === c.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <input
                type="radio"
                name="color"
                value={c.value}
                checked={color === c.value}
                onChange={() => setColor(c.value)}
                className="accent-blue-600"
              />
              <span
                className="inline-block w-6 h-6 rounded border border-gray-300"
                style={{ backgroundColor: c.hex }}
              />
              <span className="text-gray-900 dark:text-gray-100">
                {c.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !mainText.trim() || !cta.trim()}
          className="w-full h-12 text-lg font-semibold rounded-xl text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          {isGenerating ? "יוצר קריאטיב..." : "צור קריאטיב (תמונה)"}
        </button>
      </div>
    </div>
  );
}
