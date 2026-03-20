#!/usr/bin/env node
/** Base mainnet (8453): forge verify-contract for all AEP addresses in ~/.aep/config.json. Needs ETHERSCAN_API_KEY (loads repo .env). */
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CONTRACTS = join(REPO_ROOT, "contracts");

const CONFIG_PATH =
  process.env.AEP_CONFIG_PATH ?? join(homedir(), ".aep", "config.json");

const ENTRYPOINT = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const k = m[1];
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function run(cwd, cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function castAbiEncode(sig, ...values) {
  const r = spawnSync("cast", ["abi-encode", sig, ...values], {
    encoding: "utf-8",
    cwd: CONTRACTS,
  });
  if (r.status !== 0) {
    console.error(r.stderr || "cast abi-encode failed");
    process.exit(1);
  }
  return r.stdout.trim();
}

function main() {
  loadEnvFile(join(REPO_ROOT, ".env"));
  if (!process.env.ETHERSCAN_API_KEY?.trim()) {
    console.error("Missing ETHERSCAN_API_KEY (repo .env or env).");
    process.exit(1);
  }
  if (!existsSync(CONFIG_PATH)) {
    console.error(`Missing ${CONFIG_PATH}`);
    process.exit(1);
  }
  const cfg = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  if (cfg.chainId !== 8453) {
    console.error(`Expected config.chainId 8453, got ${cfg.chainId}`);
    process.exit(1);
  }

  const impl =
    cfg.aepAccountImplementationAddress ?? cfg.implementationAddress;
  const factory = cfg.factoryAddress ?? cfg.aepAccountFactoryAddress;
  const credit = cfg.creditFacilityFactoryAddress;
  const escrow = cfg.escrowFactoryAddress;
  const splitter = cfg.revenueSplitterFactoryAddress;
  const sla = cfg.slaFactoryAddress;
  const treasury = cfg.treasuryAddress;

  for (const [name, addr] of [
    ["aepAccountImplementationAddress", impl],
    ["factory", factory],
    ["creditFacilityFactory", credit],
    ["escrowFactory", escrow],
    ["revenueSplitterFactory", splitter],
    ["slaFactory", sla],
  ]) {
    if (!addr || typeof addr !== "string") {
      console.error(`Missing config field for ${name}`);
      process.exit(1);
    }
  }
  if (!treasury) {
    console.error("Missing config.treasuryAddress");
    process.exit(1);
  }

  const ver = (label, contractPath, addr, constructorArgsHex) => {
    console.log(`\n>>> ${label}`);
    const args = [
      "verify-contract",
      addr,
      contractPath,
      "--chain",
      "base",
    ];
    if (constructorArgsHex) {
      args.push("--constructor-args", constructorArgsHex);
    }
    run(CONTRACTS, "forge", args);
  };

  ver(
    "AEPAccount (impl)",
    "src/AEPAccount.sol:AEPAccount",
    impl,
    castAbiEncode("constructor(address)", ENTRYPOINT),
  );
  ver(
    "AEPAccountFactory",
    "src/AEPAccountFactory.sol:AEPAccountFactory",
    factory,
    castAbiEncode("constructor(address,address)", ENTRYPOINT, impl),
  );
  ver(
    "CreditFacilityFactory",
    "src/relationships/CreditFacilityFactory.sol:CreditFacilityFactory",
    credit,
    castAbiEncode("constructor(address)", treasury),
  );
  ver(
    "ConditionalEscrowFactory",
    "src/relationships/ConditionalEscrowFactory.sol:ConditionalEscrowFactory",
    escrow,
    castAbiEncode("constructor(address)", treasury),
  );
  ver(
    "RevenueSplitterFactory",
    "src/relationships/RevenueSplitterFactory.sol:RevenueSplitterFactory",
    splitter,
    null,
  );
  ver(
    "SLAContractFactory",
    "src/relationships/SLAContractFactory.sol:SLAContractFactory",
    sla,
    castAbiEncode("constructor(address)", treasury),
  );

  console.log("\nDone. When Basescan finishes indexing: pnpm run verify:mainnet-signoff");
}

main();
