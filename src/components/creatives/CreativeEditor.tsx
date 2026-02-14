"use client";

import { useState, useRef } from "react";
import type { BackgroundType, ColorType, CreativeSuggestion } from "@/types";
import FBMLogo from "@/components/FBMLogo";

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
    profileImage?: string;
    displayName?: string;
    displayRole?: string;
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
  const [cta, setCta] = useState(suggestion.cta || "שלחו הודעה");
  const [background, setBackground] = useState<BackgroundType>(
    suggestion.background,
  );
  const [color, setColor] = useState<ColorType>(suggestion.color);
  const [isGenerating, setIsGenerating] = useState(false);

  // Profile image upload state
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [profileImage, setProfileImage] = useState<string>("");
  const [displayName, setDisplayName] = useState(userInfo.name);
  const [displayRole, setDisplayRole] = useState(userInfo.role);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setProfileImage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate({
        mainText,
        cta,
        background,
        color,
        userInfo,
        ...(showProfileUpload && {
          profileImage: profileImage || undefined,
          displayName,
          displayRole,
        }),
      });
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
          <span className="font-semibold text-blue-600 inline-flex items-center gap-1">
            <FBMLogo size={18} />
            FBM Studio
          </span>
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
          placeholder="שלחו הודעה"
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

      {/* Profile Image Upload */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <label className="text-base font-semibold text-gray-900 dark:text-gray-100">
            📸 להוסיף תמונה אישית?
          </label>
          <button
            type="button"
            onClick={() => setShowProfileUpload(!showProfileUpload)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              showProfileUpload ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showProfileUpload ? "-translate-x-6" : "-translate-x-1"
              }`}
            />
          </button>
        </div>

        {showProfileUpload && (
          <div className="mt-4 space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                תמונת פרופיל
              </label>
              <div className="flex items-center gap-4">
                {profileImage ? (
                  <div className="relative">
                    <img
                      src={profileImage}
                      alt="תמונת פרופיל"
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="profile-upload"
                  />
                  <label
                    htmlFor="profile-upload"
                    className="inline-block px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                  >
                    {profileImage ? "החלף תמונה" : "העלה תמונה"}
                  </label>
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                שם מלא
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={userInfo.name}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Display Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                תפקיד / תיאור
              </label>
              <input
                type="text"
                value={displayRole}
                onChange={(e) => setDisplayRole(e.target.value)}
                placeholder={userInfo.role}
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        )}
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
