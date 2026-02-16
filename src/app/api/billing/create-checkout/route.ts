import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createPaymentLink } from "@/lib/sumit";
import { PLAN_PRICES } from "@/lib/plan-limits";

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get current user from Authorization header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const customerName = profile?.full_name || user.email?.split("@")[0] || "Customer";
    const customerEmail = user.email || "";
    const price = PLAN_PRICES[plan];

    // Determine URLs
    const origin = req.headers.get("origin") || "https://fbm-studio.com";
    const redirectUrl = `${origin}/settings?payment=success&plan=${plan}`;
    const webhookUrl = `${origin}/api/billing/webhook`;

    const planLabel = plan === "premium" ? "פרימיום" : "סטנדרט";

    const result = await createPaymentLink({
      customerName,
      customerEmail,
      description: `FBM Studio - תוכנית ${planLabel}`,
      price,
      redirectUrl,
      webhookUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to create checkout" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
    });
  } catch (error) {
    console.error("create-checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
