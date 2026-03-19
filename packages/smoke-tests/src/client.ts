/**
 * Viem clients for Base Sepolia.
 */
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "@economicagents/sdk";
import type { SmokeTestConfig } from "./config.js";

export function createClients(config: SmokeTestConfig) {
  const transport = http(config.rpcUrl);
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport,
  });

  let walletClient = undefined;
  if (config.privateKey) {
    const account = privateKeyToAccount(config.privateKey);
    walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport,
    });
  }

  return { publicClient, walletClient };
}
