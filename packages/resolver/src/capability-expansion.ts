/**
 * Capability expansion: map common phrases to synonym tokens for semantic-style matching.
 * Enables "image classification" to match "computer vision API" without vector embeddings.
 */

const CAPABILITY_SYNONYMS: Record<string, string[]> = {
  "image classification": ["image", "classification", "vision", "computer vision", "cv", "ml"],
  "computer vision": ["vision", "image", "cv", "classification", "detection", "recognition"],
  "image recognition": ["image", "recognition", "vision", "classification", "cv"],
  "object detection": ["object", "detection", "vision", "image", "cv"],
  "nlp": ["nlp", "natural language", "text", "language", "processing"],
  "natural language": ["nlp", "language", "text", "natural"],
  "text summarization": ["summarization", "summarize", "text", "summary", "nlp"],
  "summarization": ["summarize", "summary", "text", "nlp"],
  "translation": ["translate", "language", "text", "nlp"],
  "sentiment analysis": ["sentiment", "analysis", "text", "nlp", "emotion"],
  "image generation": ["image", "generation", "vision", "create", "generate"],
  "code generation": ["code", "generation", "programming", "developer"],
  "embedding": ["embed", "vector", "encoding", "representation"],
  "search": ["search", "retrieval", "find", "query"],
  "api": ["api", "service", "endpoint", "web"],
  "mcp": ["mcp", "model context", "protocol", "tools"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Expand a capability phrase to include synonyms for better matching.
 * Returns a deduplicated set of tokens (base tokens + synonyms).
 */
export function expandCapability(phrase: string): string[] {
  const baseTokens = tokenize(phrase);
  const expanded = new Set<string>(baseTokens);

  const phraseLower = phrase.toLowerCase().trim();
  for (const [key, synonyms] of Object.entries(CAPABILITY_SYNONYMS)) {
    if (phraseLower.includes(key)) {
      for (const s of synonyms) expanded.add(s);
    }
  }

  for (const token of baseTokens) {
    for (const [key, synonyms] of Object.entries(CAPABILITY_SYNONYMS)) {
      if (key.includes(token) || token.includes(key)) {
        for (const s of synonyms) expanded.add(s);
      }
    }
  }

  return Array.from(expanded);
}
