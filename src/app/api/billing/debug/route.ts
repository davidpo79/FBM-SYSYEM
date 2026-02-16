import { NextResponse } from "next/server";

/**
 * Debug endpoint to check if Sumit credentials are configured.
 * DELETE THIS FILE after debugging is complete.
 */
export async function GET() {
  const companyId = process.env.SUMIT_COMPANY_ID;
  const apiKey = process.env.SUMIT_API_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    sumit: {
      SUMIT_COMPANY_ID_set: !!companyId,
      SUMIT_COMPANY_ID_value: companyId ? `${companyId.substring(0, 3)}...` : "(empty)",
      SUMIT_COMPANY_ID_type: typeof companyId,
      SUMIT_COMPANY_ID_asNumber: Number(companyId) || 0,
      SUMIT_API_KEY_set: !!apiKey,
      SUMIT_API_KEY_length: apiKey?.length || 0,
      SUMIT_API_KEY_preview: apiKey ? `${apiKey.substring(0, 4)}...` : "(empty)",
    },
    supabase: {
      SUPABASE_SERVICE_ROLE_KEY_set: !!serviceRoleKey,
      NEXT_PUBLIC_SUPABASE_URL_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
  });
}
