import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLAN_PRICES } from "@/lib/plan-limits";
import { setupRecurringCharge } from "@/lib/sumit";

/**
 * Sumit webhook handler.
 * Called by Sumit after a payment is completed via:
 * 1. The WebhookURL parameter we pass to createPaymentLink (includes ?userId=...&plan=...)
 * 2. Sumit automation triggers (no userId in URL, must find user by email)
 *
 * IMPORTANT: Always return 200 to Sumit to prevent retry loops.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};

  // Extract userId and plan from URL query params (set by create-checkout)
  const urlUserId = req.nextUrl.searchParams.get("userId") || "";
  const urlPlan = req.nextUrl.searchParams.get("plan") || "";

  try {
    // Try to parse the body - Sumit might send JSON or form data
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
      if (typeof body.Data === "string") {
        try { body.Data = JSON.parse(body.Data as string); } catch { /* ignore */ }
      }
      if (typeof body.Customer === "string") {
        try { body.Customer = JSON.parse(body.Customer as string); } catch { /* ignore */ }
      }
    } else {
      body = await req.json();
    }
  } catch (parseError) {
    console.error("Sumit webhook: failed to parse body:", parseError);
    // If we have userId from URL, we can still process
    if (!urlUserId) {
      return NextResponse.json({ received: true, processed: false, error: "parse_error" });
    }
  }

  try {
    console.log("Sumit webhook received:", {
      urlUserId,
      urlPlan,
      bodyKeys: Object.keys(body),
      bodyPreview: JSON.stringify(body).substring(0, 1500),
    });

    // Extract payment details from Sumit payload
    const data = (body?.Data as Record<string, unknown>) || {};

    const customerEmail = String(
      (body?.Customer as Record<string, unknown>)?.EmailAddress
      || body?.CustomerEmail
      || body?.Customer_EmailAddress
      || data?.CustomerEmail
      || (data?.Customer as Record<string, unknown>)?.EmailAddress
      || body?.customer_email
      || body?.Email
      || body?.email
      || ""
    ).trim();

    const transactionId = String(
      body?.TransactionID
      || data?.TransactionID
      || body?.DocumentID
      || data?.DocumentID
      || body?.transaction_id
      || ""
    );

    const amount = Number(
      body?.Total
      || body?.Amount
      || data?.Amount
      || data?.Total
      || (body?.Items as Array<Record<string, unknown>>)?.[0]?.UnitPrice
      || (body?.Items as Array<Record<string, unknown>>)?.[0]?.Price
      || (data?.Items as Array<Record<string, unknown>>)?.[0]?.UnitPrice
      || 0
    );

    console.log("Sumit webhook parsed:", { customerEmail, transactionId, amount, urlUserId, urlPlan });

    // Determine userId: prefer URL param, fallback to email lookup
    let userId = urlUserId;

    if (!userId && customerEmail) {
      // Find user by email via auth
      try {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const user = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === customerEmail.toLowerCase(),
        );
        if (user) userId = user.id;
      } catch (authError) {
        console.error("Sumit webhook: auth lookup error:", authError);
      }
    }

    if (!userId) {
      console.error("Sumit webhook: no userId found. urlUserId:", urlUserId, "email:", customerEmail);
      return NextResponse.json({ received: true, processed: false, error: "user_not_found" });
    }

    // Determine plan from URL param or amount
    let plan = urlPlan || "standard";
    let planPrice = PLAN_PRICES[plan] || PLAN_PRICES.standard;

    if (!urlPlan && amount > 0) {
      if (amount >= PLAN_PRICES.premium) {
        plan = "premium";
        planPrice = PLAN_PRICES.premium;
      } else {
        plan = "standard";
        planPrice = PLAN_PRICES.standard;
      }
    }

    const planLabel = plan === "premium" ? "פרימיום" : "סטנדרט";

    // Set up recurring monthly charge
    let recurringId = "";
    const recurringEmail = customerEmail || await getUserEmail(userId);
    if (recurringEmail) {
      try {
        const recurringResult = await setupRecurringCharge({
          customerEmail: recurringEmail,
          description: `ייעוץ עסקי - FBM Studio תוכנית ${planLabel} (מנוי חודשי)`,
          price: planPrice,
          intervalMonths: 1,
        });

        if (recurringResult.success) {
          recurringId = recurringResult.recurringId || "";
          console.log(`Sumit webhook: recurring charge set up, ID: ${recurringId}`);
        } else {
          console.error("Sumit webhook: recurring setup failed:", recurringResult.error);
        }
      } catch (recurringError) {
        console.error("Sumit webhook: recurring exception:", recurringError);
      }
    }

    // Update user profile
    const updateData: Record<string, unknown> = {
      plan,
      subscription_status: "active",
      plan_price: amount || planPrice,
    };
    if (transactionId) updateData.sumit_customer_id = transactionId;
    if (recurringId) updateData.sumit_recurring_id = recurringId;

    // Try update first
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update(updateData)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Sumit webhook: update failed:", updateError.message);
      // Fallback: upsert
      const { error: upsertError } = await supabaseAdmin
        .from("user_profiles")
        .upsert({ user_id: userId, ...updateData }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Sumit webhook: upsert also failed:", upsertError.message);
        return NextResponse.json({ received: true, processed: false, error: "db_failed" });
      }
    }

    console.log(`Sumit webhook: SUCCESS - userId=${userId} plan=${plan} recurring=${recurringId || "none"}`);
    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Sumit webhook error:", error);
    return NextResponse.json({ received: true, processed: false, error: "internal_error" });
  }
}

/** Helper to get user email from auth */
async function getUserEmail(userId: string): Promise<string> {
  try {
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const user = usersData?.users?.find((u) => u.id === userId);
    return user?.email || "";
  } catch {
    return "";
  }
}
