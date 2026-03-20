#!/usr/bin/env node

/**
 * CLI for AEP on-chain event monitor.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

function getConfigPath(): string {
  const env = process.env.AEP_CONFIG_PATH;
  if (env && env.length > 0) return env;
  return join(homedir(), ".aep", "config.json");
}
import { rejectPathTraversal } from "@economicagents/sdk";
import { runMonitor } from "./index.js";
import type { MonitorConfig } from "./types.js";

// Match hosted deploy: /var/lib/aep/env sets AEP_RPC_URL and often BASE_MAINNET_RPC (Alchemy).
const DEFAULT_RPC =
  process.env.AEP_RPC_URL ??
  process.env.BASE_MAINNET_RPC ??
  process.env.BASE_SEPOLIA_RPC ??
  "https://sepolia.base.org";
const DEFAULT_ENTRYPOINT = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const DEFAULT_STATE_PATH = join(homedir(), ".aep", "monitor");

interface Config {
  rpcUrl?: string;
  chainId?: number;
  entryPointAddress?: string;
  account?: string;
  monitor?: {
    accounts?: string[];
    facilities?: string[];
    slas?: string[];
    webhookUrl?: string;
    pollIntervalMs?: number;
    statePath?: string;
  };
}

function loadConfig(): Config {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

async function main(): Promise<void> {
  const config = loadConfig();
  const monitorCfg = config.monitor ?? {};
  const accounts = (monitorCfg.accounts ?? (config.account ? [config.account] : [])) as `0x${string}`[];
  const facilities = (monitorCfg.facilities ?? []) as `0x${string}`[];
  const slas = (monitorCfg.slas ?? []) as `0x${string}`[];

  if (accounts.length === 0 && facilities.length === 0 && slas.length === 0) {
    console.error(
      "Error: No addresses to monitor. Set monitor.accounts, monitor.facilities, or monitor.slas in ~/.aep/config.json"
    );
    console.error("Example: { \"monitor\": { \"accounts\": [\"0x...\"], \"facilities\": [\"0x...\"] } }");
    process.exit(1);
  }

  const statePath = monitorCfg.statePath ?? DEFAULT_STATE_PATH;
  if (rejectPathTraversal(statePath)) {
    console.error("Error: invalid state-path (contains '..' or null bytes)");
    process.exit(1);
  }

  let chainId =
    config.chainId ??
    parseInt(process.env.AEP_CHAIN_ID ?? process.env.BASE_SEPOLIA_CHAIN_ID ?? "84532", 10);
  if (Number.isNaN(chainId) || chainId <= 0) {
    console.error("Error: invalid chainId in config or AEP_CHAIN_ID (use e.g. 84532 or 8453)");
    process.exit(1);
  }

  const monitorConfig: MonitorConfig = {
    rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
    chainId,
    entryPointAddress: (config.entryPointAddress ?? DEFAULT_ENTRYPOINT) as `0x${string}`,
    accounts,
    facilities,
    slas,
    webhookUrl: monitorCfg.webhookUrl,
    pollIntervalMs: monitorCfg.pollIntervalMs,
    statePath,
  };

  console.error("AEP monitor starting. Watching:", {
    accounts: monitorConfig.accounts.length,
    facilities: monitorConfig.facilities.length,
    slas: monitorConfig.slas.length,
  });
  console.error("Press Ctrl+C to stop.");

  await runMonitor(monitorConfig);
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
