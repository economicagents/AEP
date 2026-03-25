#!/usr/bin/env node

/**
 * CLI for AEP economic graph sync.
 */

import { join } from "path";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import { Command } from "commander";
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

const program = new Command();

program
  .name("aep-graph")
  .description("AEP economic graph: sync on-chain events into local SQLite graph store")
  .version("0.2.0")
  .addHelpText(
    "after",
    `\nExamples:\n  $ aep-graph sync\n  $ aep-graph sync -r https://sepolia.base.org --graph-path ~/.aep/graph\n`
  );

program
  .command("sync")
  .description("Incremental graph sync (accounts, payments, credit, escrow, splitter, SLA)")
  .option("-r, --rpc <url>", "JSON-RPC URL", DEFAULT_RPC)
  .option("--graph-path <path>", "Graph database path", DEFAULT_GRAPH_PATH)
  .option("--chain-id <id>", "Chain id (overrides config when set)")
  .action(async (opts) => {
    const config = loadConfig();
    const rpcUrl = opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC;
    const graphPath = opts.graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;

    const factoryAddress = (config.aepAccountFactoryAddress ?? config.factoryAddress) as Address | undefined;
    if (!factoryAddress || factoryAddress === "0x0000000000000000000000000000000000000000") {
      console.error(
        "Error: factoryAddress or aepAccountFactoryAddress required in config (deploy factory first)"
      );
      process.exit(1);
    }

    let chainId: number;
    if (opts.chainId != null && opts.chainId !== "") {
      chainId = parseInt(String(opts.chainId), 10);
    } else {
      chainId =
        config.chainId ??
        parseInt(process.env.AEP_CHAIN_ID ?? process.env.BASE_SEPOLIA_CHAIN_ID ?? "84532", 10);
    }
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
  });

async function main() {
  let argv = process.argv.slice(2);
  if (argv.length === 0) {
    argv = ["sync"];
  }
  const first = argv[0];
  if (
    first &&
    !first.startsWith("-") &&
    first !== "sync" &&
    first !== "-h" &&
    first !== "--help" &&
    first !== "-V" &&
    first !== "--version"
  ) {
    argv = ["sync", ...argv];
  }
  await program.parseAsync(argv, { from: "user" });
}

main();
