import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { buildPainsPrompt } from "@/lib/prompts";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { strategyDocument, selectedNiche } = await req.json();

    if (!strategyDocument || typeof strategyDocument !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid strategyDocument" },
        { status: 400 },
      );
    }

    if (!selectedNiche || typeof selectedNiche !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid selectedNiche" },
        { status: 400 },
      );
    }

    const prompt = buildPainsPrompt(strategyDocument, selectedNiche);
    const painAnalysis = await callAI("", prompt);

    logApiCall({
      endpoint: "/api/generate-pains",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ painAnalysis });
  } catch (error) {
    console.error("generate-pains error:", error);

    logApiCall({
      endpoint: "/api/generate-pains",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: "Failed to generate pain analysis" },
      { status: 500 },
    );
  }
}
