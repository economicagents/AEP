#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createClient, http, isAddress, type Chain } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { getSignerAccount } from "@economicagents/keystore";
import { Mppx, tempo } from "mppx/client";
import {
  createAccount,
  getAccountAddress,
  checkPolicy,
  getDeposit,
  setFrozen,
  getPolicyModules,
  getBudgetPolicyState,
  setBudgetCaps,
  setBudgetCapsFull,
  setRateLimits,
  getReputationSummary,
  setReputationRegistry,
  setMinReputation,
  setIdentityRegistry,
  setUseAllowList,
  setUseAgentAllowList,
  setUseGlobalMinReputation,
  addVerifiedAgent,
  removeVerifiedAgent,
  addToAllowList,
  removeFromAllowList,
  addToBlockList,
  removeFromBlockList,
  addAgentToAllowList,
  clearAgentAllowList,
  execute,
  parseIntent,
  baseSepolia,
  baseMainnet,
  ERC8004_BASE_SEPOLIA,
  ERC8004_BASE_MAINNET,
  USDC_BASE_SEPOLIA,
  USDC_BASE_MAINNET,
  classifyPaywallHeaders,
  interceptMpp402Response,
  resolveTempoChain,
  resolveTempoChainId,
  createCreditFacility,
  getCreditFacilityState,
  creditDeposit,
  creditDraw,
  creditRepay,
  creditFreeze,
  creditUnfreeze,
  creditDeclareDefault,
  creditWithdraw,
  createEscrow,
  getEscrowState,
  escrowFund,
  escrowAcknowledge,
  escrowSubmitForValidation,
  escrowRelease,
  escrowDispute,
  createRevenueSplitter,
  getRevenueSplitterState,
  splitterDistribute,
  createSLA,
  getSLAState,
  slaStake,
  slaDeclareBreach,
  slaUnstake,
  getAccountAnalytics,
  computeCreditScore,
  getRecommendations,
  syncGraph,
  getFleetSummary,
  getFleetAlerts,
  rejectPathTraversal,
  isValidProbeUrl,
} from "@economicagents/sdk";
import { loadProviders, probeX402Endpoint } from "@economicagents/indexer";
import { runMonitor } from "@economicagents/monitor";
import { resolveIntent } from "@economicagents/resolver";

let privateKeyWarningEmitted = false;

async function resolveSigner(opts: {
  privateKey?: string;
  account?: string;
}): Promise<{ account: PrivateKeyAccount; privateKey: `0x${string}` }> {
  // Explicit --private-key override
  if (opts.privateKey) {
    const pk = (opts.privateKey.startsWith("0x")
      ? opts.privateKey
      : `0x${opts.privateKey}`) as `0x${string}`;
    if (
      !privateKeyWarningEmitted &&
      process.env.AEP_SILENCE_PRIVATE_KEY_WARNING !== "1"
    ) {
      console.error(
        "Warning: PRIVATE_KEY in .env is insecure. Prefer: cast wallet import aep --interactive, then set AEP_KEYSTORE_ACCOUNT=aep"
      );
      privateKeyWarningEmitted = true;
    }
    return { account: privateKeyToAccount(pk), privateKey: pk };
  }
  // Prefer keystore, then PRIVATE_KEY (handled by getSignerAccount)
  return getSignerAccount(opts.account);
}

async function requireSigner(opts: {
  privateKey?: string;
  account?: string;
}): Promise<{ account: PrivateKeyAccount; privateKey: `0x${string}` }> {
  try {
    return await resolveSigner(opts);
  } catch (err) {
    console.error(
      "Error: No signer. Recommended: cast wallet import aep --interactive, then set AEP_KEYSTORE_ACCOUNT=aep. Fallback: set PRIVATE_KEY in .env (insecure)."
    );
    process.exit(1);
  }
}

function getConfigPath(): string {
  const env = process.env.AEP_CONFIG_PATH;
  if (env && env.length > 0) return env;
  return join(homedir(), ".aep", "config.json");
}

const CONFIG_PATH = getConfigPath();
const DEFAULT_INDEX_PATH = join(homedir(), ".aep", "index");
const DEFAULT_GRAPH_PATH = join(homedir(), ".aep", "graph");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEFAULT_ENTRYPOINT = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const DEFAULT_RPC =
  process.env.AEP_RPC_URL ?? process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const DEFAULT_CHAIN_ID = parseInt(
  process.env.AEP_CHAIN_ID ?? process.env.BASE_SEPOLIA_CHAIN_ID ?? "84532",
  10
);

interface Config {
  account?: string;
  owner?: string;
  foundryAccount?: string;
  rpcUrl?: string;
  chainId?: number;
  bundlerRpcUrl?: string;
  factoryAddress?: string;
  /** Alias for factoryAddress used by graph package */
  aepAccountFactoryAddress?: string;
  entryPointAddress?: string;
  monitor?: {
    accounts?: string[];
    facilities?: string[];
    slas?: string[];
    webhookUrl?: string;
    pollIntervalMs?: number;
    statePath?: string;
  };
  fleets?: Record<string, { accounts: string[]; name?: string }>;
  identityRegistryAddress?: string;
  reputationRegistryAddress?: string;
  validationRegistryAddress?: string;
  usdcAddress?: string;
  indexPath?: string;
  creditFacilityFactoryAddress?: string;
  escrowFactoryAddress?: string;
  revenueSplitterFactoryAddress?: string;
  slaFactoryAddress?: string;
  /** AEP Treasury address for relationship fees. Env: AEP_TREASURY_ADDRESS */
  treasuryAddress?: string;
  /** Phase 4: Economic graph path. Default ~/.aep/graph */
  graphPath?: string;
  /** Tempo JSON-RPC for MPP client (`aep resolve --api-url`). Env `AEP_TEMPO_RPC_URL` overrides. */
  tempoRpcUrl?: string;
  /** Tempo chain id for MPP (4217 / 42431). Env `AEP_TEMPO_CHAIN_ID` overrides. */
  tempoChainId?: number;
  /** TIP-20 on Tempo (validated if set). Env `AEP_TEMPO_CURRENCY` overrides when server-hosted. */
  tempoCurrency?: string;
  /** TempoStreamChannel escrow (validated if set). Env `AEP_TEMPO_ESCROW_CONTRACT` overrides when server-hosted. */
  tempoEscrowContract?: string;
}

function loadConfig(): Config {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

function validatePath(path: string, name: string): void {
  if (rejectPathTraversal(path)) {
    console.error(`Error: invalid path (${name}) - contains '..' or null bytes`);
    process.exit(1);
  }
}

function requireFactory(factory: string, command: string) {
  if (!factory || factory === ZERO_ADDRESS) {
    console.error(`Error: --factory required for ${command}. Deploy factory first: forge script script/Deploy.s.sol`);
    process.exit(1);
  }
  if (!isAddress(factory)) {
    console.error("Error: invalid factory address");
    process.exit(1);
  }
}

function requireAddress(value: string, name: string) {
  if (!value || !isAddress(value)) {
    console.error(`Error: invalid ${name} address`);
    process.exit(1);
  }
}

function parseWei(value: string, name: string): bigint {
  try {
    const n = BigInt(value);
    if (n < 0n) {
      console.error(`Error: ${name} must be non-negative`);
      process.exit(1);
    }
    return n;
  } catch {
    console.error(`Error: invalid ${name} (expected integer in wei)`);
    process.exit(1);
  }
}

function handleError(err: unknown, context: string): never {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`Error (${context}):`, msg);
  process.exit(1);
}

