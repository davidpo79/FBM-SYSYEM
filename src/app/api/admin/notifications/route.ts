import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Helper: extract the authenticated user from the Authorization header.
 * The client sends `Authorization: Bearer <supabase-access-token>`.
 */
async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user;
}

/**
 * GET /api/admin/notifications
 * Fetches the 20 most recent notifications for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: notifications, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("admin/notifications GET - query error:", error);
      return NextResponse.json(
        { error: "שגיאה בשליפת התראות" },
        { status: 500 },
      );
    }

    return NextResponse.json({ notifications: notifications ?? [] });
  } catch (e) {
    console.error("admin/notifications GET exception:", e);
    return NextResponse.json(
      { error: "שגיאה בשליפת התראות" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/notifications
 * Marks a single notification as read.
 * Body: { id: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "לא מאומת" },
        { status: 401 },
      );
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "חסר מזהה התראה" },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("admin_notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("admin/notifications PATCH - update error:", error);
      return NextResponse.json(
        { error: "שגיאה בעדכון התראה" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "התראה לא נמצאה" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, notification: data });
  } catch (e) {
    console.error("admin/notifications PATCH exception:", e);
    return NextResponse.json(
      { error: "שגיאה בעדכון התראה" },
      { status: 500 },
    );
  }
}
