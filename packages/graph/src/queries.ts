/**
 * Query helpers for analytics, credit scoring, and recommendations.
 */

import { getDatabase } from "./store.js";
import type { SqliteDb } from "./store.js";

export interface PaymentRow {
  fromAddr: string;
  toAddr: string;
  amount: string;
  token: string;
  blockNumber: number;
  source: string;
}

export interface AccountAnalytics {
  address: string;
  totalOutflow: string;
  totalInflow: string;
  netPnl: string;
  paymentCount: number;
  uniqueCounterparties: number;
  creditDraws: number;
  creditRepays: number;
  defaults: number;
  slaBreaches: number;
  successRate: number;
}

export interface CreditScoreResult {
  score: number;
  factors: {
    paymentConsistency: number;
    revenueStability: number;
    relationshipStability: number;
    defaultHistory: number;
    slaBreachHistory: number;
  };
}

/** Blocks per period (Base ~2s/block). 7d, 30d, 90d. */
const BLOCKS_PER_PERIOD: Record<string, number> = {
  "7d": 302_400,
  "30d": 1_296_000,
  "90d": 3_888_000,
};

function getMaxBlock(db: SqliteDb): number {
  const row = db.prepare("SELECT MAX(blockNumber) as maxBlock FROM payments").get() as
    | { maxBlock: number | null }
    | undefined;
  return row?.maxBlock ?? 0;
}

export function getBlockRangeForPeriod(
  graphPath: string,
  period: string
): { fromBlock: number; toBlock: number } | null {
  const blocks = BLOCKS_PER_PERIOD[period];
  if (!blocks) return null;
  const db = getDatabase(graphPath, { readonly: true });
  const maxBlock = getMaxBlock(db);
  return { fromBlock: Math.max(0, maxBlock - blocks), toBlock: maxBlock };
}

export function getPaymentsFrom(
  db: SqliteDb,
  address: string
): PaymentRow[] {
  const rows = db
    .prepare(
      "SELECT fromAddr, toAddr, amount, token, blockNumber, source FROM payments WHERE fromAddr = ? ORDER BY blockNumber"
    )
    .all(address.toLowerCase()) as PaymentRow[];
  return rows;
}

export function getPaymentsTo(
  db: SqliteDb,
  address: string
): PaymentRow[] {
  const rows = db
    .prepare(
      "SELECT fromAddr, toAddr, amount, token, blockNumber, source FROM payments WHERE toAddr = ? ORDER BY blockNumber"
    )
    .all(address.toLowerCase()) as PaymentRow[];
  return rows;
}

export function getAccountAnalytics(
  graphPath: string,
  address: string
): AccountAnalytics | null {
  const db = getDatabase(graphPath, { readonly: true });
  const addr = address.toLowerCase();

  const outflows = db
    .prepare(
      "SELECT amount, source FROM payments WHERE fromAddr = ?"
    )
    .all(addr) as { amount: string; source: string }[];
  const inflows = db
    .prepare(
      "SELECT amount, source FROM payments WHERE toAddr = ?"
    )
    .all(addr) as { amount: string; source: string }[];

  const totalOutflow = outflows.reduce(
    (sum, r) => sum + BigInt(r.amount),
    0n
  );
  const totalInflow = inflows.reduce(
    (sum, r) => sum + BigInt(r.amount),
    0n
  );
  const netPnl = totalInflow - totalOutflow;

  const toAddrs = db
    .prepare("SELECT toAddr FROM payments WHERE fromAddr = ?")
    .all(addr) as { toAddr: string }[];
  const fromAddrs = db
    .prepare("SELECT fromAddr FROM payments WHERE toAddr = ?")
    .all(addr) as { fromAddr: string }[];
  const uniqueCounterparties = new Set([
    ...toAddrs.map((r) => r.toAddr),
    ...fromAddrs.map((r) => r.fromAddr),
  ]).size;

  const creditDraws = inflows.filter((r) => r.source === "credit_draw").length;
  const creditRepays = outflows.filter((r) => r.source === "credit_repay").length;
  const defaultCount = 0;

  const slaBreachRows = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM sla_events WHERE eventType = 'breach_declared' AND provider = ?"
    )
    .get(addr) as { cnt: number } | undefined;
  const slaBreaches = slaBreachRows?.cnt ?? 0;

  const userOps = db
    .prepare(
      "SELECT success FROM user_ops WHERE sender = ?"
    )
    .all(addr) as { success: number }[];
  const successCount = userOps.filter((r) => r.success === 1).length;
  const successRate =
    userOps.length > 0 ? successCount / userOps.length : 1;

  return {
    address: addr,
    totalOutflow: totalOutflow.toString(),
    totalInflow: totalInflow.toString(),
    netPnl: netPnl.toString(),
    paymentCount: outflows.length + inflows.length,
    uniqueCounterparties,
    creditDraws,
    creditRepays,
    defaults: defaultCount,
    slaBreaches,
    successRate,
  };
}

