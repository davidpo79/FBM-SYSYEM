import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { apis } = await req.json();

    if (!apis || !Array.isArray(apis) || apis.length === 0) {
      return Response.json({ error: "Please select at least one API/tool" }, { status: 400 });
    }

    const apiList = apis.join(", ");

    const prompt = `You are an elite Silicon Valley Tech Lead. The user provides specific APIs or tools: ${apiList}.

Architect 3 hyper-specific, highly profitable Micro-SaaS startup ideas combining exactly these APIs.

Return ONLY valid JSON in this format:
{
  "ideas": [
    {
      "name": "Product Name (2-3 words)",
      "pitch": "One aggressive sentence about what it does and why it prints money",
      "architecture": "Step-by-step API connection logic. How ${apiList} connect together technically. Be specific about data flow and integration points.",
      "monetization": "Who pays, why they pay, pricing model, and expected revenue per customer"
    }
  ]
}

Rules:
- Each idea MUST use ALL of the provided APIs/tools: ${apiList}
- Ideas must be buildable by a solo developer in 2-4 weeks
- Focus on B2B or prosumer — people who pay for tools
- Be specific and technical in the architecture section
- Return exactly 3 ideas`;

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
