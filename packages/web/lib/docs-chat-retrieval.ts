import { DOC_CONTENT } from "./docs-content.generated";

/** Max characters per sub-chunk after heading split */
const MAX_CHUNK_CHARS = 4000;
/** Target number of chunks to score; budget applied after ranking */
const DEFAULT_TOP_K = 10;
/** Total character budget for retrieved context */
const MAX_CONTEXT_CHARS = 36_000;

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "they",
  "them",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "also",
  "now",
  "here",
  "there",
  "then",
  "once",
]);

export interface DocChunk {
  slug: string;
  /** Site path, e.g. `/docs/guides/cookbook` */
  docPath: string;
  sectionTitle: string | null;
  text: string;
}

function tokenize(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9]+/g);
  if (!raw) return [];
  return raw.filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function splitByMaxLength(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + max, text.length);
    if (end < text.length) {
      const breakAt = text.lastIndexOf("\n\n", end);
      if (breakAt > i + max * 0.5) end = breakAt;
    }
    out.push(text.slice(i, end).trim());
    i = end;
  }
  return out.filter(Boolean);
}

function chunkMarkdown(slug: string, md: string): DocChunk[] {
  const docPath = `/docs/${slug}`;
  const sections = md.split(/\n(?=## )/);
  const out: DocChunk[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    let sectionTitle: string | null = null;
    let body = trimmed;

    if (trimmed.startsWith("##")) {
      const lineEnd = trimmed.indexOf("\n");
      const firstLine = lineEnd === -1 ? trimmed : trimmed.slice(0, lineEnd);
      sectionTitle = firstLine.replace(/^#+\s*/, "").trim();
      body = lineEnd === -1 ? "" : trimmed.slice(lineEnd + 1).trim();
    }

    const textToSplit = body.length > 0 ? body : trimmed;
    for (const sub of splitByMaxLength(textToSplit, MAX_CHUNK_CHARS)) {
      out.push({ slug, docPath, sectionTitle, text: sub });
    }
  }

  return out;
}

let cachedChunks: DocChunk[] | null = null;

export function getAllDocChunks(): DocChunk[] {
  if (cachedChunks) return cachedChunks;
  const chunks: DocChunk[] = [];
  for (const [slug, md] of Object.entries(DOC_CONTENT)) {
    chunks.push(...chunkMarkdown(slug, md));
  }
  cachedChunks = chunks;
  return chunks;
}

function scoreChunk(queryTerms: string[], chunkText: string): number {
  if (queryTerms.length === 0) return 0;
  const lower = chunkText.toLowerCase();
  let score = 0;
  for (const t of queryTerms) {
    if (t.length < 2) continue;
    let idx = 0;
    while (idx < lower.length) {
      const found = lower.indexOf(t, idx);
      if (found === -1) break;
      score += 1;
      idx = found + t.length;
    }
  }
  return score / Math.sqrt(chunkText.length + 1);
}

export interface RetrievedContext {
  blocks: string[];
  /** Paths included for system prompt / citations */
  sourcePaths: string[];
}

/**
 * Selects top lexical chunks for the user query and formats context for the model.
 */
export function buildRetrievedContext(
  userQuery: string,
  options?: { topK?: number; maxChars?: number }
): RetrievedContext {
  const topK = options?.topK ?? DEFAULT_TOP_K;
  const maxChars = options?.maxChars ?? MAX_CONTEXT_CHARS;
  let queryTerms = tokenize(userQuery.trim());
  if (queryTerms.length === 0) {
    queryTerms = ["aep", "agent", "economic", "protocol", "documentation"];
  }
  const chunks = getAllDocChunks();

  const scored = chunks
    .map((c) => ({
      chunk: c,
      score: scoreChunk(queryTerms, `${c.sectionTitle ?? ""}\n${c.text}`),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.chunk.slug.localeCompare(b.chunk.slug);
    });

  const seen = new Set<string>();
  const blocks: string[] = [];
  const sourcePaths = new Set<string>();
  let total = 0;

  for (const { chunk, score } of scored) {
    if (score <= 0 && blocks.length >= 3) break;
    if (blocks.length >= topK && score <= 0) break;

    const key = `${chunk.slug}:${chunk.sectionTitle ?? ""}:${chunk.text.slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const title = chunk.sectionTitle ? ` — ${chunk.sectionTitle}` : "";
    const block = `### Source: ${chunk.docPath}${title}\n\n${chunk.text}`;
    if (total + block.length > maxChars && blocks.length >= 4) break;

    blocks.push(block);
    sourcePaths.add(chunk.docPath);
    total += block.length;

    if (blocks.length >= topK && total >= maxChars * 0.5) break;
    if (total >= maxChars) break;
  }

  if (blocks.length === 0) {
    const fallback = scored.slice(0, 5).filter((s) => s.score >= 0);
    for (const { chunk } of fallback) {
      const title = chunk.sectionTitle ? ` — ${chunk.sectionTitle}` : "";
      blocks.push(`### Source: ${chunk.docPath}${title}\n\n${chunk.text}`);
      sourcePaths.add(chunk.docPath);
      if (blocks.length >= 5) break;
    }
  }

  return {
    blocks,
    sourcePaths: [...sourcePaths],
  };
}

export function formatContextForPrompt(retrieved: RetrievedContext): string {
  if (retrieved.blocks.length === 0) {
    return "(No excerpts matched this query. Say you lack a cited passage and point to the closest /docs pages.)";
  }
  return retrieved.blocks.join("\n\n---\n\n");
}
