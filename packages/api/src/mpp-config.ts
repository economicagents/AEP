/**
 * MPP + Tempo session paywall configuration for the AEP API.
 */

import {
  resolveTempoChain,
  resolveTempoChainId,
  tempoChainId,
  tempoEscrowContract,
  tempoTip20Decimals,
} from "@economicagents/sdk";
import { Store } from "mppx";
import { Mppx, tempo } from "mppx/hono";
import type { MiddlewareHandler } from "hono";
import type { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/** Narrow surface used by the API (avoids exporting opaque mppx generics in `.d.ts`). */
export type AepMppxHono = {
  session: (options: {
    amount: string;
    unitType: "request";
    decimals: number;
    description: string;
    chainId: number;
    suggestedDeposit: string;
  }) => MiddlewareHandler;
};

export type PaywallBackend = "x402" | "mpp";

/** Optional `~/.aep/config.json` Tempo fields (non-secret). Secrets stay in env only. */
export type MppConfigFile = {
  tempoRpcUrl?: string;
  tempoChainId?: number;
  tempoCurrency?: string;
  tempoEscrowContract?: string;
};

export function getPaywallBackend(): PaywallBackend {
  const v = process.env.AEP_PAYWALL_BACKEND?.trim().toLowerCase();
  if (v === "mpp") return "mpp";
  return "x402";
}

/**
 * Build `mppx` Hono instance with Tempo charge+session methods (session used for /resolve).
 */
export function createMppxHono(
  treasury: Address,
  fileConfig?: MppConfigFile
): {
  mppx: AepMppxHono;
  chainId: number;
  currency: Address;
  escrow: Address;
} {
  const secretKey = process.env.MPP_SECRET_KEY ?? process.env.AEP_MPP_SECRET_KEY;
  if (!secretKey || secretKey.length < 16) {
    throw new Error(
      "AEP_PAYWALL_BACKEND=mpp requires MPP_SECRET_KEY or AEP_MPP_SECRET_KEY (strong random secret, e.g. openssl rand -hex 32)"
    );
  }

  const chainId = resolveTempoChainId({
    envChainId: process.env.AEP_TEMPO_CHAIN_ID,
    fileChainId: fileConfig?.tempoChainId,
  });
  const { chain, defaultCurrency } = resolveTempoChain(chainId);
  const envCurr = process.env.AEP_TEMPO_CURRENCY?.trim();
  const fileCurr = fileConfig?.tempoCurrency?.trim();
  const currency =
    envCurr && envCurr.length > 0
      ? (envCurr as Address)
      : fileCurr && fileCurr.length > 0
        ? (fileCurr as Address)
        : defaultCurrency;

  const escrowEnv = process.env.AEP_TEMPO_ESCROW_CONTRACT?.trim() as Address | undefined;
  const escrowFile = fileConfig?.tempoEscrowContract?.trim() as Address | undefined;
  const escrow =
    (escrowEnv && escrowEnv.length > 0 ? escrowEnv : undefined) ??
    (escrowFile && escrowFile.length > 0 ? escrowFile : undefined) ??
    tempoEscrowContract[chainId];
  if (!escrow) {
    throw new Error(`No bundled Tempo escrow for chainId ${chainId}; set AEP_TEMPO_ESCROW_CONTRACT`);
  }

  const rpcOverride = process.env.AEP_TEMPO_RPC_URL?.trim() || fileConfig?.tempoRpcUrl?.trim();
  const defaultRpc = chain.rpcUrls.default.http[0];
  const rpcUrl = rpcOverride && rpcOverride.length > 0 ? rpcOverride : defaultRpc;
  if (!rpcUrl || rpcUrl.length === 0) {
    throw new Error(`Set AEP_TEMPO_RPC_URL for Tempo chain ${chainId}`);
  }

  const rpcMap: Record<number, string> = { [chainId]: rpcUrl };

  let feePayer: import("viem").Account | string | undefined;
  const feeUrl = process.env.AEP_TEMPO_FEE_PAYER_URL?.trim();
  const feePk = process.env.AEP_TEMPO_FEE_PAYER_PRIVATE_KEY?.trim();
  if (feeUrl) feePayer = feeUrl;
  else if (feePk) feePayer = privateKeyToAccount(feePk as `0x${string}`);

  const testnet = chainId === tempoChainId.testnet;

  const methods = tempo({
    recipient: treasury,
    currency,
    testnet,
    rpcUrl: rpcMap,
    feePayer,
    store: Store.memory(),
    escrowContract: escrow,
  });

  const mppx = Mppx.create({
    methods: [methods],
    secretKey,
  });

  return {
    mppx: mppx as unknown as AepMppxHono,
    chainId,
    currency,
    escrow,
  };
}

export function tempoSessionOptions(args: {
  chainId: number;
  amount: string;
  description: string;
}) {
  return {
    amount: args.amount,
    unitType: "request" as const,
    decimals: tempoTip20Decimals,
    description: args.description,
    chainId: args.chainId,
    suggestedDeposit:
      process.env.AEP_TEMPO_SUGGESTED_DEPOSIT?.trim() &&
      process.env.AEP_TEMPO_SUGGESTED_DEPOSIT.trim().length > 0
        ? process.env.AEP_TEMPO_SUGGESTED_DEPOSIT.trim()
        : "5",
  };
}
