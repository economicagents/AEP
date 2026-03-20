#!/usr/bin/env bash
# Publish @economicagents/* (including @economicagents/cli) to npm in dependency order (see docs/PUBLISHING.md).
# Prerequisites: npm login; @economicagents org on npm; pnpm run build already satisfied.
# Dry run: DRY_RUN=1 pnpm run publish:packages
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pnpm run verify:npm-metadata
pnpm run build

PUBLISH_ARGS=(--access public --no-git-checks)
if [[ "${DRY_RUN:-}" == "1" ]]; then
  PUBLISH_ARGS+=(--dry-run)
  echo "==> DRY_RUN=1 (no upload)"
fi
# 2FA auth-and-publish: same TOTP often works for a short window; refresh NPM_OTP if a step fails with EOTP.
if [[ -n "${NPM_OTP:-}" ]]; then
  PUBLISH_ARGS+=(--otp="${NPM_OTP}")
fi

for pkg in viem-rpc graph keystore sdk indexer resolver monitor mcp api cli; do
  echo "==> pnpm publish packages/$pkg"
  (cd "packages/$pkg" && pnpm publish "${PUBLISH_ARGS[@]}")
done

echo "==> Done. Verify: npm view @economicagents/cli version && npm view @economicagents/sdk version"
