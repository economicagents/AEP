import type { Address } from "viem";
import type { Intent } from "@aep/sdk";

export interface ResolvedProvider {
  agentId: bigint;
  agentRegistry: string;
  endpoint: string;
  paymentWallet: Address;
  pricePerUnit: bigint;
  reputationScore: number;
  latencyMs?: number;
  supportedTrust: string[];
  name?: string;
  description?: string;
}

export interface ExecutionPlanStep {
  capability: string;
  providers: ResolvedProvider[];
}

export interface ExecutionPlan {
  providers: ResolvedProvider[];
  totalEstimatedCost: string;
  /** For multi-step intents: ordered pipeline of sub-plans */
  steps?: ExecutionPlanStep[];
}

export interface ResolveConfig {
  indexPath: string;
  maxProviders?: number;
  /** When set, boost providers recommended for this account (collaborative filtering) */
  accountAddress?: string;
  graphPath?: string;
  weights?: {
    price?: number;
    reputation?: number;
    latency?: number;
    validation?: number;
    uptime?: number;
  };
}

export type { Intent };
