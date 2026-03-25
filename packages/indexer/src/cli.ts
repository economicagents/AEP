#!/usr/bin/env node

/**
 * CLI for AEP provider index sync.
 */

import { join } from "path";
import { homedir } from "os";
import { existsSync, readFileSync } from "fs";
import { Command } from "commander";
import { rejectPathTraversal } from "@economicagents/sdk";
import { syncIndex } from "./index.js";
import { embedProviders } from "./embed.js";
import { getIndexDatabaseUrl } from "./pg-config.js";
import { closePgPool, getPgPool } from "./pg/pool.js";
import { ensureMigrated } from "./pg/migrate.js";
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

const program = new Command();

program
  .name("aep-index")
  .description("AEP provider index: sync ERC-8004 providers into ~/.aep/index (optional embed, Postgres migrate)")
  .version("0.2.0")
  .addHelpText(
    "after",
    `\nExamples:\n  $ aep-index sync\n  $ aep-index sync -r https://sepolia.base.org --index-path ~/.aep/index\n  $ aep-index embed --index-path ~/.aep/index\n  $ aep-index migrate\n`
  );

program
  .command("sync")
  .description("Incremental sync from chain into local index (and optional x402 probe)")
  .addHelpText(
    "after",
    `\nExamples:\n  $ aep-index sync\n  $ aep-index sync -r https://sepolia.base.org --chain-id 84532 --probe-x402\n`
  )
  .option("-r, --rpc <url>", "JSON-RPC URL", DEFAULT_RPC)
  .option("--index-path <path>", "Index directory", DEFAULT_INDEX_PATH)
  .option("--chain-id <id>", "Chain id (e.g. 84532 Base Sepolia, 8453 Base mainnet)")
  .option("--probe-x402", "Probe x402 on discovered HTTP endpoints")
  .action(async (opts) => {
    const config = loadConfig();
    const rpcUrl = opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC;
    const indexPath = opts.indexPath ?? config.indexPath ?? DEFAULT_INDEX_PATH;
    if (rejectPathTraversal(indexPath)) {
      console.error("Error: invalid index-path (contains '..' or null bytes)");
      process.exit(1);
    }
    const probeX402 = Boolean(opts.probeX402);
    const identityRegistry = (config.identityRegistryAddress ?? IDENTITY_REGISTRY) as Address;
    const reputationRegistry = (config.reputationRegistryAddress ?? REPUTATION_REGISTRY) as Address;

    let chainId: number;
    if (opts.chainId != null && opts.chainId !== "") {
      chainId = parseInt(String(opts.chainId), 10);
    } else {
      chainId = config.chainId ?? DEFAULT_CHAIN_ID;
    }
    if (Number.isNaN(chainId) || chainId <= 0) {
      console.error(
        "Error: invalid chain-id (use e.g. 84532 for Base Sepolia, 8453 for Base mainnet)"
      );
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
  });

program
  .command("embed")
  .description("Rebuild embeddings / search index for providers under index path")
  .addHelpText("after", `\nExamples:\n  $ aep-index embed\n  $ aep-index embed --index-path ~/.aep/index\n`)
  .option("--index-path <path>", "Index directory", DEFAULT_INDEX_PATH)
  .action(async (opts) => {
    const config = loadConfig();
    const indexPath = opts.indexPath ?? config.indexPath ?? DEFAULT_INDEX_PATH;
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
  });

program
  .command("migrate")
  .description("Apply Postgres migrations (requires AEP_INDEX_DATABASE_URL or config indexDatabaseUrl)")
  .addHelpText(
    "after",
    `\nExamples:\n  $ export AEP_INDEX_DATABASE_URL=postgres://...\n  $ aep-index migrate\n`
  )
  .action(async () => {
    if (!getIndexDatabaseUrl()) {
      console.error("Error: set AEP_INDEX_DATABASE_URL or indexDatabaseUrl in config to run migrations");
      process.exit(1);
    }
    try {
      const pool = getPgPool();
      await ensureMigrated(pool);
      await closePgPool();
      console.log("Migrations applied.");
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
  const subcommands = new Set(["sync", "embed", "migrate", "-h", "--help", "-V", "--version"]);
  if (first && !first.startsWith("-") && !subcommands.has(first)) {
    argv = ["sync", ...argv];
  }
  await program.parseAsync(argv, { from: "user" });
}

main();
