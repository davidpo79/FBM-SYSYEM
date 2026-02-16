import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLAN_PRICES } from "@/lib/plan-limits";
import { setupRecurringCharge } from "@/lib/sumit";

/**
 * Sumit webhook handler.
 * Called by Sumit after a payment is completed.
 * Updates user plan and sets up recurring monthly billing.
 *
 * IMPORTANT: Always return 200 to Sumit even if we have internal errors,
 * otherwise Sumit will keep retrying and showing errors.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};

  try {
    // Try to parse the body - Sumit might send JSON or form data
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        body[key] = value;
      }
      // Try to parse nested JSON fields
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
    // Try reading as text for debugging
    try {
      const text = await req.text();
      console.error("Sumit webhook raw body:", text.substring(0, 500));
    } catch { /* ignore */ }
    // Return 200 so Sumit doesn't keep retrying
    return NextResponse.json({ received: true, processed: false, error: "parse_error" });
  }

  try {
    console.log("Sumit webhook received:", JSON.stringify(body, null, 2).substring(0, 2000));

    // Extract payment details - handle multiple possible Sumit payload formats
    const data = (body?.Data as Record<string, unknown>) || {};

    const customerEmail = String(
      (body?.Customer as Record<string, unknown>)?.EmailAddress
      || body?.CustomerEmail
      || data?.CustomerEmail
      || (data?.Customer as Record<string, unknown>)?.EmailAddress
      || body?.customer_email
      || ""
    ).trim();

    const transactionId = String(
      body?.TransactionID
      || data?.TransactionID
      || body?.transaction_id
      || ""
    );

    const amount = Number(
      body?.Amount
      || data?.Amount
      || (body?.Items as Array<Record<string, unknown>>)?.[0]?.UnitPrice
      || (body?.Items as Array<Record<string, unknown>>)?.[0]?.Price
      || (data?.Items as Array<Record<string, unknown>>)?.[0]?.UnitPrice
      || 0
    );

    // StatusCode: 0 = success in Sumit API
    const statusCode = body?.StatusCode ?? data?.StatusCode ?? body?.Status ?? -1;

    console.log("Sumit webhook parsed:", {
      customerEmail,
      transactionId,
      amount,
      statusCode,
      rawKeys: Object.keys(body),
      dataKeys: Object.keys(data),
    });

    // Accept status 0 (Sumit success) or if no status code provided (some webhook formats)
    if (statusCode !== 0 && statusCode !== 200 && statusCode !== -1) {
      console.log("Sumit webhook: payment not successful, status:", statusCode);
      return NextResponse.json({ received: true, processed: false });
    }

    if (!customerEmail) {
      console.error("Sumit webhook: no customer email found in payload");
      return NextResponse.json({ received: true, processed: false, error: "no_email" });
    }

    // Find user by email - try user_profiles first (more reliable), then auth
    let userId: string | null = null;
    let userEmail = customerEmail;

    // Method 1: Find by email in user_profiles (via auth users)
    try {
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (listError) {
        console.error("Sumit webhook: listUsers error:", listError.message);
      } else {
        const user = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === customerEmail.toLowerCase(),
        );
        if (user) {
          userId = user.id;
          userEmail = user.email || customerEmail;
        }
      }
    } catch (authError) {
      console.error("Sumit webhook: auth lookup error:", authError);
    }

    // Method 2: Fallback - find by email directly in user_profiles
    if (!userId) {
      try {
        const { data: profileByEmail } = await supabaseAdmin
          .from("user_profiles")
          .select("user_id")
          .ilike("email", customerEmail)
          .single();
        if (profileByEmail?.user_id) {
          userId = profileByEmail.user_id;
        }
      } catch {
        // Column might not exist, ignore
      }
    }

    if (!userId) {
      console.error("Sumit webhook: user not found for email:", customerEmail);
      return NextResponse.json({ received: true, processed: false, error: "user_not_found" });
    }

    // Determine plan from amount
    let plan = "standard";
    let planPrice = PLAN_PRICES.standard;
    if (amount >= PLAN_PRICES.premium) {
      plan = "premium";
      planPrice = PLAN_PRICES.premium;
    }

    const planLabel = plan === "premium" ? "פרימיום" : "סטנדרט";

    // Set up recurring monthly charge (non-blocking - don't fail webhook if this fails)
    let recurringId = "";
    try {
      const recurringResult = await setupRecurringCharge({
        customerEmail: userEmail,
        description: `FBM Studio - תוכנית ${planLabel} (מנוי חודשי)`,
        price: planPrice,
        intervalMonths: 1,
      });

      if (recurringResult.success) {
        recurringId = recurringResult.recurringId || "";
        console.log(`Sumit webhook: recurring charge set up for ${userEmail}, ID: ${recurringId}`);
      } else {
        console.error("Sumit webhook: failed to set up recurring:", recurringResult.error);
      }
    } catch (recurringError) {
      console.error("Sumit webhook: recurring charge setup error:", recurringError);
      // Continue anyway - the main payment went through
    }

    // Update user profile - use update first, fallback to upsert
    const updateData: Record<string, unknown> = {
      plan,
      subscription_status: "active",
      plan_price: amount || planPrice,
    };
    if (transactionId) updateData.sumit_customer_id = transactionId;
    if (recurringId) updateData.sumit_recurring_id = recurringId;

    let updateSuccess = false;

    // Try update first
    try {
      const { error: updateError } = await supabaseAdmin
        .from("user_profiles")
        .update(updateData)
        .eq("user_id", userId);

      if (!updateError) {
        updateSuccess = true;
        console.log(`Sumit webhook: updated existing profile for ${userEmail}`);
      } else {
        console.error("Sumit webhook: update failed:", updateError.message);
      }
    } catch (updateErr) {
      console.error("Sumit webhook: update exception:", updateErr);
    }

    // Fallback: try upsert
    if (!updateSuccess) {
      try {
        const { error: upsertError } = await supabaseAdmin
          .from("user_profiles")
          .upsert(
            { user_id: userId, ...updateData },
            { onConflict: "user_id" },
          );

        if (upsertError) {
          console.error("Sumit webhook: upsert also failed:", upsertError.message);
          // Still return 200 to Sumit
          return NextResponse.json({ received: true, processed: false, error: "db_update_failed" });
        }
        updateSuccess = true;
      } catch (upsertErr) {
        console.error("Sumit webhook: upsert exception:", upsertErr);
        return NextResponse.json({ received: true, processed: false, error: "db_exception" });
      }
    }

    console.log(`Sumit webhook: SUCCESS - updated user ${userEmail} to plan ${plan} (recurring: ${recurringId || "none"})`);
    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Sumit webhook error:", error);
    // ALWAYS return 200 to Sumit to prevent retry loops
    return NextResponse.json({ received: true, processed: false, error: "internal_error" });
  }
}
