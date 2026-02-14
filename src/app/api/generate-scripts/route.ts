import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";
import { buildScriptsPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
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
    const scripts = await callClaude("", prompt);

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error("generate-scripts error:", error);
    return NextResponse.json(
      { error: "Failed to generate scripts" },
      { status: 500 },
    );
  }
}
