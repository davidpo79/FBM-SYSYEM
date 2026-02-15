import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { studentName, studentEmail, studentPhone } = await req.json();

    if (!studentName || !studentEmail) {
      return NextResponse.json(
        { error: "שם ואימייל הם שדות חובה" },
        { status: 400 },
      );
    }

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

    const { data, error } = await supabaseAdmin
      .from("welcome_tokens")
      .insert({
        token,
        student_name: studentName,
        student_email: studentEmail,
        student_phone: studentPhone || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("admin/invite - insert error:", error);
      return NextResponse.json(
        { error: "שגיאה ביצירת הזמנה" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      token: data.token,
      expiresAt: data.expires_at,
    });
  } catch (e) {
    console.error("admin/invite exception:", e);
    return NextResponse.json(
      { error: "שגיאה ביצירת טוקן הזמנה" },
      { status: 500 },
    );
  }
}
