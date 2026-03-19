#!/usr/bin/env node
/**
 * Ensures workspace packages use the @economicagents/* scope and publishable packages
 * declare Apache-2.0 and repository metadata.
 * Run: node scripts/verify-npm-publish-metadata.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scopePattern = /^@economicagents\/[a-z0-9-]+$/;

const rootPkgPath = join(root, "package.json");
const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));
if (rootPkg.name !== "@economicagents/workspace") {
  console.error(`root package.json: expected name @economicagents/workspace, got ${rootPkg.name}`);
  process.exit(1);
}
if (rootPkg.private !== true) {
  console.error("root package.json: expected private: true");
  process.exit(1);
}

const packagesRoot = join(root, "packages");
let failed = false;

for (const dir of readdirSync(packagesRoot)) {
  const pkgPath = join(packagesRoot, dir, "package.json");
  if (!existsSync(pkgPath) || !statSync(pkgPath).isFile()) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const expected = `@economicagents/${dir}`;
  if (pkg.name !== expected) {
    console.error(`packages/${dir}/package.json: expected name ${expected}, got ${pkg.name}`);
    failed = true;
    continue;
  }
  if (!scopePattern.test(pkg.name)) {
    console.error(`packages/${dir}/package.json: invalid scoped name ${pkg.name}`);
    failed = true;
  }
}

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
  if (!pkg.name?.startsWith("@economicagents/")) {
    console.error(`${rel}: publishable package must be @economicagents/*, got ${pkg.name}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("npm publish metadata OK for", publishable.length, "publishable packages; all packages/* use @economicagents/*");
