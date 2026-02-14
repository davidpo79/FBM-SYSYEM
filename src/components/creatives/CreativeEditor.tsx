"use client";

import { useState, useRef, useEffect } from "react";
import type {
  BackgroundType,
  ColorType,
  FontSizeType,
  TextPositionType,
  FormatType,
  CreativeSuggestion,
} from "@/types";
import FBMLogo from "@/components/FBMLogo";

interface CreativeEditorProps {
  suggestion: CreativeSuggestion;
  userInfo: {
    name: string;
    role: string;
    niche: string;
  };
  generatedImage?: { url: string; base64?: string } | null;
  onGenerate: (config: {
    mainText: string;
    subtitle?: string;
    cta: string;
    background: BackgroundType;
    color: ColorType;
    userInfo: { name: string; role: string; niche: string };
    showProfile?: boolean;
    profileImage?: string;
    displayName?: string;
    displayRole?: string;
    fontSize?: FontSizeType;
    textPosition?: TextPositionType;
    format?: FormatType;
  }) => Promise<void>;
}

const backgrounds: { value: BackgroundType; icon: string; label: string }[] = [
  { value: "lighthouse", icon: "\u{1F5FC}", label: "מגדלור" },
  { value: "mountain", icon: "\u26F0\uFE0F", label: "הר" },
  { value: "path", icon: "\u{1F6E4}\uFE0F", label: "דרך" },
  { value: "office", icon: "\u{1F3E2}", label: "משרד" },
];

const colors: { value: ColorType; hex: string; label: string }[] = [
  { value: "gold", hex: "#FFD700", label: "זהב" },
  { value: "teal", hex: "#00A3E0", label: "תכלת" },
];

const fontSizes: { value: FontSizeType; label: string }[] = [
  { value: "small", label: "קטן" },
  { value: "medium", label: "בינוני" },
  { value: "large", label: "גדול" },
];

const textPositions: { value: TextPositionType; label: string }[] = [
  { value: "top", label: "למעלה" },
  { value: "center", label: "מרכז" },
  { value: "bottom", label: "למטה" },
];

