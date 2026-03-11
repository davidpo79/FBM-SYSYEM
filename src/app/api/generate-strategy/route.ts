import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { buildStrategyPrompt, buildGTMStrategyPrompt } from "@/lib/prompts";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { userName, answers, track } = await req.json();

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

    // GTM track: structured JSON strategy
    if (track === "gtm") {
      const prompt = buildGTMStrategyPrompt({ userName, answers });
      const raw = await callAI("", prompt, 8000, { jsonMode: true });
      const strategy = JSON.parse(raw);

      logApiCall({
        endpoint: "/api/generate-strategy",
        status: "success",
        durationMs: Date.now() - startTime,
      });

      return NextResponse.json({ strategy, track: "gtm" });
    }

    // FBM track: markdown strategy (default)
    const prompt = buildStrategyPrompt({ userName, answers });
    const strategy = await callAI("", prompt);

    logApiCall({
      endpoint: "/api/generate-strategy",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ strategy });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("generate-strategy error:", message);

    logApiCall({
      endpoint: "/api/generate-strategy",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: `Failed to generate strategy: ${message}` },
      { status: 500 },
    );
  }
}
