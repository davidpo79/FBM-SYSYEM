import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { buildScriptsPrompt } from "@/lib/prompts";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { strategyDocument, painAnalysis } = await req.json();

    if (!strategyDocument || typeof strategyDocument !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid strategyDocument" },
        { status: 400 },
      );
    }

    if (!painAnalysis || typeof painAnalysis !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid painAnalysis" },
        { status: 400 },
      );
    }

    const prompt = buildScriptsPrompt(strategyDocument, painAnalysis);
    const scripts = await callAI("", prompt);

    logApiCall({
      endpoint: "/api/generate-scripts",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error("generate-scripts error:", error);

    logApiCall({
      endpoint: "/api/generate-scripts",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: "Failed to generate scripts" },
      { status: 500 },
    );
  }
}
