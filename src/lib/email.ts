import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "FBM Studio <noreply@fbm-studio.com>";

function resetPasswordEmailHtml(resetLink: string, userName?: string): string {
  const greeting = userName ? `היי ${userName},` : "היי,";
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>איפוס סיסמה - FBM Studio</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a0533 0%,#2d1b69 50%,#1a0533 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">
                FBM Studio
              </h1>
              <p style="margin:8px 0 0;color:#c9a962;font-size:13px;letter-spacing:2px;">
                Frequency Based Marketing
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700;text-align:center;">
                איפוס סיסמה
              </h2>
              <div style="width:40px;height:3px;background:#c9a962;margin:0 auto 24px;border-radius:2px;"></div>

              <p style="margin:0 0 16px;color:#4a4a68;font-size:16px;line-height:1.7;">
                ${greeting}
              </p>
              <p style="margin:0 0 24px;color:#4a4a68;font-size:16px;line-height:1.7;">
                קיבלנו בקשה לאיפוס הסיסמה שלך ב-FBM Studio.
                לחץ על הכפתור למטה כדי לבחור סיסמה חדשה:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#c9a962 0%,#e6c97a 100%);color:#1a0533;text-decoration:none;font-size:18px;font-weight:700;padding:14px 48px;border-radius:12px;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(201,169,98,0.3);">
                      איפוס סיסמה
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;color:#8888a0;font-size:14px;line-height:1.6;">
                אם לא ביקשת לאפס את הסיסמה, ניתן להתעלם מהודעה זו. הסיסמה שלך לא תשתנה.
              </p>

              <p style="margin:0 0 8px;color:#8888a0;font-size:13px;line-height:1.6;">
                הקישור תקף ל-24 שעות. אם הכפתור לא עובד, העתק את הקישור הבא:
              </p>
              <p style="margin:0;padding:12px;background:#f4f4f7;border-radius:8px;word-break:break-all;direction:ltr;text-align:left;">
                <a href="${resetLink}" style="color:#2d1b69;font-size:12px;text-decoration:underline;">${resetLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f8fa;padding:24px 40px;text-align:center;border-top:1px solid #eeeef2;">
              <p style="margin:0 0 4px;color:#b0b0c0;font-size:13px;">
                FBM Studio &copy; ${new Date().getFullYear()}
              </p>
              <p style="margin:0;color:#b0b0c0;font-size:12px;">
                Frequency Based Marketing System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendResetPasswordEmail(
  email: string,
  resetLink: string,
  userName?: string,
): Promise<{ success: boolean; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "איפוס סיסמה | FBM Studio",
      html: resetPasswordEmailHtml(resetLink, userName),
    });

    if (error) {
      console.error("sendResetPasswordEmail error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    console.error("sendResetPasswordEmail exception:", e);
    return { success: false, error: "Failed to send email" };
  }
}
