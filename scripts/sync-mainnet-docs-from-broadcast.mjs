#!/usr/bin/env node
/**
 * After a Base mainnet forge broadcast, sync:
 * - ~/.aep/config.json (or AEP_CONFIG_PATH) — impl + factory addresses from broadcast, merges account/monitor from existing file
 * - docs/guides/deployment.md — Mainnet live table, read-only smoke loop, operator cheat sheet env vars
 *
 * Reads:
 *   contracts/broadcast/Deploy.s.sol/<chainId>/run-latest.json
 *   contracts/broadcast/DeployRelationships.s.sol/<chainId>/run-latest.json
 *
 * Usage (from repo root):
 *   node scripts/sync-mainnet-docs-from-broadcast.mjs --repo-root . --chain-id 8453 --treasury 0x... --owner 0x... --rpc-url https://...
 *
 * Env (optional): TREASURY, OWNER, BASE_MAINNET_RPC / RPC_URL
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { getAddress, isAddress } from "viem";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENTRYPOINT = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

/** Only patch markdown after this heading so Sepolia tables (same row labels) are untouched. */
const MAINNET_DOCS_ANCHOR = "## Mainnet live addresses and record";
const CANONICAL_MAINNET = {
  chainId: 8453,
  defaultRpc: "https://mainnet.base.org",
  identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
  validationRegistry: "0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

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

function parseArgs(argv) {
  const out = {
    repoRoot: process.cwd(),
    chainId: 8453,
    configPath: join(homedir(), ".aep", "config.json"),
    docsPath: null,
    treasury: process.env.TREASURY?.trim() || process.env.AEP_TREASURY_ADDRESS?.trim(),
    owner: process.env.OWNER?.trim(),
    rpcUrl:
      process.env.BASE_MAINNET_RPC?.trim() ||
      process.env.RPC_URL?.trim() ||
      CANONICAL_MAINNET.defaultRpc,
    dryRun: false,
    skipDocs: false,
    skipConfig: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo-root" && argv[i + 1]) {
      out.repoRoot = resolve(argv[++i]);
    } else if (a === "--chain-id" && argv[i + 1]) {
      out.chainId = parseInt(argv[++i], 10);
    } else if (a === "--config-path" && argv[i + 1]) {
      out.configPath = resolve(argv[++i]);
    } else if (a === "--docs-path" && argv[i + 1]) {
      out.docsPath = resolve(argv[++i]);
    } else if (a === "--treasury" && argv[i + 1]) {
      out.treasury = argv[++i].trim();
    } else if (a === "--owner" && argv[i + 1]) {
      out.owner = argv[++i].trim();
    } else if (a === "--rpc-url" && argv[i + 1]) {
      out.rpcUrl = argv[++i].trim();
    } else if (a === "--dry-run") {
      out.dryRun = true;
    } else if (a === "--skip-docs") {
      out.skipDocs = true;
    } else if (a === "--skip-config") {
      out.skipConfig = true;
    }
  }
  if (!out.docsPath) {
    out.docsPath = join(out.repoRoot, "docs", "guides", "deployment.md");
  }
  return out;
}

function readBroadcast(repoRoot, relPath) {
  const full = join(repoRoot, "contracts", "broadcast", relPath);
  if (!existsSync(full)) {
    throw new Error(`Missing broadcast file: ${full}`);
  }
  return JSON.parse(readFileSync(full, "utf-8"));
}

function collectCreates(data) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const tx of data.transactions || []) {
    if (tx.transactionType === "CREATE" && tx.contractName && tx.contractAddress) {
      out[tx.contractName] = getAddress(tx.contractAddress);
    }
  }
  return out;
}

function gitHead(repoRoot) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

