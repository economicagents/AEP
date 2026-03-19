/**
 * Unit tests for monitor store - better-sqlite3 persistence for block state.
 */

import { existsSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  closeDatabase,
  getLastBlock,
  isSqliteAvailable,
  setLastBlock,
} from "../src/store.js";

const itSqlite = isSqliteAvailable() ? it : it.skip;

describe("monitor store", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aep-monitor-test-"));
  });

  afterEach(() => {
    closeDatabase();
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("loads store module", () => {
    expect(typeof getLastBlock).toBe("function");
    expect(typeof setLastBlock).toBe("function");
    expect(typeof isSqliteAvailable).toBe("function");
  });

  itSqlite("better-sqlite3 is available", () => {
    expect(isSqliteAvailable()).toBe(true);
  });

  itSqlite("setLastBlock and getLastBlock persist to disk", () => {
    setLastBlock(tmpDir, "account_factory", 12345);
    expect(getLastBlock(tmpDir, "account_factory")).toBe(12345);

    closeDatabase();
    expect(getLastBlock(tmpDir, "account_factory")).toBe(12345);
  });

  itSqlite("state.db exists on disk when better-sqlite3 used", () => {
    setLastBlock(tmpDir, "account_factory", 12345);
    const dbPath = join(tmpDir, "state.db");
    expect(existsSync(dbPath)).toBe(true);
  });

  itSqlite("getLastBlock returns 0 for unknown key", () => {
    expect(getLastBlock(tmpDir, "unknown_key")).toBe(0);
  });

  itSqlite("setLastBlock overwrites previous value", () => {
    setLastBlock(tmpDir, "key", 100);
    setLastBlock(tmpDir, "key", 200);
    expect(getLastBlock(tmpDir, "key")).toBe(200);
  });
});
