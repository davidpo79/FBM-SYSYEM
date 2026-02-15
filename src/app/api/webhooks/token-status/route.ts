import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const WEBHOOK_SECRET =
  process.env.GHL_WEBHOOK_SECRET || "fbm-ghl-secret-2026";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  const { data } = await supabase
    .from("welcome_tokens")
    .select(
      "student_name, used_at, booking_confirmed, created_at, expires_at",
    )
    .eq("token", token)
    .single();

  if (!data) {
    return Response.json({ error: "Token not found" }, { status: 404 });
  }

  return Response.json({
    student_name: data.student_name,
    status: data.used_at ? "used" : "pending",
    used_at: data.used_at,
    booking_confirmed: data.booking_confirmed,
    expired: new Date(data.expires_at) < new Date(),
  });
}
