/**
 * Fleet alerts — one-shot query for security-relevant events for fleet accounts.
 * Queries graph DB for linked facilities/SLAs, then RPC for on-chain events.
 */

import { createPublicClient, parseAbiItem, isAddress } from "viem";
import { transportFromRpcUrl } from "@economicagents/viem-rpc";
import { base, baseSepolia } from "viem/chains";
import type { Address } from "viem";
import { getDatabase } from "./store.js";

const CHUNK_SIZE = 9999n;
const DEFAULT_ENTRYPOINT = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;
const DEFAULT_BLOCK_RANGE = 50_000;

export interface FleetAlert {
  type: string;
  severity: "high" | "medium";
  contract?: string;
  blockNumber: number;
  txHash?: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface GetFleetAlertsOptions {
  fromBlock?: number;
  toBlock?: number;
  entryPointAddress?: Address;
  /** Chain ID (84532 Base Sepolia, 8453 Base mainnet). Default 84532. */
  chainId?: number;
}

export async function getFleetAlerts(
  graphPath: string,
  rpcUrl: string,
  accountAddresses: string[],
  options?: GetFleetAlertsOptions
): Promise<FleetAlert[]> {
  const normalized = accountAddresses
    .filter((a) => typeof a === "string" && isAddress(a))
    .map((a) => (a as string).toLowerCase());
  if (normalized.length === 0) return [];

  if (!rpcUrl || typeof rpcUrl !== "string" || !rpcUrl.trim()) {
    throw new Error("getFleetAlerts requires a non-empty rpcUrl");
  }

  const db = getDatabase(graphPath, { readonly: true });

  // 1. Facilities where lender or borrower in fleet accounts
  const facilityAddresses: string[] = [];
  if (normalized.length > 0) {
    const placeholders = normalized.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT DISTINCT address FROM facilities WHERE lender IN (${placeholders}) OR borrower IN (${placeholders})`
      )
      .all(...normalized, ...normalized) as { address: string }[];
    facilityAddresses.push(...rows.map((r) => r.address));
  }

  // 2. SLAs where provider or consumer in fleet accounts
  const slaAddresses: string[] = [];
  if (normalized.length > 0) {
    const placeholders = normalized.map(() => "?").join(",");
    const rows = db
      .prepare(
        `SELECT DISTINCT address FROM slas WHERE provider IN (${placeholders}) OR consumer IN (${placeholders})`
      )
      .all(...normalized, ...normalized) as { address: string }[];
    slaAddresses.push(...rows.map((r) => r.address));
  }

  const chainId = options?.chainId ?? 84532;
  const chain = chainId === base.id ? base : baseSepolia;
  const client = createPublicClient({
    chain,
    transport: transportFromRpcUrl(rpcUrl),
  });

  const toBlock = options?.toBlock ?? Number(await client.getBlockNumber());
  const fromBlock =
    options?.fromBlock ?? Math.max(0, toBlock - DEFAULT_BLOCK_RANGE);
  const entryPoint =
    (options?.entryPointAddress as Address) ?? DEFAULT_ENTRYPOINT;
  const now = Date.now();

  const alerts: FleetAlert[] = [];
  const accountSet = new Set(normalized);

  const addAlert = (alert: Omit<FleetAlert, "timestamp">) => {
    alerts.push({ ...alert, timestamp: now });
  };

  // 3. AEPAccount Frozen
  if (normalized.length > 0) {
    for (let start = BigInt(fromBlock); start <= toBlock; start += CHUNK_SIZE) {
      const end =
        start + CHUNK_SIZE > BigInt(toBlock) ? BigInt(toBlock) : start + CHUNK_SIZE;
      const logs = await client.getLogs({
        address: normalized as Address[],
        event: parseAbiItem("event Frozen(bool frozen)"),
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const args = (log as { args?: { frozen?: boolean } }).args;
        addAlert({
          type: "ACCOUNT_FROZEN",
          severity: "high",
          contract: log.address,
          blockNumber: Number(log.blockNumber ?? 0),
          txHash: log.transactionHash ?? undefined,
          data: { frozen: args?.frozen ?? false },
        });
      }
    }
  }

  // 4. AEPAccount PolicyRecordSpendFailed
  if (normalized.length > 0) {
    for (let start = BigInt(fromBlock); start <= toBlock; start += CHUNK_SIZE) {
      const end =
        start + CHUNK_SIZE > BigInt(toBlock) ? BigInt(toBlock) : start + CHUNK_SIZE;
      const logs = await client.getLogs({
        address: normalized as Address[],
        event: parseAbiItem("event PolicyRecordSpendFailed(address indexed module)"),
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const args = (log as { args?: { module?: Address } }).args;
        addAlert({
          type: "POLICY_RECORD_SPEND_FAILED",
          severity: "medium",
          contract: log.address,
          blockNumber: Number(log.blockNumber ?? 0),
          txHash: log.transactionHash ?? undefined,
          data: { module: args?.module },
        });
      }
    }
  }

  // 5. CreditFacility Frozen
  if (facilityAddresses.length > 0) {
    for (let start = BigInt(fromBlock); start <= toBlock; start += CHUNK_SIZE) {
      const end =
        start + CHUNK_SIZE > BigInt(toBlock) ? BigInt(toBlock) : start + CHUNK_SIZE;
      const logs = await client.getLogs({
        address: facilityAddresses as Address[],
        event: parseAbiItem("event Frozen(bool frozen)"),
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const args = (log as { args?: { frozen?: boolean } }).args;
        addAlert({
          type: "FACILITY_FROZEN",
          severity: "high",
          contract: log.address,
          blockNumber: Number(log.blockNumber ?? 0),
          txHash: log.transactionHash ?? undefined,
          data: { frozen: args?.frozen ?? false },
        });
      }
    }
  }

  // 6. CreditFacility DefaultDeclared
  if (facilityAddresses.length > 0) {
    for (let start = BigInt(fromBlock); start <= toBlock; start += CHUNK_SIZE) {
      const end =
        start + CHUNK_SIZE > BigInt(toBlock) ? BigInt(toBlock) : start + CHUNK_SIZE;
      const logs = await client.getLogs({
        address: facilityAddresses as Address[],
        event: parseAbiItem("event DefaultDeclared(address indexed borrower)"),
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const args = (log as { args?: { borrower?: Address } }).args;
        addAlert({
          type: "DEFAULT_DECLARED",
          severity: "high",
          contract: log.address,
          blockNumber: Number(log.blockNumber ?? 0),
          txHash: log.transactionHash ?? undefined,
          data: { borrower: args?.borrower },
        });
      }
    }
  }

  // 7. SLAContract BreachDeclared
  if (slaAddresses.length > 0) {
    for (let start = BigInt(fromBlock); start <= toBlock; start += CHUNK_SIZE) {
      const end =
        start + CHUNK_SIZE > BigInt(toBlock) ? BigInt(toBlock) : start + CHUNK_SIZE;
      const logs = await client.getLogs({
        address: slaAddresses as Address[],
        event: parseAbiItem(
          "event BreachDeclared(address indexed consumer, bytes32 indexed requestHash, uint256 amount)"
        ),
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const args = (log as {
          args?: { consumer?: Address; requestHash?: `0x${string}`; amount?: bigint };
        }).args;
        addAlert({
          type: "BREACH_DECLARED",
          severity: "high",
          contract: log.address,
          blockNumber: Number(log.blockNumber ?? 0),
          txHash: log.transactionHash ?? undefined,
          data: {
            consumer: args?.consumer,
            requestHash: args?.requestHash,
            amount: args?.amount?.toString(),
          },
        });
      }
    }
  }

  // 8. EntryPoint UserOperationRevertReason (filter by sender in fleet accounts)
  if (accountSet.size > 0) {
    for (let start = BigInt(fromBlock); start <= toBlock; start += CHUNK_SIZE) {
      const end =
        start + CHUNK_SIZE > BigInt(toBlock) ? BigInt(toBlock) : start + CHUNK_SIZE;
      const logs = await client.getLogs({
        address: entryPoint,
        event: parseAbiItem(
          "event UserOperationRevertReason(bytes32 indexed userOpHash, address indexed sender, uint256 nonce, bytes revertReason)"
        ),
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const args = (log as {
          args?: {
            sender?: Address;
            userOpHash?: `0x${string}`;
            nonce?: bigint;
            revertReason?: `0x${string}`;
          };
        }).args;
        if (args?.sender && accountSet.has(args.sender.toLowerCase())) {
          addAlert({
            type: "USER_OP_REVERT",
            severity: "medium",
            blockNumber: Number(log.blockNumber ?? 0),
            txHash: log.transactionHash ?? undefined,
            data: {
              sender: args.sender,
              userOpHash: args.userOpHash,
              nonce: args.nonce?.toString(),
              revertReason: args.revertReason,
            },
          });
        }
      }
    }
  }

  alerts.sort((a, b) => b.blockNumber - a.blockNumber);
  return alerts;
}
