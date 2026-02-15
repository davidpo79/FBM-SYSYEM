import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, reason: "לא סופק טוקן" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("welcome_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { valid: false, reason: "טוקן לא נמצא" },
        { status: 404 },
      );
    }

    // Check if already used
    if (data.used) {
      return NextResponse.json(
        { valid: false, reason: "טוקן כבר נוצל" },
        { status: 400 },
      );
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, reason: "טוקן פג תוקף" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      valid: true,
      studentName: data.student_name,
      studentEmail: data.student_email,
      studentPhone: data.student_phone,
      expiresAt: data.expires_at,
    });
  } catch (e) {
    console.error("welcome/validate GET exception:", e);
    return NextResponse.json(
      { valid: false, reason: "שגיאה באימות טוקן" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "לא סופק טוקן" },
        { status: 400 },
      );
    }

    // Verify token exists and is valid before marking as used
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("welcome_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "טוקן לא נמצא" },
        { status: 404 },
      );
    }

    if (existing.used) {
      return NextResponse.json(
        { error: "טוקן כבר נוצל" },
        { status: 400 },
      );
    }

    if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "טוקן פג תוקף" },
        { status: 400 },
      );
    }

    // Mark as used
    const { error: updateError } = await supabaseAdmin
      .from("welcome_tokens")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("token", token);

    if (updateError) {
      console.error("welcome/validate POST - update error:", updateError);
      return NextResponse.json(
        { error: "שגיאה בעדכון טוקן" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("welcome/validate POST exception:", e);
    return NextResponse.json(
      { error: "שגיאה בסימון טוקן כמנוצל" },
      { status: 500 },
    );
  }
}
