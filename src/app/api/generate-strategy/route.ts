import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { buildStrategyPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const { userName, answers } = await req.json();

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

    const prompt = buildStrategyPrompt({ userName, answers });
    const strategy = await callAI("", prompt);

    return NextResponse.json({ strategy });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("generate-strategy error:", message);
    return NextResponse.json(
      { error: `Failed to generate strategy: ${message}` },
      { status: 500 },
    );
  }
}
