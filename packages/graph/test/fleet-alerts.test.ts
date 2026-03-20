/**
 * Unit tests for getFleetAlerts.
 * Uses better-sqlite3 when available; falls back to sql.js otherwise.
 */

import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import initSqlJs from "sql.js";
import { getFleetAlerts } from "../src/fleet-alerts.js";
import {
  closeDatabase,
  getDatabase,
  insertFacility,
  insertSLA,
  isSqliteAvailable,
  setSqlJsFallback,
} from "../src/store.js";

const SQL = await initSqlJs();
setSqlJsFallback(SQL);
const itSqlite = isSqliteAvailable() ? it : it.skip;

const ADDR_A = "0x1111111111111111111111111111111111111111";
const ADDR_B = "0x2222222222222222222222222222222222222222";
const FACILITY_ADDR = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SLA_ADDR = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("getFleetAlerts", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aep-fleet-alerts-test-"));
  });

  afterEach(() => {
    closeDatabase();
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("returns [] for empty account addresses", async () => {
    const result = await getFleetAlerts(tmpDir, "https://sepolia.base.org", []);
    expect(result).toEqual([]);
  });

  it("throws when rpcUrl is empty", async () => {
    await expect(
      getFleetAlerts(tmpDir, "", [ADDR_A])
    ).rejects.toThrow("getFleetAlerts requires a non-empty rpcUrl");
  });

  it("returns [] when all account addresses are invalid", async () => {
    const result = await getFleetAlerts(tmpDir, "https://sepolia.base.org", [
      "not-an-address",
      "0xinvalid",
    ]);
    expect(result).toEqual([]);
  });

  itSqlite("returns array of FleetAlert shape (integration, requires network)", async () => {
    const db = getDatabase(tmpDir);
    insertFacility(db, FACILITY_ADDR, ADDR_A, ADDR_B, 100);
    insertSLA(db, SLA_ADDR, ADDR_A, ADDR_B, 100);

    const result = await getFleetAlerts(tmpDir, "https://sepolia.base.org", [
      ADDR_A,
    ]);

    expect(Array.isArray(result)).toBe(true);
    for (const a of result) {
      expect(a).toHaveProperty("type");
      expect(typeof a.type).toBe("string");
      expect(a).toHaveProperty("severity");
      expect(["high", "medium"]).toContain(a.severity);
      expect(a).toHaveProperty("blockNumber");
      expect(typeof a.blockNumber).toBe("number");
      expect(a).toHaveProperty("data");
      expect(typeof a.data).toBe("object");
      expect(a).toHaveProperty("timestamp");
      expect(typeof a.timestamp).toBe("number");
    }
  }, 15_000);

  itSqlite("getFleetAlerts is a function", () => {
    expect(typeof getFleetAlerts).toBe("function");
  });
});
