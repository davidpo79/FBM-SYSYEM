import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "חסר מזהה משתמש" },
        { status: 400 }
      );
    }

    // Get user email
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      return NextResponse.json(
        { error: "משתמש לא נמצא" },
        { status: 404 }
      );
    }

    const email = userData.user.email;

    // Generate a password reset link via admin API
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (linkError) {
      console.error("admin/reset-password - generateLink error:", linkError);
      return NextResponse.json(
        { error: "שגיאה ביצירת קישור איפוס" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email,
      resetLink: linkData?.properties?.action_link || null,
    });
  } catch (e) {
    console.error("admin/reset-password exception:", e);
    return NextResponse.json(
      { error: "שגיאה בשליחת איפוס סיסמה" },
      { status: 500 }
    );
  }
}
