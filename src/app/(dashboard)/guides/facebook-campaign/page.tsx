"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, AlertTriangle, Lightbulb, Target, DollarSign, Users, Image, Video, MessageCircle, MousePointerClick, Settings2, Eye } from "lucide-react";

interface Step {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl mt-4" style={{ backgroundColor: "rgba(212, 168, 67, 0.08)", border: "1px solid rgba(212, 168, 67, 0.2)" }}>
      <Lightbulb size={18} className="flex-shrink-0 mt-0.5" style={{ color: "#D4A843" }} />
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</p>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl mt-4" style={{ backgroundColor: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
      <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</p>
    </div>
  );
}

function NumberedStep({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start py-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#D4A843" }}>
        {num}
      </span>
      <div className="text-sm text-[var(--text-primary)] leading-relaxed pt-0.5">{children}</div>
    </div>
  );
}

function ScreenLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3B82F6" }}>
      <Eye size={12} />
      {label}
    </span>
  );
}

function ButtonLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "#1877F2" }}>
      {label}
    </span>
  );
}

function MenuPath({ path }: { path: string }) {
  const parts = path.split(" > ");
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronLeft size={12} className="text-[var(--text-muted)]" />}
          <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--sidebar-hover)" }}>{part}</span>
        </span>
      ))}
    </span>
  );
}

