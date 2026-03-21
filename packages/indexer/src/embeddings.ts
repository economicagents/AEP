const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const DEFAULT_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

function requireApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.length === 0) {
    throw new Error("OPENAI_API_KEY is required for embedding operations");
  }
  return key;
}

export function embeddingModel(): string {
  return process.env.AEP_EMBEDDING_MODEL ?? DEFAULT_MODEL;
}

async function postEmbeddingsWithRetry(
  key: string,
  model: string,
  chunk: string[]
): Promise<{ data: { embedding: number[]; index: number }[] }> {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: chunk }),
    });
    const bodyText = await res.text();
    if (res.ok) {
      return JSON.parse(bodyText) as { data: { embedding: number[]; index: number }[] };
    }
    const retryable = res.status === 429 || (res.status >= 500 && res.status <= 504);
    if (retryable && attempt < maxAttempts) {
      const delayMs = Math.min(8000, 250 * 2 ** (attempt - 1));
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }
    throw new Error(`OpenAI embeddings failed: ${res.status} ${bodyText}`);
  }
  throw new Error("OpenAI embeddings failed after retries");
}

/**
 * Batch embed texts (preserves order). Uses OpenAI embeddings API.
 */
export async function embedTextsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const key = requireApiKey();
  const model = embeddingModel();
  const out: number[][] = [];
  const batchSize = Math.min(64, Math.max(1, parseInt(process.env.AEP_EMBEDDING_BATCH_SIZE ?? "64", 10) || 64));

  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    const data = await postEmbeddingsWithRetry(key, model, chunk);
    const sorted = [...data.data].sort((a, b) => a.index - b.index);
    for (const row of sorted) {
      if (row.embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding dimension ${row.embedding.length} does not match expected ${EMBEDDING_DIMENSIONS}; set AEP_EMBEDDING_MODEL / migration`
        );
      }
      out.push(row.embedding);
    }
  }
  return out;
}

export async function embedQueryText(text: string): Promise<number[]> {
  const [vec] = await embedTextsBatch([text]);
  return vec!;
}
