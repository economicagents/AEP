import type { Address } from "viem";

/** ERC-8004 agent registration file (from agentURI) */
export interface AgentRegistrationFile {
  type?: string;
  name?: string;
  description?: string;
  image?: string;
  services?: Array<{ name: string; endpoint: string; version?: string }>;
  x402Support?: boolean;
  active?: boolean;
  registrations?: Array<{ agentId: number; agentRegistry: string }>;
  supportedTrust?: string[];
}

/** Indexed provider entry */
export interface IndexedProvider {
  agentId: bigint;
  agentRegistry: string;
  chainId: number;
  name?: string;
  description?: string;
  services: Array<{ name: string; endpoint: string; version?: string }>;
  x402Support: boolean;
  active: boolean;
  paymentWallet?: Address;
  reputationScore?: number;
  reputationCount?: bigint;
  lastProbeLatencyMs?: number;
  lastProbePrice?: bigint;
  probeSuccessCount?: number;
  probeFailCount?: number;
  lastProbeAt?: number;
  uptimePercent?: number;
  errorRate?: number;
  supportedTrust: string[];
  lastUpdated: number;
}

/** Index sync state (for incremental sync) */
export interface IndexState {
  lastBlock: number;
  chainId: number;
  identityRegistryAddress: string;
  updatedAt: number;
}

/** Resume file for long first-time backfills (log chunks + optional agent phase) */
export interface SyncCheckpoint {
  v: 1;
  /** Chain head at sync start (fixed upper bound for log scan) */
  toBlock: number;
  /** Highest block fully scanned for logs (Registered + URIUpdated) */
  lastChunkEnd: number;
  /** True when all log chunks through toBlock are done; agent pass may be pending */
  logsComplete: boolean;
  agentIds: string[];
  uriByAgent: Record<string, string>;
}

export interface IndexConfig {
  rpcUrl: string;
  chainId: number;
  identityRegistryAddress: Address;
  reputationRegistryAddress?: Address;
  indexPath: string;
  ipfsGateway?: string;
  probeX402?: boolean;
}
