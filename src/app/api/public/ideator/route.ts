import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

const API_CATEGORIES = [
  { value: "ai-automation", label: "AI & Automation" },
  { value: "fintech", label: "FinTech" },
  { value: "healthtech", label: "HealthTech" },
  { value: "edtech", label: "EdTech" },
  { value: "ecommerce", label: "E-Commerce & Retail" },
  { value: "devtools", label: "Developer Tools" },
  { value: "saas-b2b", label: "SaaS B2B" },
  { value: "creator-economy", label: "Creator Economy" },
  { value: "sustainability", label: "Sustainability & CleanTech" },
  { value: "proptech", label: "PropTech & Real Estate" },
] as const;

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { category } = await req.json();

    const catLabel =
      API_CATEGORIES.find((c) => c.value === category)?.label || category || "General Tech";

    const prompt = `You are a world-class startup ideation engine for the GTM BootCamp program.

Generate exactly 3 unique Micro-SaaS product ideas in the "${catLabel}" category.

For each idea, provide:
1. name - A catchy product name (2-3 words max)
2. tagline - One-sentence value proposition (max 12 words)
3. problem - The specific pain point it solves (2-3 sentences)
4. solution - How the product solves it (2-3 sentences)
5. target_audience - Who would pay for this (be specific)
6. monetization - How it makes money (pricing model + suggested price)
7. mvp_scope - What the MVP includes (3-5 bullet points)
8. competitive_edge - Why this wins vs alternatives (1-2 sentences)
9. market_size - Estimated TAM/SAM (brief)
10. difficulty - "easy" | "medium" | "hard" (MVP build difficulty)

Requirements:
- Ideas must be REALISTIC and buildable by a solo founder in 2-4 weeks
- Focus on niche problems with clear willingness to pay
- Each idea should be different in approach and target audience
- Be creative but practical

Return JSON only (no markdown backticks):
{
  "ideas": [
    {
      "name": "...",
      "tagline": "...",
      "problem": "...",
      "solution": "...",
      "target_audience": "...",
      "monetization": "...",
      "mvp_scope": ["...", "...", "..."],
      "competitive_edge": "...",
      "market_size": "...",
      "difficulty": "easy"
    }
  ]
}`;

    const text = await callAI("", prompt, 4000, { jsonMode: true });
    const parsed = JSON.parse(text);

    logApiCall({
      endpoint: "/api/public/ideator",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return Response.json(parsed);
  } catch (error: unknown) {
    console.error("Ideator API error:", error);

    logApiCall({
      endpoint: "/api/public/ideator",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate ideas" },
      { status: 500 },
    );
  }
}
