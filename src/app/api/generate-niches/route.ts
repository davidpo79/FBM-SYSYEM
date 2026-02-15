import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { buildNichesPrompt } from "@/lib/prompts";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { strategyDocument } = await req.json();

    if (!strategyDocument || typeof strategyDocument !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid strategyDocument" },
        { status: 400 },
      );
    }

    const prompt = buildNichesPrompt(strategyDocument);
    const result = await callAI("", prompt, 4000);

    // Parse the JSON response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from AI response");
    }

    const niches = JSON.parse(jsonMatch[0]);

    logApiCall({
      endpoint: "/api/generate-niches",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(niches);
  } catch (error) {
    console.error("generate-niches error:", error);

    logApiCall({
      endpoint: "/api/generate-niches",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: "Failed to generate niches" },
      { status: 500 },
    );
  }
}
