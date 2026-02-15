import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "לא סופק טוקן" },
        { status: 400 },
      );
    }

    // Look up the token in welcome_tokens table
    const { data, error } = await supabaseAdmin
      .from("welcome_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "טוקן לא נמצא" },
        { status: 400 },
      );
    }

    // Check if already used
    if (data.used_at) {
      return NextResponse.json(
        { error: "טוקן כבר נוצל" },
        { status: 400 },
      );
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "טוקן פג תוקף" },
        { status: 400 },
      );
    }

    // Token is valid - return student data
    return NextResponse.json({
      valid: true,
      studentName: data.student_name,
      studentEmail: data.student_email,
    });
  } catch (e) {
    console.error("admin/welcome/validate POST exception:", e);
    return NextResponse.json(
      { error: "שגיאה באימות טוקן" },
      { status: 500 },
    );
  }
}
