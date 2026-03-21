/**
 * SQLite store for economic graph. Uses better-sqlite3 (optional dependency).
 * Falls back to sql.js (pure JS) when better-sqlite3 native bindings are unavailable.
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

/** sql.js native Database shape (run/exec/prepare/close) — differs from SqliteDb. */
type SqlJsNativeDb = {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    bind: (params: unknown[]) => void;
    step: () => boolean;
    getAsObject: () => Record<string, unknown>;
    free: () => void;
  };
  close: () => void;
};

let db: SqliteDb | null = null;
let dbPath: string | null = null;
/** Read-only handle (API analytics) — avoids write locks vs graph sync in a second process */
let roDb: SqliteDb | null = null;
let roDbPath: string | null = null;
let sqliteAvailable: boolean | null = null;
let sqlJsFallback: { Database: new () => SqlJsNativeDb } | null = null;

/** better-sqlite3 only — WAL + busy_timeout reduce lock errors when aep-api and graph sync share graph.db */
type BetterSqlite3Handle = SqliteDb & { pragma: (statement: string) => unknown };

const GRAPH_SQLITE_BUSY_TIMEOUT_MS = 30_000;

/** For tests: set sql.js as fallback when better-sqlite3 native bindings are unavailable. */
export function setSqlJsFallback(SQL: { Database: new () => SqlJsNativeDb }): void {
  sqlJsFallback = SQL;
}

function wrapSqlJsDb(nativeDb: SqlJsNativeDb): SqliteDb {
  return {
    exec(sql: string): void {
      nativeDb.exec(sql);
    },
    prepare(sql: string) {
      return {
        run: (...args: unknown[]) => {
          const stmt = nativeDb.prepare(sql);
          stmt.bind(args as unknown[]);
          while (stmt.step()) {
            /* consume rows */
          }
          stmt.free();
          return { changes: 1 };
        },
        get: (...args: unknown[]) => {
          const stmt = nativeDb.prepare(sql);
          stmt.bind(args as unknown[]);
          const row = stmt.step() ? stmt.getAsObject() : undefined;
          stmt.free();
          return row as unknown;
        },
        all: (...args: unknown[]) => {
          const stmt = nativeDb.prepare(sql);
          stmt.bind(args as unknown[]);
          const rows: Record<string, unknown>[] = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows as unknown[];
        },
      };
    },
    close: () => nativeDb.close(),
  };
}

/** Exported for tests: true when better-sqlite3 (disk persistence) is active; false when using sql.js fallback. */
export function isUsingBetterSqlite3(): boolean {
  if (sqliteAvailable === null) isSqliteAvailable();
  return sqliteAvailable === true;
}

/** Exported for tests: whether SQLite (better-sqlite3 or sql.js fallback) is available. */
export function isSqliteAvailable(): boolean {
  if (sqliteAvailable === null) {
    try {
      const Database = require("better-sqlite3");
      const testDb = new Database(":memory:") as SqliteDb;
      testDb.close();
      sqliteAvailable = true;
    } catch {
      sqliteAvailable = false;
    }
  }
  if (sqliteAvailable) return true;
  return sqlJsFallback !== null;
}

export type GraphDatabaseOptions = {
  /** Use read-only mode (API / analytics). Lets graph sync hold the write lock without SQLITE_BUSY. */
  readonly?: boolean;
};

