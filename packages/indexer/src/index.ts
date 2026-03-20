/**
 * Provider discovery index - syncs ERC-8004 Identity Registry to local store.
 */

import { createPublicClient, parseAbiItem } from "viem";
import { transportFromRpcUrl } from "@economicagents/viem-rpc";
import { base, baseSepolia } from "viem/chains";
import { getReputationSummary } from "@economicagents/sdk";
import type { Address } from "viem";
import { IDENTITY_REGISTRY_ABI } from "./abi.js";
import { fetchRegistrationFile } from "./fetch.js";
import { probeX402Endpoint } from "./probe.js";
import {
  loadProviders,
  loadState,
  loadSyncCheckpoint,
  removeSyncCheckpoint,
  saveProviders,
  saveState,
  saveSyncCheckpoint,
} from "./store.js";
import { buildSearchIndex } from "./search-store.js";
import { normalizeServices } from "./normalize-services.js";
import type { IndexConfig, IndexedProvider, SyncCheckpoint } from "./types.js";

function uriRecordToMap(record: Record<string, string>): Map<bigint, string> {
  const m = new Map<bigint, string>();
  for (const [k, v] of Object.entries(record)) {
    m.set(BigInt(k), v);
  }
  return m;
}

function uriMapToRecord(m: Map<bigint, string>): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of m) {
    o[k.toString()] = v;
  }
  return o;
}

function saveCheckpointSlice(indexPath: string, cp: Omit<SyncCheckpoint, "v">): void {
  saveSyncCheckpoint(indexPath, { v: 1, ...cp });
}

