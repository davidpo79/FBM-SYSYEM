import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createPaymentLink } from "@/lib/sumit";
import { CONSULTING_PRODUCT } from "@/lib/plan-limits";

export async function POST(req: NextRequest) {
  try {
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

    // Verify Sumit credentials are configured
    if (!process.env.SUMIT_COMPANY_ID || !process.env.SUMIT_API_KEY) {
      console.error("consulting-checkout: SUMIT_COMPANY_ID or SUMIT_API_KEY not set");
      return NextResponse.json(
        { error: "Payment gateway not configured. Set SUMIT_COMPANY_ID and SUMIT_API_KEY in environment variables." },
        { status: 500 },
      );
    }

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
