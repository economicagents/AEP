#!/usr/bin/env node

/**
 * CLI for AEP economic graph sync.
 * Usage: npx aep-graph sync [options]
 */

import { join } from "path";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import { syncGraph } from "./index.js";
import type { Address } from "viem";

function getConfigPath(): string {
  const env = process.env.AEP_CONFIG_PATH;
  if (env && env.length > 0) return env;
  return join(homedir(), ".aep", "config.json");
}

const DEFAULT_GRAPH_PATH = join(homedir(), ".aep", "graph");
const DEFAULT_RPC =
  process.env.AEP_RPC_URL ?? process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const DEFAULT_ENTRYPOINT = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address;
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;

interface Config {
  rpcUrl?: string;
  chainId?: number;
  graphPath?: string;
  factoryAddress?: string;
  aepAccountFactoryAddress?: string;
  entryPointAddress?: string;
  creditFacilityFactoryAddress?: string;
  escrowFactoryAddress?: string;
  revenueSplitterFactoryAddress?: string;
  slaFactoryAddress?: string;
  usdcAddress?: string;
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

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? "sync";
  const config = loadConfig();

  if (command !== "sync") {
    console.error("Usage: aep-graph <sync> [options]");
    console.error("  sync  [--rpc <url>] [--graph-path <path>] [--chain-id <id>]");
    process.exit(1);
  }

  const rpcIndex = args.indexOf("--rpc");
  const rpcUrl = rpcIndex >= 0 ? args[rpcIndex + 1] : config.rpcUrl ?? DEFAULT_RPC;
  const pathIndex = args.indexOf("--graph-path");
  const graphPath =
    pathIndex >= 0 ? args[pathIndex + 1]! : config.graphPath ?? DEFAULT_GRAPH_PATH;

  const factoryAddress = (config.aepAccountFactoryAddress ?? config.factoryAddress) as Address | undefined;
  if (!factoryAddress || factoryAddress === "0x0000000000000000000000000000000000000000") {
    console.error(
      "Error: factoryAddress or aepAccountFactoryAddress required in config (deploy factory first)"
    );
    process.exit(1);
  }

  const chainIdArg = args.indexOf("--chain-id");
  let chainId =
    chainIdArg >= 0 && args[chainIdArg + 1]
      ? parseInt(args[chainIdArg + 1]!, 10)
      : config.chainId ??
        parseInt(process.env.AEP_CHAIN_ID ?? process.env.BASE_SEPOLIA_CHAIN_ID ?? "84532", 10);
  if (Number.isNaN(chainId) || chainId <= 0) {
    console.error("Error: invalid chain-id (use e.g. 84532 for Base Sepolia, 8453 for Base mainnet)");
    process.exit(1);
  }

  try {
    const result = await syncGraph({
      rpcUrl,
      chainId,
      graphPath,
      aepAccountFactoryAddress: factoryAddress,
      entryPointAddress: (config.entryPointAddress ?? DEFAULT_ENTRYPOINT) as Address,
      creditFacilityFactoryAddress: config.creditFacilityFactoryAddress as Address | undefined,
      escrowFactoryAddress: config.escrowFactoryAddress as Address | undefined,
      revenueSplitterFactoryAddress: config.revenueSplitterFactoryAddress as Address | undefined,
      slaFactoryAddress: config.slaFactoryAddress as Address | undefined,
      usdcAddress: (config.usdcAddress ?? USDC_BASE_SEPOLIA) as Address,
    });
    console.log(
      `Graph sync complete: accounts=${result.accountsAdded} payments=${result.paymentsAdded} ` +
        `userOps=${result.userOpsAdded} credit=${result.creditEventsAdded} ` +
        `escrow=${result.escrowEventsAdded} splitter=${result.splitterEventsAdded} sla=${result.slaEventsAdded}`
    );
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
