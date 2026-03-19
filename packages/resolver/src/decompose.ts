/**
 * Decompose multi-step capability strings into sub-intents.
 * "research + summarize + format" -> ["research", "summarize", "format"]
 */

const SPLIT_PATTERNS = [/\s+\+\s+/, /\s+and\s+/i, /\s*,\s*/];

/**
 * Split capability into sub-capabilities by common conjunctions.
 * Returns single-element array if no split pattern matches.
 */
export function decomposeIntent(capability: string): string[] {
  const trimmed = capability.trim();
  if (!trimmed) return [];

  for (const pattern of SPLIT_PATTERNS) {
    const parts = trimmed.split(pattern).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }

  return [trimmed];
}