function getDb(graphPath: string, options?: GraphDatabaseOptions): SqliteDb {
  const wantsReadonly = options?.readonly === true;
  /** sql.js tests use one in-memory DB; read-only file semantics do not apply */
  isSqliteAvailable();
  const readonly =
    wantsReadonly && sqliteAvailable === true && sqlJsFallback === null;
  const resolvedPath = join(graphPath, "graph.db");

  if (readonly) {
    if (roDb && roDbPath === resolvedPath) return roDb;
    if (roDb) {
      roDb.close();
      roDb = null;
      roDbPath = null;
    }
  } else {
    if (db && dbPath === resolvedPath) return db;
    if (db) {
      db.close();
      db = null;
      dbPath = null;
    }
  }

  if (!isSqliteAvailable()) {
    throw new Error(
      "better-sqlite3 or sql.js required for graph. Install: npm install better-sqlite3"
    );
  }
  try {
    if (sqliteAvailable) {
      const Database = require("better-sqlite3");
      if (readonly) {
        const nativeDb = new Database(resolvedPath, {
          readonly: true,
          fileMustExist: true,
          timeout: GRAPH_SQLITE_BUSY_TIMEOUT_MS,
        }) as BetterSqlite3Handle;
        roDb = nativeDb;
        roDbPath = resolvedPath;
        return nativeDb;
      }
      mkdirSync(graphPath, { recursive: true });
      const nativeDb = new Database(resolvedPath, {
        timeout: GRAPH_SQLITE_BUSY_TIMEOUT_MS,
      }) as BetterSqlite3Handle;
      nativeDb.pragma("journal_mode = WAL");
      nativeDb.pragma(`busy_timeout = ${GRAPH_SQLITE_BUSY_TIMEOUT_MS}`);
      db = nativeDb;
      dbPath = resolvedPath;
    } else if (sqlJsFallback) {
      // sql.js creates in-memory DB; graphPath is ignored. Use better-sqlite3 for production persistence.
      const nativeDb = new sqlJsFallback.Database();
      db = wrapSqlJsDb(nativeDb);
      dbPath = resolvedPath;
    } else {
      throw new Error("No SQLite backend available");
    }
    initSchema(db);
    return db;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Graph database init failed: ${msg}. Install better-sqlite3 for production: npm install better-sqlite3`
    );
  }
}

function initSchema(database: SqliteDb): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      address TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      firstSeenBlock INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromAddr TEXT NOT NULL,
      toAddr TEXT NOT NULL,
      amount TEXT NOT NULL,
      token TEXT NOT NULL,
      blockNumber INTEGER NOT NULL,
      txHash TEXT NOT NULL,
      logIndex INTEGER,
      source TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payments_from ON payments(fromAddr);
    CREATE INDEX IF NOT EXISTS idx_payments_to ON payments(toAddr);
    CREATE INDEX IF NOT EXISTS idx_payments_block ON payments(blockNumber);

    CREATE TABLE IF NOT EXISTS user_ops (
      userOpHash TEXT PRIMARY KEY,
      sender TEXT NOT NULL,
      success INTEGER NOT NULL,
      actualGasCost TEXT,
      blockNumber INTEGER,
      txHash TEXT
    );

    CREATE TABLE IF NOT EXISTS facilities (
      address TEXT PRIMARY KEY,
      lender TEXT NOT NULL,
      borrower TEXT NOT NULL,
      firstSeenBlock INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS escrows (
      address TEXT PRIMARY KEY,
      consumer TEXT NOT NULL,
      provider TEXT NOT NULL,
      firstSeenBlock INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS splitters (
      address TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      firstSeenBlock INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS slas (
      address TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      consumer TEXT NOT NULL,
      firstSeenBlock INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sla_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slaAddress TEXT NOT NULL,
      eventType TEXT NOT NULL,
      provider TEXT NOT NULL,
      consumer TEXT,
      amount TEXT,
      requestHash TEXT,
      blockNumber INTEGER NOT NULL,
      txHash TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sla_events_sla ON sla_events(slaAddress);
    CREATE INDEX IF NOT EXISTS idx_sla_events_provider ON sla_events(provider);

    CREATE TABLE IF NOT EXISTS sync_state (
      contract_key TEXT PRIMARY KEY,
      lastBlock INTEGER NOT NULL
    );
  `);
}

export function ensureGraphDir(graphPath: string): void {
  mkdirSync(graphPath, { recursive: true });
}

export function getDatabase(graphPath: string, options?: GraphDatabaseOptions): SqliteDb {
  return getDb(graphPath, options);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    dbPath = null;
  }
  if (roDb) {
    roDb.close();
    roDb = null;
    roDbPath = null;
  }
}

export function insertAccount(
  database: SqliteDb,
  address: string,
  owner: string,
  firstSeenBlock: number
): void {
  database
    .prepare(
      "INSERT OR IGNORE INTO accounts (address, owner, firstSeenBlock) VALUES (?, ?, ?)"
    )
    .run(address.toLowerCase(), owner.toLowerCase(), firstSeenBlock);
}

export function insertPayment(
  database: SqliteDb,
  fromAddr: string,
  toAddr: string,
  amount: string,
  token: string,
  blockNumber: number,
  txHash: string,
  logIndex: number | null,
  source: string
): void {
  database
    .prepare(
      `INSERT INTO payments (fromAddr, toAddr, amount, token, blockNumber, txHash, logIndex, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      fromAddr.toLowerCase(),
      toAddr.toLowerCase(),
      amount,
      token.toLowerCase(),
      blockNumber,
      txHash,
      logIndex,
      source
    );
}

export function insertUserOp(
  database: SqliteDb,
  userOpHash: string,
  sender: string,
  success: boolean,
  actualGasCost: string | null,
  blockNumber: number | null,
  txHash: string | null
): void {
  database
    .prepare(
      `INSERT OR REPLACE INTO user_ops (userOpHash, sender, success, actualGasCost, blockNumber, txHash)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      userOpHash,
      sender.toLowerCase(),
      success ? 1 : 0,
      actualGasCost,
      blockNumber,
      txHash
    );
}