function saveConfig(config: Config) {
  mkdirSync(join(homedir(), ".aep"), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function cliChainId(config: Config): number {
  return config.chainId ?? DEFAULT_CHAIN_ID;
}

function resolveCliChain(config: Config): Chain {
  const id = cliChainId(config);
  if (id === 8453) return baseMainnet;
  if (id === 84532) return baseSepolia;
  return {
    id,
    name: `Chain ${id}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [] } },
  };
}

function cliPaywallBackend(): "x402" | "mpp" {
  const v = process.env.AEP_PAYWALL_BACKEND?.trim().toLowerCase();
  if (v === "mpp") return "mpp";
  return "x402";
}

/**
 * Managed API resolve: x402 error with guidance, or MPP Tempo session via mppx client.
 */
async function fetchManagedResolve(url: string, init: RequestInit, config: Config): Promise<Response> {
  const first = await fetch(url, init);
  if (first.status !== 402) {
    return first;
  }
  const kind = classifyPaywallHeaders(first.headers);
  const useMpp = cliPaywallBackend() === "mpp" || kind === "mpp";
  if (!useMpp) {
    console.error(
      "Payment required (x402). Use an x402-capable client, use a free API instance, or set AEP_PAYWALL_BACKEND=mpp for MPP/Tempo session paywalls."
    );
    process.exit(1);
  }

  if (config.account && isAddress(config.account)) {
    const intercepted = await interceptMpp402Response(config.account as `0x${string}`, first, {
      rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
      chain: resolveCliChain(config),
    });
    if (intercepted.handled && !intercepted.policyCheck.allowed) {
      console.error(
        `AEP policy declined this payment: ${intercepted.policyCheck.reason ?? "UNKNOWN"}`
      );
      process.exit(1);
    }
  }

  const { account } = await requireSigner({});
  let chainId: number;
  try {
    chainId = resolveTempoChainId({
      envChainId: process.env.AEP_TEMPO_CHAIN_ID,
      fileChainId: config.tempoChainId,
    });
  } catch (e) {
    console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
  const { chain } = resolveTempoChain(chainId);
  const rpcOverride =
    process.env.AEP_TEMPO_RPC_URL?.trim() || config.tempoRpcUrl?.trim();
  const rpcUrl =
    rpcOverride && rpcOverride.length > 0 ? rpcOverride : chain.rpcUrls.default.http[0];
  if (!rpcUrl || rpcUrl.length === 0) {
    console.error(
      "Error: set AEP_TEMPO_RPC_URL or tempoRpcUrl in ~/.aep/config.json for Tempo (MPP paywall)."
    );
    process.exit(1);
  }

  const mppx = Mppx.create({
    methods: [
      tempo({
        account,
        getClient: async ({ chainId: cid }) => {
          const id = cid ?? chainId;
          const { chain: tempoChain } = resolveTempoChain(id);
          return createClient({
            chain: tempoChain,
            transport: http(rpcUrl),
          });
        },
      }),
    ],
    polyfill: false,
  });
  return mppx.fetch(url, init);
}

type Erc8004Bundle = {
  identityRegistry: `0x${string}`;
  reputationRegistry: `0x${string}`;
  validationRegistry: `0x${string}`;
};

function erc8004ForConfig(config: Config): Erc8004Bundle {
  return cliChainId(config) === 8453 ? ERC8004_BASE_MAINNET : ERC8004_BASE_SEPOLIA;
}

function usdcForConfig(config: Config): `0x${string}` {
  return cliChainId(config) === 8453 ? USDC_BASE_MAINNET : USDC_BASE_SEPOLIA;
}

const ADDRESS_FIELDS: (keyof Config)[] = [
  "account",
  "owner",
  "factoryAddress",
  "aepAccountFactoryAddress",
  "entryPointAddress",
  "identityRegistryAddress",
  "reputationRegistryAddress",
  "validationRegistryAddress",
  "usdcAddress",
  "creditFacilityFactoryAddress",
  "escrowFactoryAddress",
  "revenueSplitterFactoryAddress",
  "slaFactoryAddress",
  "treasuryAddress",
  "tempoCurrency",
  "tempoEscrowContract",
];

function validateConfig(config: Config): string[] {
  const errors: string[] = [];

  for (const key of ADDRESS_FIELDS) {
    const value = config[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      errors.push(`${key}: must be string`);
    } else if (!isAddress(value)) {
      errors.push(`${key}: invalid address`);
    }
  }

  const pathsToCheck: { value: string | undefined; name: string }[] = [
    { value: config.indexPath, name: "indexPath" },
    { value: config.graphPath, name: "graphPath" },
    { value: config.monitor?.statePath, name: "monitor.statePath" },
  ];
  for (const { value, name } of pathsToCheck) {
    if (value && rejectPathTraversal(value)) {
      errors.push(`${name}: contains '..' or null bytes`);
    }
  }

  if (config.chainId !== undefined && (typeof config.chainId !== "number" || config.chainId <= 0)) {
    errors.push("chainId: must be positive number (e.g. 84532 Base Sepolia, 8453 Base mainnet)");
  }
  if (config.rpcUrl !== undefined && typeof config.rpcUrl !== "string") {
    errors.push("rpcUrl: must be string");
  }
  if (config.bundlerRpcUrl !== undefined && typeof config.bundlerRpcUrl !== "string") {
    errors.push("bundlerRpcUrl: must be string");
  }
  if (
    config.tempoChainId !== undefined &&
    (typeof config.tempoChainId !== "number" || config.tempoChainId <= 0)
  ) {
    errors.push("tempoChainId: must be positive number (e.g. 4217 Tempo mainnet, 42431 Moderato)");
  }
  if (config.tempoRpcUrl !== undefined && typeof config.tempoRpcUrl !== "string") {
    errors.push("tempoRpcUrl: must be string");
  }

  const mon = config.monitor;
  if (mon) {
    if (mon.pollIntervalMs !== undefined && (typeof mon.pollIntervalMs !== "number" || mon.pollIntervalMs < 0)) {
      errors.push("monitor.pollIntervalMs: must be non-negative number");
    }
    if (mon.webhookUrl !== undefined && mon.webhookUrl !== "") {
      const u = mon.webhookUrl;
      if (typeof u !== "string" || (!u.startsWith("http://") && !u.startsWith("https://"))) {
        errors.push("monitor.webhookUrl: must be http or https URL");
      }
    }
    for (const [arrName, arr] of [
      ["monitor.accounts", mon.accounts],
      ["monitor.facilities", mon.facilities],
      ["monitor.slas", mon.slas],
    ] as const) {
      if (arr && Array.isArray(arr)) {
        for (let i = 0; i < arr.length; i++) {
          if (typeof arr[i] !== "string" || !isAddress(arr[i])) {
            errors.push(`${arrName}[${i}]: invalid address`);
          }
        }
      }
    }
  }

  if (config.fleets && typeof config.fleets === "object") {
    for (const [fleetId, fleet] of Object.entries(config.fleets)) {
      if (!fleet || typeof fleet !== "object" || !Array.isArray(fleet.accounts)) {
        errors.push(`fleets.${fleetId}: must have accounts array`);
      } else {
        for (let i = 0; i < fleet.accounts.length; i++) {
          if (typeof fleet.accounts[i] !== "string" || !isAddress(fleet.accounts[i])) {
            errors.push(`fleets.${fleetId}.accounts[${i}]: invalid address`);
          }
        }
      }
    }
  }

  return errors;
}

const program = new Command();

program
  .name("aep")
  .description("AEP (Agent Economic Protocol) CLI")
  .version("0.1.0");

program
  .command("deploy")
  .description("Deploy a new AEP account")
  .option("-o, --owner <address>", "Owner address (default: derived from signer)")
  .option("-a, --account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-s, --salt <hex>", "CREATE2 salt (default: 0x00...)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .requiredOption("-f, --factory <address>", "Factory address (from forge script script/Deploy.s.sol)")
  .action(async (opts) => {
    requireFactory(opts.factory, "deploy");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.account ?? opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const pk = signer.privateKey;
    const owner = (opts.owner ?? signer.account.address) as string;
    requireAddress(owner, "owner");
    const salt = (opts.salt ?? `0x${"0".repeat(64)}`) as `0x${string}`;
    const chainConfig = loadConfig();

    try {
      const { account, txHash } = await createAccount({
        owner: owner as `0x${string}`,
        salt,
        privateKey: pk,
        rpcUrl: opts.rpc,
        chain: resolveCliChain(chainConfig),
        factoryAddress: opts.factory as `0x${string}`,
        entryPointAddress: DEFAULT_ENTRYPOINT as `0x${string}`,
      });

      const config = loadConfig();
      const erc = erc8004ForConfig(chainConfig);
      config.account = account;
      config.owner = owner;
      config.rpcUrl = opts.rpc;
      config.factoryAddress = opts.factory;
      config.entryPointAddress = DEFAULT_ENTRYPOINT;
      config.chainId = cliChainId(chainConfig);
      config.identityRegistryAddress = erc.identityRegistry;
      config.reputationRegistryAddress = erc.reputationRegistry;
      config.validationRegistryAddress = erc.validationRegistry;
      config.usdcAddress = usdcForConfig(chainConfig);
      config.treasuryAddress = owner;
      saveConfig(config);

      console.log("Account deployed:", account);
      console.log("Tx hash:", txHash);
    } catch (err) {
      handleError(err, "deploy");
    }
  });

program
  .command("address")
  .description("Get predicted account address")
  .option("-o, --owner <address>", "Owner address (default: derived from signer)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-s, --salt <hex>", "CREATE2 salt", `0x${"0".repeat(64)}`)
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .requiredOption("-f, --factory <address>", "Factory address")
  .action(async (opts) => {
    requireFactory(opts.factory, "address");
    let owner: string | undefined = opts.owner;
    if (!owner) {
      try {
        const signer = await resolveSigner({
          privateKey: opts.privateKey,
          account: opts.account ?? opts.keystoreAccount ?? loadConfig().foundryAccount,
        });
        owner = signer.account.address;
      } catch {
        console.error("Error: --owner or signer (AEP_KEYSTORE_ACCOUNT/PRIVATE_KEY) required");
        process.exit(1);
      }
    }
    requireAddress(owner, "owner");
    try {
      const address = await getAccountAddress(
        owner as `0x${string}`,
        opts.salt as `0x${string}`,
        {
          factoryAddress: opts.factory as `0x${string}`,
          rpcUrl: opts.rpc,
          chain: resolveCliChain(loadConfig()),
        }
      );
      console.log(address);
    } catch (err) {
      handleError(err, "address");
    }
  });

program
  .command("config validate")
  .description("Validate ~/.aep/config.json (format, paths, addresses)")
  .action(() => {
    if (!existsSync(CONFIG_PATH)) {
      console.log("Config file not found (ok if using defaults)");
      return;
    }
    let config: Config;
    try {
      config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Config;
    } catch {
      console.error("Config file is not valid JSON");
      process.exit(1);
    }
    const errors = validateConfig(config);
    if (errors.length > 0) {
      console.error("Config validation failed:");
      errors.forEach((e) => console.error("  -", e));
      process.exit(1);
    }
    console.log("Config valid");
  });

program
  .command("balance")
  .description("Get account deposit (EntryPoint balance)")
  .option("-a, --account <address>", "Account address (or from config)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    const config = loadConfig();
    const account = (opts.account ?? config.account) as `0x${string}` | undefined;
    if (!account) {
      console.error("Error: --account or deploy first to set config");
      process.exit(1);
    }
    requireAddress(account, "account");

    try {
      const balance = await getDeposit(account, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Deposit:", balance.toString(), "wei");
    } catch (err) {
      handleError(err, "balance");
    }
  });

program
  .command("check-policy")
  .description("Check if payment would pass policy (for x402)")
  .requiredOption("-a, --amount <wei>", "Payment amount in wei/smallest unit")
  .requiredOption("-t, --to <address>", "Recipient address")
  .option("-c, --account <address>", "Account address (or from config)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    const config = loadConfig();
    const account = (opts.account ?? config.account) as `0x${string}` | undefined;
    if (!account) {
      console.error("Error: --account or deploy first to set config");
      process.exit(1);
    }
    requireAddress(account, "account");
    requireAddress(opts.to, "recipient");
    const amount = parseWei(opts.amount, "amount");

    try {
      const allowed = await checkPolicy(
        account,
        amount,
        opts.to as `0x${string}`,
        {
          rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
          chain: resolveCliChain(config),
        }
      );
      console.log(allowed ? "Allowed" : "Denied");
      process.exit(allowed ? 0 : 1);
    } catch (err) {
      handleError(err, "check-policy");
    }
  });

program
  .command("freeze")
  .description("Freeze account (blocks all operations)")
  .option("-a, --account <address>", "Account address (or from config)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    const config = loadConfig();
    const account = (opts.account ?? config.account) as `0x${string}` | undefined;
    if (!account) {
      console.error("Error: --account or deploy first to set config");
      process.exit(1);
    }
    requireAddress(account, "account");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? config.foundryAccount,
    });

    try {
      const hash = await setFrozen(account, true, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Account frozen. Tx:", hash);
    } catch (err) {
      handleError(err, "freeze");
    }
  });

program
  .command("unfreeze")
  .description("Unfreeze account")
  .option("-a, --account <address>", "Account address (or from config)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    const config = loadConfig();
    const account = (opts.account ?? config.account) as `0x${string}` | undefined;
    if (!account) {
      console.error("Error: --account or deploy first to set config");
      process.exit(1);
    }
    requireAddress(account, "account");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? config.foundryAccount,
    });

    try {
      const hash = await setFrozen(account, false, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Account unfrozen. Tx:", hash);
    } catch (err) {
      handleError(err, "unfreeze");
    }
  });

program
  .command("modules")
  .description("List policy module addresses for an account")
  .option("-a, --account <address>", "Account address (or from config)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    const config = loadConfig();
    const account = (opts.account ?? config.account) as `0x${string}` | undefined;
    if (!account) {
      console.error("Error: --account or deploy first to set config");
      process.exit(1);
    }
    requireAddress(account, "account");

    try {
      const modules = await getPolicyModules(account, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      modules.forEach((m: string, i: number) => console.log(`${i}: ${m}`));
    } catch (err) {
      handleError(err, "modules");
    }
  });

program
  .command("policy-get")
  .description("Get BudgetPolicy state (caps and spend)")
  .requiredOption("-m, --module <address>", "BudgetPolicy module address (from aep modules)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.module, "module");

    try {
      const state = await getBudgetPolicyState(opts.module as `0x${string}`, {
        rpcUrl: opts.rpc ?? loadConfig().rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(loadConfig()),
      });
      console.log("maxPerTx:", state.maxPerTx.toString());
      console.log("maxDaily:", state.maxDaily.toString());
      console.log("maxWeekly:", state.maxWeekly.toString());
      console.log("maxPerTask:", state.maxPerTask.toString());
      console.log("taskWindowSeconds:", state.taskWindowSeconds.toString());
      console.log("dailyWindowSeconds:", state.dailyWindowSeconds.toString());
      console.log("weeklyWindowSeconds:", state.weeklyWindowSeconds.toString());
      console.log("spentDaily:", state.spentDaily.toString());
      console.log("spentWeekly:", state.spentWeekly.toString());
      console.log("spentInTask:", state.spentInTask.toString());
    } catch (err) {
      handleError(err, "policy-get");
    }
  });

program
  .command("policy-set")
  .description("Set BudgetPolicy caps (owner only)")
  .requiredOption("-m, --module <address>", "BudgetPolicy module address (from aep modules)")
  .option("--max-per-tx <wei>", "Max per transaction (0 = unlimited)", "0")
  .option("--max-daily <wei>", "Max daily spend (0 = unlimited)", "0")
  .option("--max-weekly <wei>", "Max weekly spend (0 = unlimited)", "0")
  .option("--max-per-task <wei>", "Max per task (0 = disabled)", "0")
  .option("--task-window <seconds>", "Task window in seconds (0 = disabled)", "0")
  .option("--daily-window <seconds>", "Daily window in seconds (0 = 86400)", "0")
  .option("--weekly-window <seconds>", "Weekly window in seconds (0 = 604800)", "0")
  .option("--full", "Use setCapsFull (set all params including per-task and windows)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.module, "module");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;

    const maxPerTx = parseWei(opts.maxPerTx, "max-per-tx");
    const maxDaily = parseWei(opts.maxDaily, "max-daily");
    const maxWeekly = parseWei(opts.maxWeekly, "max-weekly");

    const config = loadConfig();
    try {
      if (opts.full) {
        const maxPerTask = parseWei(opts.maxPerTask ?? "0", "max-per-task");
        const taskWindowSeconds = parseWei(opts.taskWindow ?? "0", "task-window");
        const dailyWindowSeconds = parseWei(opts.dailyWindow ?? "0", "daily-window");
        const weeklyWindowSeconds = parseWei(opts.weeklyWindow ?? "0", "weekly-window");
        const hash = await setBudgetCapsFull(
          opts.module as `0x${string}`,
          {
            maxPerTx,
            maxDaily,
            maxWeekly,
            maxPerTask,
            taskWindowSeconds,
            dailyWindowSeconds,
            weeklyWindowSeconds,
          },
          {
            privateKey,
            rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
            chain: resolveCliChain(config),
          }
        );
        console.log("Policy updated (full). Tx:", hash);
      } else {
        const hash = await setBudgetCaps(
          opts.module as `0x${string}`,
          { maxPerTx, maxDaily, maxWeekly },
          {
            privateKey,
            rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
            chain: resolveCliChain(config),
          }
        );
        console.log("Policy updated. Tx:", hash);
      }
    } catch (err) {
      handleError(err, "policy-set");
    }
  });

const rateLimitCmd = program
  .command("rate-limit")
  .description("RateLimitPolicy configuration (max tx per window)");

rateLimitCmd
  .command("set")
  .description("Set RateLimitPolicy limits (owner only)")
  .requiredOption("-m, --module <address>", "RateLimitPolicy module address (from aep modules)")
  .requiredOption("--max-tx <n>", "Max transactions per window (0 = unlimited)")
  .requiredOption("--window-seconds <s>", "Window length in seconds")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.module, "module");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const maxTx = BigInt(opts.maxTx);
    const windowSeconds = BigInt(opts.windowSeconds);
    const config = loadConfig();
    try {
      const hash = await setRateLimits(
        opts.module as `0x${string}`,
        { maxTxPerWindow: maxTx, windowSeconds },
        {
          privateKey: signer.privateKey,
          rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
          chain: resolveCliChain(config),
        }
      );
      console.log("Rate limit updated. Tx:", hash);
    } catch (err) {
      handleError(err, "rate-limit set");
    }
  });

const counterparty = program
  .command("counterparty")
  .description("CounterpartyPolicy configuration (ERC-8004 allowlist, min-reputation)");

counterparty
  .command("set-reputation-registry")
  .description("Set reputation registry address on CounterpartyPolicy")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .requiredOption("--registry <address>", "ReputationRegistry address")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.module, "module");
    requireAddress(opts.registry, "registry");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await setReputationRegistry(
        opts.module as `0x${string}`,
        opts.registry as `0x${string}`,
        {
          privateKey: signer.privateKey,
          rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
          chain: resolveCliChain(config),
        }
      );
      console.log("Reputation registry set. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty set-reputation-registry");
    }
  });

counterparty
  .command("set-min-reputation")
  .description("Set min-reputation threshold (0 decimals = disabled)")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .requiredOption("--min <value>", "Minimum reputation value (int128)")
  .requiredOption("--decimals <n>", "Decimal places (0 = disabled)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.module, "module");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const min = (() => {
      try {
        return BigInt(opts.min);
      } catch {
        console.error("Error: invalid --min (expected integer)");
        process.exit(1);
      }
    })();
    const decimals = parseInt(opts.decimals, 10);
    if (isNaN(decimals) || decimals < 0 || decimals > 18) {
      console.error("Error: --decimals must be 0-18");
      process.exit(1);
    }
    const config = loadConfig();
    try {
      const hash = await setMinReputation(
        opts.module as `0x${string}`,
        min,
        decimals,
        {
          privateKey: signer.privateKey,
          rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
          chain: resolveCliChain(config),
        }
      );
      console.log("Min reputation set. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty set-min-reputation");
    }
  });

counterparty
  .command("set-identity-registry")
  .description("Set identity registry address on CounterpartyPolicy")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .requiredOption("--registry <address>", "IdentityRegistry address")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.module, "module");
    requireAddress(opts.registry, "registry");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await setIdentityRegistry(
        opts.module as `0x${string}`,
        opts.registry as `0x${string}`,
        {
          privateKey: signer.privateKey,
          rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
          chain: resolveCliChain(config),
        }
      );
      console.log("Identity registry set. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty set-identity-registry");
    }
  });

counterparty
  .command("add-allow <address>")
  .description("Add address to allow list")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (address, opts) => {
    requireAddress(opts.module, "module");
    requireAddress(address, "address");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await addToAllowList(opts.module as `0x${string}`, address as `0x${string}`, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Added to allow list. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty add-allow");
    }
  });

counterparty
  .command("remove-allow <address>")
  .description("Remove address from allow list")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (address, opts) => {
    requireAddress(opts.module, "module");
    requireAddress(address, "address");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await removeFromAllowList(opts.module as `0x${string}`, address as `0x${string}`, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Removed from allow list. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty remove-allow");
    }
  });

counterparty
  .command("add-block <address>")
  .description("Add address to block list")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (address, opts) => {
    requireAddress(opts.module, "module");
    requireAddress(address, "address");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await addToBlockList(opts.module as `0x${string}`, address as `0x${string}`, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Added to block list. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty add-block");
    }
  });

counterparty
  .command("remove-block <address>")
  .description("Remove address from block list")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (address, opts) => {
    requireAddress(opts.module, "module");
    requireAddress(address, "address");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await removeFromBlockList(opts.module as `0x${string}`, address as `0x${string}`, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Removed from block list. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty remove-block");
    }
  });

counterparty
  .command("add-agent-allow <agentId>")
  .description("Add agent ID to agent allow list")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (agentId, opts) => {
    requireAddress(opts.module, "module");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const id = BigInt(agentId);
    const config = loadConfig();
    try {
      const hash = await addAgentToAllowList(opts.module as `0x${string}`, id, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Added agent to allow list. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty add-agent-allow");
    }
  });

counterparty
  .command("clear-agent-allow")
  .description("Clear agent allow list")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.module, "module");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await clearAgentAllowList(opts.module as `0x${string}`, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Agent allow list cleared. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty clear-agent-allow");
    }
  });

counterparty
  .command("set-use-allow-list <true|false>")
  .description("Enable or disable address allow list")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (value, opts) => {
    requireAddress(opts.module, "module");
    const use = value === "true";
    if (value !== "true" && value !== "false") {
      console.error("Error: value must be true or false");
      process.exit(1);
    }
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await setUseAllowList(opts.module as `0x${string}`, use, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Use allow list set. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty set-use-allow-list");
    }
  });

counterparty
  .command("set-use-agent-allow-list <true|false>")
  .description("Enable or disable agent allow list")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (value, opts) => {
    requireAddress(opts.module, "module");
    const use = value === "true";
    if (value !== "true" && value !== "false") {
      console.error("Error: value must be true or false");
      process.exit(1);
    }
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await setUseAgentAllowList(opts.module as `0x${string}`, use, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Use agent allow list set. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty set-use-agent-allow-list");
    }
  });

counterparty
  .command("set-use-global-min-reputation <true|false>")
  .description("Enable or disable global min-reputation (verified agents only)")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (value, opts) => {
    requireAddress(opts.module, "module");
    const use = value === "true";
    if (value !== "true" && value !== "false") {
      console.error("Error: value must be true or false");
      process.exit(1);
    }
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await setUseGlobalMinReputation(opts.module as `0x${string}`, use, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Use global min-reputation set. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty set-use-global-min-reputation");
    }
  });

counterparty
  .command("add-verified-agent <agentId>")
  .description("Add agent to verified set (for global min-reputation)")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (agentIdStr, opts) => {
    requireAddress(opts.module, "module");
    const agentId = BigInt(agentIdStr);
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await addVerifiedAgent(opts.module as `0x${string}`, agentId, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Added verified agent. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty add-verified-agent");
    }
  });

counterparty
  .command("remove-verified-agent <wallet>")
  .description("Remove wallet from verified set")
  .requiredOption("-m, --module <address>", "CounterpartyPolicy module address (from aep modules)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (wallet, opts) => {
    requireAddress(opts.module, "module");
    requireAddress(wallet, "wallet");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const config = loadConfig();
    try {
      const hash = await removeVerifiedAgent(opts.module as `0x${string}`, wallet as `0x${string}`, {
        privateKey: signer.privateKey,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("Removed verified agent. Tx:", hash);
    } catch (err) {
      handleError(err, "counterparty remove-verified-agent");
    }
  });

program
  .command("execute")
  .description("Build, sign, and submit UserOp via bundler (execute call)")
  .requiredOption("-t, --to <address>", "Recipient address")
  .option("-v, --value <wei>", "Value in wei", "0")
  .option("-d, --data <hex>", "Calldata (0x-prefixed hex)", "0x")
  .option("-a, --account <address>", "Account address (or from config)")
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("-b, --bundler <url>", "Bundler RPC URL (required)")
  .action(async (opts) => {
    const config = loadConfig();
    const account = (opts.account ?? config.account) as `0x${string}` | undefined;
    if (!account) {
      console.error("Error: --account or deploy first to set config");
      process.exit(1);
    }
    requireAddress(account, "account");
    requireAddress(opts.to, "recipient");
    const bundlerUrl = opts.bundler ?? config.bundlerRpcUrl;
    if (!bundlerUrl) {
      console.error("Error: --bundler or bundlerRpcUrl in config required");
      process.exit(1);
    }
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? config.foundryAccount,
    });
    const value = parseWei(opts.value, "value");
    const data = (opts.data?.startsWith("0x") ? opts.data : `0x${opts.data}`) as `0x${string}`;

    try {
      const hash = await execute(
        [{ to: opts.to as `0x${string}`, value, data }],
        {
          account,
          privateKey: signer.privateKey,
          rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
          bundlerRpcUrl: bundlerUrl,
          entryPointAddress: (config.entryPointAddress ?? DEFAULT_ENTRYPOINT) as `0x${string}`,
          chain: resolveCliChain(config),
        }
      );
      console.log("UserOp hash:", hash);
    } catch (err) {
      handleError(err, "execute");
    }
  });

program
  .command("resolve")
  .description("Resolve intent to execution plan (provider list)")
  .requiredOption("-c, --capability <string>", "Capability description (e.g. image classification)")
  .option("--max-per-unit <usd>", "Max price per unit in USD", "999999")
  .option("--max-total <usd>", "Max total budget in USD", "999999")
  .option("--min-reputation <0-1>", "Minimum reputation score", parseFloat)
  .option("--index-path <path>", "Path to provider index", DEFAULT_INDEX_PATH)
  .option("--api-url <url>", "Call managed API instead of local resolver (x402 or MPP when paywalled)")
  .option("--premium", "Use /resolve/premium endpoint ($0.02) when --api-url is set")
  .action(async (opts) => {
    const config = loadConfig();
    const intent = parseIntent({
      capability: opts.capability,
      budget: {
        max_per_unit: opts.maxPerUnit ?? "999999",
        max_total: opts.maxTotal ?? "999999",
        currency: "USDC",
      },
      trust: opts.minReputation != null ? { min_reputation: opts.minReputation } : undefined,
    });
    try {
      if (opts.apiUrl) {
        const baseUrl = String(opts.apiUrl).replace(/\/$/, "");
        const path = opts.premium ? "resolve/premium" : "resolve";
        const url = `${baseUrl}/${path}`;
        const indexPath = opts.indexPath ?? config.indexPath ?? DEFAULT_INDEX_PATH;
        const graphPathResolve = config.graphPath ?? DEFAULT_GRAPH_PATH;
        validatePath(indexPath, "index-path");
        if (config.graphPath) validatePath(graphPathResolve, "graphPath");
        const params = new URLSearchParams();
        if (indexPath !== DEFAULT_INDEX_PATH) params.set("indexPath", indexPath);
        if (config.account && isAddress(config.account)) params.set("accountAddress", config.account);
        if (config.graphPath) params.set("graphPath", graphPathResolve);
        const query = params.toString() ? `?${params.toString()}` : "";
        const target = `${url}${query}`;
        const init: RequestInit = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(intent),
        };
        const res = await fetchManagedResolve(target, init, config);
        if (!res.ok) {
          const body = await res.text();
          let msg = res.statusText;
          if (body) {
            try {
              const parsed = JSON.parse(body);
              msg = parsed.error ?? body;
            } catch {
              msg = body;
            }
          }
          console.error("Error (resolve):", msg);
          process.exit(1);
        }
        const plan = await res.json();
        console.log(JSON.stringify(plan, null, 2));
      } else {
        const indexPath = opts.indexPath ?? config.indexPath ?? DEFAULT_INDEX_PATH;
        const graphPath = config.graphPath ?? DEFAULT_GRAPH_PATH;
        validatePath(indexPath, "index-path");
        validatePath(graphPath, "graphPath");
        const plan = await resolveIntent(intent, {
          indexPath,
          accountAddress:
            config.account && isAddress(config.account) ? (config.account as `0x${string}`) : undefined,
          graphPath,
        });
        console.log(JSON.stringify(plan, null, 2));
      }
    } catch (err) {
      handleError(err, "resolve");
    }
  });

program
  .command("provider probe")
  .description("Probe paid HTTP endpoint — x402 or MPP (on-demand health check)")
  .argument("[url]", "x402 endpoint URL to probe")
  .option("--agent-id <id>", "Agent ID (lookup URL from index)")
  .option("--index-path <path>", "Path to provider index (for --agent-id)", DEFAULT_INDEX_PATH)
  .action(async (urlArg, opts) => {
    const config = loadConfig();
    const url = urlArg as string | undefined;
    const agentId = opts.agentId;
    if (!url && !agentId) {
      console.error("Error: provide URL or --agent-id");
      process.exit(1);
    }
    if (url && agentId) {
      console.error("Error: provide URL or --agent-id, not both");
      process.exit(1);
    }
    let targetUrl: string;
    if (url) {
      const allowPrivate = process.env.AEP_PROBE_ALLOW_PRIVATE !== "false";
      if (!isValidProbeUrl(url, allowPrivate)) {
        console.error(
          "Error: invalid URL (use http/https; set AEP_PROBE_ALLOW_PRIVATE=false to reject private IPs)"
        );
        process.exit(1);
      }
      targetUrl = url;
    } else {
      const indexPath = opts.indexPath ?? config.indexPath ?? DEFAULT_INDEX_PATH;
      validatePath(indexPath, "index-path");
      const providers = loadProviders(indexPath);
      const id = BigInt(agentId);
      const provider = providers.find((p) => p.agentId === id);
      if (!provider) {
        console.error(`Error: agent ${agentId} not found in index. Run aep-index sync first.`);
        process.exit(1);
      }
      const httpEndpoint = provider.services.find(
        (s) =>
          (s.name === "web" || s.name === "MCP" || s.name === "OASF") &&
          (s.endpoint.startsWith("http://") || s.endpoint.startsWith("https://"))
      )?.endpoint;
      if (!httpEndpoint) {
        console.error(`Error: no HTTP endpoint for agent ${agentId}`);
        process.exit(1);
      }
      targetUrl = httpEndpoint;
    }
    try {
      const result = await probeX402Endpoint(targetUrl);
      const out = {
        success: result.success,
        paymentKind: result.paymentKind,
        price: result.price?.toString(),
        latencyMs: result.latencyMs,
        paymentTo: result.paymentTo,
      };
      console.log(JSON.stringify(out, null, 2));
    } catch (err) {
      handleError(err, "provider probe");
    }
  });

program
  .command("monitor")
  .description("Run on-chain event monitor (security alerts)")
  .option("--state-path <path>", "State storage path", join(homedir(), ".aep", "monitor"))
  .action(async (opts) => {
    const config = loadConfig();
    const monitorCfg = config.monitor ?? ({} as { accounts?: string[]; facilities?: string[]; slas?: string[]; webhookUrl?: string; pollIntervalMs?: number });
    const accounts = (
      (monitorCfg.accounts?.length ? monitorCfg.accounts : null) ??
      (config.account ? [config.account] : [])
    ) as `0x${string}`[];
    const facilities = (monitorCfg.facilities ?? []) as `0x${string}`[];
    const slas = (monitorCfg.slas ?? []) as `0x${string}`[];
    if (accounts.length === 0 && facilities.length === 0 && slas.length === 0) {
      console.error("Error: Set monitor.accounts, monitor.facilities, or monitor.slas in ~/.aep/config.json");
      process.exit(1);
    }
    const statePath = opts.statePath ?? config.monitor?.statePath ?? join(homedir(), ".aep", "monitor");
    validatePath(statePath, "state-path");
    const chainId =
      config.chainId ?? DEFAULT_CHAIN_ID;
    try {
      await runMonitor({
        rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
        chainId,
        entryPointAddress: (config.entryPointAddress ?? "0x0000000071727De22E5E9d8BAf0edAc6f37da032") as `0x${string}`,
        accounts,
        facilities,
        slas,
        webhookUrl: monitorCfg.webhookUrl,
        pollIntervalMs: monitorCfg.pollIntervalMs,
        statePath,
      });
    } catch (err) {
      handleError(err, "monitor");
    }
  });

program
  .command("graph sync")
  .description("Phase 4: Sync economic graph (payments, credit events)")
  .option("--graph-path <path>", "Graph storage path", DEFAULT_GRAPH_PATH)
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    const config = loadConfig();
    const graphPath = opts.graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    validatePath(graphPath, "graph-path");
    const factoryAddress = config.factoryAddress;
    if (!factoryAddress) {
      console.error("Error: factoryAddress in config required (deploy factory first)");
      process.exit(1);
    }
    const chainId =
      config.chainId ?? DEFAULT_CHAIN_ID;
    try {
      const result = await syncGraph({
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chainId,
        graphPath,
        aepAccountFactoryAddress: factoryAddress as `0x${string}`,
        entryPointAddress: (config.entryPointAddress ?? "0x0000000071727De22E5E9d8BAf0edAc6f37da032") as `0x${string}`,
        creditFacilityFactoryAddress: config.creditFacilityFactoryAddress as `0x${string}` | undefined,
        escrowFactoryAddress: config.escrowFactoryAddress as `0x${string}` | undefined,
        revenueSplitterFactoryAddress: config.revenueSplitterFactoryAddress as `0x${string}` | undefined,
        slaFactoryAddress: config.slaFactoryAddress as `0x${string}` | undefined,
        usdcAddress: usdcForConfig(config),
      });
      console.log(
        `Graph sync: accounts=${result.accountsAdded} payments=${result.paymentsAdded} ` +
          `userOps=${result.userOpsAdded} credit=${result.creditEventsAdded} ` +
          `escrow=${result.escrowEventsAdded} splitter=${result.splitterEventsAdded}`
      );
    } catch (err) {
      handleError(err, "graph sync");
    }
  });

program
  .command("analytics <address>")
  .description("Phase 4: Get account analytics (P&L, spend patterns)")
  .option("--graph-path <path>", "Graph storage path", DEFAULT_GRAPH_PATH)
  .action(async (address, opts) => {
    const config = loadConfig();
    const graphPath = opts.graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    validatePath(graphPath, "graph-path");
    requireAddress(address, "address");
    try {
      const analytics = getAccountAnalytics(graphPath, address);
      if (!analytics) {
        console.error("No analytics for address (run 'aep graph sync' first)");
        process.exit(1);
      }
      console.log(JSON.stringify(analytics, null, 2));
    } catch (err) {
      handleError(err, "analytics");
    }
  });

program
  .command("credit-score <address>")
  .description("Phase 4: Get credit score for an account")
  .option("--graph-path <path>", "Graph storage path", DEFAULT_GRAPH_PATH)
  .action(async (address, opts) => {
    const config = loadConfig();
    const graphPath = opts.graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    validatePath(graphPath, "graph-path");
    requireAddress(address, "address");
    try {
      const result = computeCreditScore(graphPath, address);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      handleError(err, "credit-score");
    }
  });

program
  .command("recommendations <address>")
  .description("Phase 4: Get provider recommendations (collaborative filtering)")
  .option("--graph-path <path>", "Graph storage path", DEFAULT_GRAPH_PATH)
  .option("--index-path <path>", "Provider index path", DEFAULT_INDEX_PATH)
  .option("--capability <string>", "Filter by capability")
  .option("--limit <n>", "Max recommendations", "5")
  .action(async (address, opts) => {
    const config = loadConfig();
    const graphPath = opts.graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    const indexPath = opts.indexPath ?? config.indexPath ?? DEFAULT_INDEX_PATH;
    validatePath(graphPath, "graph-path");
    validatePath(indexPath, "index-path");
    requireAddress(address, "address");
    try {
      const providers = loadProviders(indexPath);
      const recs = getRecommendations(
        graphPath,
        providers,
        address,
        opts.capability,
        parseInt(opts.limit ?? "5", 10)
      );
      console.log(
        JSON.stringify(
          recs.map((r) => ({ ...r, agentId: r.agentId.toString() })),
          null,
          2
        )
      );
    } catch (err) {
      handleError(err, "recommendations");
    }
  });

const fleetCmd = program
  .command("fleet")
  .description("Fleet management (multiple accounts)");

fleetCmd
  .command("list")
  .description("List configured fleets")
  .action(() => {
    const config = loadConfig();
    const fleets = config.fleets ?? {};
    const ids = Object.keys(fleets);
    if (ids.length === 0) {
      console.log("No fleets configured. Add fleets to ~/.aep/config.json");
      return;
    }
    for (const id of ids) {
      const f = fleets[id];
      console.log(`${id}: ${f?.accounts?.length ?? 0} accounts${f?.name ? ` (${f.name})` : ""}`);
    }
  });

fleetCmd
  .command("summary <id>")
  .description("Get fleet summary (aggregate analytics)")
  .option("--graph-path <path>", "Graph storage path", DEFAULT_GRAPH_PATH)
  .action(async (id, opts) => {
    const config = loadConfig();
    const fleets = config.fleets ?? {};
    const fleet = fleets[id];
    if (!fleet || !fleet.accounts?.length) {
      console.error(`Error: Fleet ${id} not found`);
      process.exit(1);
    }
    const graphPath = opts.graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    validatePath(graphPath, "graph-path");
    try {
      const summary = getFleetSummary(graphPath, fleet.accounts);
      console.log(JSON.stringify(summary, null, 2));
    } catch (err) {
      handleError(err, "fleet summary");
    }
  });

fleetCmd
  .command("alerts <id>")
  .description("Get fleet alerts (on-chain security events)")
  .option("--graph-path <path>", "Graph storage path", DEFAULT_GRAPH_PATH)
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--from-block <n>", "From block (default: toBlock - 50000)")
  .option("--to-block <n>", "To block (default: latest)")
  .action(async (id, opts) => {
    const config = loadConfig();
    const fleets = config.fleets ?? {};
    const fleet = fleets[id];
    if (!fleet || !fleet.accounts?.length) {
      console.error(`Error: Fleet ${id} not found`);
      process.exit(1);
    }
    const graphPath = opts.graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    const rpcUrl = opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC;
    validatePath(graphPath, "graph-path");
    const chainId =
      config.chainId ?? DEFAULT_CHAIN_ID;
    const options: { fromBlock?: number; toBlock?: number; chainId?: number } = {
      chainId,
    };
    if (opts.fromBlock != null) {
      const n = parseInt(String(opts.fromBlock), 10);
      if (!Number.isNaN(n) && n >= 0) options.fromBlock = n;
    }
    if (opts.toBlock != null) {
      const n = parseInt(String(opts.toBlock), 10);
      if (!Number.isNaN(n) && n >= 0) options.toBlock = n;
    }
    try {
      const alerts = await getFleetAlerts(graphPath, rpcUrl, fleet.accounts, options);
      console.log(JSON.stringify({ alerts }, null, 2));
    } catch (err) {
      handleError(err, "fleet alerts");
    }
  });

fleetCmd
  .command("freeze <id>")
  .description("Freeze all accounts in fleet (requires PRIVATE_KEY, owner of all accounts)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (id, opts) => {
    const config = loadConfig();
    const fleets = config.fleets ?? {};
    const fleet = fleets[id];
    if (!fleet || !fleet.accounts?.length) {
      console.error(`Error: Fleet ${id} not found`);
      process.exit(1);
    }
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    const rpcUrl = opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC;
    for (const account of fleet.accounts) {
      requireAddress(account, "account");
      try {
        const hash = await setFrozen(account as `0x${string}`, true, {
          privateKey,
          rpcUrl,
          chain: resolveCliChain(config),
        });
        console.log(`Frozen ${account}: ${hash}`);
      } catch (err) {
        console.error(`Failed to freeze ${account}:`, err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    }
    console.log(`Fleet ${id}: all ${fleet.accounts.length} accounts frozen`);
  });

counterparty
  .command("reputation-summary")
  .description("Get reputation summary for an agent")
  .requiredOption("--agent-id <id>", "Agent ID (ERC-8004 tokenId)")
  .option("--registry <address>", "ReputationRegistry address (default: canonical for config chain)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    const config = loadConfig();
    const registry = (opts.registry ?? erc8004ForConfig(config).reputationRegistry) as string;
    requireAddress(registry, "registry");
    const agentId = BigInt(opts.agentId);
    try {
      const summary = await getReputationSummary(agentId, {
        reputationRegistryAddress: registry as `0x${string}`,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log("count:", summary.count.toString());
      console.log("summaryValue:", summary.summaryValue.toString());
      console.log("summaryValueDecimals:", summary.summaryValueDecimals);
    } catch (err) {
      handleError(err, "counterparty reputation-summary");
    }
  });

const credit = program
  .command("credit")
  .description("Phase 3: Credit facility (lender/borrower)");

credit
  .command("create")
  .description("Create a credit facility")
  .requiredOption("--lender <address>", "Lender address")
  .requiredOption("--borrower <address>", "Borrower address")
  .requiredOption("--limit <amount>", "Credit limit (6 decimals)")
  .requiredOption("--min-reputation <0-100>", "Minimum reputation score", parseFloat)
  .requiredOption("--borrower-agent-id <id>", "Borrower ERC-8004 agent ID")
  .option("--token <address>", "Token address (default: USDC for config chain)")
  .option("--repayment-interval <seconds>", "Repayment interval (0 = 30 days)", "0")
  .option("--origination-fee <amount>", "Origination fee in token (6 decimals). Lender pays. 0 = no fee", "0")
  .option("--factory <address>", "CreditFacilityFactory address (or from config)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    const config = loadConfig();
    const factory = config.creditFacilityFactoryAddress ?? opts.factory;
    if (!factory) {
      console.error("Error: --factory or creditFacilityFactoryAddress in config required");
      process.exit(1);
    }
    const erc = erc8004ForConfig(config);
    const token = (opts.token ?? usdcForConfig(config)) as string;
    requireAddress(opts.lender, "lender");
    requireAddress(opts.borrower, "borrower");
    requireAddress(token, "token");
    requireAddress(factory, "factory");
    if (opts.minReputation < 0 || opts.minReputation > 100) {
      console.error("Error: min-reputation must be 0-100");
      process.exit(1);
    }
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const { facility, txHash } = await createCreditFacility({
        lender: opts.lender as `0x${string}`,
        borrower: opts.borrower as `0x${string}`,
        token: token as `0x${string}`,
        limit: parseWei(opts.limit, "limit"),
        minReputation: Math.floor(opts.minReputation),
        repaymentInterval: parseInt(opts.repaymentInterval, 10),
        reputationRegistry: erc.reputationRegistry,
        identityRegistry: erc.identityRegistry,
        borrowerAgentId: BigInt(opts.borrowerAgentId),
        factoryAddress: factory as `0x${string}`,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        originationFee: parseWei(opts.originationFee ?? "0", "origination-fee"),
        chain: resolveCliChain(config),
      });
      console.log("Facility:", facility);
      console.log("Tx:", txHash);
    } catch (err) {
      handleError(err, "credit create");
    }
  });

credit
  .command("deposit")
  .description("Lender deposits into facility")
  .requiredOption("-f, --facility <address>", "Credit facility address")
  .requiredOption("-a, --amount <amount>", "Amount (6 decimals)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.facility, "facility");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await creditDeposit(opts.facility as `0x${string}`, parseWei(opts.amount, "amount"), {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "credit deposit");
    }
  });

credit
  .command("draw")
  .description("Borrower draws from facility")
  .requiredOption("-f, --facility <address>", "Credit facility address")
  .requiredOption("-a, --amount <amount>", "Amount (6 decimals)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.facility, "facility");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await creditDraw(opts.facility as `0x${string}`, parseWei(opts.amount, "amount"), {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "credit draw");
    }
  });

credit
  .command("repay")
  .description("Borrower repays facility")
  .requiredOption("-f, --facility <address>", "Credit facility address")
  .requiredOption("-a, --amount <amount>", "Amount (6 decimals)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.facility, "facility");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await creditRepay(opts.facility as `0x${string}`, parseWei(opts.amount, "amount"), {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "credit repay");
    }
  });

credit
  .command("freeze")
  .description("Lender freezes facility")
  .requiredOption("-f, --facility <address>", "Credit facility address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.facility, "facility");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await creditFreeze(opts.facility as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "credit freeze");
    }
  });

credit
  .command("unfreeze")
  .description("Lender unfreezes facility")
  .requiredOption("-f, --facility <address>", "Credit facility address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.facility, "facility");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await creditUnfreeze(opts.facility as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "credit unfreeze");
    }
  });

credit
  .command("default")
  .description("Declare facility default (after repayment deadline)")
  .requiredOption("-f, --facility <address>", "Credit facility address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.facility, "facility");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await creditDeclareDefault(opts.facility as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "credit default");
    }
  });

credit
  .command("state")
  .description("Get credit facility state")
  .requiredOption("-f, --facility <address>", "Credit facility address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.facility, "facility");
    const config = loadConfig();
    try {
      const state = await getCreditFacilityState(opts.facility as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log(JSON.stringify({
        limit: state.limit.toString(),
        drawn: state.drawn.toString(),
        balance: state.balance.toString(),
        frozen: state.frozen,
        defaulted: state.defaulted,
        repaymentDeadline: state.repaymentDeadline.toString(),
      }, null, 2));
    } catch (err) {
      handleError(err, "credit state");
    }
  });

credit
  .command("withdraw")
  .description("Lender withdraws excess funds (only when drawn == 0)")
  .requiredOption("-f, --facility <address>", "Credit facility address")
  .requiredOption("-a, --amount <amount>", "Amount (6 decimals)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.facility, "facility");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await creditWithdraw(opts.facility as `0x${string}`, parseWei(opts.amount, "amount"), {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "credit withdraw");
    }
  });

const escrow = program
  .command("escrow")
  .description("Phase 3: Conditional escrow");

escrow
  .command("create")
  .description("Create an escrow (single-amount or multi-milestone)")
  .requiredOption("--consumer <address>", "Consumer address")
  .requiredOption("--provider <address>", "Provider address")
  .requiredOption("--provider-agent-id <id>", "Provider ERC-8004 agent ID")
  .requiredOption("--validator <address>", "Validator address")
  .option("--token <address>", "Token address (default: USDC for config chain)")
  .option("--release-threshold <0-100>", "Release threshold", "80")
  .option("--milestone-amounts <amounts>", "Comma-separated milestone amounts (6 decimals). E.g. 100000000,200000000,300000000")
  .option("--setup-fee <amount>", "Setup fee in token (6 decimals). Caller pays. 0 = no fee", "0")
  .option("--factory <address>", "ConditionalEscrowFactory address (or from config)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.consumer, "consumer");
    requireAddress(opts.provider, "provider");
    requireAddress(opts.validator, "validator");
    const config = loadConfig();
    const erc = erc8004ForConfig(config);
    const token = (opts.token ?? usdcForConfig(config)) as string;
    requireAddress(token, "token");
    const releaseThreshold = parseInt(opts.releaseThreshold, 10);
    if (releaseThreshold < 0 || releaseThreshold > 100) {
      console.error("Error: release-threshold must be 0-100");
      process.exit(1);
    }
    const factory = config.escrowFactoryAddress ?? opts.factory;
    if (!factory) {
      console.error("Error: --factory or escrowFactoryAddress in config required");
      process.exit(1);
    }
    requireAddress(factory, "factory");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    const milestoneAmounts =
      opts.milestoneAmounts != null && String(opts.milestoneAmounts).trim()
        ? String(opts.milestoneAmounts)
            .split(",")
            .map((s) => parseWei(s.trim(), "milestone"))
        : [];
    try {
      const { escrow: escrowAddr, txHash } = await createEscrow({
        consumer: opts.consumer as `0x${string}`,
        provider: opts.provider as `0x${string}`,
        providerAgentId: BigInt(opts.providerAgentId),
        token: token as `0x${string}`,
        validationRegistry: erc.validationRegistry,
        validatorAddress: opts.validator as `0x${string}`,
        releaseThreshold,
        factoryAddress: factory as `0x${string}`,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        setupFee: parseWei(opts.setupFee ?? "0", "setup-fee"),
        milestoneAmounts,
        chain: resolveCliChain(config),
      });
      console.log("Escrow:", escrowAddr);
      console.log("Tx:", txHash);
    } catch (err) {
      handleError(err, "escrow create");
    }
  });

escrow
  .command("fund")
  .description("Consumer funds escrow")
  .requiredOption("-e, --escrow <address>", "Escrow address")
  .requiredOption("-a, --amount <amount>", "Amount (6 decimals)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.escrow, "escrow");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await escrowFund(opts.escrow as `0x${string}`, parseWei(opts.amount, "amount"), {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "escrow fund");
    }
  });

escrow
  .command("acknowledge")
  .description("Provider acknowledges escrow")
  .requiredOption("-e, --escrow <address>", "Escrow address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.escrow, "escrow");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await escrowAcknowledge(opts.escrow as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "escrow acknowledge");
    }
  });

escrow
  .command("submit-validation")
  .description("Provider submits for validation")
  .requiredOption("-e, --escrow <address>", "Escrow address")
  .requiredOption("--request-hash <hash>", "Validation request hash (0x...)")
  .option("--milestone-index <n>", "Milestone index (0 for legacy single-amount)", "0")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.escrow, "escrow");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    const milestoneIndex = parseInt(opts.milestoneIndex ?? "0", 10);
    if (milestoneIndex < 0) {
      console.error("Error: milestone-index must be >= 0");
      process.exit(1);
    }
    try {
      const hash = await escrowSubmitForValidation(
        opts.escrow as `0x${string}`,
        opts.requestHash as `0x${string}`,
        {
          rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
          privateKey,
          milestoneIndex,
          chain: resolveCliChain(config),
        }
      );
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "escrow submit-validation");
    }
  });

escrow
  .command("release")
  .description("Release escrow to provider (after validation passes)")
  .requiredOption("-e, --escrow <address>", "Escrow address")
  .option("--milestone-index <n>", "Milestone index to release (0 for legacy single-amount)", "0")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.escrow, "escrow");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    const milestoneIndex = parseInt(opts.milestoneIndex ?? "0", 10);
    if (milestoneIndex < 0) {
      console.error("Error: milestone-index must be >= 0");
      process.exit(1);
    }
    try {
      const hash = await escrowRelease(opts.escrow as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        milestoneIndex,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "escrow release");
    }
  });

escrow
  .command("dispute")
  .description("Consumer disputes escrow")
  .requiredOption("-e, --escrow <address>", "Escrow address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.escrow, "escrow");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await escrowDispute(opts.escrow as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "escrow dispute");
    }
  });

escrow
  .command("state")
  .description("Get escrow state")
  .requiredOption("-e, --escrow <address>", "Escrow address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.escrow, "escrow");
    const config = loadConfig();
    try {
      const state = await getEscrowState(opts.escrow as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      const stateNames = ["FUNDED", "IN_PROGRESS", "VALIDATING", "RELEASED", "DISPUTED"];
      console.log(JSON.stringify({
        state: stateNames[state.state] ?? state.state,
        amount: state.amount.toString(),
        requestHash: state.requestHash,
      }, null, 2));
    } catch (err) {
      handleError(err, "escrow state");
    }
  });

const splitter = program
  .command("splitter")
  .description("Phase 3: Revenue splitter");

splitter
  .command("create")
  .description("Create a revenue splitter")
  .requiredOption("--recipients <addr,addr,...>", "Recipient addresses (comma-separated)")
  .requiredOption("--weights <n,n,...>", "Weights in basis points (sum=10000)")
  .option("--token <address>", "Token address (default: USDC for config chain)")
  .option("--factory <address>", "RevenueSplitterFactory address (or from config)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    const config = loadConfig();
    const token = (opts.token ?? usdcForConfig(config)) as string;
    requireAddress(token, "token");
    const factory = config.revenueSplitterFactoryAddress ?? opts.factory;
    if (!factory) {
      console.error("Error: --factory or revenueSplitterFactoryAddress in config required");
      process.exit(1);
    }
    requireAddress(factory, "factory");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    const recipients = opts.recipients.split(",").map((s: string) => s.trim()) as `0x${string}`[];
    const weights = opts.weights.split(",").map((s: string) => parseInt(s.trim(), 10));
    if (recipients.length !== weights.length || recipients.length === 0) {
      console.error("Error: recipients and weights must have same non-zero length");
      process.exit(1);
    }
    recipients.forEach((r, i) => requireAddress(r, `recipient ${i}`));
    const weightSum = weights.reduce((a: number, b: number) => a + b, 0);
    if (weightSum !== 10000) {
      console.error("Error: weights must sum to 10000 (basis points)");
      process.exit(1);
    }
    try {
      const { splitter: splitterAddr, txHash } = await createRevenueSplitter({
        recipients,
        weights,
        token: token as `0x${string}`,
        factoryAddress: factory as `0x${string}`,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Splitter:", splitterAddr);
      console.log("Tx:", txHash);
    } catch (err) {
      handleError(err, "splitter create");
    }
  });

splitter
  .command("distribute")
  .description("Distribute revenue to recipients")
  .requiredOption("-s, --splitter <address>", "Revenue splitter address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.splitter, "splitter");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await splitterDistribute(opts.splitter as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "splitter distribute");
    }
  });

splitter
  .command("state")
  .description("Get splitter state")
  .requiredOption("-s, --splitter <address>", "Revenue splitter address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.splitter, "splitter");
    const config = loadConfig();
    try {
      const state = await getRevenueSplitterState(opts.splitter as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log(JSON.stringify({
        recipients: state.recipients,
        weights: state.weights.map((w) => w.toString()),
        balance: state.balance.toString(),
      }, null, 2));
    } catch (err) {
      handleError(err, "splitter state");
    }
  });

const sla = program
  .command("sla")
  .description("Phase 3: SLA contract");

sla
  .command("create")
  .description("Create an SLA contract")
  .requiredOption("--provider <address>", "Provider address")
  .requiredOption("--consumer <address>", "Consumer address")
  .requiredOption("--provider-agent-id <id>", "Provider ERC-8004 agent ID")
  .requiredOption("--stake-amount <amount>", "Stake amount (6 decimals)")
  .option("--token <address>", "Stake token address (default: USDC for config chain)")
  .option("--breach-threshold <0-100>", "Breach if validation < this", "80")
  .option("--setup-fee <amount>", "Setup fee in stake token (6 decimals). Caller pays. 0 = no fee", "0")
  .option("--factory <address>", "SLAContractFactory address (or from config)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.provider, "provider");
    requireAddress(opts.consumer, "consumer");
    const config = loadConfig();
    const erc = erc8004ForConfig(config);
    const stakeToken = (opts.token ?? usdcForConfig(config)) as string;
    requireAddress(stakeToken, "token");
    const breachThreshold = parseInt(opts.breachThreshold, 10);
    if (breachThreshold < 0 || breachThreshold > 100) {
      console.error("Error: breach-threshold must be 0-100");
      process.exit(1);
    }
    const factory = config.slaFactoryAddress ?? opts.factory;
    if (!factory) {
      console.error("Error: --factory or slaFactoryAddress in config required");
      process.exit(1);
    }
    requireAddress(factory, "factory");
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const { sla: slaAddr, txHash } = await createSLA({
        provider: opts.provider as `0x${string}`,
        consumer: opts.consumer as `0x${string}`,
        providerAgentId: BigInt(opts.providerAgentId),
        stakeToken: stakeToken as `0x${string}`,
        stakeAmount: parseWei(opts.stakeAmount, "stakeAmount"),
        validationRegistry: erc.validationRegistry,
        breachThreshold,
        factoryAddress: factory as `0x${string}`,
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        setupFee: parseWei(opts.setupFee ?? "0", "setup-fee"),
        chain: resolveCliChain(config),
      });
      console.log("SLA:", slaAddr);
      console.log("Tx:", txHash);
    } catch (err) {
      handleError(err, "sla create");
    }
  });

sla
  .command("stake")
  .description("Provider stakes")
  .requiredOption("-s, --sla <address>", "SLA contract address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.sla, "sla");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await slaStake(opts.sla as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "sla stake");
    }
  });

sla
  .command("breach")
  .description("Consumer declares breach")
  .requiredOption("-s, --sla <address>", "SLA contract address")
  .requiredOption("--request-hash <hash>", "Validation request hash (0x...)")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.sla, "sla");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await slaDeclareBreach(
        opts.sla as `0x${string}`,
        opts.requestHash as `0x${string}`,
        {
          rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
          privateKey,
          chain: resolveCliChain(config),
        }
      );
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "sla breach");
    }
  });

sla
  .command("unstake")
  .description("Provider unstakes")
  .requiredOption("-s, --sla <address>", "SLA contract address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .option("--keystore-account <name>", "Foundry keystore account (env: AEP_KEYSTORE_ACCOUNT)")
  .option("-k, --private-key <key>", "Private key (env: PRIVATE_KEY; fallback, insecure)")
  .action(async (opts) => {
    requireAddress(opts.sla, "sla");
    const config = loadConfig();
    const signer = await requireSigner({
      privateKey: opts.privateKey,
      account: opts.keystoreAccount ?? loadConfig().foundryAccount,
    });
    const privateKey = signer.privateKey;
    try {
      const hash = await slaUnstake(opts.sla as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        privateKey,
        chain: resolveCliChain(config),
      });
      console.log("Tx:", hash);
    } catch (err) {
      handleError(err, "sla unstake");
    }
  });

sla
  .command("state")
  .description("Get SLA state")
  .requiredOption("-s, --sla <address>", "SLA contract address")
  .option("-r, --rpc <url>", "RPC URL", DEFAULT_RPC)
  .action(async (opts) => {
    requireAddress(opts.sla, "sla");
    const config = loadConfig();
    try {
      const state = await getSLAState(opts.sla as `0x${string}`, {
        rpcUrl: opts.rpc ?? config.rpcUrl ?? DEFAULT_RPC,
        chain: resolveCliChain(config),
      });
      console.log(JSON.stringify({
        staked: state.staked,
        breached: state.breached,
        balance: state.balance.toString(),
      }, null, 2));
    } catch (err) {
      handleError(err, "sla state");
    }
  });

program.parse();
