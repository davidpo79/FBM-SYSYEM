import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendResetPasswordEmail } from "@/lib/email";
import { validateEmail } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    const emailCheck = validateEmail(email || "");
    if (!emailCheck.valid) {
      return NextResponse.json(
        { error: emailCheck.error },
        { status: 400 }
      );
    }

    // Generate recovery link via admin API (does NOT send email)
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (linkError) {
      // Don't reveal if user exists or not
      console.error("forgot-password generateLink error:", linkError);
      return NextResponse.json({ success: true });
    }

    const resetLink = linkData?.properties?.action_link;
    if (!resetLink) {
      return NextResponse.json({ success: true });
    }

    // Get user's name for personalized email
    let userName: string | undefined;
    if (linkData.user?.id) {
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("full_name")
        .eq("user_id", linkData.user.id)
        .single();
      userName = profile?.full_name || undefined;
    }

    // Send branded email
    const emailResult = await sendResetPasswordEmail(email, resetLink, userName);

    if (!emailResult.success) {
      console.error("forgot-password email error:", emailResult.error);
      // Fallback: if Resend is not configured, the link was still generated
      // The user won't get the email, but admin could use the link
    }

    // Always return success to not reveal if user exists
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("forgot-password exception:", e);
    return NextResponse.json(
      { error: "אירעה שגיאה. נסה שוב." },
      { status: 500 }
    );
  }
}