export default function CreativeEditor({
  suggestion,
  userInfo,
  generatedImage,
  onGenerate,
}: CreativeEditorProps) {
  const [mainText, setMainText] = useState(suggestion.main_text);
  const [subtitle, setSubtitle] = useState(`שיווק מבוסס תדר - לידים מדויקים ל${userInfo.niche}`);
  const [cta, setCta] = useState(suggestion.cta || "שלחו הודעה");
  const [background, setBackground] = useState<BackgroundType>(suggestion.background);
  const [color, setColor] = useState<ColorType>(suggestion.color);
  const [format, setFormat] = useState<FormatType>("story");
  const [fontSize, setFontSize] = useState<FontSizeType>("medium");
  const [textPosition, setTextPosition] = useState<TextPositionType>("top");
  const [isGenerating, setIsGenerating] = useState(false);

  // Profile image upload state
  const [showProfileUpload, setShowProfileUpload] = useState(false);
  const [profileImage, setProfileImage] = useState<string>("");
  const [displayName, setDisplayName] = useState(userInfo.name);
  const [displayRole, setDisplayRole] = useState(userInfo.role);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track if user changed settings after last generation
  const [hasChanges, setHasChanges] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(!!generatedImage);

  // Mark changes when any setting is modified
  useEffect(() => {
    if (hasGenerated) {
      setHasChanges(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainText, subtitle, cta, background, color, format, fontSize, textPosition, showProfileUpload, profileImage, displayName, displayRole]);

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
        subtitle,
        cta,
        background,
        color,
        userInfo,
        format,
        fontSize,
        textPosition,
        showProfile: showProfileUpload,
        ...(showProfileUpload && {
          profileImage: profileImage || undefined,
          displayName,
          displayRole,
        }),
      });
      setHasGenerated(true);
      setHasChanges(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const imageSrc = generatedImage?.url || generatedImage?.base64;

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <span className="font-semibold text-blue-600 inline-flex items-center gap-1">
          <FBMLogo size={18} />
          FBM Studio
        </span>
        <span>מציע:</span>
        <span className="italic text-gray-500">{suggestion.reasoning}</span>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - Image preview (60%) */}
        <div className="lg:w-[60%] flex-shrink-0">
          <div className="sticky top-4">
            <div className={`${format === "story" ? "aspect-[9/16]" : "aspect-square"} w-full max-h-[70vh] rounded-2xl overflow-hidden border border-[var(--card-border)] bg-[var(--content-bg)] relative transition-all`}>
              {isGenerating && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 rounded-2xl">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-white font-semibold mt-4 text-lg">יוצר קריאייטיב...</p>
                  <p className="text-white/70 text-sm mt-1">~15 שניות</p>
                </div>
              )}
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt="קריאטיב שנוצר"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium">התמונה תופיע כאן</p>
                  <p className="text-sm mt-1">ערוך את ההגדרות ולחץ על &quot;צור קריאייטיב&quot;</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Editor panel (40%) */}
        <div className="lg:w-[40%] space-y-5 max-h-[80vh] lg:overflow-y-auto lg:pl-2">
          {/* Format */}
          <section>
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-1.5">
              פורמט תמונה
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormat("feed")}
                className={`flex-1 px-3 py-2 rounded-[10px] border text-sm cursor-pointer transition-all ${
                  format === "feed"
                    ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                    : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                }`}
              >
                פיד 1:1
              </button>
              <button
                type="button"
                onClick={() => setFormat("story")}
                className={`flex-1 px-3 py-2 rounded-[10px] border text-sm cursor-pointer transition-all ${
                  format === "story"
                    ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                    : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                }`}
              >
                סטורי 9:16
              </button>
            </div>
          </section>

          {/* A. Main Text */}
          <section>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
              📝 טקסט ראשי
            </label>
            <textarea
              value={mainText}
              onChange={(e) => setMainText(e.target.value)}
              placeholder="הטקסט שיופיע על התמונה..."
              maxLength={120}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            />
            <p className="text-xs text-gray-500 mt-0.5">{mainText.length}/120</p>
          </section>

          {/* A2. Subtitle */}
          <section>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
              🏷️ תת-כותרת
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={80}
              placeholder="שיווק מבוסס תדר - לידים מדויקים ל..."
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            />
            <p className="text-xs text-gray-500 mt-0.5">{subtitle.length}/80</p>
          </section>

          {/* B. CTA */}
          <section>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
              💬 קריאה לפעולה (CTA)
            </label>
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              maxLength={30}
              placeholder="שלחו הודעה"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            />
            <p className="text-xs text-gray-500 mt-0.5">{cta.length}/30</p>
          </section>

          {/* C. Background */}
          <section>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
              🖼️ סוג רקע
            </label>
            <div className="grid grid-cols-2 gap-2">
              {backgrounds.map((bg) => (
                <button
                  key={bg.value}
                  type="button"
                  onClick={() => setBackground(bg.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-all ${
                    background === bg.value
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  <span>{bg.icon}</span>
                  <span>{bg.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* D. Color */}
          <section>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
              🎨 צבע
            </label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm cursor-pointer transition-all flex-1 ${
                    color === c.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 font-semibold"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <span
                    className="inline-block w-5 h-5 rounded-full border border-gray-300"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-gray-900 dark:text-gray-100">{c.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* E. Font Size */}
          <section>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
              🔤 גודל טקסט
            </label>
            <div className="flex gap-2">
              {fontSizes.map((fs) => (
                <button
                  key={fs.value}
                  type="button"
                  onClick={() => setFontSize(fs.value)}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-all ${
                    fontSize === fs.value
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  {fs.label}
                </button>
              ))}
            </div>
          </section>

          {/* F. Text Position */}
          <section>
            <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-1.5">
              📍 מיקום טקסט
            </label>
            <div className="flex gap-2">
              {textPositions.map((tp) => (
                <button
                  key={tp.value}
                  type="button"
                  onClick={() => setTextPosition(tp.value)}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm cursor-pointer transition-all ${
                    textPosition === tp.value
                      ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] font-semibold"
                      : "border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                  }`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
          </section>

          {/* G. Profile Image Upload */}
          <section className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-900 dark:text-gray-100">
                📸 תמונה אישית
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
              <div className="mt-3 space-y-3">
                {/* Image Upload */}
                <div className="flex items-center gap-3">
                  {profileImage ? (
                    <div className="relative flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={profileImage}
                        alt="תמונת פרופיל"
                        className="w-14 h-14 rounded-full object-cover border-2 border-blue-500"
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
                    <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      className="inline-block px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                    >
                      {profileImage ? "החלף תמונה" : "העלה תמונה"}
                    </label>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    שם מלא
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={userInfo.name}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                  />
                </div>

                {/* Display Role */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    תפקיד / תיאור
                  </label>
                  <input
                    type="text"
                    value={displayRole}
                    onChange={(e) => setDisplayRole(e.target.value)}
                    placeholder={userInfo.role}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                  />
                </div>
              </div>
            )}
          </section>

          {/* H. Generate Button */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !mainText.trim() || !cta.trim()}
              className={`w-full h-12 text-base font-bold rounded-xl text-white transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                hasGenerated && hasChanges
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isGenerating
                ? "⏳ יוצר קריאייטיב... (~15 שניות)"
                : hasGenerated && hasChanges
                  ? "🔄 צור מחדש עם השינויים"
                  : "✨ צור קריאייטיב"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
