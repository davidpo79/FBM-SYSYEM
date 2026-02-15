"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getQuestions } from "@/lib/questions";

type TabId = "general" | "questionnaire" | "prompts";

const PROMPT_LIST = [
  {
    name: "strategy",
    label: "אסטרטגיה",
    description: "יצירת מסמך אסטרטגיה מבוסס FBM",
    placeholder:
      "אתה מומחה FBM. צור מסמך אסטרטגיה מלא עבור...\n\nכלול: קהל יעד, מסרים מרכזיים, ערוצים מומלצים...",
  },
  {
    name: "niches",
    label: "נישות",
    description: "זיהוי 3 נישות אידיאליות",
    placeholder:
      "נתח את המידע הבא וזהה 3 נישות אידיאליות...\n\nלכל נישה ציין: שם, גודל שוק, פוטנציאל...",
  },
  {
    name: "pains",
    label: "כאבים",
    description: "ניתוח כאבים עמוקים של קהל יעד",
    placeholder:
      "בצע ניתוח כאבים עמוק עבור קהל היעד...\n\nלכל כאב ציין: תיאור, עוצמה, פתרון מוצע...",
  },
  {
    name: "scripts",
    label: "תסריטים",
    description: "יצירת 3 תסריטי וידאו FBM",
    placeholder:
      "צור 3 תסריטי וידאו על בסיס מתודולוגיית FBM...\n\nכל תסריט כולל: Hook, בעיה, פתרון, CTA...",
  },
  {
    name: "creative",
    label: "קריאייטיב",
    description: "הנחיות ליצירת תמונות שיווקיות",
    placeholder:
      "צור הנחיות קריאייטיב לתמונות שיווקיות...\n\nלכל קריאייטיב: תיאור ויזואלי, טקסט, סגנון...",
  },
  {
    name: "expert",
    label: "מומחה FBM",
    description: "צ'אטבוט מומחה FBM",
    placeholder:
      "אתה מומחה בשיטת FBM. עזור לסטודנט עם שאלות...\n\nהנחיות: ענה בעברית, השתמש בדוגמאות...",
  },
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [nicheMode, setNicheMode] = useState(false);

  // General settings state
  const [systemName, setSystemName] = useState("FBM Studio");
  const [calendarUrl, setCalendarUrl] = useState(
    "https://api.leadconnectorhq.com/widget/booking/YOUR_CALENDAR_ID",
  );
  const [generalSaved, setGeneralSaved] = useState(false);

  // Prompts state
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [promptSaved, setPromptSaved] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const admin = await isAdmin();
      if (!admin) {
        router.replace("/dashboard");
        return;
      }
      setLoading(false);
    }
    init();
  }, [router]);

  function handleSaveGeneral() {
    // Placeholder - would save to DB
    setGeneralSaved(true);
    setTimeout(() => setGeneralSaved(false), 2000);
  }

  function handlePromptChange(name: string, value: string) {
    setPrompts((prev) => ({ ...prev, [name]: value }));
  }

  function handleSavePrompt(name: string) {
    // Placeholder - would save to DB
    setPromptSaved(name);
    setTimeout(() => setPromptSaved(null), 2000);
  }

  if (loading) {
    return (
      <div dir="rtl">
        <div className="mb-8 animate-in">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="card-static p-6">
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "general", label: "כללי" },
    { id: "questionnaire", label: "שאלון" },
    { id: "prompts", label: "Prompts" },
  ];

  const marketerQuestions = getQuestions();
  const businessQuestions = getQuestions("יועץ משכנתאות");

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="mb-8 animate-in">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          הגדרות מערכת
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          הגדרות ותצורה של FBM Studio
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-0 mb-6 animate-in delay-1"
        style={{ borderBottom: "2px solid var(--card-border)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-6 py-3 text-sm font-medium cursor-pointer transition-colors relative"
            style={{
              color:
                activeTab === tab.id
                  ? "var(--gold)"
                  : "var(--text-muted)",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--gold)"
                  : "2px solid transparent",
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="space-y-6 animate-in delay-2">
          <div className="card-elevated p-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6">
              הגדרות כלליות
            </h2>
            <div className="space-y-5 max-w-lg">
              {/* System Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  שם המערכת
                </label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] outline-none transition-colors"
                  style={{
                    border: "1.5px solid var(--card-border)",
                    backgroundColor: "var(--content-bg)",
                  }}
                />
              </div>

              {/* GoHighLevel Calendar URL */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  GoHighLevel Calendar URL
                </label>
                <input
                  type="url"
                  value={calendarUrl}
                  onChange={(e) => setCalendarUrl(e.target.value)}
                  placeholder="https://api.leadconnectorhq.com/widget/booking/..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] outline-none transition-colors font-mono text-xs"
                  style={{
                    border: "1.5px solid var(--card-border)",
                    backgroundColor: "var(--content-bg)",
                  }}
                  dir="ltr"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  כתובת ה-iframe של הלוח שנות שמוצג בעמוד Welcome
                </p>
              </div>

              {/* Version Info */}
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: "var(--content-bg)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase tracking-wider">
                  גרסה
                </label>
                <p className="text-[var(--text-primary)] font-medium">
                  1.0.0 Beta
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveGeneral}
                className="btn-gold text-sm !py-2.5 !px-6"
              >
                {generalSaved ? "נשמר!" : "שמור שינויים"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questionnaire Tab */}
      {activeTab === "questionnaire" && (
        <div className="space-y-6 animate-in delay-2">
          {/* Niche Mode Toggle */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  מצב נישה
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  כאשר מצב נישה פעיל, השאלון מותאם לבעלי עסקים עם נישה ידועה
                </p>
              </div>
              <button
                onClick={() => setNicheMode(!nicheMode)}
                className="relative w-12 h-6 rounded-full transition-colors cursor-pointer"
                style={{
                  backgroundColor: nicheMode
                    ? "var(--gold)"
                    : "var(--card-border)",
                }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                  style={{
                    transform: nicheMode
                      ? "translateX(2px)"
                      : "translateX(26px)",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Marketer Version */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              גרסה א&apos; &mdash; שאלות למשווק FBM
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              כשהנישה ריקה &mdash; המשווק ממלא על עצמו
            </p>
            <div className="space-y-3">
              {marketerQuestions.map((q, i) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: "var(--content-bg)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #D4A843, #C49A38)",
                        color: "#0F1117",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-[var(--gold)]">
                          {q.sectionTitle}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          &middot;
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {q.title}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        {q.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Business Owner Version */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              גרסה ב&apos; &mdash; שאלות לבעל עסק
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              דוגמה עם נישה: &quot;יועץ משכנתאות&quot;
            </p>
            <div className="space-y-3">
              {businessQuestions.map((q, i) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: "var(--content-bg)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #818CF8, #6366F1)",
                        color: "#fff",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-medium"
                          style={{ color: "#818CF8" }}
                        >
                          {q.sectionTitle}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          &middot;
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {q.title}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        {q.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prompts Tab */}
      {activeTab === "prompts" && (
        <div className="space-y-6 animate-in delay-2">
          <div className="card-elevated p-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
              AI Prompts
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              ערוך את ה-prompts המשמשים את מנוע ה-AI במערכת
            </p>

            <div className="space-y-6">
              {PROMPT_LIST.map((prompt) => (
                <div
                  key={prompt.name}
                  className="p-5 rounded-xl"
                  style={{
                    backgroundColor: "var(--content-bg)",
                    border: "1px solid var(--card-border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">
                        {prompt.label}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {prompt.description}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: "var(--gold-soft)",
                        color: "var(--gold)",
                      }}
                    >
                      {prompt.name}
                    </span>
                  </div>
                  <textarea
                    value={prompts[prompt.name] ?? ""}
                    onChange={(e) =>
                      handlePromptChange(prompt.name, e.target.value)
                    }
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl text-sm text-[var(--text-primary)] outline-none transition-colors resize-y font-mono leading-relaxed"
                    style={{
                      border: "1.5px solid var(--card-border)",
                      backgroundColor: "var(--card-bg)",
                    }}
                    placeholder={prompt.placeholder}
                    dir="rtl"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-[var(--text-muted)]">
                      {(prompts[prompt.name] ?? "").length > 0
                        ? `${(prompts[prompt.name] ?? "").length} תווים`
                        : "ריק - ישתמש ב-prompt ברירת המחדל"}
                    </span>
                    <button
                      onClick={() => handleSavePrompt(prompt.name)}
                      className="btn-outline text-xs !py-1.5 !px-4 !rounded-lg"
                    >
                      {promptSaved === prompt.name ? "נשמר!" : "שמור"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div
            className="p-4 rounded-xl"
            style={{
              backgroundColor: "var(--gold-soft)",
              border: "1px solid var(--gold)",
            }}
          >
            <p className="text-sm text-[var(--text-primary)]">
              ה-prompts ברירת המחדל מוגדרים בקובץ{" "}
              <code
                className="px-1.5 py-0.5 rounded text-xs font-mono"
                style={{
                  backgroundColor: "rgba(212, 168, 67, 0.2)",
                  color: "var(--gold)",
                }}
              >
                src/lib/prompts.ts
              </code>
              . ערכים שנשמרים כאן ידרסו את ברירת המחדל.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
