/**
 * SQLite FTS5 (BM25) search index — optional better-sqlite3.
 */

import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { IndexedProvider } from "./types.js";
import type { SearchResult } from "./search-result.js";
import { RRF_K } from "./rrf.js";

const SEARCH_DB = "search.db";

function getSearchDbPath(indexPath: string): string {
  return join(indexPath, SEARCH_DB);
}

let sqliteAvailable: boolean | null = null;

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
    // sqlite-vec optional
  }
}

export async function buildSqliteSearchIndex(
  indexPath: string,
  providers: IndexedProvider[]
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

export async function sqliteSearchIndexExists(indexPath: string): Promise<boolean> {
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

function toFts5Query(capability: string): string {
  const tokens = capability
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (tokens.length === 0) return '""';
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"`).join(" OR ");
}

export async function sqliteSearchByCapability(
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

  const filter = (ids: string[]) => (providerIds ? ids.filter((id) => providerIds.has(id)) : ids);
  bm25Results = filter(bm25Results);

  if (bm25Results.length === 0) return { agentIds: [], scores: [] };

  return {
    agentIds: bm25Results.slice(0, limit),
    scores: bm25Results.map((_, i) => 1 / (RRF_K + i + 1)).slice(0, limit),
  };
}
