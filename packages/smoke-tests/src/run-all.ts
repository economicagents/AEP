#!/usr/bin/env node
/**
 * Run all validation steps: verify, unit, e2e.
 * Exit 1 on first failure.
 * Flags: --verify-only, --unit-only, --e2e-only
 */
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");

const args = process.argv.slice(2);
const verifyOnly = args.includes("--verify-only");
const unitOnly = args.includes("--unit-only");
const e2eOnly = args.includes("--e2e-only");

function run(name: string, cmd: string, cmdArgs: string[]): boolean {
  console.log(`\n--- ${name} ---\n`);
  const r = spawnSync(cmd, cmdArgs, {
    stdio: "inherit",
    cwd: join(__dirname, ".."),
  });
  return r.status === 0;
}

let passed = 0;
let failed = 0;

if (!unitOnly && !e2eOnly) {
  if (!existsSync(join(distDir, "01-verify-deployment.js"))) {
    console.error("Run pnpm run build first in packages/smoke-tests");
    process.exit(1);
  }
  const ok = run("01 Verify deployment", "node", [
    join(distDir, "01-verify-deployment.js"),
  ]);
  if (ok) passed++;
  else {
    failed++;
    console.error("\nValidation failed at verify step");
    process.exit(1);
  }
}

if (!verifyOnly && !e2eOnly) {
  const ok = run("02 Unit tests (live)", "pnpm", [
    "exec",
    "vitest",
    "run",
    "02-unit",
  ]);
  if (ok) passed++;
  else {
    failed++;
    console.error("\nValidation failed at unit tests");
    process.exit(1);
  }
}

if (!verifyOnly && !unitOnly) {
  const ok = run("03 E2E smoke tests", "pnpm", [
    "exec",
    "vitest",
    "run",
    "03-e2e",
  ]);
  if (ok) passed++;
  else {
    failed++;
    console.error("\nValidation failed at E2E tests");
    process.exit(1);
  }
}

console.log(`\n--- Summary: ${passed} passed, ${failed} failed ---\n`);
process.exit(failed > 0 ? 1 : 0);
