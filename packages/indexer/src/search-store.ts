/**
 * Search index store: FTS5 (BM25) for capability discovery.
 * Uses better-sqlite3 when available (optional dep); otherwise no-op.
 * sqlite-vec is optional for future vector search; FTS5/BM25 does not require it.
 * Keeps providers.json as source of truth; search.db is a derived index.
 */

import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { IndexedProvider } from "./types.js";

const SEARCH_DB = "search.db";
const RRF_K = 60;

function getSearchDbPath(indexPath: string): string {
  return join(indexPath, SEARCH_DB);
}

let sqliteAvailable: boolean | null = null;

/**
 * Verify better-sqlite3 native bindings actually work.
 * require() alone can succeed while bindings load lazily on first use.
 */
function checkSqlite(): boolean {
  if (sqliteAvailable !== null) return sqliteAvailable;
  try {
    const Database = require("better-sqlite3") as new (path: string) => { close: () => void };
    const db = new Database(":memory:");
    db.close();
    sqliteAvailable = true;
  } catch {
    sqliteAvailable = false;
  }
  return sqliteAvailable;
}

/** Exported for tests: whether better-sqlite3 native bindings are available. */
export function isSqliteAvailable(): boolean {
  return checkSqlite();
}

function getDatabase(): new (
  path: string,
  opts?: { readonly?: boolean }
) => {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...args: unknown[]) => void;
    get: () => unknown;
    all: (...args: unknown[]) => unknown[];
    free: () => void;
  };
  close: () => void;
} {
  return require("better-sqlite3");
}

function loadSqliteVec(db: unknown): void {
  try {
    require("sqlite-vec").load(db);
  } catch {
    // sqlite-vec optional for vector search; FTS5 works without it
  }
}

/**
 * (Re)build FTS5 index from providers. No-op if better-sqlite3/sqlite-vec unavailable.
 */
export async function buildSearchIndex(
  indexPath: string,
  providers: IndexedProvider[],
  _embeddings?: Map<string, Float32Array>
): Promise<void> {
  if (!checkSqlite()) return;

  const Database = getDatabase();

  mkdirSync(indexPath, { recursive: true });
  const dbPath = getSearchDbPath(indexPath);
  const db = new Database(dbPath);
  loadSqliteVec(db);

  try {
    db.exec("DROP TABLE IF EXISTS providers_fts");
    db.exec(`
      CREATE VIRTUAL TABLE providers_fts USING fts5(
        agent_id,
        name,
        description,
        services_text
      )
    `);

    const insert = db.prepare(`
      INSERT INTO providers_fts(agent_id, name, description, services_text)
      VALUES (?, ?, ?, ?)
    `);

    for (const p of providers) {
      const agentId = p.agentId.toString();
      const name = p.name ?? "";
      const description = p.description ?? "";
      const servicesText = p.services.map((s) => s.name).join(" ");
      insert.run(agentId, name, description, servicesText);
    }
  } finally {
    db.close();
  }
}

/**
 * Check if search index exists and has data.
 */
export async function searchIndexExists(indexPath: string): Promise<boolean> {
  if (!checkSqlite()) return false;
  const dbPath = getSearchDbPath(indexPath);
  if (!existsSync(dbPath)) return false;
  try {
    const Database = getDatabase();
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare("SELECT COUNT(*) as n FROM providers_fts").get() as { n: number };
    db.close();
    return row.n > 0;
  } catch {
    return false;
  }
}

/**
 * Check if vector embeddings exist in search index.
 */
export function hasVectorIndex(_indexPath: string): boolean {
  return false;
}

/**
 * Tokenize capability for FTS5 MATCH. Escape double-quotes, use OR for terms.
 */
function toFts5Query(capability: string): string {
  const tokens = capability
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (tokens.length === 0) return '""';
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"`).join(" OR ");
}

export interface SearchResult {
  agentIds: string[];
  scores: number[];
}

/**
 * Search by capability using BM25 (FTS5).
 * Returns empty if sqlite unavailable or index missing.
 */
export async function searchByCapability(
  indexPath: string,
  capability: string,
  providerIds?: Set<string>,
  limit = 50
): Promise<SearchResult> {
  if (!checkSqlite()) return { agentIds: [], scores: [] };

  const dbPath = getSearchDbPath(indexPath);
  if (!existsSync(dbPath)) return { agentIds: [], scores: [] };

  const Database = getDatabase();
  const ftsQuery = toFts5Query(capability);
  let bm25Results: string[] = [];

  try {
    const db = new Database(dbPath, { readonly: true });
    const stmt = db.prepare(
      `SELECT agent_id FROM providers_fts WHERE providers_fts MATCH ? ORDER BY bm25(providers_fts) LIMIT ?`
    );
    const rows = stmt.all(ftsQuery, limit) as { agent_id: string }[];
    db.close();
    bm25Results = rows.map((r) => r.agent_id);
  } catch {
    bm25Results = [];
  }

  const filter = (ids: string[]) =>
    providerIds ? ids.filter((id) => providerIds.has(id)) : ids;
  bm25Results = filter(bm25Results);

  if (bm25Results.length === 0) return { agentIds: [], scores: [] };

  return {
    agentIds: bm25Results.slice(0, limit),
    scores: bm25Results.map((_, i) => 1 / (RRF_K + i + 1)).slice(0, limit),
  };
}

/**
 * Write embeddings to the search index. No-op (vector not implemented).
 */
export function writeEmbeddings(
  _indexPath: string,
  _embeddings: Map<string, Float32Array>
): void {}
