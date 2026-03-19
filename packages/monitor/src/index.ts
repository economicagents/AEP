/**
 * On-chain event monitor - polls for security-relevant events and emits alerts.
 */

import { join } from "path";
import { homedir } from "os";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import type { Address } from "viem";
import { getLastBlock, setLastBlock, closeDatabase } from "./store.js";
import type { MonitorConfig, SecurityAlert } from "./types.js";

const CHUNK_SIZE = 9999n;
const DEFAULT_POLL_INTERVAL_MS = 12_000;
const DEFAULT_STATE_PATH = join(homedir(), ".aep", "monitor");

function emitAlert(alert: SecurityAlert, webhookUrl?: string): void {
  const line = JSON.stringify(alert);
  console.log(line);
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: line,
    }).catch((err) => {
      console.error(JSON.stringify({ error: "webhook failed", message: String(err) }));
    });
  }
}

export async function runMonitor(config: MonitorConfig): Promise<void> {
  const chain = config.chainId === base.id ? base : baseSepolia;
  const client = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });
  const statePath = config.statePath ?? DEFAULT_STATE_PATH;
  const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  const processRound = async (): Promise<void> => {
    const toBlock = await client.getBlockNumber();
    const now = Date.now();

    // 1. AEPAccount Frozen
    if (config.accounts.length > 0) {
      const from = BigInt(getLastBlock(statePath, "account_frozen") + 1);
      if (from <= toBlock) {
        for (let start = from; start <= toBlock; start += CHUNK_SIZE) {
          const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
          const logs = await client.getLogs({
            address: config.accounts,
            event: parseAbiItem("event Frozen(bool frozen)"),
            fromBlock: start,
            toBlock: end,
          });
          for (const log of logs) {
            const args = (log as { args?: { frozen?: boolean } }).args;
            emitAlert(
              {
                type: "ACCOUNT_FROZEN",
                severity: "high",
                contract: log.address,
                blockNumber: Number(log.blockNumber ?? 0),
                txHash: log.transactionHash ?? undefined,
                data: { frozen: args?.frozen ?? false },
                timestamp: now,
              },
              config.webhookUrl
            );
          }
          setLastBlock(statePath, "account_frozen", Number(end));
        }
      }
    }

    // 2. AEPAccount PolicyRecordSpendFailed
    if (config.accounts.length > 0) {
      const from = BigInt(getLastBlock(statePath, "policy_record_spend_failed") + 1);
      if (from <= toBlock) {
        for (let start = from; start <= toBlock; start += CHUNK_SIZE) {
          const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
          const logs = await client.getLogs({
            address: config.accounts,
            event: parseAbiItem("event PolicyRecordSpendFailed(address indexed module)"),
            fromBlock: start,
            toBlock: end,
          });
          for (const log of logs) {
            const args = (log as { args?: { module?: Address } }).args;
            emitAlert(
              {
                type: "POLICY_RECORD_SPEND_FAILED",
                severity: "medium",
                contract: log.address,
                blockNumber: Number(log.blockNumber ?? 0),
                txHash: log.transactionHash ?? undefined,
                data: { module: args?.module },
                timestamp: now,
              },
              config.webhookUrl
            );
          }
          setLastBlock(statePath, "policy_record_spend_failed", Number(end));
        }
      }
    }

    // 3. CreditFacility Frozen
    if (config.facilities.length > 0) {
      const from = BigInt(getLastBlock(statePath, "facility_frozen") + 1);
      if (from <= toBlock) {
        for (let start = from; start <= toBlock; start += CHUNK_SIZE) {
          const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
          const logs = await client.getLogs({
            address: config.facilities as Address[],
            event: parseAbiItem("event Frozen(bool frozen)"),
            fromBlock: start,
            toBlock: end,
          });
          for (const log of logs) {
            const args = (log as { args?: { frozen?: boolean } }).args;
            emitAlert(
              {
                type: "FACILITY_FROZEN",
                severity: "high",
                contract: log.address,
                blockNumber: Number(log.blockNumber ?? 0),
                txHash: log.transactionHash ?? undefined,
                data: { frozen: args?.frozen ?? false },
                timestamp: now,
              },
              config.webhookUrl
            );
          }
          setLastBlock(statePath, "facility_frozen", Number(end));
        }
      }
    }

    // 4. CreditFacility DefaultDeclared
    if (config.facilities.length > 0) {
      const from = BigInt(getLastBlock(statePath, "default_declared") + 1);
      if (from <= toBlock) {
        for (let start = from; start <= toBlock; start += CHUNK_SIZE) {
          const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
          const logs = await client.getLogs({
            address: config.facilities as Address[],
            event: parseAbiItem("event DefaultDeclared(address indexed borrower)"),
            fromBlock: start,
            toBlock: end,
          });
          for (const log of logs) {
            const args = (log as { args?: { borrower?: Address } }).args;
            emitAlert(
              {
                type: "DEFAULT_DECLARED",
                severity: "high",
                contract: log.address,
                blockNumber: Number(log.blockNumber ?? 0),
                txHash: log.transactionHash ?? undefined,
                data: { borrower: args?.borrower },
                timestamp: now,
              },
              config.webhookUrl
            );
          }
          setLastBlock(statePath, "default_declared", Number(end));
        }
      }
    }

    // 5. SLAContract BreachDeclared
    if (config.slas.length > 0) {
      const from = BigInt(getLastBlock(statePath, "breach_declared") + 1);
      if (from <= toBlock) {
        for (let start = from; start <= toBlock; start += CHUNK_SIZE) {
          const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
          const logs = await client.getLogs({
            address: config.slas as Address[],
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
            emitAlert(
              {
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
                timestamp: now,
              },
              config.webhookUrl
            );
          }
          setLastBlock(statePath, "breach_declared", Number(end));
        }
      }
    }

    // 6. EntryPoint UserOperationRevertReason (filter by sender in our accounts)
    const accountSet = new Set(config.accounts.map((a) => a.toLowerCase()));
    if (accountSet.size > 0) {
      const from = BigInt(getLastBlock(statePath, "user_op_revert") + 1);
      if (from <= toBlock) {
        for (let start = from; start <= toBlock; start += CHUNK_SIZE) {
          const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
          const logs = await client.getLogs({
            address: config.entryPointAddress,
            event: parseAbiItem(
              "event UserOperationRevertReason(bytes32 indexed userOpHash, address indexed sender, uint256 nonce, bytes revertReason)"
            ),
            fromBlock: start,
            toBlock: end,
          });
          for (const log of logs) {
            const args = (log as {
              args?: { sender?: Address; userOpHash?: `0x${string}`; nonce?: bigint; revertReason?: `0x${string}` };
            }).args;
            if (args?.sender && accountSet.has(args.sender.toLowerCase())) {
              emitAlert(
                {
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
                  timestamp: now,
                },
                config.webhookUrl
              );
            }
          }
          setLastBlock(statePath, "user_op_revert", Number(end));
        }
      }
    }
  };

  const run = async (): Promise<never> => {
    try {
      await processRound();
    } catch (err) {
      console.error(JSON.stringify({ error: "monitor round failed", message: String(err) }));
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    return run();
  };

  process.on("SIGINT", () => {
    closeDatabase();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    closeDatabase();
    process.exit(0);
  });

  await run();
}

export { getLastBlock, setLastBlock, closeDatabase } from "./store.js";
export type { MonitorConfig, SecurityAlert } from "./types.js";
