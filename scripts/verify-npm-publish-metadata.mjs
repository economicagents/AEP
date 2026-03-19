#!/usr/bin/env node
/**
 * Ensures publishable workspace packages declare Apache-2.0 and have repository metadata.
 * Run: node scripts/verify-npm-publish-metadata.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publishable = [
  "packages/graph",
  "packages/keystore",
  "packages/sdk",
  "packages/indexer",
  "packages/resolver",
  "packages/monitor",
  "packages/mcp",
  "packages/api",
  "packages/cli",
];

let failed = false;
for (const rel of publishable) {
  const path = join(root, rel, "package.json");
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  if (pkg.license !== "Apache-2.0") {
    console.error(`${rel}: expected license Apache-2.0, got ${pkg.license}`);
    failed = true;
  }
  if (!pkg.repository?.url?.includes("github.com")) {
    console.error(`${rel}: missing or invalid repository.url`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("npm publish metadata OK for", publishable.length, "packages");
