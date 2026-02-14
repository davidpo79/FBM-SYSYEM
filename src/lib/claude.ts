import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 8000,
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-opus-4-20250514",
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: [{ role: "user", content: userMessage }],
    system: systemPrompt,
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }
  return block.text;
}
