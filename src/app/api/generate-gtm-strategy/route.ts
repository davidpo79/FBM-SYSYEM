import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { buildGTMStrategyPrompt } from "@/lib/prompts";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { userName, answers, gtmOnboardingData } = await req.json();

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid answers" },
        { status: 400 },
      );
    }

    if (!userName || typeof userName !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid userName" },
        { status: 400 },
      );
    }

    const prompt = buildGTMStrategyPrompt({ userName, answers, gtmOnboardingData });
    const raw = await callAI("", prompt, 8000, { jsonMode: true });

    // Parse the JSON response
    const strategy = JSON.parse(raw);

    logApiCall({
      endpoint: "/api/generate-gtm-strategy",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ strategy });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("generate-gtm-strategy error:", message);

    logApiCall({
      endpoint: "/api/generate-gtm-strategy",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: `Failed to generate GTM strategy: ${message}` },
      { status: 500 },
    );
  }
}
