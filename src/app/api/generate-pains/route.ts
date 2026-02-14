import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";
import { buildPainsPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
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
    const painAnalysis = await callClaude("", prompt);

    return NextResponse.json({ painAnalysis });
  } catch (error) {
    console.error("generate-pains error:", error);
    return NextResponse.json(
      { error: "Failed to generate pain analysis" },
      { status: 500 },
    );
  }
}
