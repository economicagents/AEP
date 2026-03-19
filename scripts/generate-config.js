#!/usr/bin/env node
/**
 * AEP config.json generator for Base Sepolia.
 * Reads addresses from env vars or JSON file, outputs complete config to stdout.
 *
 * Env vars:
 *   AEP_ACCOUNT_FACTORY, CREDIT_FACILITY_FACTORY, ESCROW_FACTORY,
 *   REVENUE_SPLITTER_FACTORY, SLA_FACTORY, RPC_URL, TREASURY, OWNER (or derived from PRIVATE_KEY)
 *
 * Or: --from-json <path> to read addresses from a JSON file.
 *
 * Usage:
 *   AEP_ACCOUNT_FACTORY=0x... CREDIT_FACILITY_FACTORY=0x... ... node generate-config.js
 *   node generate-config.js --from-json deployment.json
 */

const { readFileSync, existsSync } = require("fs");
const { execFileSync } = require("child_process");
const { join } = require("path");
const { homedir } = require("os");

const AEP_DIR = join(homedir(), ".aep");

const CANONICAL = {
  entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  baseSepolia: {
    chainId: 84532,
    rpc: "https://sepolia.base.org",
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
    validationRegistry: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  baseMainnet: {
    chainId: 8453,
    rpc: "https://mainnet.base.org",
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
    validationRegistry: "0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
};

function loadAddresses() {
  const fromJson = process.argv.indexOf("--from-json");
  if (fromJson >= 0 && process.argv[fromJson + 1]) {
    const path = process.argv[fromJson + 1];
    if (!existsSync(path)) {
      console.error(`Error: file not found: ${path}`);
      process.exit(1);
    }
    return JSON.parse(readFileSync(path, "utf-8"));
  }

  const factory = process.env.AEP_ACCOUNT_FACTORY ?? process.env.factoryAddress;
  return {
    factoryAddress: factory,
    aepAccountFactoryAddress: factory ?? process.env.AEP_ACCOUNT_FACTORY,
    creditFacilityFactoryAddress:
      process.env.CREDIT_FACILITY_FACTORY ?? process.env.creditFacilityFactoryAddress,
    escrowFactoryAddress:
      process.env.ESCROW_FACTORY ?? process.env.escrowFactoryAddress,
    revenueSplitterFactoryAddress:
      process.env.REVENUE_SPLITTER_FACTORY ??
      process.env.revenueSplitterFactoryAddress,
    slaFactoryAddress: process.env.SLA_FACTORY ?? process.env.slaFactoryAddress,
    rpcUrl: process.env.RPC_URL ?? process.env.rpcUrl,
    treasuryAddress: process.env.TREASURY ?? process.env.treasuryAddress,
    owner: (() => {
      if (process.env.OWNER) return process.env.OWNER;
      if (process.env.owner) return process.env.owner;
      if (process.env.PRIVATE_KEY) {
        try {
          return execFileSync("cast", ["wallet", "address", "--private-key", process.env.PRIVATE_KEY], {
            encoding: "utf-8",
          }).trim();
        } catch {
          return undefined;
        }
      }
      return undefined;
    })(),
  };
}

function buildConfig(addr) {
  const factory = addr.factoryAddress ?? addr.aepAccountFactoryAddress;
  if (!factory) {
    console.error("Error: factoryAddress or AEP_ACCOUNT_FACTORY required");
    process.exit(1);
  }

  const chainId = parseInt(process.env.CHAIN_ID ?? addr.chainId ?? "84532", 10);
  const chain =
    chainId === 8453 ? CANONICAL.baseMainnet : CANONICAL.baseSepolia;

  const config = {
    rpcUrl: addr.rpcUrl ?? chain.rpc,
    chainId,
    factoryAddress: factory,
    aepAccountFactoryAddress: factory,
    identityRegistryAddress: chain.identityRegistry,
    reputationRegistryAddress: chain.reputationRegistry,
    validationRegistryAddress: chain.validationRegistry,
    entryPointAddress: CANONICAL.entryPoint,
    usdcAddress: chain.usdc,
    indexPath: process.env.AEP_INDEX_PATH ?? join(AEP_DIR, "index"),
    graphPath: process.env.AEP_GRAPH_PATH ?? join(AEP_DIR, "graph"),
    monitor: {
      accounts: [],
      facilities: [],
      slas: [],
      pollIntervalMs: 12000,
      statePath: process.env.AEP_MONITOR_STATE ?? join(AEP_DIR, "monitor"),
    },
  };

  if (addr.creditFacilityFactoryAddress)
    config.creditFacilityFactoryAddress = addr.creditFacilityFactoryAddress;
  if (addr.escrowFactoryAddress)
    config.escrowFactoryAddress = addr.escrowFactoryAddress;
  if (addr.revenueSplitterFactoryAddress)
    config.revenueSplitterFactoryAddress = addr.revenueSplitterFactoryAddress;
  if (addr.slaFactoryAddress) config.slaFactoryAddress = addr.slaFactoryAddress;
  if (addr.treasuryAddress) config.treasuryAddress = addr.treasuryAddress;
  if (addr.owner) config.owner = addr.owner;

  return config;
}

const addresses = loadAddresses();
const config = buildConfig(addresses);
console.log(JSON.stringify(config, null, 2));