export function computeCreditScore(
  graphPath: string,
  address: string
): CreditScoreResult {
  const db = getDatabase(graphPath, { readonly: true });
  const addr = address.toLowerCase();

  const outflows = getPaymentsFrom(db, addr);
  const inflows = getPaymentsTo(db, addr);

  const totalOut = outflows.reduce((s, r) => s + BigInt(r.amount), 0n);
  const totalIn = inflows.reduce((s, r) => s + BigInt(r.amount), 0n);

  const defaults = 0;

  const slaBreachRows = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM sla_events WHERE eventType = 'breach_declared' AND provider = ?"
    )
    .get(addr) as { cnt: number } | undefined;
  const slaBreaches = slaBreachRows?.cnt ?? 0;

  const paymentConsistency =
    outflows.length >= 3 ? Math.min(1, outflows.length / 10) : 0.3;
  const revenueStability =
    totalIn > 0n
      ? Number(Math.min(1, Number(totalIn) / 1e12))
      : 0.2;
  const relationshipStability =
    new Set([...outflows.map((r) => r.toAddr), ...inflows.map((r) => r.fromAddr)])
      .size >= 2
      ? 0.8
      : 0.4;
  const defaultHistory = defaults === 0 ? 1 : Math.max(0, 1 - defaults * 0.3);
  const slaBreachHistory = slaBreaches === 0 ? 1 : Math.max(0, 1 - slaBreaches * 0.3);

  const score =
    paymentConsistency * 0.2 +
    revenueStability * 0.2 +
    relationshipStability * 0.2 +
    defaultHistory * 0.2 +
    slaBreachHistory * 0.2;

  return {
    score: Math.min(1, Math.max(0, score)),
    factors: {
      paymentConsistency,
      revenueStability,
      relationshipStability,
      defaultHistory,
      slaBreachHistory,
    },
  };
}

