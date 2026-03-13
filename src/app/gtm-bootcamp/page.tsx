"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/track-event";
import { fbLead, fbViewContent } from "@/lib/fbpixel";

export default function GTMBootcampPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Track page view + FB Pixel
  useEffect(() => {
    trackEvent({ eventType: "page_view", eventName: "gtm_bootcamp_page", stepName: "gtm-bootcamp" });
    fbViewContent("GTM Bootcamp Page");
  }, []);

  // Listen for GHL form submission via postMessage to fire FB Lead event
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // GHL iframe sends postMessage on form events
      if (typeof event.data === "string" && event.data.includes("formSubmitted")) {
        fbLead("GTM Bootcamp Booking");
        trackEvent({ eventType: "step_complete", eventName: "gtm_bootcamp_booking", stepName: "gtm-bootcamp" });
      }
      // Also check for object-style messages from GHL
      if (event.data && typeof event.data === "object" && (event.data.type === "formSubmitted" || event.data.event === "formSubmitted")) {
        fbLead("GTM Bootcamp Booking");
        trackEvent({ eventType: "step_complete", eventName: "gtm_bootcamp_booking", stepName: "gtm-bootcamp" });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  /* Auto-resize iframe height based on content */
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://link.msgsndr.com/js/form_embed.js";
    script.type = "text/javascript";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#080A0F", color: "#F0F6FF", direction: "rtl" }}>
      {/* ── Header ── */}
      <header style={{
        padding: "20px 24px",
        borderBottom: "1px solid rgba(0,255,136,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "monospace",
          fontSize: 18,
          fontWeight: 700,
          color: "#00FF88",
          letterSpacing: 1,
          direction: "ltr",
        }}>
          &lt;GTM Bootcamp /&gt;
        </span>
      </header>

      {/* ── Hero Section ── */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px 64px" }}>
        {/* Tagline badge */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{
            display: "inline-block",
            fontFamily: "monospace",
            fontSize: 13,
            color: "#00FF88",
            background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.2)",
            borderRadius: 20,
            padding: "6px 18px",
            letterSpacing: 0.5,
          }}>
            משורת קוד לשורת רווח
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          textAlign: "center",
          fontSize: "clamp(24px, 5vw, 36px)",
          fontWeight: 800,
          lineHeight: 1.3,
          marginBottom: 16,
          color: "#F0F6FF",
        }}>
          Go-To-Market Bootcamp for AI Startups{" "}
          <span style={{ color: "#00FF88" }}>— בואו נבדוק התאמה.</span>
        </h1>

        {/* Description */}
        <p style={{
          textAlign: "center",
          fontSize: "clamp(15px, 2.5vw, 18px)",
          lineHeight: 1.8,
          color: "#94A3B8",
          maxWidth: 560,
          margin: "0 auto 40px",
        }}>
          קבעו שיחת אבחון קצרה של 15 דקות. ננתח את רעיון ה-AI שלכם ונראה איך
          אפשר לבנות לו מנוע שיווקי שמביא משתמשים משלמים.
        </p>

        {/* Decorative line */}
        <div style={{
          width: 60,
          height: 3,
          background: "linear-gradient(90deg, #00FF88, #00CC6A)",
          borderRadius: 2,
          margin: "0 auto 40px",
        }} />

        {/* ── Calendar Widget ── */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(0,255,136,0.12)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 0 40px rgba(0,255,136,0.04)",
        }}>
          <iframe
            ref={iframeRef}
            src="https://api.leadconnectorhq.com/widget/booking/IE5MfAX8MxwCPFRpUw8v"
            style={{
              width: "100%",
              minHeight: 700,
              border: "none",
              overflow: "hidden",
              display: "block",
            }}
            scrolling="no"
            id="IE5MfAX8MxwCPFRpUw8v_1773261671064"
          />
        </div>

        {/* Footer note */}
        <p style={{
          textAlign: "center",
          fontSize: 13,
          color: "#3D4F6F",
          marginTop: 32,
          fontFamily: "monospace",
        }}>
          {/* ללא עלות · 15 דקות · אונליין */}
        </p>

        {/* ══════════════════════════════════════════════════════════
            SEO Content — crawlable by search engines and LLMs
            ══════════════════════════════════════════════════════════ */}
        <section style={{
          marginTop: 80,
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(0,255,136,0.08)",
          borderRadius: 20,
          padding: "48px 32px",
        }}>
          <h2 style={{
            fontSize: "clamp(20px, 4vw, 28px)",
            fontWeight: 800,
            color: "#F0F6FF",
            marginBottom: 12,
            textAlign: "center",
          }}>
            מהי אסטרטגיית Go-To-Market לסטארטאפ AI?
          </h2>
          <div style={{
            width: 40,
            height: 3,
            background: "linear-gradient(90deg, #00FF88, #00CC6A)",
            borderRadius: 2,
            margin: "0 auto 28px",
          }} />
          <p style={{ color: "#94A3B8", lineHeight: 1.9, fontSize: 16, marginBottom: 20 }}>
            אסטרטגיית GTM היא התוכנית שלב-אחר-שלב שלוקחת את מוצר ה-AI שלכם
            מרעיון ללקוחות משלמים. עבור סטארטאפים בתחום ה-AI, המשמעות היא הגדרת
            פרופיל לקוח אידיאלי (ICP), מיצוב המוצר מול חלופות, בחירת ערוצי רכישה
            מתאימים ובניית תהליך מכירות חוזר.
          </p>
          <p style={{ color: "#94A3B8", lineHeight: 1.9, fontSize: 16, marginBottom: 0 }}>
            בניגוד ל-SaaS מסורתי, מוצרי AI עומדים בפני אתגרי GTM ייחודיים: בניית
            אמון עם משתמשים, הסבר טכנולוגיה מורכבת במילים פשוטות וניווט בדרישות
            אינטגרציה. ה-GTM Bootcamp של FBM Studio מטפל בכל אלה עם מסגרת עבודה
            שנבנתה במיוחד עבור מייסדי AI.
          </p>
        </section>

        <section style={{
          marginTop: 32,
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(0,255,136,0.08)",
          borderRadius: 20,
          padding: "48px 32px",
        }}>
          <h3 style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#00FF88",
            marginBottom: 24,
            textAlign: "center",
          }}>
            איך תוכנית ההכשרה עובדת?
          </h3>
          <p style={{ color: "#94A3B8", lineHeight: 1.9, fontSize: 16, marginBottom: 28, textAlign: "center" }}>
            תוכנית הכשרה של <strong style={{ color: "#F0F6FF" }}>חודש בליווי אישי במסגרת קבוצתית</strong> — שבה תלמדו איך לעשות שיווק Go-To-Market למערכת הטכנולוגית שלכם או לכל מערכת אחרת.
          </p>
          <ol style={{ color: "#94A3B8", lineHeight: 2.2, fontSize: 15, paddingRight: 20, margin: 0 }}>
            <li style={{ marginBottom: 8 }}><strong style={{ color: "#F0F6FF" }}>הגדרת ICP ומיצוב מוצר</strong> — נזהה יחד את הלקוח האידיאלי שלכם ונבנה מיצוב שמדבר אליו בדיוק.</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: "#F0F6FF" }}>בניית אסטרטגיית GTM מותאמת</strong> — תוכנית שיווק מובנית עם ערוצי רכישה, מסרים ותהליכי המרה.</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: "#F0F6FF" }}>יצירת קריאייטיב ותוכן</strong> — סקריפטים, ויזואליים והוקים מותאמים לקהל היעד ולערוצי השיווק שלכם.</li>
            <li style={{ marginBottom: 8 }}><strong style={{ color: "#F0F6FF" }}>ליווי אישי שבועי</strong> — פגישות אישיות ומשוב מתמשך לאורך כל החודש כדי לחדד ולשפר את הביצועים.</li>
            <li><strong style={{ color: "#F0F6FF" }}>למידה קבוצתית</strong> — מפגשים קבוצתיים עם מייסדים נוספים לשיתוף ידע, תובנות והזדמנויות שיתוף פעולה.</li>
          </ol>
        </section>

        <section style={{
          marginTop: 32,
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(0,255,136,0.08)",
          borderRadius: 20,
          padding: "48px 32px",
        }}>
          <h3 style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#00FF88",
            marginBottom: 24,
            textAlign: "center",
          }}>
            למי זה מתאים?
          </h3>
          <ul style={{ color: "#94A3B8", lineHeight: 2.2, fontSize: 15, paddingRight: 20, margin: 0, listStyle: "none" }}>
            <li style={{ marginBottom: 8, paddingRight: 8 }}><span style={{ color: "#00FF88", marginLeft: 8 }}>&#x2713;</span> מייסדי AI שיש להם מוצר אבל מתקשים למצוא לקוחות משלמים</li>
            <li style={{ marginBottom: 8, paddingRight: 8 }}><span style={{ color: "#00FF88", marginLeft: 8 }}>&#x2713;</span> בילדרים טכניים שרוצים מסגרת שיווקית מובנית</li>
            <li style={{ marginBottom: 8, paddingRight: 8 }}><span style={{ color: "#00FF88", marginLeft: 8 }}>&#x2713;</span> מייסדים יחידים שמשיקים את ה-SaaS הראשון שלהם</li>
            <li style={{ marginBottom: 8, paddingRight: 8 }}><span style={{ color: "#00FF88", marginLeft: 8 }}>&#x2713;</span> צוותים שעוברים ממוצרי AI ל-B2C למוצרי B2B</li>
            <li style={{ paddingRight: 8 }}><span style={{ color: "#00FF88", marginLeft: 8 }}>&#x2713;</span> כל מי שחוקר רעיונות לסטארטאפ AI ורוצה מסלול ברור לשוק</li>
          </ul>
        </section>

        <section style={{
          marginTop: 32,
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(0,255,136,0.08)",
          borderRadius: 20,
          padding: "48px 32px",
        }}>
          <h3 style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#00FF88",
            marginBottom: 28,
            textAlign: "center",
          }}>
            שאלות נפוצות
          </h3>

          <div style={{
            marginBottom: 24,
            padding: "20px 24px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.04)",
          }}>
            <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
              מהי אסטרטגיית GTM לסטארטאפ AI?
            </h4>
            <p style={{ color: "#94A3B8", lineHeight: 1.8, fontSize: 15, margin: 0 }}>
              אסטרטגיית GTM לסטארטאפים בתחום ה-AI היא תוכנית מובנית שמגדירה את
              פרופיל הלקוח האידיאלי (ICP), ממצבת את מוצר ה-AI בשוק, בוחרת את ערוצי
              השיווק הנכונים ויוצרת תהליך חוזר לרכישת לקוחות משלמים.
            </p>
          </div>

          <div style={{
            marginBottom: 24,
            padding: "20px 24px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.04)",
          }}>
            <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
              איך מוצאים את הלקוחות המשלמים הראשונים למוצר AI?
            </h4>
            <p style={{ color: "#94A3B8", lineHeight: 1.8, fontSize: 15, margin: 0 }}>
              התחילו בזיהוי ה-ICP — מי סובל מהבעיה שה-AI שלכם פותר, יש לו תקציב
              לשלם ויכולת טכנית לאמץ. לאחר מכן אמתו עם שיחות גילוי, בנו דף נחיתה
              עם הצעת ערך ברורה והשתמשו בפרסום ממוקד כדי להביא לידים איכותיים.
            </p>
          </div>

          <div style={{
            marginBottom: 24,
            padding: "20px 24px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.04)",
          }}>
            <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
              כמה זמן לוקח לבנות אסטרטגיית GTM?
            </h4>
            <p style={{ color: "#94A3B8", lineHeight: 1.8, fontSize: 15, margin: 0 }}>
              עם ה-GTM Bootcamp של FBM Studio, תוכלו לקבל אסטרטגיית Go-To-Market
              מלאה תוך פחות משבוע. הפלטפורמה משתמשת ב-AI כדי לנתח את המוצר, לזהות
              את ה-ICP, להציע ערוצי שיווק וליצור קריאייטיב לפרסום.
            </p>
          </div>

          <div style={{
            padding: "20px 24px",
            background: "rgba(0,0,0,0.2)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.04)",
          }}>
            <h4 style={{ color: "#F0F6FF", fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
              מהו כלי ה-FBM Ideator?
            </h4>
            <p style={{ color: "#94A3B8", lineHeight: 1.8, fontSize: 15, margin: 0 }}>
              FBM Ideator הוא מחולל רעיונות חינמי לסטארטאפי AI. בחרו נישה ושוק,
              והכלי מייצר רעיונות עסקיים מלאים עם ניתוח קהל יעד, אינטגרציות API
              ואסטרטגיית Go-To-Market — הכל מונע על ידי AI.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
