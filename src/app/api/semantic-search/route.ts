import { NextRequest, NextResponse } from "next/server";
import { findRelevantContext } from "@/lib/embeddings";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { query, documents, topK } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid query" },
        { status: 400 },
      );
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty documents array" },
        { status: 400 },
      );
    }

    // documents should be: [{ name: string, content: string }]
    const docs = documents.map(
      (d: { name?: string; content?: string }, i: number) => ({
        name: d.name || `doc-${i}`,
        content: d.content || "",
      }),
    );

    const { context, results } = await findRelevantContext(
      query,
      docs,
      topK || 5,
    );

    logApiCall({
      endpoint: "/api/semantic-search",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      context,
      results: results.map((r) => ({
        id: r.chunk.id,
        section: r.chunk.section,
        text: r.chunk.text,
        score: r.score,
      })),
    });
  } catch (error) {
    console.error("semantic-search error:", error);
    logApiCall({
      endpoint: "/api/semantic-search",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: "Failed to perform semantic search" },
      { status: 500 },
    );
  }
}
