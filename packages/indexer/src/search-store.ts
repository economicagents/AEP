/**
 * Search index facade: PostgreSQL + pgvector when AEP_INDEX_DATABASE_URL is set,
 * otherwise SQLite FTS5 (optional better-sqlite3).
 */

import type { IndexedProvider } from "./types.js";
import type { SearchResult } from "./search-result.js";
import { getIndexDatabaseUrl } from "./pg-config.js";
import {
  buildPgSearchIndex,
  pgSearchIndexExists,
  pgHasVectorIndex,
  pgSearchByCapability,
  writePgEmbeddings,
} from "./search-store-pg.js";
import {
  buildSqliteSearchIndex,
  sqliteSearchIndexExists,
  sqliteSearchByCapability,
  isSqliteAvailable,
} from "./search-store-sqlite.js";

export type { SearchResult } from "./search-result.js";
export { isSqliteAvailable };

export async function buildSearchIndex(
  indexPath: string,
  providers: IndexedProvider[],
  _embeddings?: Map<string, Float32Array>
): Promise<void> {
  if (getIndexDatabaseUrl()) {
    await buildPgSearchIndex(indexPath, providers);
    if (_embeddings && _embeddings.size > 0) {
      await writePgEmbeddings(indexPath, _embeddings);
    }
    return;
  }
  await buildSqliteSearchIndex(indexPath, providers);
}

export async function searchIndexExists(indexPath: string): Promise<boolean> {
  if (getIndexDatabaseUrl()) {
    return pgSearchIndexExists(indexPath);
  }
  return sqliteSearchIndexExists(indexPath);
}

export async function hasVectorIndex(indexPath: string): Promise<boolean> {
  if (getIndexDatabaseUrl()) {
    return pgHasVectorIndex(indexPath);
  }
  return false;
}

export async function searchByCapability(
  indexPath: string,
  capability: string,
  providerIds?: Set<string>,
  limit = 50
): Promise<SearchResult> {
  if (!capability.trim()) {
    return { agentIds: [], scores: [] };
  }
  if (getIndexDatabaseUrl()) {
    return pgSearchByCapability(indexPath, capability, providerIds, limit);
  }
  return sqliteSearchByCapability(indexPath, capability, providerIds, limit);
}

export async function writeEmbeddings(
  indexPath: string,
  embeddings: Map<string, Float32Array>
): Promise<void> {
  if (getIndexDatabaseUrl()) {
    await writePgEmbeddings(indexPath, embeddings);
  }
}
