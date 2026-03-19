#!/usr/bin/env node

/**
 * CLI for AEP provider index sync.
 * Usage: npx aep-index sync [options]
 */

import { join } from "path";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import { rejectPathTraversal } from "@aep/sdk";
import { syncIndex } from "./index.js";
import { embedProviders } from "./embed.js";
import type { Address } from "viem";

function getConfigPath(): string {
  const env = process.env.AEP_CONFIG_PATH;
  if (env && env.length > 0) return env;
  return join(homedir(), ".aep", "config.json");
}

const DEFAULT_INDEX_PATH = join(homedir(), ".aep", "index");
const DEFAULT_RPC =
  process.env.AEP_RPC_URL ?? process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const DEFAULT_CHAIN_ID = parseInt(
  process.env.AEP_CHAIN_ID ?? process.env.BASE_SEPOLIA_CHAIN_ID ?? "84532",
  10
);
const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as Address;
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as Address;

interface Config {
  rpcUrl?: string;
  chainId?: number;
  identityRegistryAddress?: string;
  reputationRegistryAddress?: string;
  indexPath?: string;
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

function getIndexPath(args: string[], config: Config): string {
  const pathIndex = args.indexOf("--index-path");
  return pathIndex >= 0 ? args[pathIndex + 1]! : config.indexPath ?? DEFAULT_INDEX_PATH;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "sync";
  const config = loadConfig();

  if (command === "embed") {
    const indexPath = getIndexPath(args, config);
    if (rejectPathTraversal(indexPath)) {
      console.error("Error: invalid index-path (contains '..' or null bytes)");
      process.exit(1);
    }
    try {
      const result = await embedProviders(indexPath);
      console.log(`Index rebuild complete: ${result.indexed} providers indexed`);
    } catch (err) {
      console.error("Error:", err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    return;
  }

  if (command !== "sync") {
    console.error("Usage: aep-index <sync|embed> [options]");
    console.error("  sync  [--rpc <url>] [--index-path <path>] [--chain-id <id>] [--probe-x402]");
    console.error("  embed [--index-path <path>]");
    process.exit(1);
  }

  const rpcIndex = args.indexOf("--rpc");
  const rpcUrl = rpcIndex >= 0 ? args[rpcIndex + 1] : config.rpcUrl ?? DEFAULT_RPC;
  const indexPath = getIndexPath(args, config);
  if (rejectPathTraversal(indexPath)) {
    console.error("Error: invalid index-path (contains '..' or null bytes)");
    process.exit(1);
  }
  const probeX402 = args.includes("--probe-x402");

  const identityRegistry = (config.identityRegistryAddress ?? IDENTITY_REGISTRY) as Address;
  const reputationRegistry = (config.reputationRegistryAddress ?? REPUTATION_REGISTRY) as Address;

  const chainIdArg = args.indexOf("--chain-id");
  let chainId =
    chainIdArg >= 0 && args[chainIdArg + 1]
      ? parseInt(args[chainIdArg + 1]!, 10)
      : config.chainId ?? DEFAULT_CHAIN_ID;
  if (Number.isNaN(chainId) || chainId <= 0) {
    console.error("Error: invalid chain-id (use e.g. 84532 for Base Sepolia, 8453 for Base mainnet)");
    process.exit(1);
  }

  try {
    const result = await syncIndex({
      rpcUrl,
      chainId,
      identityRegistryAddress: identityRegistry,
      reputationRegistryAddress: reputationRegistry,
      indexPath,
      probeX402,
    });
    console.log(`Sync complete: ${result.added} added, ${result.updated} updated`);
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
