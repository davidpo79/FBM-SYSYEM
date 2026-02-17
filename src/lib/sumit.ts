/**
 * Sumit (formerly OfficeGuy) Payment Gateway Integration
 *
 * API Docs: https://app.sumit.co.il/developers/api/
 * Swagger: https://app.sumit.co.il/help/developers/swagger/index.html
 *
 * Base URL: https://api.sumit.co.il
 * Auth: Credentials object { CompanyID (integer), APIKey } in JSON body
 */

const SUMIT_BASE_URL = "https://api.sumit.co.il";

function getSumitCredentials() {
  const companyId = Number(process.env.SUMIT_COMPANY_ID) || 0;
  const apiKey = process.env.SUMIT_API_KEY || "";
  return { companyId, apiKey };
}

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
  const { companyId, apiKey } = getSumitCredentials();

  console.log("Sumit request:", {
    endpoint,
    companyId,
    apiKeyLength: apiKey.length,
    hasCompanyId: companyId > 0,
    hasApiKey: apiKey.length > 0,
  });

  if (!companyId || !apiKey) {
    throw new Error(`Sumit credentials missing: CompanyID=${companyId}, APIKey length=${apiKey.length}`);
  }

  const res = await fetch(`${SUMIT_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Credentials: {
        CompanyID: companyId,
        APIKey: apiKey,
      },
      ...body,
    }),
  });

  if (!res.ok) {
    throw new Error(`Sumit API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  console.log("Sumit response:", {
    endpoint,
    status: json.Status,
    hasRedirectURL: !!json.Data?.RedirectURL,
    userError: json.UserErrorMessage || null,
    technicalError: json.TechnicalErrorDetails || null,
  });

  return json;
}

/**
 * Create a redirect payment page (hosted by Sumit).
 * The customer is redirected to Sumit's secure payment page,
 * then redirected back to `redirectUrl` after payment.
 */
export async function createPaymentLink(params: {
  customerName: string;
  customerEmail: string;
  companyNumber?: string;
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
        ...(params.companyNumber ? { CompanyNumber: params.companyNumber } : {}),
      },
      Items: [
        {
          Item: {
            Name: params.description,
            Price: params.price,
            Currency: "ILS",
          },
          Quantity: 1,
          UnitPrice: params.price,
          Description: params.description,
        },
      ],
      RedirectURL: params.redirectUrl,
      ...(params.webhookUrl ? { WebhookURL: params.webhookUrl } : {}),
      MaximumPayments: 1,
      DocumentDescription: `ייעוץ עסקי - ${params.description}`,
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
          Item: {
            Name: params.description,
            Price: params.price,
            Currency: "ILS",
          },
          Quantity: 1,
          UnitPrice: params.price,
          Description: params.description,
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
 * Set up a recurring standing order for a customer after their first payment.
 * Uses the customer's saved payment method from the initial redirect payment.
 */
export async function setupRecurringCharge(params: {
  customerEmail: string;
  description: string;
  price: number;
  intervalMonths?: number;
}): Promise<{ success: boolean; recurringId?: string; error?: string }> {
  try {
    // Start the next charge 1 month from now (first payment already done via redirect)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const response = await sumitRequest("/billing/recurring/charge/", {
      Customer: {
        EmailAddress: params.customerEmail,
        SearchMode: "AutoCreateOrUpdate",
      },
      Items: [
        {
          Item: {
            Name: params.description,
            Price: params.price,
            Currency: "ILS",
          },
          Quantity: 1,
          UnitPrice: params.price,
          Description: params.description,
          Duration_Days: 0,
          Duration_Months: params.intervalMonths ?? 1,
          Recurrence: 0, // 0 = indefinite
          DateStart: nextMonth.toISOString(),
        },
      ],
      UpdateCustomerByEmail: true,
      SendDocumentByEmail: true,
      VATIncluded: false,
      DocumentDescription: `ייעוץ עסקי - ${params.description}`,
    });

    console.log("setupRecurringCharge response:", JSON.stringify(response, null, 2).substring(0, 1000));

    if (response.Status === 0 || response.Data?.StatusCode === 0) {
      const recurringId = response.Data?.RecurringPaymentID
        || response.Data?.RecurringID
        || response.Data?.TransactionID
        || "";
      return { success: true, recurringId: String(recurringId) };
    }

    return {
      success: false,
      error: response.UserErrorMessage || response.TechnicalErrorDetails || "Failed to set up recurring charge",
    };
  } catch (e) {
    console.error("Sumit setupRecurringCharge error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * List documents (invoices/receipts) for a customer by email.
 */
export async function listDocumentsForCustomer(params: {
  customerEmail: string;
}): Promise<{ success: boolean; documents?: Array<Record<string, unknown>>; error?: string }> {
  try {
    const response = await sumitRequest("/billing/documents/search/", {
      Customer: {
        EmailAddress: params.customerEmail,
        SearchMode: "AutoCreateOrUpdate",
      },
      PageSize: 50,
      Page: 1,
    });

    if (response.Status === 0 || response.Data) {
      const items = (response.Data?.Items || response.Data?.Documents || []) as Array<Record<string, unknown>>;
      return { success: true, documents: items };
    }

    return {
      success: false,
      error: response.UserErrorMessage || "Failed to list documents",
    };
  } catch (e) {
    console.error("Sumit listDocuments error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * Cancel a customer's recurring charge / standing order.
 */
export async function cancelRecurringCharge(params: {
  customerEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // First list active recurring items for this customer
    const listResponse = await sumitRequest("/billing/recurring/listforcustomer/", {
      Customer: {
        EmailAddress: params.customerEmail,
        SearchMode: "AutoCreateOrUpdate",
      },
    });

    const items = listResponse.Data?.Items as Array<{ ID?: string; RecurringPaymentID?: string }> | undefined;
    if (!items || items.length === 0) {
      return { success: true }; // No active recurring items
    }

    // Cancel each active recurring item
    for (const item of items) {
      const itemId = item.ID || item.RecurringPaymentID;
      if (!itemId) continue;

      await sumitRequest("/billing/recurring/cancel/", {
        Customer: {
          EmailAddress: params.customerEmail,
          SearchMode: "AutoCreateOrUpdate",
        },
        RecurringPaymentID: itemId,
      });
    }

    return { success: true };
  } catch (e) {
    console.error("Sumit cancelRecurringCharge error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
