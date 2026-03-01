"use client";

import { useRouter, useParams } from "next/navigation";

export default function VideoCreatorPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="pb-20 overflow-x-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-in">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">🎬 יצירת וידאו</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            סרטון MP4 של 60 שניות — קליפי סטוק / AI + קריינות + כתוביות
          </p>
        </div>
      </div>

      {/* Development Status Banner */}
      <div className="card-static rounded-xl p-8 text-center animate-in">
        <div
          className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center text-4xl"
          style={{ backgroundColor: "rgba(212, 168, 67, 0.1)" }}
        >
          🚧
        </div>

        <h3
          className="text-2xl font-bold mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          העמוד בפיתוח
        </h3>

        <p className="text-sm text-[var(--text-secondary)] mb-2 max-w-md mx-auto leading-relaxed">
          יצירת הוידאו נמצאת כרגע בשלבי פיתוח ועדיין לא זמינה לשימוש.
        </p>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto leading-relaxed">
          אנחנו עובדים על זה ובקרוב הפיצ׳ר יהיה מוכן עבורכם!
        </p>

        <div
          className="rounded-xl p-4 mb-6 max-w-sm mx-auto"
          style={{
            backgroundColor: "rgba(212, 168, 67, 0.06)",
            border: "1px solid rgba(212, 168, 67, 0.15)",
          }}
        >
          <p className="text-xs font-medium" style={{ color: "#D4A843" }}>
            מה צפוי?
          </p>
          <ul className="text-xs text-[var(--text-secondary)] mt-2 space-y-1.5 text-right">
            <li>📹 יצירת סרטונים עם קליפי סטוק מ-Pexels</li>
            <li>🤖 יצירת סרטונים עם AI מ-Google Veo</li>
            <li>🎙️ קריינות אוטומטית בעברית</li>
            <li>📝 כתוביות מסונכרנות</li>
            <li>🎵 מוזיקת רקע</li>
          </ul>
        </div>

        <button
          onClick={() => router.push(`/project/${projectId}/copy`)}
          className="btn-gold !py-3 !px-8 text-base"
        >
          המשך לקופי למודעות
        </button>
      </div>
    </div>
  );
}