function buildConfigMerge(existing, addresses, opts) {
  const { treasury, owner, rpcUrl } = opts;
  const impl = addresses.AEPAccount;
  const factory = addresses.AEPAccountFactory;
  if (!impl || !factory) {
    throw new Error(
      "Broadcast missing AEPAccount or AEPAccountFactory (expected CREATE txs)"
    );
  }
  const merged = {
    ...(typeof existing === "object" && existing !== null ? existing : {}),
    rpcUrl,
    chainId: CANONICAL_MAINNET.chainId,
    factoryAddress: factory,
    aepAccountFactoryAddress: factory,
    aepAccountImplementationAddress: impl,
    implementationAddress: impl,
    identityRegistryAddress: CANONICAL_MAINNET.identityRegistry,
    reputationRegistryAddress: CANONICAL_MAINNET.reputationRegistry,
    validationRegistryAddress: CANONICAL_MAINNET.validationRegistry,
    entryPointAddress: ENTRYPOINT,
    usdcAddress: CANONICAL_MAINNET.usdc,
    creditFacilityFactoryAddress: addresses.CreditFacilityFactory,
    escrowFactoryAddress: addresses.ConditionalEscrowFactory,
    revenueSplitterFactoryAddress: addresses.RevenueSplitterFactory,
    slaFactoryAddress: addresses.SLAContractFactory,
  };
  if (!merged.indexPath) merged.indexPath = join(homedir(), ".aep", "index");
  if (!merged.graphPath) merged.graphPath = join(homedir(), ".aep", "graph");
  if (!merged.monitor || typeof merged.monitor !== "object") {
    merged.monitor = {
      accounts: [],
      facilities: [],
      slas: [],
      pollIntervalMs: 12000,
      statePath: join(homedir(), ".aep", "monitor"),
    };
  }
  if (treasury && isAddress(treasury)) merged.treasuryAddress = getAddress(treasury);
  if (owner && isAddress(owner)) merged.owner = getAddress(owner);
  return merged;
}

function setTableRow(md, label, cellContent) {
  const re = new RegExp(
    `^(\\| ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| ).*( \\|)$`,
    "m"
  );
  if (!re.test(md)) {
    console.warn("sync: could not find table row for:", label);
    return md;
  }
  return md.replace(re, `$1${cellContent}$2`);
}

function patchDeploymentMd(content, ctx) {
  const {
    fullSha,
    shortSha,
    dateUtc,
    treasury,
    impl,
    factory,
    creditF,
    escrowF,
    splitterF,
    slaF,
    firstAccount,
  } = ctx;

  const i = content.indexOf(MAINNET_DOCS_ANCHOR);
  if (i < 0) {
    throw new Error(`docs missing "${MAINNET_DOCS_ANCHOR}"`);
  }
  const head = content.slice(0, i);
  let md = content.slice(i);

  const commitNote = `\`${fullSha}\` (short: \`${shortSha}\`) — recorded by Foundry in \`contracts/broadcast/Deploy*.s.sol/8453/run-latest.json\` at broadcast. After a history rewrite, \`git rev-parse HEAD\` may differ; treat **broadcast JSON + Basescan** as the address source of truth.`;

  md = setTableRow(md, "Deploy commit (SHA)", commitNote);
  md = setTableRow(md, "Deploy date (UTC)", dateUtc);

  const treasuryCell = treasury
    ? `\`${treasury}\` (deploy-time treasury; set **\`AEP_TREASURY_ADDRESS\`** to a Safe when ready; relationship factories use treasury at deploy time)`
    : "—";
  md = setTableRow(md, "Treasury", treasuryCell);

  const smokeLast = firstAccount || impl;
  const rows = [
    ["AEPAccount implementation", `\`${impl}\``],
    ["AEPAccountFactory", `\`${factory}\``],
    ["CreditFacilityFactory", `\`${creditF}\``],
    ["ConditionalEscrowFactory", `\`${escrowF}\``],
    ["RevenueSplitterFactory", `\`${splitterF}\``],
    ["SLAContractFactory", `\`${slaF}\``],
    [
      "First AEP account (Phase 2.5)",
      firstAccount ? `\`${firstAccount}\`` : "`—` (run Phase 2.5 / `aep deploy`, then re-run this sync)",
    ],
  ];
  for (const [label, cell] of rows) {
    md = setTableRow(md, label, cell);
  }

  // Read-only smoke (inside mainnet doc slice only)
  const lines = md.split("\n");
  const forIdx = lines.findIndex((l) => l.includes("for addr in \\"));
  if (forIdx >= 0) {
    const indent = "  ";
    const block = [
      lines[forIdx],
      `${indent}${impl} \\`,
      `${indent}${factory} \\`,
      `${indent}${creditF} \\`,
      `${indent}${escrowF} \\`,
      `${indent}${splitterF} \\`,
      `${indent}${slaF} \\`,
      `${indent}${smokeLast}; do`,
    ];
    let j = forIdx + 1;
    while (j < lines.length && /^\s*0x[a-fA-F0-9]{40}/.test(lines[j])) {
      j++;
    }
    if (j < lines.length && lines[j].includes("; do")) {
      lines.splice(forIdx, j - forIdx + 1, ...block);
      md = lines.join("\n");
    }
  }

  md = md.replace(/^AEP_IMPL='0x[a-fA-F0-9]{40}'$/m, `AEP_IMPL='${impl}'`);
  md = md.replace(/^FACTORY='0x[a-fA-F0-9]{40}'$/m, `FACTORY='${factory}'`);
  md = md.replace(/^CREDIT_F='0x[a-fA-F0-9]{40}'$/m, `CREDIT_F='${creditF}'`);
  md = md.replace(/^ESCROW_F='0x[a-fA-F0-9]{40}'$/m, `ESCROW_F='${escrowF}'`);
  md = md.replace(/^SPLITTER_F='0x[a-fA-F0-9]{40}'$/m, `SPLITTER_F='${splitterF}'`);
  md = md.replace(/^SLA_F='0x[a-fA-F0-9]{40}'$/m, `SLA_F='${slaF}'`);
  if (firstAccount) {
    md = md.replace(/^FIRST_ACCOUNT='0x[a-fA-F0-9]{40}'$/m, `FIRST_ACCOUNT='${firstAccount}'`);
  }

  return head + md;
}