export function computeCreditScoreInRange(
  graphPath: string,
  address: string,
  fromBlock: number,
  toBlock: number
): CreditScoreResult {
  const db = getDatabase(graphPath, { readonly: true });
  const addr = address.toLowerCase();

  const outflows = db
    .prepare(
      "SELECT fromAddr, toAddr, amount, token, blockNumber, source FROM payments WHERE fromAddr = ? AND blockNumber >= ? AND blockNumber <= ? ORDER BY blockNumber"
    )
    .all(addr, fromBlock, toBlock) as PaymentRow[];
  const inflows = db
    .prepare(
      "SELECT fromAddr, toAddr, amount, token, blockNumber, source FROM payments WHERE toAddr = ? AND blockNumber >= ? AND blockNumber <= ? ORDER BY blockNumber"
    )
    .all(addr, fromBlock, toBlock) as PaymentRow[];

  const totalOut = outflows.reduce((s, r) => s + BigInt(r.amount), 0n);
  const totalIn = inflows.reduce((s, r) => s + BigInt(r.amount), 0n);

  const defaults = 0;

  const slaBreachRows = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM sla_events WHERE eventType = 'breach_declared' AND provider = ?
       AND blockNumber >= ? AND blockNumber <= ?`
    )
    .get(addr, fromBlock, toBlock) as { cnt: number } | undefined;
  const slaBreaches = slaBreachRows?.cnt ?? 0;

  const paymentConsistency =
    outflows.length >= 3 ? Math.min(1, outflows.length / 10) : 0.3;
  const revenueStability =
    totalIn > 0n
      ? Number(Math.min(1, Number(totalIn) / 1e12))
      : 0.2;
  const relationshipStability =
    new Set([...outflows.map((r) => r.toAddr), ...inflows.map((r) => r.fromAddr)])
      .size >= 2
      ? 0.8
      : 0.4;
  const defaultHistory = defaults === 0 ? 1 : Math.max(0, 1 - defaults * 0.3);
  const slaBreachHistory = slaBreaches === 0 ? 1 : Math.max(0, 1 - slaBreaches * 0.3);

  const score =
    paymentConsistency * 0.2 +
    revenueStability * 0.2 +
    relationshipStability * 0.2 +
    defaultHistory * 0.2 +
    slaBreachHistory * 0.2;

  return {
    score: Math.min(1, Math.max(0, score)),
    factors: {
      paymentConsistency,
      revenueStability,
      relationshipStability,
      defaultHistory,
      slaBreachHistory,
    },
  };
}

export function getAccountAnalyticsInRange(
  graphPath: string,
  address: string,
  fromBlock: number,
  toBlock: number
): AccountAnalytics | null {
  const db = getDatabase(graphPath, { readonly: true });
  const addr = address.toLowerCase();

  const outflows = db
    .prepare(
      "SELECT amount, source FROM payments WHERE fromAddr = ? AND blockNumber >= ? AND blockNumber <= ?"
    )
    .all(addr, fromBlock, toBlock) as { amount: string; source: string }[];
  const inflows = db
    .prepare(
      "SELECT amount, source FROM payments WHERE toAddr = ? AND blockNumber >= ? AND blockNumber <= ?"
    )
    .all(addr, fromBlock, toBlock) as { amount: string; source: string }[];

  const totalOutflow = outflows.reduce((sum, r) => sum + BigInt(r.amount), 0n);
  const totalInflow = inflows.reduce((sum, r) => sum + BigInt(r.amount), 0n);
  const netPnl = totalInflow - totalOutflow;

  const toAddrs = db
    .prepare(
      "SELECT toAddr FROM payments WHERE fromAddr = ? AND blockNumber >= ? AND blockNumber <= ?"
    )
    .all(addr, fromBlock, toBlock) as { toAddr: string }[];
  const fromAddrs = db
    .prepare(
      "SELECT fromAddr FROM payments WHERE toAddr = ? AND blockNumber >= ? AND blockNumber <= ?"
    )
    .all(addr, fromBlock, toBlock) as { fromAddr: string }[];
  const uniqueCounterparties = new Set([
    ...toAddrs.map((r) => r.toAddr),
    ...fromAddrs.map((r) => r.fromAddr),
  ]).size;

  const creditDraws = inflows.filter((r) => r.source === "credit_draw").length;
  const creditRepays = outflows.filter((r) => r.source === "credit_repay").length;

  const slaBreachRows = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM sla_events WHERE eventType = 'breach_declared' AND provider = ?
       AND blockNumber >= ? AND blockNumber <= ?`
    )
    .get(addr, fromBlock, toBlock) as { cnt: number } | undefined;
  const slaBreaches = slaBreachRows?.cnt ?? 0;

  const userOps = db
    .prepare(
      "SELECT success FROM user_ops WHERE sender = ? AND blockNumber >= ? AND blockNumber <= ?"
    )
    .all(addr, fromBlock, toBlock) as { success: number }[];
  const successCount = userOps.filter((r) => r.success === 1).length;
  const successRate = userOps.length > 0 ? successCount / userOps.length : 1;

  return {
    address: addr,
    totalOutflow: totalOutflow.toString(),
    totalInflow: totalInflow.toString(),
    netPnl: netPnl.toString(),
    paymentCount: outflows.length + inflows.length,
    uniqueCounterparties,
    creditDraws,
    creditRepays,
    defaults: 0,
    slaBreaches,
    successRate,
  };
}

export interface PaymentTrend {
  blockBucket: number;
  outflow: string;
  inflow: string;
  net: string;
  paymentCount: number;
}

/** Rolling spend/revenue trends. Groups by block bucket (~1 day = 43200 blocks on Base). */
export function getPaymentTrends(
  graphPath: string,
  address: string,
  period: "7d" | "30d" | "90d"
): PaymentTrend[] {
  const db = getDatabase(graphPath, { readonly: true });
  const addr = address.toLowerCase();
  const maxBlock = getMaxBlock(db);
  const blocks = BLOCKS_PER_PERIOD[period] ?? BLOCKS_PER_PERIOD["30d"];
  const fromBlock = Math.max(0, maxBlock - blocks);
  const BUCKET_SIZE = 43_200;

  const outflows = db
    .prepare(
      `SELECT blockNumber, amount FROM payments WHERE fromAddr = ? AND blockNumber >= ? AND blockNumber <= ?`
    )
    .all(addr, fromBlock, maxBlock) as { blockNumber: number; amount: string }[];
  const inflows = db
    .prepare(
      `SELECT blockNumber, amount FROM payments WHERE toAddr = ? AND blockNumber >= ? AND blockNumber <= ?`
    )
    .all(addr, fromBlock, maxBlock) as { blockNumber: number; amount: string }[];

  const bucketOut = new Map<number, bigint>();
  const bucketIn = new Map<number, bigint>();
  const bucketCount = new Map<number, number>();

  for (const r of outflows) {
    const b = Math.floor(r.blockNumber / BUCKET_SIZE) * BUCKET_SIZE;
    bucketOut.set(b, (bucketOut.get(b) ?? 0n) + BigInt(r.amount));
    bucketCount.set(b, (bucketCount.get(b) ?? 0) + 1);
  }
  for (const r of inflows) {
    const b = Math.floor(r.blockNumber / BUCKET_SIZE) * BUCKET_SIZE;
    bucketIn.set(b, (bucketIn.get(b) ?? 0n) + BigInt(r.amount));
    bucketCount.set(b, (bucketCount.get(b) ?? 0) + 1);
  }

  const allBuckets = new Set([...bucketOut.keys(), ...bucketIn.keys()]);
  return Array.from(allBuckets)
    .sort((a, b) => a - b)
    .map((blockBucket) => {
      const out = bucketOut.get(blockBucket) ?? 0n;
      const in_ = bucketIn.get(blockBucket) ?? 0n;
      return {
        blockBucket,
        outflow: out.toString(),
        inflow: in_.toString(),
        net: (in_ - out).toString(),
        paymentCount: bucketCount.get(blockBucket) ?? 0,
      };
    });
}

