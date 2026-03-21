/**
 * Economic graph sync - indexes on-chain events to build transaction graph.
 */

import { createPublicClient, parseAbiItem } from "viem";
import { transportFromRpcUrl } from "@economicagents/viem-rpc";
import { base, baseSepolia } from "viem/chains";
import type { Address } from "viem";
import {
  getDatabase,
  insertAccount,
  insertPayment,
  insertUserOp,
  insertFacility,
  insertEscrow,
  insertSplitter,
  insertSLA,
  insertSLAEvent,
  getSyncState,
  setSyncState,
  getAccountAddresses,
  getFacilityAddresses,
  getEscrowAddresses,
  getSplitterAddresses,
  getSLAAddresses,
} from "./store.js";
import type { GraphConfig, SyncResult } from "./types.js";

const CHUNK_SIZE = 9999n;
const ADDRESS_BATCH_SIZE = 50;

export async function syncGraph(config: GraphConfig): Promise<SyncResult> {
  const chain = config.chainId === base.id ? base : baseSepolia;
  const client = createPublicClient({
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const db = getDatabase(config.graphPath);
  const result: SyncResult = {
    accountsAdded: 0,
    paymentsAdded: 0,
    userOpsAdded: 0,
    creditEventsAdded: 0,
    escrowEventsAdded: 0,
    splitterEventsAdded: 0,
    slaEventsAdded: 0,
  };

  const toBlock = await client.getBlockNumber();

  // 1. Sync AccountDeployed from AEPAccountFactory
  const accountFrom =
    BigInt(getSyncState(db, "account_factory") ?? 0) + 1n;
  if (accountFrom <= toBlock) {
    for (let start = accountFrom; start <= toBlock; start += CHUNK_SIZE) {
      const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
      const logs = await client.getLogs({
        address: config.aepAccountFactoryAddress,
        event: parseAbiItem(
          "event AccountDeployed(address indexed account, address indexed owner, bytes32 indexed salt)"
        ),
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const args = (log as { args?: { account?: Address; owner?: Address } })
          .args;
        if (args?.account && args?.owner) {
          insertAccount(
            db,
            args.account,
            args.owner,
            Number(log.blockNumber ?? 0)
          );
          result.accountsAdded++;
        }
      }
      setSyncState(db, "account_factory", Number(end));
    }
  }

  // 2. Sync factory events to get child addresses
  if (config.creditFacilityFactoryAddress) {
    const cfFrom =
      BigInt(getSyncState(db, "credit_factory") ?? 0) + 1n;
    if (cfFrom <= toBlock) {
      for (let start = cfFrom; start <= toBlock; start += CHUNK_SIZE) {
        const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
        const logs = await client.getLogs({
          address: config.creditFacilityFactoryAddress!,
          event: parseAbiItem(
            "event FacilityCreated(address indexed facility, address indexed lender, address indexed borrower)"
          ),
          fromBlock: start,
          toBlock: end,
        });
        for (const log of logs) {
          const args = (log as {
            args?: { facility?: Address; lender?: Address; borrower?: Address };
          }).args;
          if (args?.facility && args?.lender && args?.borrower) {
            insertFacility(
              db,
              args.facility,
              args.lender,
              args.borrower,
              Number(log.blockNumber ?? 0)
            );
          }
        }
        setSyncState(db, "credit_factory", Number(end));
      }
    }
  }

  if (config.escrowFactoryAddress) {
    const escFrom =
      BigInt(getSyncState(db, "escrow_factory") ?? 0) + 1n;
    if (escFrom <= toBlock) {
      for (let start = escFrom; start <= toBlock; start += CHUNK_SIZE) {
        const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
        const logs = await client.getLogs({
          address: config.escrowFactoryAddress!,
          event: parseAbiItem(
            "event EscrowCreated(address indexed escrow, address indexed consumer, address indexed provider)"
          ),
          fromBlock: start,
          toBlock: end,
        });
        for (const log of logs) {
          const args = (log as {
            args?: { escrow?: Address; consumer?: Address; provider?: Address };
          }).args;
          if (args?.escrow && args?.consumer && args?.provider) {
            insertEscrow(
              db,
              args.escrow,
              args.consumer,
              args.provider,
              Number(log.blockNumber ?? 0)
            );
          }
        }
        setSyncState(db, "escrow_factory", Number(end));
      }
    }
  }

  if (config.revenueSplitterFactoryAddress) {
    const splitFrom =
      BigInt(getSyncState(db, "splitter_factory") ?? 0) + 1n;
    if (splitFrom <= toBlock) {
      for (let start = splitFrom; start <= toBlock; start += CHUNK_SIZE) {
        const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
        const logs = await client.getLogs({
          address: config.revenueSplitterFactoryAddress!,
          event: parseAbiItem(
            "event SplitterCreated(address indexed splitter, address indexed token)"
          ),
          fromBlock: start,
          toBlock: end,
        });
        for (const log of logs) {
          const args = (log as {
            args?: { splitter?: Address; token?: Address };
          }).args;
          if (args?.splitter && args?.token) {
            insertSplitter(
              db,
              args.splitter,
              args.token,
              Number(log.blockNumber ?? 0)
            );
          }
        }
        setSyncState(db, "splitter_factory", Number(end));
      }
    }
  }

  if (config.slaFactoryAddress) {
    const slaFrom = BigInt(getSyncState(db, "sla_factory") ?? 0) + 1n;
    if (slaFrom <= toBlock) {
      for (let start = slaFrom; start <= toBlock; start += CHUNK_SIZE) {
        const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
        const logs = await client.getLogs({
          address: config.slaFactoryAddress!,
          event: parseAbiItem(
            "event SLACreated(address indexed sla, address indexed provider, address indexed consumer)"
          ),
          fromBlock: start,
          toBlock: end,
        });
        for (const log of logs) {
          const args = (log as {
            args?: { sla?: Address; provider?: Address; consumer?: Address };
          }).args;
          if (args?.sla && args?.provider && args?.consumer) {
            insertSLA(
              db,
              args.sla,
              args.provider,
              args.consumer,
              Number(log.blockNumber ?? 0)
            );
          }
        }
        setSyncState(db, "sla_factory", Number(end));
      }
    }
  }

  // 3. Sync UserOperationEvent from EntryPoint
  const epFrom = BigInt(getSyncState(db, "entry_point") ?? 0) + 1n;
  if (epFrom <= toBlock) {
    for (let start = epFrom; start <= toBlock; start += CHUNK_SIZE) {
      const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
      const logs = await client.getLogs({
        address: config.entryPointAddress,
        event: parseAbiItem(
          "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)"
        ),
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const args = (log as {
          args?: {
            userOpHash?: `0x${string}`;
            sender?: Address;
            success?: boolean;
            actualGasCost?: bigint;
          };
        }).args;
        if (args?.userOpHash && args?.sender) {
          insertUserOp(
            db,
            args.userOpHash,
            args.sender,
            args.success ?? false,
            args.actualGasCost?.toString() ?? null,
            Number(log.blockNumber ?? 0),
            log.transactionHash ?? null
          );
          result.userOpsAdded++;
        }
      }
      setSyncState(db, "entry_point", Number(end));
    }
  }

  // 4. Sync ERC-20 Transfer from USDC (filter by accounts)
  const usdcFrom = BigInt(getSyncState(db, "usdc") ?? 0) + 1n;
  if (usdcFrom <= toBlock) {
    const accounts = new Set(getAccountAddresses(db).map((a) => a.toLowerCase()));
    for (let start = usdcFrom; start <= toBlock; start += CHUNK_SIZE) {
      const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
      const logs = await client.getLogs({
        address: config.usdcAddress,
        event: parseAbiItem(
          "event Transfer(address indexed from, address indexed to, uint256 value)"
        ),
        fromBlock: start,
        toBlock: end,
      });
      for (const log of logs) {
        const args = (log as {
          args?: { from?: Address; to?: Address; value?: bigint };
        }).args;
        if (args?.from && args?.to && args?.value !== undefined) {
          const from = args.from.toLowerCase();
          const to = args.to.toLowerCase();
          if (accounts.has(from) || accounts.has(to)) {
            insertPayment(
              db,
              args.from,
              args.to,
              args.value.toString(),
              config.usdcAddress,
              Number(log.blockNumber ?? 0),
              log.transactionHash ?? "",
              log.logIndex ?? null,
              "transfer"
            );
            result.paymentsAdded++;
          }
        }
      }
      setSyncState(db, "usdc", Number(end));
    }
  }

  // 5. Sync CreditFacility events (Drawn, Repaid, DefaultDeclared)
  const facilities = getFacilityAddresses(db);
  if (facilities.length > 0) {
    const cfEvFrom = BigInt(getSyncState(db, "credit_events") ?? 0) + 1n;
    if (cfEvFrom <= toBlock) {
      for (let start = cfEvFrom; start <= toBlock; start += CHUNK_SIZE) {
        const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
        type Log = Awaited<ReturnType<typeof client.getLogs>>[number];
        const drawnLogs: Log[] = [];
        const repaidLogs: Log[] = [];
        for (let i = 0; i < facilities.length; i += ADDRESS_BATCH_SIZE) {
          const batch = facilities.slice(i, i + ADDRESS_BATCH_SIZE) as Address[];
          const [d, r] = await Promise.all([
            client.getLogs({
              address: batch,
              event: parseAbiItem(
                "event Drawn(address indexed borrower, uint256 amount)"
              ),
              fromBlock: start,
              toBlock: end,
            }),
            client.getLogs({
              address: batch,
              event: parseAbiItem(
                "event Repaid(address indexed borrower, uint256 amount)"
              ),
              fromBlock: start,
              toBlock: end,
            }),
          ]);
          drawnLogs.push(...d);
          repaidLogs.push(...r);
        }
        const facilityByAddress = new Map<string, { lender: string; borrower: string }>();
        for (const addr of facilities) {
          const row = db
            .prepare(
              "SELECT lender, borrower FROM facilities WHERE address = ?"
            )
            .get(addr.toLowerCase()) as { lender: string; borrower: string } | undefined;
          if (row) facilityByAddress.set(addr.toLowerCase(), row);
        }
        for (const log of drawnLogs) {
          const args = (log as { args?: { borrower?: Address; amount?: bigint } }).args;
          const fac = facilityByAddress.get((log.address ?? "").toLowerCase());
          if (args?.borrower && args?.amount !== undefined && fac) {
            insertPayment(
              db,
              log.address!,
              args.borrower,
              args.amount.toString(),
              config.usdcAddress,
              Number(log.blockNumber ?? 0),
              log.transactionHash ?? "",
              log.logIndex ?? null,
              "credit_draw"
            );
            result.creditEventsAdded++;
          }
        }
        for (const log of repaidLogs) {
          const args = (log as { args?: { borrower?: Address; amount?: bigint } }).args;
          const fac = facilityByAddress.get((log.address ?? "").toLowerCase());
          if (args?.borrower && args?.amount !== undefined && fac) {
            insertPayment(
              db,
              args.borrower,
              log.address!,
              args.amount.toString(),
              config.usdcAddress,
              Number(log.blockNumber ?? 0),
              log.transactionHash ?? "",
              log.logIndex ?? null,
              "credit_repay"
            );
            result.creditEventsAdded++;
          }
        }
        setSyncState(db, "credit_events", Number(end));
      }
    }
  }

  // 6. Sync ConditionalEscrow events (Funded, Released)
  const escrows = getEscrowAddresses(db);
  if (escrows.length > 0) {
    const escEvFrom = BigInt(getSyncState(db, "escrow_events") ?? 0) + 1n;
    if (escEvFrom <= toBlock) {
      for (let start = escEvFrom; start <= toBlock; start += CHUNK_SIZE) {
        const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
        type EscrowLog = Awaited<ReturnType<typeof client.getLogs>>[number];
        const fundedLogs: EscrowLog[] = [];
        const releasedLogs: EscrowLog[] = [];
        for (let i = 0; i < escrows.length; i += ADDRESS_BATCH_SIZE) {
          const batch = escrows.slice(i, i + ADDRESS_BATCH_SIZE) as Address[];
          const [f, r] = await Promise.all([
            client.getLogs({
              address: batch,
              event: parseAbiItem(
                "event Funded(address indexed consumer, uint256 amount)"
              ),
              fromBlock: start,
              toBlock: end,
            }),
            client.getLogs({
              address: batch,
              event: parseAbiItem(
                "event Released(address indexed provider, uint256 amount)"
              ),
              fromBlock: start,
              toBlock: end,
            }),
          ]);
          fundedLogs.push(...f);
          releasedLogs.push(...r);
        }
        const escrowByAddress = new Map<string, { consumer: string; provider: string }>();
        for (const addr of escrows) {
          const row = db
            .prepare(
              "SELECT consumer, provider FROM escrows WHERE address = ?"
            )
            .get(addr.toLowerCase()) as { consumer: string; provider: string } | undefined;
          if (row) escrowByAddress.set(addr.toLowerCase(), row);
        }
        for (const log of fundedLogs) {
          const args = (log as { args?: { consumer?: Address; amount?: bigint } }).args;
          const esc = escrowByAddress.get((log.address ?? "").toLowerCase());
          if (args?.consumer && args?.amount !== undefined && esc) {
            insertPayment(
              db,
              args.consumer,
              log.address!,
              args.amount.toString(),
              config.usdcAddress,
              Number(log.blockNumber ?? 0),
              log.transactionHash ?? "",
              log.logIndex ?? null,
              "escrow_fund"
            );
            result.escrowEventsAdded++;
          }
        }
        for (const log of releasedLogs) {
          const args = (log as { args?: { provider?: Address; amount?: bigint } }).args;
          const esc = escrowByAddress.get((log.address ?? "").toLowerCase());
          if (args?.provider && args?.amount !== undefined && esc) {
            insertPayment(
              db,
              log.address!,
              args.provider,
              args.amount.toString(),
              config.usdcAddress,
              Number(log.blockNumber ?? 0),
              log.transactionHash ?? "",
              log.logIndex ?? null,
              "escrow_release"
            );
            result.escrowEventsAdded++;
          }
        }
        setSyncState(db, "escrow_events", Number(end));
      }
    }
  }

  // 7. Sync RevenueSplitter Distributed
  const splitters = getSplitterAddresses(db);
  if (splitters.length > 0) {
    const splitEvFrom = BigInt(getSyncState(db, "splitter_events") ?? 0) + 1n;
    if (splitEvFrom <= toBlock) {
      for (let start = splitEvFrom; start <= toBlock; start += CHUNK_SIZE) {
        const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
        let splitterLogs: Awaited<ReturnType<typeof client.getLogs>> = [];
        for (let i = 0; i < splitters.length; i += ADDRESS_BATCH_SIZE) {
          const batch = splitters.slice(i, i + ADDRESS_BATCH_SIZE) as Address[];
          const batchLogs = await client.getLogs({
            address: batch,
            event: parseAbiItem(
              "event Distributed(address indexed token, uint256 totalAmount)"
            ),
            fromBlock: start,
            toBlock: end,
          });
          splitterLogs = splitterLogs.concat(batchLogs);
        }
        for (const log of splitterLogs) {
          const args = (log as {
            args?: { token?: Address; totalAmount?: bigint };
          }).args;
          if (args?.token && args?.totalAmount !== undefined) {
            insertPayment(
              db,
              log.address!,
              log.address!,
              args.totalAmount.toString(),
              args.token,
              Number(log.blockNumber ?? 0),
              log.transactionHash ?? "",
              log.logIndex ?? null,
              "splitter_distribute"
            );
            result.splitterEventsAdded++;
          }
        }
        setSyncState(db, "splitter_events", Number(end));
      }
    }
  }

  // 8. Sync SLAContract Staked, BreachDeclared, Unstaked
  const slas = getSLAAddresses(db);
  if (slas.length > 0) {
    const slaEvFrom = BigInt(getSyncState(db, "sla_events") ?? 0) + 1n;
    if (slaEvFrom <= toBlock) {
      for (let start = slaEvFrom; start <= toBlock; start += CHUNK_SIZE) {
        const end = start + CHUNK_SIZE > toBlock ? toBlock : start + CHUNK_SIZE;
        type SLALog = Awaited<ReturnType<typeof client.getLogs>>[number];
        const stakedLogs: SLALog[] = [];
        const breachLogs: SLALog[] = [];
        const unstakedLogs: SLALog[] = [];
        for (let i = 0; i < slas.length; i += ADDRESS_BATCH_SIZE) {
          const batch = slas.slice(i, i + ADDRESS_BATCH_SIZE) as Address[];
          const [s, b, u] = await Promise.all([
            client.getLogs({
              address: batch,
              event: parseAbiItem("event Staked(address indexed provider, uint256 amount)"),
              fromBlock: start,
              toBlock: end,
            }),
            client.getLogs({
              address: batch,
              event: parseAbiItem(
                "event BreachDeclared(address indexed consumer, bytes32 indexed requestHash, uint256 amount)"
              ),
              fromBlock: start,
              toBlock: end,
            }),
            client.getLogs({
              address: batch,
              event: parseAbiItem("event Unstaked(address indexed provider, uint256 amount)"),
              fromBlock: start,
              toBlock: end,
            }),
          ]);
          stakedLogs.push(...s);
          breachLogs.push(...b);
          unstakedLogs.push(...u);
        }
        const slaByAddress = new Map<string, { provider: string; consumer: string }>();
        for (const addr of slas) {
          const row = db
            .prepare("SELECT provider, consumer FROM slas WHERE address = ?")
            .get(addr.toLowerCase()) as { provider: string; consumer: string } | undefined;
          if (row) slaByAddress.set(addr.toLowerCase(), row);
        }
        for (const log of stakedLogs) {
          const args = (log as { args?: { provider?: Address; amount?: bigint } }).args;
          const sla = slaByAddress.get((log.address ?? "").toLowerCase());
          if (args?.provider && args?.amount !== undefined && sla) {
            insertSLAEvent(
              db,
              log.address!,
              "staked",
              args.provider,
              sla.consumer,
              args.amount.toString(),
              null,
              Number(log.blockNumber ?? 0),
              log.transactionHash ?? ""
            );
            result.slaEventsAdded++;
          }
        }
        for (const log of breachLogs) {
          const args = (log as {
            args?: { consumer?: Address; requestHash?: `0x${string}`; amount?: bigint };
          }).args;
          const sla = slaByAddress.get((log.address ?? "").toLowerCase());
          if (args?.consumer && args?.amount !== undefined && sla) {
            insertSLAEvent(
              db,
              log.address!,
              "breach_declared",
              sla.provider,
              args.consumer,
              args.amount.toString(),
              args.requestHash ?? null,
              Number(log.blockNumber ?? 0),
              log.transactionHash ?? ""
            );
            result.slaEventsAdded++;
          }
        }
        for (const log of unstakedLogs) {
          const args = (log as { args?: { provider?: Address; amount?: bigint } }).args;
          const sla = slaByAddress.get((log.address ?? "").toLowerCase());
          if (args?.provider && args?.amount !== undefined && sla) {
            insertSLAEvent(
              db,
              log.address!,
              "unstaked",
              args.provider,
              sla.consumer,
              args.amount.toString(),
              null,
              Number(log.blockNumber ?? 0),
              log.transactionHash ?? ""
            );
            result.slaEventsAdded++;
          }
        }
        setSyncState(db, "sla_events", Number(end));
      }
    }
  }

  return result;
}

export {
  getDatabase,
  closeDatabase,
  getAccountAddresses,
  getFacilityAddresses,
  getEscrowAddresses,
  getSplitterAddresses,
  getSLAAddresses,
} from "./store.js";
export {
  getPaymentsFrom,
  getPaymentsTo,
  getAccountAnalytics,
  getAccountAnalyticsInRange,
  computeCreditScore,
  computeCreditScoreInRange,
  getPaymentTrends,
  exportPaymentsCsv,
  getBlockRangeForPeriod,
  getFleetSummary,
} from "./queries.js";
export { getFleetAlerts } from "./fleet-alerts.js";
export { getRecommendations } from "./recommendations.js";
export type {
  GraphConfig,
  SyncResult,
  PaymentSource,
} from "./types.js";
export type { GraphDatabaseOptions } from "./store.js";
export type {
  PaymentRow,
  AccountAnalytics,
  CreditScoreResult,
  PaymentTrend,
  FleetSummary,
} from "./queries.js";
export type { FleetAlert, GetFleetAlertsOptions } from "./fleet-alerts.js";
export type { ProviderRecommendation, ProviderInfo } from "./recommendations.js";
