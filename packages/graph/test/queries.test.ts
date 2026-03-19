/**
 * Unit tests for graph queries: analytics, credit score, recommendations.
 * Uses better-sqlite3 when available; falls back to sql.js (pure JS) otherwise.
 */

import { existsSync, mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import initSqlJs from "sql.js";
import {
  getAccountAnalytics,
  getAccountAnalyticsInRange,
  computeCreditScore,
  exportPaymentsCsv,
  getBlockRangeForPeriod,
  getFleetSummary,
} from "../src/queries.js";
import { getRecommendations } from "../src/recommendations.js";
import {
  closeDatabase,
  getDatabase,
  insertAccount,
  insertPayment,
  isSqliteAvailable,
  isUsingBetterSqlite3,
  setSqlJsFallback,
} from "../src/store.js";
import type { ProviderInfo } from "../src/recommendations.js";

const SQL = await initSqlJs();
setSqlJsFallback(SQL);
const itSqlite = isSqliteAvailable() ? it : it.skip;

const ADDR_A = "0x1111111111111111111111111111111111111111";
const ADDR_B = "0x2222222222222222222222222222222222222222";
const ADDR_C = "0x3333333333333333333333333333333333333333";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

describe("graph queries", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aep-graph-test-"));
  });

  afterEach(() => {
    closeDatabase();
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("loads graph module", () => {
    expect(typeof getAccountAnalytics).toBe("function");
    expect(typeof computeCreditScore).toBe("function");
    expect(typeof getRecommendations).toBe("function");
  });

  itSqlite("getAccountAnalytics returns zeros for unknown address", () => {
    const analytics = getAccountAnalytics(tmpDir, ADDR_A);
    expect(analytics).not.toBeNull();
    expect(analytics!.address).toBe(ADDR_A.toLowerCase());
    expect(analytics!.totalOutflow).toBe("0");
    expect(analytics!.totalInflow).toBe("0");
    expect(analytics!.netPnl).toBe("0");
    expect(analytics!.paymentCount).toBe(0);
    expect(analytics!.uniqueCounterparties).toBe(0);
    expect(analytics!.successRate).toBe(1);
  });

  itSqlite("computeCreditScore returns baseline for empty graph", () => {
    const result = computeCreditScore(tmpDir, ADDR_A);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.factors.paymentConsistency).toBe(0.3);
    expect(result.factors.revenueStability).toBe(0.2);
    expect(result.factors.relationshipStability).toBe(0.4);
    expect(result.factors.defaultHistory).toBe(1);
  });

  itSqlite("getRecommendations returns empty for unknown account", () => {
    const providers: ProviderInfo[] = [
      {
        agentId: 1n,
        paymentWallet: ADDR_B,
        x402Support: true,
        services: [{ name: "vision" }],
      },
    ];
    const recs = getRecommendations(tmpDir, providers, ADDR_A, undefined, 5);
    expect(recs).toEqual([]);
  });

  itSqlite("getAccountAnalytics reflects payments after insert", () => {
    const db = getDatabase(tmpDir);
    insertAccount(db, ADDR_A, ADDR_C, 100);
    insertPayment(db, ADDR_A, ADDR_B, "1000000", USDC, 200, "0xabc", 0, "transfer");
    insertPayment(db, ADDR_B, ADDR_A, "500000", USDC, 201, "0xabd", 0, "transfer");

    const analytics = getAccountAnalytics(tmpDir, ADDR_A);
    expect(analytics).not.toBeNull();
    expect(analytics!.totalOutflow).toBe("1000000");
    expect(analytics!.totalInflow).toBe("500000");
    expect(analytics!.netPnl).toBe("-500000");
    expect(analytics!.paymentCount).toBe(2);
    expect(analytics!.uniqueCounterparties).toBe(1);
  });

  itSqlite("getAccountAnalyticsInRange filters by block range", () => {
    const db = getDatabase(tmpDir);
    insertAccount(db, ADDR_A, ADDR_C, 100);
    insertPayment(db, ADDR_A, ADDR_B, "100", USDC, 100, "0x1", 0, "transfer");
    insertPayment(db, ADDR_A, ADDR_B, "200", USDC, 200, "0x2", 0, "transfer");
    insertPayment(db, ADDR_A, ADDR_B, "300", USDC, 300, "0x3", 0, "transfer");
    const analytics = getAccountAnalyticsInRange(tmpDir, ADDR_A, 150, 250);
    expect(analytics).not.toBeNull();
    expect(analytics!.totalOutflow).toBe("200");
    expect(analytics!.paymentCount).toBe(1);
  });

  itSqlite("exportPaymentsCsv returns valid CSV with header", () => {
    const db = getDatabase(tmpDir);
    insertAccount(db, ADDR_A, ADDR_C, 100);
    insertPayment(db, ADDR_A, ADDR_B, "1000000", USDC, 200, "0xabc", 0, "transfer");
    const csv = exportPaymentsCsv(tmpDir, ADDR_A);
    expect(csv).toContain("fromAddr,toAddr,amount,token,blockNumber,txHash,source");
    expect(csv).toContain(ADDR_A.toLowerCase());
    expect(csv).toContain("1000000");
  });

  itSqlite("getBlockRangeForPeriod returns range for valid period", () => {
    const db = getDatabase(tmpDir);
    insertPayment(db, ADDR_A, ADDR_B, "100", USDC, 500000, "0x1", 0, "transfer");
    const range = getBlockRangeForPeriod(tmpDir, "30d");
    expect(range).not.toBeNull();
    expect(range!.fromBlock).toBeLessThanOrEqual(range!.toBlock);
    expect(range!.toBlock).toBe(500000);
  });

  itSqlite("getFleetSummary aggregates multiple accounts", () => {
    const db = getDatabase(tmpDir);
    insertAccount(db, ADDR_A, ADDR_C, 100);
    insertAccount(db, ADDR_B, ADDR_C, 100);
    insertPayment(db, ADDR_A, ADDR_B, "100", USDC, 200, "0x1", 0, "transfer");
    insertPayment(db, ADDR_B, ADDR_A, "50", USDC, 201, "0x2", 0, "transfer");
    const summary = getFleetSummary(tmpDir, [ADDR_A, ADDR_B]);
    expect(summary.accountCount).toBe(2);
    expect(summary.accounts).toHaveLength(2);
    expect(summary.totalOutflow).toBe("150");
    expect(summary.totalInflow).toBe("150");
  });

  itSqlite("better-sqlite3 persists to disk when available", () => {
    const db = getDatabase(tmpDir);
    insertAccount(db, ADDR_A, ADDR_C, 100);
    insertPayment(db, ADDR_A, ADDR_B, "1000000", USDC, 200, "0xabc", 0, "transfer");
    closeDatabase();

    if (isUsingBetterSqlite3()) {
      const dbPath = join(tmpDir, "graph.db");
      expect(existsSync(dbPath)).toBe(true);
      const db2 = getDatabase(tmpDir);
      const analytics = getAccountAnalytics(tmpDir, ADDR_A);
      expect(analytics).not.toBeNull();
      expect(analytics!.totalOutflow).toBe("1000000");
      expect(analytics!.paymentCount).toBe(1);
    }
  });

  itSqlite("computeCreditScore improves with payment history", () => {
    const db = getDatabase(tmpDir);
    insertAccount(db, ADDR_A, ADDR_C, 100);
    for (let i = 0; i < 5; i++) {
      insertPayment(
        db,
        ADDR_A,
        ADDR_B,
        "100000",
        USDC,
        100 + i,
        `0x${i}`,
        0,
        "transfer"
      );
    }
    // Revenue stability = totalIn/1e12; need >2e11 for factor >0.2
    insertPayment(db, ADDR_C, ADDR_A, "250000000000", USDC, 200, "0xrev", 0, "transfer");

    const result = computeCreditScore(tmpDir, ADDR_A);
    expect(result.score).toBeGreaterThan(0.47);
    expect(result.factors.paymentConsistency).toBeGreaterThan(0.3);
    expect(result.factors.revenueStability).toBeGreaterThan(0.2);
  });
});
