import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  }
  return _ai;
}

const EMBEDDING_MODEL = "gemini-embedding-exp-03-07";
const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 4000];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate embedding vector for a single text using Gemini Embedding.
 */
export async function embedText(text: string): Promise<number[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await getClient().models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
      });

      const values = result.embeddings?.[0]?.values;
      if (!values || values.length === 0) {
        throw new Error("Empty embedding returned from Gemini");
      }
      return values;
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES) {
        console.warn(
          `embedText attempt ${attempt + 1} failed, retrying in ${RETRY_DELAYS[attempt]}ms...`,
          e instanceof Error ? e.message : e,
        );
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  throw lastError;
}

/**
 * Generate embeddings for multiple texts in a single batch call.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  if (texts.length === 1) return [await embedText(texts[0])];

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const results = await Promise.all(
        texts.map((text) =>
          getClient().models.embedContent({
            model: EMBEDDING_MODEL,
            contents: text,
          }),
        ),
      );

      return results.map((r) => {
        const values = r.embeddings?.[0]?.values;
        if (!values || values.length === 0) {
          throw new Error("Empty embedding in batch result");
        }
        return values;
      });
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES) {
        console.warn(
          `embedTexts attempt ${attempt + 1} failed, retrying...`,
          e instanceof Error ? e.message : e,
        );
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  throw lastError;
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * A chunk of text with its embedding and metadata.
 */
export interface EmbeddedChunk {
  id: string;
  text: string;
  section: string;
  embedding: number[];
}

/**
 * Result of a semantic search.
 */
export interface SearchResult {
  chunk: EmbeddedChunk;
  score: number;
}

/**
 * Split a markdown document into logical sections/chunks for embedding.
 */
export function chunkDocument(
  doc: string,
  source: string,
  maxChunkSize = 800,
): { id: string; text: string; section: string }[] {
  const chunks: { id: string; text: string; section: string }[] = [];

  // Split by markdown headers
  const sections = doc.split(/(?=^#{1,3}\s)/m);
  let chunkIndex = 0;

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Extract section title from first line
    const firstLine = trimmed.split("\n")[0].replace(/^#+\s*/, "").trim();
    const sectionName = firstLine || source;

    // If section is small enough, keep as one chunk
    if (trimmed.length <= maxChunkSize) {
      chunks.push({
        id: `${source}-${chunkIndex++}`,
        text: trimmed,
        section: sectionName,
      });
    } else {
      // Split large sections by paragraphs
      const paragraphs = trimmed.split(/\n\n+/);
      let currentChunk = "";

      for (const para of paragraphs) {
        if (
          currentChunk.length + para.length > maxChunkSize &&
          currentChunk.length > 0
        ) {
          chunks.push({
            id: `${source}-${chunkIndex++}`,
            text: currentChunk.trim(),
            section: sectionName,
          });
          currentChunk = para;
        } else {
          currentChunk += (currentChunk ? "\n\n" : "") + para;
        }
      }

      if (currentChunk.trim()) {
        chunks.push({
          id: `${source}-${chunkIndex++}`,
          text: currentChunk.trim(),
          section: sectionName,
        });
      }
    }
  }

  return chunks;
}

/**
 * Build an in-memory vector index from document chunks.
 */
export async function buildIndex(
  chunks: { id: string; text: string; section: string }[],
): Promise<EmbeddedChunk[]> {
  const texts = chunks.map((c) => c.text);
  const embeddings = await embedTexts(texts);

  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));
}

/**
 * Search the index for chunks most relevant to a query.
 * Returns top-k results sorted by cosine similarity.
 */
export async function searchIndex(
  query: string,
  index: EmbeddedChunk[],
  topK = 5,
  minScore = 0.3,
): Promise<SearchResult[]> {
  if (index.length === 0) return [];

  const queryEmbedding = await embedText(query);

  const scored: SearchResult[] = index
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

/**
 * High-level: given project documents and a query, find the most relevant context.
 * Returns concatenated text of the most relevant chunks.
 */
export async function findRelevantContext(
  query: string,
  documents: { name: string; content: string }[],
  topK = 5,
): Promise<{ context: string; results: SearchResult[] }> {
  // Chunk all documents
  const allChunks: { id: string; text: string; section: string }[] = [];
  for (const doc of documents) {
    if (!doc.content) continue;
    const chunks = chunkDocument(doc.content, doc.name);
    allChunks.push(...chunks);
  }

  if (allChunks.length === 0) {
    return { context: "", results: [] };
  }

  // Build index and search
  const index = await buildIndex(allChunks);
  const results = await searchIndex(query, index, topK);

  // Concatenate relevant texts
  const context = results
    .map((r) => `[${r.chunk.section}] (רלוונטיות: ${(r.score * 100).toFixed(0)}%)\n${r.chunk.text}`)
    .join("\n\n---\n\n");

  return { context, results };
}
