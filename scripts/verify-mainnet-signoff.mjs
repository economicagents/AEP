#!/usr/bin/env node
/**
 * Mainnet sign-off automation: treasury/factory checks (logs "M1"), bytecode + Etherscan API v2 source (logs "M3").
 * Those M1/M3 strings are script output only — not roadmap labels used elsewhere.
 * Explorer: https://api.etherscan.io/v2/api?chainid=8453 (not api.basescan.org — deprecated V1).
 */
import { createPublicClient, http, getAddress, isAddress } from "viem";
import { base } from "viem/chains";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const CONFIG_PATH =
  process.env.AEP_CONFIG_PATH ?? join(homedir(), ".aep", "config.json");

const TREASURY_ABI = [
  {
    type: "function",
    name: "treasury",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address", name: "" }],
  },
];

function loadDotEnv(repoRoot) {
  const p = join(repoRoot, ".env");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const k = m[1];
    const v = m[2].trim().replace(/^["']|["']$/g, "");
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function explorerVerifiedContract(address, apiKey) {
  const url = new URL("https://api.etherscan.io/v2/api");
  url.searchParams.set("chainid", "8453");
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", getAddress(address));
  url.searchParams.set("apikey", apiKey);
  const res = await fetch(url);
  if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
  const data = await res.json();
  const msgOk = data.status === "1" || String(data.message).toLowerCase() === "ok";
  if (!msgOk) return { ok: false, detail: String(data.result ?? data.message ?? "API error") };
  const row = Array.isArray(data.result) ? data.result[0] : data.result;
  const src = row?.SourceCode;
  const name = row?.ContractName ?? "";
  const ok = typeof src === "string" && src.length > 2 && name.length > 0;
  return { ok, detail: ok ? name : "not verified" };
}

async function main() {
  loadDotEnv(REPO_ROOT);

  const apiKey = (process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "").trim();
  if (!apiKey) die("Set ETHERSCAN_API_KEY (or BASESCAN_API_KEY) for Etherscan source checks.");

  if (!existsSync(CONFIG_PATH)) die(`Missing config: ${CONFIG_PATH}`);

  let envRpc = process.env.BASE_MAINNET_RPC?.trim();
  if (!envRpc && existsSync(join(REPO_ROOT, ".env"))) {
    const raw = readFileSync(join(REPO_ROOT, ".env"), "utf-8");
    const m = raw.match(/^\s*BASE_MAINNET_RPC=(.+)$/m);
    if (m) envRpc = m[1].trim().replace(/^["']|["']$/g, "");
  }

  const cfg = loadJson(CONFIG_PATH);
  const rpcUrl = envRpc || cfg.rpcUrl;
  if (!rpcUrl || typeof rpcUrl !== "string") die("Set BASE_MAINNET_RPC or config.rpcUrl");

  if (cfg.chainId !== 8453) {
    console.warn(`Warning: config.chainId is ${cfg.chainId}, expected 8453.`);
  }

  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
  if ((await client.getChainId()) !== 8453) die(`RPC is not Base mainnet (8453).`);

  const treasuryExpected = cfg.treasuryAddress;
  const ownerExpected = cfg.owner;
  if (!treasuryExpected || !isAddress(treasuryExpected)) die("config.treasuryAddress missing or invalid");
  if (!ownerExpected || !isAddress(ownerExpected)) die("config.owner missing or invalid");
  const tr = getAddress(treasuryExpected);
  const ow = getAddress(ownerExpected);
  if (tr !== ow) {
    die(`Treasury sign-off: treasuryAddress (${tr}) must equal owner (${ow}).`);
  }

  const feeFactories = [
    { label: "CreditFacilityFactory", address: cfg.creditFacilityFactoryAddress },
    { label: "ConditionalEscrowFactory", address: cfg.escrowFactoryAddress },
    { label: "SLAContractFactory", address: cfg.slaFactoryAddress },
  ];

  console.log("=== M1 Treasury (viem) ===\n");
  for (const { label, address } of feeFactories) {
    if (!address || !isAddress(address)) die(`${label}: invalid address in config`);
    const onChain = await client.readContract({
      address: getAddress(address),
      abi: TREASURY_ABI,
      functionName: "treasury",
    });
    if (getAddress(onChain) !== tr) die(`${label} treasury mismatch`);
    console.log(`OK ${label}`);
  }
  console.log(`\nM1 OK — treasury ${tr}\n`);

  const rows = [
    { label: "AEPAccount impl", address: cfg.aepAccountImplementationAddress ?? cfg.implementationAddress },
    { label: "AEPAccountFactory", address: cfg.factoryAddress ?? cfg.aepAccountFactoryAddress },
    { label: "CreditFacilityFactory", address: cfg.creditFacilityFactoryAddress },
    { label: "ConditionalEscrowFactory", address: cfg.escrowFactoryAddress },
    { label: "RevenueSplitterFactory", address: cfg.revenueSplitterFactoryAddress },
    { label: "SLAContractFactory", address: cfg.slaFactoryAddress },
  ].filter((x) => x.address && isAddress(x.address));

  if (cfg.account && isAddress(cfg.account)) {
    rows.push({ label: "First AEP account (proxy)", address: cfg.account });
  }

  const proxyBytecodeMax = 512;

  console.log("=== M3 Bytecode (viem) ===\n");
  const withCode = [];
  for (const row of rows) {
    const code = await client.getCode({ address: getAddress(row.address) });
    if (!code || code === "0x") die(`${row.label}: no code at ${getAddress(row.address)}`);
    const byteLen = (code.length - 2) / 2;
    console.log(`OK ${row.label}: ${byteLen} bytes`);
    withCode.push({ ...row, byteLen });
  }

  console.log("\n=== M3 Source (Etherscan API v2, chain 8453) ===\n");
  let failed = false;
  let apiCalls = 0;
  for (const { label, address, byteLen } of withCode) {
    if (byteLen <= proxyBytecodeMax) {
      console.log(`SKIP ${label} (${byteLen} B proxy)`);
      continue;
    }
    if (apiCalls++ > 0) await sleep(400);
    const r = await explorerVerifiedContract(address, apiKey);
    if (r.ok) console.log(`OK ${label}: ${r.detail}`);
    else {
      console.error(`FAIL ${label}: ${r.detail}`);
      failed = true;
    }
  }

  if (failed) {
    console.error("\nRun pnpm run verify:mainnet-forge if needed, wait for Basescan, retry.");
    process.exit(1);
  }
  console.log("\nM3 OK — verified source indexed for Base.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
