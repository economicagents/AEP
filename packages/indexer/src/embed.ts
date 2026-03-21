/**
 * Rebuild search index from providers.json: SQLite FTS5, or Postgres + optional embeddings.
 */

import { loadProviders } from "./store.js";
import { buildSearchIndex } from "./search-store.js";
import { getIndexDatabaseUrl } from "./pg-config.js";
import { embedTextsBatch } from "./embeddings.js";
import { updatePgEmbeddings } from "./search-store-pg.js";
import type { IndexedProvider } from "./types.js";
import { buildSearchDocument } from "./search-document.js";

async function embedAllProvidersInPg(indexPath: string, providers: IndexedProvider[]): Promise<void> {
  const texts = providers.map((p) => buildSearchDocument(p));
  const embeddings = await embedTextsBatch(texts);
  const ids = providers.map((p) => p.agentId.toString());
  await updatePgEmbeddings(indexPath, ids, embeddings);
}

/**
 * Rebuild search index from providers.json (FTS5 or Postgres rows), then compute vector embeddings for Postgres when configured.
 */
export async function embedProviders(indexPath: string): Promise<{ indexed: number }> {
  const providers = loadProviders(indexPath);
  if (providers.length === 0) {
    return { indexed: 0 };
  }

  await buildSearchIndex(indexPath, providers);

  if (getIndexDatabaseUrl()) {
    await embedAllProvidersInPg(indexPath, providers);
  }

  return { indexed: providers.length };
}
