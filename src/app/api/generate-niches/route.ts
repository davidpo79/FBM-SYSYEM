import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";
import { buildNichesPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  try {
    const { strategyDocument } = await req.json();

    if (!strategyDocument || typeof strategyDocument !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid strategyDocument" },
        { status: 400 },
      );
    }

    const prompt = buildNichesPrompt(strategyDocument);
    const result = await callClaude("", prompt, 4000);

    // Parse the JSON response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from Claude response");
    }

    const niches = JSON.parse(jsonMatch[0]);

    return NextResponse.json(niches);
  } catch (error) {
    console.error("generate-niches error:", error);
    return NextResponse.json(
      { error: "Failed to generate niches" },
      { status: 500 },
    );
  }
}
