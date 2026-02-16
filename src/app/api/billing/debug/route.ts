import { NextResponse } from "next/server";

/**
 * Debug endpoint to check Sumit credentials and test API connectivity.
 * DELETE THIS FILE after debugging is complete.
 */
export async function GET() {
  const companyId = process.env.SUMIT_COMPANY_ID;
  const apiKey = process.env.SUMIT_API_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Try a real Sumit API call to see the exact response
  let sumitTestResult: unknown = null;
  try {
    const res = await fetch("https://api.sumit.co.il/billing/payments/beginredirect/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        CompanyID: Number(companyId) || 0,
        APIKey: apiKey || "",
        Customer: {
          Name: "Test Customer",
          EmailAddress: "test@test.com",
        },
        Items: [
          {
            Description: "Test Item",
            Price: 1,
            Quantity: 1,
            Currency: "ILS",
          },
        ],
        RedirectURL: "https://example.com/success",
        MaximumPayments: 1,
        SendDocumentByEmail: false,
      }),
    });

    const json = await res.json();
    sumitTestResult = {
      httpStatus: res.status,
      fullResponse: json,
    };
  } catch (e) {
    sumitTestResult = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json({
    sumit: {
      SUMIT_COMPANY_ID_set: !!companyId,
      SUMIT_COMPANY_ID_value: companyId ? `${companyId.substring(0, 3)}...` : "(empty)",
      SUMIT_COMPANY_ID_asNumber: Number(companyId) || 0,
      SUMIT_API_KEY_set: !!apiKey,
      SUMIT_API_KEY_length: apiKey?.length || 0,
      SUMIT_API_KEY_preview: apiKey ? `${apiKey.substring(0, 4)}...` : "(empty)",
    },
    supabase: {
      SUPABASE_SERVICE_ROLE_KEY_set: !!serviceRoleKey,
      NEXT_PUBLIC_SUPABASE_URL_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    sumitApiTest: sumitTestResult,
  });
}
