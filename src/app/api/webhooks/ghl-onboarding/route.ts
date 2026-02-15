import { createClient } from "@supabase/supabase-js";

// Use service role key for webhook (no user auth)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const WEBHOOK_SECRET =
  process.env.GHL_WEBHOOK_SECRET || "fbm-ghl-secret-2026";

function generateToken(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  try {
    // Validate webhook secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Extract student info from GHL payload
    const studentName =
      body.contact_name || body.first_name || body.name || "";
    const studentEmail = body.email || body.contact_email || "";
    const studentPhone = body.phone || body.contact_phone || "";

    if (!studentName) {
      return Response.json(
        { error: "Missing student name" },
        { status: 400 },
      );
    }

    // Rate limiting: max 10 tokens per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("welcome_tokens")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);

    if (count !== null && count >= 10) {
      return Response.json(
        { error: "Rate limit exceeded — max 10 tokens per hour" },
        { status: 429 },
      );
    }

    // Generate token
    const token = generateToken(24);

    // Save to welcome_tokens
    const { data, error } = await supabase
      .from("welcome_tokens")
      .insert({
        token,
        student_name: studentName,
        student_email: studentEmail,
        student_phone: studentPhone,
      })
      .select("token, expires_at")
      .single();

    if (error) {
      console.error("Token creation error:", error);
      return Response.json(
        { error: "Failed to create token" },
        { status: 500 },
      );
    }

    // Build welcome URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app";
    const welcomeUrl = `${baseUrl}/welcome?token=${data.token}`;

    // Return the link for GHL to use in SMS
    return Response.json({
      success: true,
      welcome_url: welcomeUrl,
      token: data.token,
      expires_at: data.expires_at,
      student_name: studentName,
      sms_message: `שלום ${studentName}!\nברוך הבא לתהליך FBM!\nהנה הלינק האישי שלך:\n${welcomeUrl}\nמחכים לך!`,
    });
  } catch (error: unknown) {
    console.error("GHL webhook error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 },
    );
  }
}
