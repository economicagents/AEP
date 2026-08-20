#!/usr/bin/env node
/**
 * x402 → policy check → UserOp (demo)
 *
 * Uses published @economicagents/cli on npm (pin 0.2.0 — registry as of Aug 2026).
 * Read-only policy check runs against a public Base Sepolia account; execute is optional.
 *
 * Usage:
 *   node run.mjs
 *   RECIPIENT=0x... AMOUNT_WEI=1000000 node run.mjs
 *   BUNDLER_RPC_URL=https://... PRIVATE_KEY=0x... node run.mjs --execute
 */

import { spawnSync } from "node:child_process";

const CLI_PKG = process.env.AEP_CLI_PKG ?? "@economicagents/cli@0.2.0";
const RPC = process.env.AEP_RPC_URL ?? "https://sepolia.base.org";
const FACTORY = process.env.AEP_FACTORY ?? "0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546";

/** Public demo account on Base Sepolia (see docs/guides/deployment.md). */
const DEMO_ACCOUNT =
  process.env.AEP_ACCOUNT ?? "0x13A053aAAfa68807dfeD8FAe82C6242429D24A15";

const RECIPIENT =
  process.env.RECIPIENT ?? "0x0000000000000000000000000000000000000001";
const AMOUNT_WEI = process.env.AMOUNT_WEI ?? "1000000";

const shouldExecute = process.argv.includes("--execute");

function runAep(args) {
  const result = spawnSync("npx", ["-y", CLI_PKG, ...args], {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });
  const out = (result.stdout ?? "") + (result.stderr ?? "");
  if (out.trim()) process.stdout.write(out.endsWith("\n") ? out : out + "\n");
  return result.status ?? 1;
}

console.log("=== AEP x402 → policy check → UserOp ===\n");
console.log(`CLI: npx ${CLI_PKG}`);
console.log(`RPC: ${RPC}`);
console.log(`Factory: ${FACTORY}`);
console.log(`Demo account: ${DEMO_ACCOUNT}`);
console.log(`Simulated x402 payment: ${AMOUNT_WEI} wei → ${RECIPIENT}\n`);

console.log("Step 1 — x402 intercept (documented headers)");
console.log("  Payment-Amount:", AMOUNT_WEI);
console.log("  Payment-To:", RECIPIENT);
console.log("  → Run policy check before signing PAYMENT-SIGNATURE\n");

console.log("Step 2 — on-chain policy check (published CLI)");
const policyStatus = runAep([
  "check-policy",
  "-c",
  DEMO_ACCOUNT,
  "-a",
  AMOUNT_WEI,
  "-t",
  RECIPIENT,
  "-r",
  RPC,
]);

if (policyStatus === 0) {
  console.log("  Result: Allowed\n");
} else {
  console.log(
    "  Result: Denied (expected for demo recipient — set RECIPIENT to an allowed address)\n"
  );
}

console.log("Step 3 — UserOp (optional)");
if (!shouldExecute) {
  console.log("  Skipped. To submit a real UserOp:");
  console.log(`    export PRIVATE_KEY=0x...   # funded owner key`);
  console.log(`    export BUNDLER_RPC_URL=https://your-bundler`);
  console.log(`    node run.mjs --execute`);
  console.log("\nOr deploy your own account first:");
  console.log(`    export PRIVATE_KEY=0x...`);
  console.log(
    `    npx ${CLI_PKG} deploy --factory ${FACTORY} --rpc ${RPC}`
  );
  process.exit(0);
}

if (!process.env.PRIVATE_KEY && !process.env.AEP_KEYSTORE_ACCOUNT) {
  console.error("Error: set PRIVATE_KEY or AEP_KEYSTORE_ACCOUNT to execute");
  process.exit(1);
}
if (!process.env.BUNDLER_RPC_URL) {
  console.error("Error: set BUNDLER_RPC_URL to execute");
  process.exit(1);
}

const accountFlag = process.env.AEP_ACCOUNT
  ? ["-a", process.env.AEP_ACCOUNT]
  : [];

const execStatus = runAep([
  "execute",
  "-t",
  RECIPIENT,
  "-v",
  AMOUNT_WEI,
  "-d",
  "0x",
  "--bundler",
  process.env.BUNDLER_RPC_URL,
  "-r",
  RPC,
  ...accountFlag,
]);

process.exit(execStatus);