export function exportPaymentsCsv(
  graphPath: string,
  address: string,
  fromBlock?: number,
  toBlock?: number
): string {
  const db = getDatabase(graphPath, { readonly: true });
  const addr = address.toLowerCase();
  let sql =
    "SELECT fromAddr, toAddr, amount, token, blockNumber, txHash, source FROM payments WHERE (fromAddr = ? OR toAddr = ?)";
  const args: (string | number)[] = [addr, addr];
  if (fromBlock != null) {
    sql += " AND blockNumber >= ?";
    args.push(fromBlock);
  }
  if (toBlock != null) {
    sql += " AND blockNumber <= ?";
    args.push(toBlock);
  }
  sql += " ORDER BY blockNumber";
  const rows = db.prepare(sql).all(...args) as {
    fromAddr: string;
    toAddr: string;
    amount: string;
    token: string;
    blockNumber: number;
    txHash: string;
    source: string;
  }[];
  function csvEscape(val: string | number): string {
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }
  const header = "fromAddr,toAddr,amount,token,blockNumber,txHash,source";
  const lines = rows.map(
    (r) =>
      `${csvEscape(r.fromAddr)},${csvEscape(r.toAddr)},${csvEscape(r.amount)},${csvEscape(r.token)},${csvEscape(r.blockNumber)},${csvEscape(r.txHash)},${csvEscape(r.source)}`
  );
  return [header, ...lines].join("\n");
}

export interface FleetSummary {
  accountCount: number;
  totalOutflow: string;
  totalInflow: string;
  netPnl: string;
  paymentCount: number;
  uniqueCounterparties: number;
  accounts: Array<{
    address: string;
    totalOutflow: string;
    totalInflow: string;
    netPnl: string;
    paymentCount: number;
  }>;
}

export function getFleetSummary(
  graphPath: string,
  accountAddresses: string[]
): FleetSummary {
  const db = getDatabase(graphPath, { readonly: true });
  const normalized = accountAddresses.map((a) => a.toLowerCase());
  let totalOutflow = 0n;
  let totalInflow = 0n;
  let paymentCount = 0;
  const allCounterparties = new Set<string>();
  const accounts: FleetSummary["accounts"] = [];

  for (const addr of normalized) {
    const analytics = getAccountAnalytics(graphPath, addr);
    if (analytics) {
      totalOutflow += BigInt(analytics.totalOutflow);
      totalInflow += BigInt(analytics.totalInflow);
      paymentCount += analytics.paymentCount;
      const outflows = db
        .prepare("SELECT toAddr FROM payments WHERE fromAddr = ?")
        .all(addr) as { toAddr: string }[];
      const inflows = db
        .prepare("SELECT fromAddr FROM payments WHERE toAddr = ?")
        .all(addr) as { fromAddr: string }[];
      outflows.forEach((r) => allCounterparties.add(r.toAddr));
      inflows.forEach((r) => allCounterparties.add(r.fromAddr));
      accounts.push({
        address: addr,
        totalOutflow: analytics.totalOutflow,
        totalInflow: analytics.totalInflow,
        netPnl: analytics.netPnl,
        paymentCount: analytics.paymentCount,
      });
    } else {
      accounts.push({
        address: addr,
        totalOutflow: "0",
        totalInflow: "0",
        netPnl: "0",
        paymentCount: 0,
      });
    }
  }

  return {
    accountCount: accounts.length,
    totalOutflow: totalOutflow.toString(),
    totalInflow: totalInflow.toString(),
    netPnl: (totalInflow - totalOutflow).toString(),
    paymentCount,
    uniqueCounterparties: allCounterparties.size,
    accounts,
  };
}