const STEPS: Step[] = [
  {
    id: 1,
    title: "כניסה למנהל המודעות",
    subtitle: "פתיחת Ads Manager",
    icon: <Settings2 size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          בשלב הראשון צריך להיכנס למנהל המודעות של פייסבוק (Ads Manager) ולהתחיל ליצור קמפיין חדש.
        </p>

        <NumberedStep num={1}>
          היכנס לכתובת{" "}
          <span className="font-bold text-[var(--text-primary)]">business.facebook.com</span>{" "}
          או לחץ על <MenuPath path="תפריט > מנהל מודעות" /> מתוך הדף העסקי שלך.
        </NumberedStep>

        <NumberedStep num={2}>
          לחץ על הכפתור הירוק <ButtonLabel label="+ צור" /> בפינה השמאלית העליונה של המסך.
        </NumberedStep>

        <NumberedStep num={3}>
          בחר <span className="font-bold">קמפיין</span> מהתפריט שנפתח.
        </NumberedStep>

        <Tip>
          אם אין לך עדיין חשבון פרסום — פייסבוק ייצור לך אחד אוטומטית כשתנסה ליצור קמפיין לראשונה. וודא שיש לך אמצעי תשלום מוגדר.
        </Tip>
      </>
    ),
  },
  {
    id: 2,
    title: "בחירת מטרת הקמפיין",
    subtitle: "Engagement — מעורבות",
    icon: <Target size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          פייסבוק מציג 6 מטרות קמפיין. אנחנו נבחר במטרת <strong>מעורבות (Engagement)</strong> כי זו המטרה שמביאה לידים דרך הודעות.
        </p>

        <NumberedStep num={1}>
          במסך <ScreenLabel label="בחר מטרת קמפיין" /> תראה 6 אפשרויות. בחר ב:
          <div className="mt-2 p-3 rounded-xl font-bold text-base" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#16A34A" }}>
            מעורבות (Engagement)
          </div>
        </NumberedStep>

        <NumberedStep num={2}>
          לחץ <ButtonLabel label="המשך" />.
        </NumberedStep>

        <Warning>
          אל תבחר &quot;לידים&quot; (Leads) — זה ייצור טופס ולא הודעות. אנחנו רוצים שאנשים ישלחו הודעה ישירה ולא ימלאו טופס.
        </Warning>

        <Tip>
          מטרת &quot;מעורבות&quot; מאפשרת לנו בשלב הבא לבחור &quot;הודעות&quot; כיעד המרה — ככה פייסבוק יביא אנשים שסביר שישלחו הודעה.
        </Tip>
      </>
    ),
  },
  {
    id: 3,
    title: "הגדרת שם הקמפיין",
    subtitle: "שם ברור ומסודר",
    icon: <Settings2 size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          תן לקמפיין שם ברור שיעזור לך לזהות אותו בעתיד. שמות טובים כוללים את שם הלקוח, סוג הקמפיין והתאריך.
        </p>

        <NumberedStep num={1}>
          במסך <ScreenLabel label="קמפיין חדש" /> — מלא את שדה <strong>שם הקמפיין</strong>.
        </NumberedStep>

        <NumberedStep num={2}>
          השתמש בפורמט ברור, למשל:
          <div className="mt-2 space-y-1.5">
            <div className="p-2.5 rounded-lg text-sm font-mono" style={{ backgroundColor: "var(--sidebar-hover)" }}>
              דודי_מאמן_כושר_מעורבות_הודעות_מרץ25
            </div>
            <div className="p-2.5 rounded-lg text-sm font-mono" style={{ backgroundColor: "var(--sidebar-hover)" }}>
              שרה_יועצת_משכנתאות_הודעות_מרץ25
            </div>
          </div>
        </NumberedStep>

        <NumberedStep num={3}>
          <strong>הגדרות מיוחדות:</strong>
          <ul className="mt-1 space-y-1 mr-4 list-disc text-[var(--text-secondary)]">
            <li>קטגוריית מודעה מיוחדת — <strong>לא</strong> (אלא אם מדובר בנדל&quot;ן, אשראי, תעסוקה)</li>
            <li>A/B Test — <strong>כבוי</strong> (לא נדרש בשלב זה)</li>
            <li>Advantage Campaign Budget — <strong>כבוי</strong> (נגדיר תקציב ברמת האדסט)</li>
          </ul>
        </NumberedStep>

        <NumberedStep num={4}>
          לחץ <ButtonLabel label="הבא" /> לעבור לשלב האדסט.
        </NumberedStep>

        <Tip>
          כבה את Advantage Campaign Budget כי אנחנו רוצים שליטה מלאה בתקציב ברמת האדסט. ככה תוכל לנהל כמה קהלים במקביל עם תקציבים שונים.
        </Tip>
      </>
    ),
  },
  {
    id: 4,
    title: "הגדרת האדסט — יעד המרה",
    subtitle: "Messaging Apps — הודעות",
    icon: <MessageCircle size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          ברמת האדסט (Ad Set) נגדיר לאן נרצה שפייסבוק ישלח את הליד — ישירות להודעות.
        </p>

        <NumberedStep num={1}>
          במסך <ScreenLabel label="אדסט חדש" /> — תן שם לאדסט. למשל:
          <div className="mt-2 p-2.5 rounded-lg text-sm font-mono" style={{ backgroundColor: "var(--sidebar-hover)" }}>
            קהל_חם_גיל_25-55_מרכז
          </div>
        </NumberedStep>

        <NumberedStep num={2}>
          בסעיף <strong>Conversion Location</strong> (יעד המרה) — בחר:
          <div className="mt-2 p-3 rounded-xl font-bold" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#16A34A" }}>
            Messaging Apps (אפליקציות הודעות)
          </div>
        </NumberedStep>

        <NumberedStep num={3}>
          בסעיף <strong>Messaging Apps</strong> — בחר:
          <ul className="mt-1 space-y-1.5 mr-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" />
              <span><strong>Messenger</strong> — מומלץ כברירת מחדל</span>
            </li>
            <li className="flex items-center gap-2">
              <Circle size={14} className="text-gray-400" />
              <span><strong>WhatsApp</strong> — אופציונלי, אם יש חשבון עסקי</span>
            </li>
            <li className="flex items-center gap-2">
              <Circle size={14} className="text-gray-400" />
              <span><strong>Instagram Direct</strong> — אופציונלי</span>
            </li>
          </ul>
        </NumberedStep>

        <Tip>
          Messenger הוא הכי אמין ופשוט — העדיפו אותו בהתחלה. WhatsApp דורש חשבון WhatsApp Business מחובר לעמוד.
        </Tip>
      </>
    ),
  },
  {
    id: 5,
    title: "תקציב ולוח זמנים",
    subtitle: "כמה להשקיע ומתי להתחיל",
    icon: <DollarSign size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          עכשיו נגדיר כמה כסף הקמפיין ישתמש ביום ומתי הוא יתחיל לרוץ.
        </p>

        <NumberedStep num={1}>
          בסעיף <strong>Budget & Schedule</strong> — בחר <strong>Daily Budget</strong> (תקציב יומי).
        </NumberedStep>

        <NumberedStep num={2}>
          הגדר תקציב יומי לפי הצורך:
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--sidebar-hover)" }}>
              <span className="text-sm font-medium">בדיקה ראשונית</span>
              <span className="font-bold text-[var(--gold)]">30-50 ₪/יום</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--sidebar-hover)" }}>
              <span className="text-sm font-medium">קמפיין פעיל רגיל</span>
              <span className="font-bold text-[var(--gold)]">50-100 ₪/יום</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "var(--sidebar-hover)" }}>
              <span className="text-sm font-medium">קמפיין אגרסיבי</span>
              <span className="font-bold text-[var(--gold)]">100-300 ₪/יום</span>
            </div>
          </div>
        </NumberedStep>

        <NumberedStep num={3}>
          <strong>תאריך התחלה:</strong> אפשר להשאיר &quot;מיד&quot; או לבחור תאריך עתידי.
          <br />
          <strong>תאריך סיום:</strong> מומלץ <strong>לא להגדיר</strong> תאריך סיום — ככה תוכל לעצור ידנית כשתרצה.
        </NumberedStep>

        <Warning>
          אל תתחיל עם תקציב גבוה מדי! התחל עם 30-50 ₪ ליום, בדוק תוצאות 3-5 ימים, ואז תעלה בהדרגה.
        </Warning>

        <Tip>
          עדיף לרוץ בתקציב נמוך ל-7 ימים מאשר בתקציב גבוה ליום אחד. פייסבוק צריך זמן ללמוד את הקהל שלך (שלב הלמידה).
        </Tip>
      </>
    ),
  },
  {
    id: 6,
    title: "הגדרת קהל יעד (טרגוט)",
    subtitle: "מי יראה את המודעה",
    icon: <Users size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          זה השלב הכי חשוב — מי יראה את המודעה שלך. טרגוט טוב = לידים איכותיים.
        </p>

        <NumberedStep num={1}>
          <strong>מיקום גאוגרפי:</strong>
          <ul className="mt-1 space-y-1 mr-4 list-disc text-[var(--text-secondary)]">
            <li>בחר <strong>ישראל</strong> (או אזור ספציפי אם רלוונטי)</li>
            <li>אפשר לצמצם לערים — למשל: תל אביב, חיפה, ירושלים</li>
            <li>אפשר להוסיף רדיוס סביב נקודה — מתאים לעסקים מקומיים</li>
          </ul>
        </NumberedStep>

        <NumberedStep num={2}>
          <strong>גיל:</strong>
          <div className="mt-1 p-3 rounded-xl" style={{ backgroundColor: "var(--sidebar-hover)" }}>
            <span className="text-sm">הטווח המומלץ לרוב העסקים: <strong>25-55</strong></span>
            <br />
            <span className="text-xs text-[var(--text-muted)]">התאם לפי הנישה — מאמני כושר למשל: 22-45, יועצי משכנתאות: 28-50</span>
          </div>
        </NumberedStep>

        <NumberedStep num={3}>
          <strong>מגדר:</strong> בחר <strong>הכל</strong> (אלא אם השירות ספציפי למגדר מסוים).
        </NumberedStep>

        <NumberedStep num={4}>
          <strong>Detailed Targeting (תחומי עניין):</strong>
          <ul className="mt-1 space-y-1.5 mr-4 list-disc text-[var(--text-secondary)]">
            <li>הקלד תחומי עניין רלוונטיים לנישה</li>
            <li>למשל למאמן כושר: &quot;כושר גופני&quot;, &quot;חדר כושר&quot;, &quot;אורח חיים בריא&quot;</li>
            <li>למשל ליועץ משכנתאות: &quot;משכנתא&quot;, &quot;נדל&quot;ן&quot;, &quot;רכישת דירה&quot;</li>
            <li>הוסף 3-8 תחומי עניין — לא יותר מדי ולא פחות מדי</li>
          </ul>
        </NumberedStep>

        <NumberedStep num={5}>
          <strong>Advantage Detailed Targeting:</strong> השאר <strong>מופעל</strong> — זה נותן לפייסבוק גמישות למצוא אנשים נוספים שסביר שיגיבו.
        </NumberedStep>

        <Tip>
          בדוק את מד הקהל בצד ימין — הוא צריך להיות באזור הירוק. קהל של 200,000-2,000,000 הוא טווח טוב ברוב המקרים. קהל קטן מדי (מתחת ל-50,000) עלול להיות יקר, וקהל גדול מדי (מעל 5 מיליון) עלול להיות לא ממוקד.
        </Tip>
      </>
    ),
  },
  {
    id: 7,
    title: "מיקומים (Placements)",
    subtitle: "היכן תופיע המודעה",
    icon: <MousePointerClick size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          מיקומים קובעים <strong>איפה</strong> המודעה תופיע — בפיד של פייסבוק, באינסטגרם, ב-Stories, וכו&apos;.
        </p>

        <NumberedStep num={1}>
          בסעיף <strong>Placements</strong> — בחר:
          <div className="mt-2 p-3 rounded-xl font-bold" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#16A34A" }}>
            Advantage+ Placements (מומלץ)
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            זה נותן לפייסבוק את הגמישות להציג את המודעה במיקום הכי אפקטיבי.
          </p>
        </NumberedStep>

        <NumberedStep num={2}>
          <strong>אם אתה רוצה שליטה ידנית</strong> — בחר &quot;Manual Placements&quot; והפעל:
          <ul className="mt-1 space-y-1.5 mr-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" />
              <span>Facebook Feed</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" />
              <span>Instagram Feed</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" />
              <span>Facebook / Instagram Stories & Reels</span>
            </li>
            <li className="flex items-center gap-2">
              <Circle size={14} className="text-gray-400" />
              <span className="text-[var(--text-muted)]">Audience Network — מומלץ לכבות</span>
            </li>
          </ul>
        </NumberedStep>

        <NumberedStep num={3}>
          לחץ <ButtonLabel label="הבא" /> לעבור ליצירת המודעה.
        </NumberedStep>

        <Tip>
          למתחילים — השאירו Advantage+ Placements. פייסבוק כבר יודע איפה הקהל שלכם הכי פעיל ויפזר את התקציב בהתאם.
        </Tip>
      </>
    ),
  },
  {
    id: 8,
    title: "יצירת המודעה — בחירת פורמט",
    subtitle: "סרטון או תמונה",
    icon: <Image size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          עכשיו מגיע החלק היצירתי — יצירת המודעה עצמה. כאן נבחר את הפורמט ונעלה את החומרים.
        </p>

        <NumberedStep num={1}>
          במסך <ScreenLabel label="מודעה חדשה" /> — תן שם למודעה. למשל:
          <div className="mt-2 p-2.5 rounded-lg text-sm font-mono" style={{ backgroundColor: "var(--sidebar-hover)" }}>
            וידאו_סיפור_אישי_v1
          </div>
        </NumberedStep>

        <NumberedStep num={2}>
          בסעיף <strong>Ad Setup</strong> — בחר <strong>Create Ad</strong> (יצירת מודעה חדשה).
        </NumberedStep>

        <NumberedStep num={3}>
          בסעיף <strong>Format</strong> (פורמט) — בחר אחד:
          <div className="mt-2 space-y-3">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Video size={16} className="text-green-600" />
                <strong className="text-green-700">Single Video (סרטון בודד) — מומלץ!</strong>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mr-6">
                סרטון FBM מבוסס תדר — הכי אפקטיבי. שימוש בסרטון שנוצר במערכת.
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--sidebar-hover)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Image size={16} className="text-blue-500" />
                <strong>Single Image (תמונה בודדת)</strong>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mr-6">
                קריאייטיב תמונה — מתאים לבדיקה מהירה או כשאין סרטון מוכן.
              </p>
            </div>
          </div>
        </NumberedStep>

        <Tip>
          בשיטת FBM, סרטון תמיד יביא תוצאות טובות יותר מתמונה. הסרטון יוצר חיבור רגשי וקרבה — בדיוק מה שהשיטה מלמדת. אם אין לך סרטון, צור אחד במערכת &quot;יצירת וידאו&quot;.
        </Tip>
      </>
    ),
  },
  {
    id: 9,
    title: "העלאת קריאייטיב ומילוי טקסטים",
    subtitle: "תמונה/סרטון + קופי",
    icon: <Video size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          עכשיו נעלה את הסרטון או התמונה ונמלא את הטקסטים של המודעה.
        </p>

        <NumberedStep num={1}>
          <strong>העלאת מדיה:</strong>
          <ul className="mt-1 space-y-1 mr-4 list-disc text-[var(--text-secondary)]">
            <li><strong>סרטון:</strong> לחץ &quot;Add Video&quot; → &quot;Upload&quot; → בחר את הסרטון מהמחשב</li>
            <li><strong>תמונה:</strong> לחץ &quot;Add Media&quot; → &quot;Upload&quot; → בחר את התמונה</li>
            <li>גודל מומלץ: <strong>1080x1080</strong> (ריבועי) או <strong>1080x1920</strong> (סטורי)</li>
          </ul>
        </NumberedStep>

        <NumberedStep num={2}>
          <strong>Primary Text (טקסט ראשי):</strong>
          <div className="mt-2 p-3 rounded-xl text-sm" style={{ backgroundColor: "var(--sidebar-hover)" }}>
            זה הטקסט שמופיע <strong>מעל</strong> המודעה בפיד.
            <br />
            <span className="text-[var(--text-muted)]">השתמש בקופי שנוצר במערכת FBM — העתק אותו מדף הקופי בפרויקט שלך.</span>
          </div>
        </NumberedStep>

        <NumberedStep num={3}>
          <strong>Headline (כותרת):</strong>
          <div className="mt-2 p-3 rounded-xl text-sm" style={{ backgroundColor: "var(--sidebar-hover)" }}>
            כותרת קצרה ואימפקטית. 5-10 מילים.
            <br />
            <span className="text-[var(--text-muted)]">למשל: &quot;הפסק לנחש, תתחיל להרוויח&quot;</span>
          </div>
        </NumberedStep>

        <NumberedStep num={4}>
          <strong>Description (תיאור):</strong>
          <div className="mt-2 p-3 rounded-xl text-sm" style={{ backgroundColor: "var(--sidebar-hover)" }}>
            משפט תמיכה קצר מתחת לכותרת.
            <br />
            <span className="text-[var(--text-muted)]">למשל: &quot;שלח הודעה עכשיו לפגישת ייעוץ חינם&quot;</span>
          </div>
        </NumberedStep>

        <NumberedStep num={5}>
          <strong>Call to Action (קריאה לפעולה):</strong> בחר <ButtonLabel label="Send Message" /> מהרשימה.
        </NumberedStep>

        <Tip>
          הקופי שנוצר במערכת FBM מותאם בדיוק לשיטת התדר. העתק את הקופי מדף &quot;קופי&quot; בפרויקט שלך — הוא כבר כתוב בשפה שמדברת ללקוח האידיאלי.
        </Tip>
      </>
    ),
  },
  {
    id: 10,
    title: "הגדרת תבנית הודעה",
    subtitle: "Message Template",
    icon: <MessageCircle size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          כשמישהו ילחץ על &quot;שלח הודעה&quot; — פייסבוק יפתח חלון הודעות עם תבנית מוכנה. נגדיר אותה.
        </p>

        <NumberedStep num={1}>
          בסעיף <strong>Message Template</strong> — לחץ <ButtonLabel label="Create" />.
        </NumberedStep>

        <NumberedStep num={2}>
          בחר <strong>Start Conversations</strong> (התחל שיחות).
        </NumberedStep>

        <NumberedStep num={3}>
          <strong>Greeting (ברכה):</strong> כתוב הודעת פתיחה שהלקוח יראה:
          <div className="mt-2 p-3 rounded-xl text-sm" style={{ backgroundColor: "var(--sidebar-hover)" }} dir="rtl">
            <p className="mb-1">דוגמה:</p>
            <p className="text-[var(--text-secondary)] italic">
              &quot;היי! 👋 שמח שהגעת. ספר לי קצת על עצמך ואשמח לעזור לך.&quot;
            </p>
          </div>
        </NumberedStep>

        <NumberedStep num={4}>
          <strong>Customer Actions (פעולות מוצעות):</strong> הוסף 1-3 כפתורי תגובה מהירה:
          <div className="mt-2 space-y-1.5">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(24, 119, 242, 0.1)", color: "#1877F2", border: "1px solid rgba(24, 119, 242, 0.2)" }}>
              אני רוצה לשמוע עוד
            </div>
            <br />
            <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(24, 119, 242, 0.1)", color: "#1877F2", border: "1px solid rgba(24, 119, 242, 0.2)" }}>
              מעוניין בפגישת ייעוץ
            </div>
            <br />
            <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(24, 119, 242, 0.1)", color: "#1877F2", border: "1px solid rgba(24, 119, 242, 0.2)" }}>
              כמה זה עולה?
            </div>
          </div>
        </NumberedStep>

        <NumberedStep num={5}>
          לחץ <ButtonLabel label="Save & Finish" /> לסגור את ההגדרה.
        </NumberedStep>

        <Tip>
          כפתורי התגובה המהירה מגדילים את שיעור ההודעות ב-40-60%! הם הופכים את הלחיצה לקלה ומורידים את החסם הפסיכולוגי של כתיבת הודעה ראשונה.
        </Tip>
      </>
    ),
  },
  {
    id: 11,
    title: "בדיקה אחרונה ופרסום",
    subtitle: "Review & Publish",
    icon: <CheckCircle2 size={20} />,
    content: (
      <>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          לפני הפרסום — נעבור על כל ההגדרות ונוודא שהכל מוכן.
        </p>

        <div className="space-y-2 mb-4">
          <h4 className="font-bold text-sm text-[var(--text-primary)]">צ&apos;קליסט לפני פרסום:</h4>
          {[
            "מטרת קמפיין = מעורבות (Engagement)",
            "יעד המרה = Messaging Apps",
            "תקציב יומי מוגדר (30-50 ₪ להתחלה)",
            "קהל יעד — גיל, מיקום ותחומי עניין מותאמים",
            "קריאייטיב — סרטון/תמונה באיכות טובה",
            "טקסט ראשי (קופי FBM)",
            "כותרת ותיאור ממלאים",
            "Call to Action = Send Message",
            "תבנית הודעה עם כפתורי תגובה מהירה",
          ].map((item, i) => (
            <label key={i} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-[var(--sidebar-hover)] transition-colors">
              <input type="checkbox" className="w-4 h-4 rounded accent-[#D4A843]" />
              <span className="text-sm text-[var(--text-primary)]">{item}</span>
            </label>
          ))}
        </div>

        <NumberedStep num={1}>
          לחץ על <ButtonLabel label="Review" /> בפינה התחתונה.
        </NumberedStep>

        <NumberedStep num={2}>
          עבור על הסיכום ובדוק שאין שגיאות (אייקון אדום).
        </NumberedStep>

        <NumberedStep num={3}>
          לחץ על <ButtonLabel label="Publish" /> — הקמפיין ישלח לבדיקה.
        </NumberedStep>

        <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.06)", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
          <p className="text-sm font-bold text-green-700 mb-1">🎉 מזל טוב!</p>
          <p className="text-sm text-[var(--text-secondary)]">
            הקמפיין נשלח לאישור. פייסבוק בודק את המודעה תוך 5-60 דקות בדרך כלל.
            לאחר האישור, המודעה תתחיל לרוץ וליצור לידים!
          </p>
        </div>

        <Tip>
          אחרי 3-5 ימים — בדוק את הביצועים. שים לב ל-Cost Per Message (עלות להודעה). אם זה מעל 20 ₪ — שקול לשנות את הקהל או את הקריאייטיב.
        </Tip>
      </>
    ),
  },
];

