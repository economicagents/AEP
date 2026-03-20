/**
 * Load config from env and optional ~/.aep/config.json.
 * Signer: AEP_KEYSTORE_ACCOUNT (preferred) or PRIVATE_KEY.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { privateKeyToAccount } from "viem/accounts";
import { getSignerAccount } from "@economicagents/keystore";

const EnvSchema = z.object({
  BASE_SEPOLIA_RPC: z.string().url().optional(),
  AEP_KEYSTORE_ACCOUNT: z.string().optional(),
  PRIVATE_KEY: z.string().optional(),
  BUNDLER_RPC_URL: z.string().url().optional(),
  SKIP_LIVE_TESTS: z
    .string()
    .optional()
    .transform((v) => v === "1" || v?.toLowerCase() === "true"),
  SKIP_E2E: z
    .string()
    .optional()
    .transform((v) => v === "1" || v?.toLowerCase() === "true"),
  AEP_CONFIG_PATH: z.string().optional(),
});

export type SmokeTestConfig = {
  rpcUrl: string;
  privateKey?: `0x${string}`;
  walletAddress?: `0x${string}`;
  bundlerRpcUrl?: string;
  skipLiveTests: boolean;
  skipE2e: boolean;
  configPath: string;
};

const DEFAULT_RPC = "https://sepolia.base.org";

export function loadConfig(): SmokeTestConfig {
  const env = EnvSchema.parse(process.env);
  const configPath =
    env.AEP_CONFIG_PATH ??
    join(process.env.HOME ?? process.env.USERPROFILE ?? "/tmp", ".aep", "config.json");

  let rpcUrl = DEFAULT_RPC;
  let privateKey = env.PRIVATE_KEY as `0x${string}` | undefined;

  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf-8"));
      if (typeof raw.rpcUrl === "string" && raw.rpcUrl.length > 0) rpcUrl = raw.rpcUrl;
    } catch {
      // ignore
    }
  }
  if (env.BASE_SEPOLIA_RPC) {
    rpcUrl = env.BASE_SEPOLIA_RPC;
  }

  if (privateKey && !privateKey.startsWith("0x")) {
    privateKey = `0x${privateKey}` as `0x${string}`;
  }
  const walletAddress = privateKey
    ? (privateKeyToAccount(privateKey).address as `0x${string}`)
    : undefined;

  return {
    rpcUrl,
    privateKey,
    walletAddress,
    bundlerRpcUrl: env.BUNDLER_RPC_URL,
    skipLiveTests: env.SKIP_LIVE_TESTS ?? false,
    skipE2e: env.SKIP_E2E ?? false,
    configPath,
  };
}

/** Resolve signer from keystore or PRIVATE_KEY. Use for E2E tests. */
export async function resolveSigner(): Promise<
  { privateKey: `0x${string}`; walletAddress: `0x${string}` } | undefined
> {
  try {
    const { account, privateKey } = await getSignerAccount();
    return { privateKey, walletAddress: account.address };
  } catch {
    return undefined;
  }
}
