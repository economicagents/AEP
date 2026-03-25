/**
 * Tempo L1 chain definitions and payment defaults (TIP-20, escrow).
 * Chain objects use viem's `tempo` / `tempoModerato` so clients include Tempo transaction serializers/formatters.
 * See https://mpp.dev/payment-methods/tempo/session
 */

import { tempo, tempoModerato as tempoModeratoViem } from "viem/chains";
import type { Address, Chain } from "viem";

/** Tempo chain IDs */
export const tempoChainId = {
  mainnet: 4217,
  testnet: 42431,
} as const;

export type TempoChainName = "mainnet" | "testnet";

/**
 * Pick Tempo chain id for API/CLI: non-empty `AEP_TEMPO_CHAIN_ID` wins; else optional file/config number; else default mainnet.
 * Empty env string is treated as unset (so file/fallback apply). Throws on non-numeric or non-positive values.
 */
export function resolveTempoChainId(args: {
  envChainId?: string;
  fileChainId?: number;
  fallback?: number;
}): number {
  const fallback = args.fallback ?? tempoChainId.mainnet;
  const trimmed = args.envChainId?.trim();
  if (trimmed && trimmed.length > 0) {
    const n = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error("Invalid AEP_TEMPO_CHAIN_ID (expected positive integer, e.g. 4217 or 42431)");
    }
    return n;
  }
  const f = args.fileChainId;
  if (f != null) {
    if (typeof f !== "number" || !Number.isFinite(f) || f <= 0) {
      throw new Error("Invalid tempoChainId in config (expected positive integer)");
    }
    return f;
  }
  return fallback;
}

/** Tempo mainnet (viem canonical; id 4217) — includes Tempo serializers/formatters */
export const tempoMainnet: Chain = tempo as Chain;

/** Tempo Moderato testnet (viem canonical; id 42431) */
export const tempoModerato: Chain = tempoModeratoViem as Chain;

/** Default TIP-20 USDC on Tempo mainnet */
export const tempoMainnetUsdc = "0x20C000000000000000000000b9537d11c60E8b50" as Address;

/** pathUSD-style sentinel / test token address used in examples */
export const tempoPathUsdPlaceholder = "0x20c0000000000000000000000000000000000000" as Address;

/** Default TIP-20 currency on testnet (pathUSD) per mppx defaults */
export const tempoTestnetDefaultCurrency = tempoPathUsdPlaceholder;

/** Default payment-channel escrow (`TempoStreamChannel`) */
export const tempoEscrowContract: Record<number, Address> = {
  [tempoChainId.mainnet]: "0x33b901018174DDabE4841042ab76ba85D4e24f25",
  [tempoChainId.testnet]: "0xe1c4d3dce17bc111181ddf716f75bae49e61a336",
};

/** Default stablecoin decimals on Tempo */
export const tempoTip20Decimals = 6;

const TEMPO_NATIVE = { name: "Ether", symbol: "ETH", decimals: 18 };

/** Resolve viem `Chain` + default currency for a Tempo chain id */
export function resolveTempoChain(chainId: number): { chain: Chain; defaultCurrency: Address } {
  if (chainId === tempoChainId.testnet) {
    return { chain: tempoModerato, defaultCurrency: tempoTestnetDefaultCurrency };
  }
  if (chainId === tempoChainId.mainnet) {
    return { chain: tempoMainnet, defaultCurrency: tempoMainnetUsdc };
  }
  return {
    chain: {
      id: chainId,
      name: "Tempo (custom)",
      nativeCurrency: TEMPO_NATIVE,
      rpcUrls: { default: { http: [] } },
    },
    defaultCurrency: tempoMainnetUsdc,
  };
}