export async function syncIndex(config: IndexConfig): Promise<{ added: number; updated: number }> {
  const chain = config.chainId === base.id ? base : baseSepolia;
  const client = createPublicClient({
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const state = loadState(config.indexPath);
  let checkpoint = loadSyncCheckpoint(config.indexPath);
  const syncHead = await client.getBlockNumber();

  if (checkpoint && state && state.lastBlock >= checkpoint.toBlock) {
    removeSyncCheckpoint(config.indexPath);
    checkpoint = null;
  }

  const fromBlock = state ? BigInt(state.lastBlock + 1) : 0n;
  const CHUNK_SIZE = 9999n;

  let agentIds = new Set<bigint>();
  let uriByAgent = new Map<bigint, string>();

  if (checkpoint?.logsComplete) {
    for (const id of checkpoint.agentIds) {
      agentIds.add(BigInt(id));
    }
    uriByAgent = uriRecordToMap(checkpoint.uriByAgent);
  } else {
    if (!checkpoint && fromBlock > syncHead) {
      return { added: 0, updated: 0 };
    }

    const scanToBlock = checkpoint ? BigInt(checkpoint.toBlock) : syncHead;
    let scanStart: bigint;
    if (checkpoint && !checkpoint.logsComplete) {
      scanStart = BigInt(checkpoint.lastChunkEnd + 1);
      for (const id of checkpoint.agentIds) {
        agentIds.add(BigInt(id));
      }
      uriByAgent = uriRecordToMap(checkpoint.uriByAgent);
    } else {
      scanStart = fromBlock;
    }

    if (scanStart <= scanToBlock) {
      for (let start = scanStart; start <= scanToBlock; start += CHUNK_SIZE) {
        const end = start + CHUNK_SIZE > scanToBlock ? scanToBlock : start + CHUNK_SIZE;
        const [reg, uri] = await Promise.all([
          client.getLogs({
            address: config.identityRegistryAddress,
            event: parseAbiItem("event Registered(uint256 indexed agentId, string agentURI, address indexed owner)"),
            fromBlock: start,
            toBlock: end,
          }),
          client.getLogs({
            address: config.identityRegistryAddress,
            event: parseAbiItem("event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)"),
            fromBlock: start,
            toBlock: end,
          }),
        ]);
        for (const log of reg) {
          const args = (log as { args?: { agentId?: bigint; agentURI?: string } }).args;
          if (args?.agentId != null) {
            agentIds.add(args.agentId);
            if (args.agentURI) uriByAgent.set(args.agentId, args.agentURI);
          }
        }
        for (const log of uri) {
          const args = (log as { args?: { agentId?: bigint; newURI?: string } }).args;
          if (args?.agentId != null) {
            agentIds.add(args.agentId);
            uriByAgent.set(args.agentId, args.newURI ?? "");
          }
        }
        saveCheckpointSlice(config.indexPath, {
          toBlock: Number(scanToBlock),
          lastChunkEnd: Number(end),
          logsComplete: false,
          agentIds: [...agentIds].map((x) => x.toString()),
          uriByAgent: uriMapToRecord(uriByAgent),
        });
      }
    }

    saveCheckpointSlice(config.indexPath, {
      toBlock: Number(scanToBlock),
      lastChunkEnd: Number(scanToBlock),
      logsComplete: true,
      agentIds: [...agentIds].map((x) => x.toString()),
      uriByAgent: uriMapToRecord(uriByAgent),
    });
  }

  const providers = loadProviders(config.indexPath);
  const byAgent = new Map(providers.map((p) => [p.agentId.toString(), p]));
  let added = 0;
  let updated = 0;

  for (const agentId of agentIds) {
    let uri = uriByAgent.get(agentId);
    if (uri === undefined) {
      uri = await client.readContract({
        address: config.identityRegistryAddress,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "tokenURI",
        args: [agentId],
      });
    }

    const reg = await fetchRegistrationFile(uri ?? "", config.ipfsGateway);
    const paymentWallet = (await client.readContract({
      address: config.identityRegistryAddress,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "getAgentWallet",
      args: [agentId],
    })) as Address;

    let reputationScore: number | undefined;
    let reputationCount: bigint | undefined;
    if (config.reputationRegistryAddress) {
      try {
        const summary = await getReputationSummary(agentId, {
          reputationRegistryAddress: config.reputationRegistryAddress,
          rpcUrl: config.rpcUrl,
          chain: config.chainId === base.id ? base : config.chainId === baseSepolia.id ? baseSepolia : undefined,
        });
        reputationCount = summary.count;
        if (summary.count > 0n && summary.summaryValueDecimals >= 0) {
          const divisor = 10 ** summary.summaryValueDecimals;
          reputationScore = Number(summary.summaryValue) / divisor;
        }
      } catch {
        // ignore
      }
    }

    const x402Support = reg?.x402Support ?? false;
    const services = normalizeServices(reg?.services);
    const httpEndpoint = services.find(
      (s) =>
        (s.name === "web" || s.name === "MCP" || s.name === "OASF") &&
        (s.endpoint.startsWith("http://") || s.endpoint.startsWith("https://"))
    )?.endpoint;

    let lastProbeLatencyMs: number | undefined;
    let lastProbePrice: bigint | undefined;
    let probeSuccessCount = 0;
    let probeFailCount = 0;
    let uptimePercent: number | undefined;
    let errorRate: number | undefined;
    const key = agentId.toString();
    const existing = byAgent.get(key);

    if (config.probeX402 && x402Support && httpEndpoint) {
      try {
        const probeResult = await probeX402Endpoint(httpEndpoint);
        lastProbeLatencyMs = probeResult.latencyMs;
        lastProbePrice = probeResult.price;
        const prevSuccess = existing?.probeSuccessCount ?? 0;
        const prevFail = existing?.probeFailCount ?? 0;

        if (probeResult.success) {
          probeSuccessCount = prevSuccess + 1;
          probeFailCount = prevFail;
        } else {
          probeSuccessCount = prevSuccess;
          probeFailCount = prevFail + 1;
        }

        const total = probeSuccessCount + probeFailCount;
        if (total > 0) {
          uptimePercent = probeSuccessCount / total;
          errorRate = probeFailCount / total;
        }
      } catch {
        probeSuccessCount = existing?.probeSuccessCount ?? 0;
        probeFailCount = (existing?.probeFailCount ?? 0) + 1;
        const total = probeSuccessCount + probeFailCount;
        if (total > 0) {
          uptimePercent = probeSuccessCount / total;
          errorRate = probeFailCount / total;
        }
      }
    } else {
      probeSuccessCount = existing?.probeSuccessCount ?? 0;
      probeFailCount = existing?.probeFailCount ?? 0;
      if (probeSuccessCount + probeFailCount > 0) {
        const total = probeSuccessCount + probeFailCount;
        uptimePercent = probeSuccessCount / total;
        errorRate = probeFailCount / total;
      }
    }

    const agentRegistry = `eip155:${config.chainId}:${config.identityRegistryAddress.toLowerCase()}`;

    const entry: IndexedProvider = {
      agentId,
      agentRegistry,
      chainId: config.chainId,
      name: reg?.name,
      description: reg?.description,
      services,
      x402Support,
      active: reg?.active ?? true,
      paymentWallet,
      reputationScore,
      reputationCount,
      lastProbeLatencyMs,
      lastProbePrice,
      probeSuccessCount: probeSuccessCount > 0 || probeFailCount > 0 ? probeSuccessCount : undefined,
      probeFailCount: probeFailCount > 0 ? probeFailCount : undefined,
      lastProbeAt:
        config.probeX402 && x402Support && httpEndpoint ? Date.now() : existing?.lastProbeAt,
      uptimePercent,
      errorRate,
      supportedTrust: reg?.supportedTrust ?? [],
      lastUpdated: Date.now(),
    };

    if (byAgent.has(key)) {
      byAgent.set(key, { ...byAgent.get(key)!, ...entry });
      updated++;
    } else {
      byAgent.set(key, entry);
      added++;
    }
  }

  const allProviders = Array.from(byAgent.values());
  saveProviders(config.indexPath, allProviders);
  saveState(config.indexPath, {
    lastBlock: Number(syncHead),
    chainId: config.chainId,
    identityRegistryAddress: config.identityRegistryAddress,
    updatedAt: Date.now(),
  });

  await buildSearchIndex(config.indexPath, allProviders);
  removeSyncCheckpoint(config.indexPath);

  return { added, updated };
}

export { loadProviders, loadState } from "./store.js";
export { probeX402Endpoint } from "./probe.js";
export type { ProbeResult } from "./probe.js";
export {
  buildSearchIndex,
  hasVectorIndex,
  searchByCapability,
  searchIndexExists,
  writeEmbeddings,
} from "./search-store.js";
export type { SearchResult } from "./search-store.js";
export type { IndexConfig, IndexedProvider, IndexState, SyncCheckpoint } from "./types.js";
