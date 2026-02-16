import { NextResponse } from "next/server";

/**
 * Debug endpoint to check Sumit credentials and test API connectivity.
 * DELETE THIS FILE after debugging is complete.
 */
export async function GET() {
  const rawCompanyId = process.env.SUMIT_COMPANY_ID ?? "";
  const rawApiKey = process.env.SUMIT_API_KEY ?? "";

  // Trim whitespace/quotes that may have been accidentally included
  const companyId = rawCompanyId.trim().replace(/^["']|["']$/g, "");
  const apiKey = rawApiKey.trim().replace(/^["']|["']$/g, "");

  // Build exact body to send — credentials must be inside a Credentials object
  const requestBody = {
    Credentials: {
      CompanyID: Number(companyId) || 0,
      APIKey: apiKey,
    },
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
  };

  let sumitTestResult: unknown = null;
  try {
    const bodyString = JSON.stringify(requestBody);
    const res = await fetch("https://api.sumit.co.il/billing/payments/beginredirect/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyString,
    });

    const json = await res.json();
    sumitTestResult = {
      httpStatus: res.status,
      fullResponse: json,
      sentBody: {
        CompanyID: requestBody.Credentials.CompanyID,
        APIKey_length: requestBody.Credentials.APIKey.length,
        APIKey_first4: requestBody.Credentials.APIKey.substring(0, 4),
        APIKey_last4: requestBody.Credentials.APIKey.substring(requestBody.Credentials.APIKey.length - 4),
        bodyStringLength: bodyString.length,
        format: "Credentials object (nested)",
      },
    };
  } catch (e) {
    sumitTestResult = {
      error: e instanceof Error ? e.message : String(e),
    };
  }

  return NextResponse.json({
    credentials: {
      raw_companyId_length: rawCompanyId.length,
      raw_apiKey_length: rawApiKey.length,
      trimmed_companyId_length: companyId.length,
      trimmed_apiKey_length: apiKey.length,
      companyId_charCodes_first5: Array.from(rawCompanyId.substring(0, 5)).map((c) => c.charCodeAt(0)),
      apiKey_charCodes_first5: Array.from(rawApiKey.substring(0, 5)).map((c) => c.charCodeAt(0)),
      companyId_asNumber: Number(companyId) || 0,
      companyId_isNaN: isNaN(Number(companyId)),
    },
    sumitApiTest: sumitTestResult,
  });
}
