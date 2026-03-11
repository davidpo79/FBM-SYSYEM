import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createPaymentLink } from "@/lib/sumit";
import { PLAN_PRICES } from "@/lib/plan-limits";

export async function POST(req: NextRequest) {
  try {
    const { plan, customerName: formCustomerName, customerIdNumber } = await req.json();

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

    const customerName = formCustomerName || profile?.full_name || user.email?.split("@")[0] || "Customer";
    const customerEmail = user.email || "";
    const companyNumber = customerIdNumber || "";
    const price = PLAN_PRICES[plan];

    // Determine URLs - pass userId and plan in webhook URL for reliable identification
    const origin = req.headers.get("origin") || "https://fbm-studio.com";
    const redirectUrl = `${origin}/payment-complete?plan=${plan}`;
    const webhookUrl = `${origin}/api/billing/webhook?userId=${user.id}&plan=${plan}`;

    // Verify Sumit credentials are configured
    if (!process.env.SUMIT_COMPANY_ID || !process.env.SUMIT_API_KEY) {
      console.error("create-checkout: SUMIT_COMPANY_ID or SUMIT_API_KEY not set");
      return NextResponse.json(
        { error: "Payment gateway not configured. Set SUMIT_COMPANY_ID and SUMIT_API_KEY in environment variables." },
        { status: 500 },
      );
    }

    // Determine plan label and payment type
    let result;

    if (plan === "gtm_diy") {
      // GTM DIY: one-time payment, 290 NIS including VAT
      result = await createPaymentLink({
        customerName,
        customerEmail,
        companyNumber,
        description: "GTM BOOTCAMP / יצירת תוכנית השקה ל 90 ימים",
        price,
        redirectUrl,
        webhookUrl,
        creditCardOnly: true,
      });
    } else if (plan === "gtm_pro") {
      // GTM PRO: first month payment via redirect, recurring set up in webhook after payment
      result = await createPaymentLink({
        customerName,
        customerEmail,
        companyNumber,
        description: "GTM BOOTCAMP / מנוי חודשי למערכת — חודש ראשון",
        price,
        redirectUrl,
        webhookUrl,
        creditCardOnly: true,
      });
    } else {
      // FBM plans: standard one-time
      const planLabel = plan === "premium" ? "פרימיום" : "סטנדרט";
      result = await createPaymentLink({
        customerName,
        customerEmail,
        companyNumber,
        description: `ייעוץ עסקי - FBM Studio תוכנית ${planLabel}`,
        price,
        redirectUrl,
        webhookUrl,
        creditCardOnly: true,
      });
    }

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