export function insertFacility(
  database: SqliteDb,
  address: string,
  lender: string,
  borrower: string,
  firstSeenBlock: number
): void {
  database
    .prepare(
      "INSERT OR IGNORE INTO facilities (address, lender, borrower, firstSeenBlock) VALUES (?, ?, ?, ?)"
    )
    .run(
      address.toLowerCase(),
      lender.toLowerCase(),
      borrower.toLowerCase(),
      firstSeenBlock
    );
}

export function insertEscrow(
  database: SqliteDb,
  address: string,
  consumer: string,
  provider: string,
  firstSeenBlock: number
): void {
  database
    .prepare(
      "INSERT OR IGNORE INTO escrows (address, consumer, provider, firstSeenBlock) VALUES (?, ?, ?, ?)"
    )
    .run(
      address.toLowerCase(),
      consumer.toLowerCase(),
      provider.toLowerCase(),
      firstSeenBlock
    );
}

export function insertSplitter(
  database: SqliteDb,
  address: string,
  token: string,
  firstSeenBlock: number
): void {
  database
    .prepare(
      "INSERT OR IGNORE INTO splitters (address, token, firstSeenBlock) VALUES (?, ?, ?)"
    )
    .run(address.toLowerCase(), token.toLowerCase(), firstSeenBlock);
}

export function insertSLA(
  database: SqliteDb,
  address: string,
  provider: string,
  consumer: string,
  firstSeenBlock: number
): void {
  database
    .prepare(
      "INSERT OR IGNORE INTO slas (address, provider, consumer, firstSeenBlock) VALUES (?, ?, ?, ?)"
    )
    .run(
      address.toLowerCase(),
      provider.toLowerCase(),
      consumer.toLowerCase(),
      firstSeenBlock
    );
}

export function getSyncState(database: SqliteDb, key: string): number | null {
  const row = database
    .prepare("SELECT lastBlock FROM sync_state WHERE contract_key = ?")
    .get(key) as { lastBlock: number } | undefined;
  return row?.lastBlock ?? null;
}

export function setSyncState(
  database: SqliteDb,
  key: string,
  lastBlock: number
): void {
  database
    .prepare(
      "INSERT OR REPLACE INTO sync_state (contract_key, lastBlock) VALUES (?, ?)"
    )
    .run(key, lastBlock);
}

export function getAccountAddresses(database: SqliteDb): string[] {
  const rows = database
    .prepare("SELECT address FROM accounts")
    .all() as { address: string }[];
  return rows.map((r) => r.address);
}

export function getFacilityAddresses(database: SqliteDb): string[] {
  const rows = database
    .prepare("SELECT address FROM facilities")
    .all() as { address: string }[];
  return rows.map((r) => r.address);
}

export function getEscrowAddresses(database: SqliteDb): string[] {
  const rows = database
    .prepare("SELECT address FROM escrows")
    .all() as { address: string }[];
  return rows.map((r) => r.address);
}

export function getSplitterAddresses(database: SqliteDb): string[] {
  const rows = database
    .prepare("SELECT address FROM splitters")
    .all() as { address: string }[];
  return rows.map((r) => r.address);
}

export function getSLAAddresses(database: SqliteDb): string[] {
  const rows = database
    .prepare("SELECT address FROM slas")
    .all() as { address: string }[];
  return rows.map((r) => r.address);
}

export function insertSLAEvent(
  database: SqliteDb,
  slaAddress: string,
  eventType: string,
  provider: string,
  consumer: string | null,
  amount: string | null,
  requestHash: string | null,
  blockNumber: number,
  txHash: string
): void {
  database
    .prepare(
      `INSERT INTO sla_events (slaAddress, eventType, provider, consumer, amount, requestHash, blockNumber, txHash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      slaAddress.toLowerCase(),
      eventType,
      provider.toLowerCase(),
      consumer?.toLowerCase() ?? null,
      amount,
      requestHash,
      blockNumber,
      txHash
    );
}
