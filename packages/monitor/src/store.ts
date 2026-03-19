/**
 * SQLite state for monitor - tracks last seen block per event stream.
 */

import { createRequire } from "module";
import { mkdirSync } from "fs";
import { join } from "path";

const require = createRequire(import.meta.url);

export type SqliteDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...args: unknown[]) => { changes: number };
    get: (...args: unknown[]) => unknown;
    all: (...args: unknown[]) => unknown[];
  };
  close: () => void;
};

let db: SqliteDb | null = null;
let sqliteAvailable: boolean | null = null;

export function isSqliteAvailable(): boolean {
  if (sqliteAvailable !== null) return sqliteAvailable;
  try {
    const Database = require("better-sqlite3") as new (path: string) => SqliteDb;
    const testDb = new Database(":memory:");
    testDb.close();
    sqliteAvailable = true;
  } catch {
    sqliteAvailable = false;
  }
  return sqliteAvailable;
}

function getDb(statePath: string): SqliteDb {
  if (db) return db;
  if (!isSqliteAvailable()) {
    throw new Error("better-sqlite3 required for monitor. Install: npm install better-sqlite3");
  }
  try {
    const Database = require("better-sqlite3") as new (path: string) => SqliteDb;
    mkdirSync(statePath, { recursive: true });
    const dbPath = join(statePath, "state.db");
    db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_state (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      );
    `);
    return db;
  } catch (err) {
    throw new Error(
      "better-sqlite3 required for monitor. Install: npm install better-sqlite3"
    );
  }
}

export function getLastBlock(statePath: string, key: string): number {
  const database = getDb(statePath);
  const row = database.prepare("SELECT value FROM sync_state WHERE key = ?").get(key) as
    | { value: number }
    | undefined;
  return row?.value ?? 0;
}

export function setLastBlock(statePath: string, key: string, block: number): void {
  const database = getDb(statePath);
  database.prepare("INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)").run(key, block);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
