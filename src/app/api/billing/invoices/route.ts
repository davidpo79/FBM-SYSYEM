import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { listDocumentsForCustomer } from "@/lib/sumit";

/**
 * Get invoices/documents for the current user from Sumit.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await listDocumentsForCustomer({ customerEmail: user.email });

    if (!result.success) {
      // Return empty array if API fails - don't block the UI
      console.error("Failed to fetch invoices:", result.error);
      return NextResponse.json({ invoices: [] });
    }

    // Map Sumit documents to a simpler format
    const invoices = (result.documents || []).map((doc) => ({
      id: doc.ID || doc.DocumentID || "",
      date: doc.Date || doc.CreatedDate || doc.IssueDate || "",
      description: doc.Description || doc.DocumentDescription || doc.ItemDescription || "",
      amount: doc.Total || doc.Amount || doc.TotalAmount || 0,
      type: doc.DocumentType || doc.Type || "",
      status: doc.Status || doc.StatusDescription || "",
      number: doc.DocumentNumber || doc.Number || "",
      url: doc.DocumentURL || doc.URL || doc.ViewURL || "",
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("billing/invoices error:", error);
    return NextResponse.json({ invoices: [] });
  }
}
