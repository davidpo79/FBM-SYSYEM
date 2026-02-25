"use client";

import { useRouter, useParams } from "next/navigation";

export default function VideoCreatorPage() {
  const router = useRouter();
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div className="pb-20" dir="rtl">
      <div className="flex flex-col items-center justify-center py-16 animate-in">
        <div className="card-static rounded-2xl p-10 max-w-lg mx-auto text-center">
          <span className="text-6xl block mb-5">🎬</span>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
            יצירת וידאו
          </h2>
          <p className="text-base text-[var(--text-secondary)] mb-2">
            העמוד הזה בבנייה ויושק בהמשך
          </p>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-8">
            בקרוב תוכלו ליצור סרטוני MP4 מקצועיים של 60 שניות ישירות
            מהתסריטים — עם קליפים, קריינות בעברית, כתוביות ומוזיקת רקע.
          </p>
          <button
            onClick={() => router.push(`/project/${projectId}/copy`)}
            className="btn-gold text-lg !px-8 !py-3"
          >
            המשך לקופי למודעות
          </button>
        </div>
      </div>
    </div>
  );
}