function main() {
  const opts = parseArgs(process.argv);
  loadDotEnv(opts.repoRoot);

  if (!opts.treasury || !isAddress(opts.treasury)) {
    console.error(
      "sync-mainnet-docs-from-broadcast: set --treasury or TREASURY / AEP_TREASURY_ADDRESS"
    );
    process.exit(1);
  }
  if (!opts.owner || !isAddress(opts.owner)) {
    console.error("sync-mainnet-docs-from-broadcast: set --owner or OWNER");
    process.exit(1);
  }

  opts.treasury = getAddress(opts.treasury);
  opts.owner = getAddress(opts.owner);

  const chainFolder = String(opts.chainId);
  const deploy1 = readBroadcast(
    opts.repoRoot,
    join("Deploy.s.sol", chainFolder, "run-latest.json")
  );
  const deploy2 = readBroadcast(
    opts.repoRoot,
    join("DeployRelationships.s.sol", chainFolder, "run-latest.json")
  );

  const addresses = { ...collectCreates(deploy1), ...collectCreates(deploy2) };

  /** @type {Record<string, unknown>} */
  let existing = {};
  if (existsSync(opts.configPath)) {
    try {
      existing = JSON.parse(readFileSync(opts.configPath, "utf-8"));
    } catch {
      existing = {};
    }
  }

  const merged = buildConfigMerge(existing, addresses, {
    treasury: opts.treasury,
    owner: opts.owner,
    rpcUrl: opts.rpcUrl,
  });

  const fullSha = gitHead(opts.repoRoot) || deploy1.commit || "";
  const shortSha =
    fullSha.length >= 7 ? fullSha.slice(0, 7) : String(deploy1.commit || "").slice(0, 7);
  const dateUtc = new Date().toISOString().slice(0, 10);

  const firstAccount =
    typeof merged.account === "string" && isAddress(merged.account)
      ? getAddress(merged.account)
      : "";

  if (!opts.skipConfig) {
    if (opts.dryRun) {
      console.log("Would write config:", opts.configPath);
      console.log(JSON.stringify(merged, null, 2));
    } else {
      mkdirSync(dirname(opts.configPath), { recursive: true });
      writeFileSync(opts.configPath, JSON.stringify(merged, null, 2) + "\n", "utf-8");
      console.log("Wrote", opts.configPath);
    }
  }

  if (!opts.skipDocs) {
    if (!existsSync(opts.docsPath)) {
      console.error("Missing docs:", opts.docsPath);
      process.exit(1);
    }
    let md = readFileSync(opts.docsPath, "utf-8");
    md = patchDeploymentMd(md, {
      fullSha: fullSha || shortSha,
      shortSha,
      dateUtc,
      treasury: opts.treasury,
      impl: addresses.AEPAccount,
      factory: addresses.AEPAccountFactory,
      creditF: addresses.CreditFacilityFactory,
      escrowF: addresses.ConditionalEscrowFactory,
      splitterF: addresses.RevenueSplitterFactory,
      slaF: addresses.SLAContractFactory,
      firstAccount,
    });
    if (opts.dryRun) {
      console.log("Would patch", opts.docsPath, "(diff omitted; use git diff after run)");
    } else {
      writeFileSync(opts.docsPath, md, "utf-8");
      console.log("Patched", opts.docsPath);
    }
  }

  console.log(
    "Next: pnpm exec aep config validate && pnpm run verify:mainnet-forge && pnpm run verify:mainnet-signoff"
  );
}

main();
