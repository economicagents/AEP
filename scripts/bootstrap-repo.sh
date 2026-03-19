#!/usr/bin/env bash
# Initialize submodules and build contracts + TypeScript workspace from a fresh clone.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run this from a git checkout of AEP (repo root)." >&2
  exit 1
fi

echo "==> git submodule update --init --recursive"
git submodule update --init --recursive

if command -v forge >/dev/null 2>&1; then
  echo "==> forge build (contracts/)"
  (cd contracts && forge build)
else
  echo "WARN: forge not found; skip contracts build. Install Foundry: https://book.getfoundry.sh/" >&2
fi

if command -v pnpm >/dev/null 2>&1; then
  echo "==> pnpm install && pnpm run build"
  pnpm install
  pnpm run build
else
  echo "WARN: pnpm not found; install Node 18+ and pnpm, then run: pnpm install && pnpm run build" >&2
fi

echo "Done. Run: pnpm run test"
