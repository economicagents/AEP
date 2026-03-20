/**
 * Rebuild search index (FTS5) from providers. Run when search.db is missing or stale.
 * Vector embeddings require better-sqlite3 + sqlite-vec (native build); sql.js build is BM25-only.
 */

import { loadProviders } from "./store.js";
import { buildSearchIndex } from "./search-store.js";

/**
 * Rebuild FTS5 search index from providers.json.
 */
export async function embedProviders(indexPath: string): Promise<{ indexed: number }> {
  const providers = loadProviders(indexPath);
  if (providers.length === 0) {
    return { indexed: 0 };
  }

  await buildSearchIndex(indexPath, providers);
  return { indexed: providers.length };
}
