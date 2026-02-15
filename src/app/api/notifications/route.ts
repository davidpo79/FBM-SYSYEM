import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "חסר מזהה משתמש" },
        { status: 400 },
      );
    }

    const { data: notifications, error } = await supabaseAdmin
      .from("admin_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("notifications GET - query error:", error);
      return NextResponse.json(
        { error: "שגיאה בשליפת התראות" },
        { status: 500 },
      );
    }

    return NextResponse.json({ notifications: notifications ?? [] });
  } catch (e) {
    console.error("notifications GET exception:", e);
    return NextResponse.json(
      { error: "שגיאה בשליפת התראות" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { notificationId } = await req.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "חסר מזהה התראה" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("admin_notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .select()
      .single();

    if (error) {
      console.error("notifications PATCH - update error:", error);
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
    console.error("notifications PATCH exception:", e);
    return NextResponse.json(
      { error: "שגיאה בעדכון התראה" },
      { status: 500 },
    );
  }
}
