/**
 * Sumit (formerly OfficeGuy) Payment Gateway Integration
 *
 * API Docs: https://app.sumit.co.il/developers/api/
 * Swagger: https://app.sumit.co.il/help/developers/swagger/index.html
 *
 * Base URL: https://api.sumit.co.il
 * Auth: CompanyID + APIKey in JSON body
 */

const SUMIT_COMPANY_ID = Number(process.env.SUMIT_COMPANY_ID) || 0;
const SUMIT_API_KEY = process.env.SUMIT_API_KEY || "";
const SUMIT_BASE_URL = "https://api.sumit.co.il";

interface SumitResponse {
  Data?: {
    RedirectURL?: string;
    CustomerID?: string;
    TransactionID?: string;
    StatusCode?: number;
    [key: string]: unknown;
  };
  Status?: number;
  UserErrorMessage?: string;
  TechnicalErrorDetails?: string;
  [key: string]: unknown;
}

async function sumitRequest(endpoint: string, body: Record<string, unknown>): Promise<SumitResponse> {
  const res = await fetch(`${SUMIT_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      CompanyID: SUMIT_COMPANY_ID,
      APIKey: SUMIT_API_KEY,
      ...body,
    }),
  });

  if (!res.ok) {
    throw new Error(`Sumit API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Create a redirect payment page (hosted by Sumit).
 * The customer is redirected to Sumit's secure payment page,
 * then redirected back to `redirectUrl` after payment.
 */
export async function createPaymentLink(params: {
  customerName: string;
  customerEmail: string;
  description: string;
  price: number;
  redirectUrl: string;
  webhookUrl?: string;
}): Promise<{ success: boolean; paymentUrl?: string; error?: string }> {
  try {
    const response = await sumitRequest("/billing/payments/beginredirect/", {
      Customer: {
        Name: params.customerName,
        EmailAddress: params.customerEmail,
      },
      Items: [
        {
          Description: params.description,
          Price: params.price,
          Quantity: 1,
          Currency: "ILS",
        },
      ],
      RedirectURL: params.redirectUrl,
      ...(params.webhookUrl ? { WebhookURL: params.webhookUrl } : {}),
      MaximumPayments: 1,
      DocumentDescription: `FBM Studio - ${params.description}`,
      SendDocumentByEmail: true,
    });

    if (response.Data?.RedirectURL) {
      return { success: true, paymentUrl: response.Data.RedirectURL };
    }

    return {
      success: false,
      error: response.UserErrorMessage || "Failed to create payment link",
    };
  } catch (e) {
    console.error("Sumit createPaymentLink error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Store a payment method (tokenize card) for future recurring charges.
 */
export async function setPaymentMethodForCustomer(params: {
  customerName: string;
  customerEmail: string;
  redirectUrl: string;
}): Promise<{ success: boolean; paymentUrl?: string; error?: string }> {
  try {
    const response = await sumitRequest("/billing/paymentmethods/setforcustomer/", {
      Customer: {
        Name: params.customerName,
        EmailAddress: params.customerEmail,
      },
      RedirectURL: params.redirectUrl,
    });

    if (response.Data?.RedirectURL) {
      return { success: true, paymentUrl: response.Data.RedirectURL };
    }

    return {
      success: false,
      error: response.UserErrorMessage || "Failed to create tokenization page",
    };
  } catch (e) {
    console.error("Sumit setPaymentMethod error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Charge a one-time payment.
 */
export async function chargePayment(params: {
  customerName: string;
  customerEmail: string;
  description: string;
  price: number;
  token?: string;
}): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const response = await sumitRequest("/billing/payments/charge/", {
      Customer: {
        Name: params.customerName,
        EmailAddress: params.customerEmail,
      },
      Items: [
        {
          Description: params.description,
          Price: params.price,
          Quantity: 1,
          Currency: "ILS",
        },
      ],
      ...(params.token ? { CreditCardToken: params.token } : {}),
      MaximumPayments: 1,
      SendDocumentByEmail: true,
    });

    if (response.Data?.TransactionID) {
      return { success: true, transactionId: String(response.Data.TransactionID) };
    }

    return {
      success: false,
      error: response.UserErrorMessage || "Charge failed",
    };
  } catch (e) {
    console.error("Sumit chargePayment error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Create a recurring charge (standing order).
 */
export async function createRecurringCharge(params: {
  customerName: string;
  customerEmail: string;
  description: string;
  price: number;
  token: string;
  intervalMonths?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await sumitRequest("/billing/recurring/charge/", {
      Customer: {
        Name: params.customerName,
        EmailAddress: params.customerEmail,
      },
      Items: [
        {
          Description: params.description,
          Price: params.price,
          Quantity: 1,
          Currency: "ILS",
        },
      ],
      CreditCardToken: params.token,
      IntervalMonths: params.intervalMonths ?? 1,
      SendDocumentByEmail: true,
    });

    if (response.Status === 0 || response.Data?.StatusCode === 0) {
      return { success: true };
    }

    return {
      success: false,
      error: response.UserErrorMessage || "Recurring charge failed",
    };
  } catch (e) {
    console.error("Sumit createRecurringCharge error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