export default function FacebookCampaignGuidePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = STEPS[currentStep];
  const progress = Math.round(((completedSteps.size) / STEPS.length) * 100);

  const toggleComplete = (stepId: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      toggleComplete(step.id);
      setCurrentStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          מדריך הקמת קמפיין מעורבות להודעות
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Facebook Ads — צעד אחר צעד למתחילים
        </p>
      </div>

      {/* Progress bar */}
      <div className="card-static p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[var(--text-secondary)]">
            התקדמות: {completedSteps.size} מתוך {STEPS.length} שלבים
          </span>
          <span className="text-xs font-bold" style={{ color: "#D4A843" }}>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: "#D4A843" }}
          />
        </div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Step navigation sidebar */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="card-static overflow-hidden lg:sticky lg:top-24">
            <div className="p-4 border-b border-[var(--card-border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">שלבי ההקמה</h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {STEPS.map((s, idx) => {
                const isActive = idx === currentStep;
                const isDone = completedSteps.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStep(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-all cursor-pointer border-b border-[var(--card-border)] last:border-b-0 ${
                      isActive
                        ? "bg-[var(--gold-soft)]"
                        : "hover:bg-[var(--sidebar-hover)]"
                    }`}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? "bg-green-500 text-white"
                        : isActive
                          ? "text-white"
                          : "bg-gray-200 text-gray-500"
                    }`} style={isActive && !isDone ? { backgroundColor: "#D4A843" } : undefined}>
                      {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${isActive ? "text-[var(--gold)]" : "text-[var(--text-primary)]"}`}>
                        {s.title}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{s.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 min-w-0">
          <div className="card-elevated p-6 animate-in">
            {/* Step header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(212, 168, 67, 0.1)", color: "#D4A843" }}>
                {step.icon}
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">שלב {step.id} מתוך {STEPS.length}</div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{step.title}</h2>
              </div>
            </div>

            {/* Step content */}
            {step.content}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--card-border)]">
              <button
                onClick={goPrev}
                disabled={currentStep === 0}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
                הקודם
              </button>

              <button
                onClick={() => toggleComplete(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  completedSteps.has(step.id)
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-green-300 hover:text-green-600"
                }`}
              >
                {completedSteps.has(step.id) ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                {completedSteps.has(step.id) ? "הושלם" : "סמן כהושלם"}
              </button>

              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: "#D4A843" }}
                >
                  הבא
                  <ChevronLeft size={16} />
                </button>
              ) : (
                <div className="w-20" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
