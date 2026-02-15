import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { userId, title, message } = await req.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: "חסרים שדות חובה: userId, title, message" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("admin_notifications")
      .insert({
        user_id: userId,
        title,
        message,
        read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("admin/send-message - insert error:", error);
      return NextResponse.json(
        { error: "שגיאה בשליחת הודעה" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      notification: data,
    });
  } catch (e) {
    console.error("admin/send-message exception:", e);
    return NextResponse.json(
      { error: "שגיאה בשליחת הודעה לתלמיד" },
      { status: 500 },
    );
  }
}
