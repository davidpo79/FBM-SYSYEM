import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createPaymentLink } from "@/lib/sumit";
import { CONSULTING_PRODUCT } from "@/lib/plan-limits";

export async function POST(req: NextRequest) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const customerName = profile?.full_name || user.email?.split("@")[0] || "Customer";
    const customerEmail = user.email || "";

    // Determine URLs
    const origin = req.headers.get("origin") || "https://fbm-studio.com";
    const redirectUrl = `${origin}/settings?consultation=success`;
    const webhookUrl = `${origin}/api/billing/consultation-webhook`;

    const result = await createPaymentLink({
      customerName,
      customerEmail,
      description: CONSULTING_PRODUCT.description,
      price: CONSULTING_PRODUCT.price,
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
    console.error("consulting-checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create consulting checkout" },
      { status: 500 },
    );
  }
}
