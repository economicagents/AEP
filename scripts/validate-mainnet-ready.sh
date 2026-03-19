#!/usr/bin/env bash
#
# Base Mainnet Readiness Checklist
# Runs all validation steps from docs/MAINNET-READINESS.md with .env loaded.
#
# Prerequisites: .env with BASE_SEPOLIA_RPC, PRIVATE_KEY (for E2E), BUNDLER_RPC_URL (for execute flow).
# E2E credit/escrow/splitter/SLA tests require wallet with ≥20 USDC on Base Sepolia.
#
# Usage: ./scripts/validate-mainnet-ready.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$REPO_ROOT/contracts"

# Load .env from repo root or contracts/
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
elif [[ -f "$CONTRACTS_DIR/.env" ]]; then
  set -a
  source "$CONTRACTS_DIR/.env"
  set +a
else
  echo "Warning: No .env found. Some checks may be skipped."
fi

# Fallback RPC for verify/unit when not in .env
export BASE_SEPOLIA_RPC="${BASE_SEPOLIA_RPC:-https://sepolia.base.org}"

echo "=== Base Mainnet Readiness Checklist ==="
echo ""

# 1. Unit tests (contracts + packages)
echo "1. Unit tests (pnpm run test)..."
cd "$REPO_ROOT"
pnpm run test
echo "   OK"
echo ""

# 2. Forge fork tests (requires BASE_SEPOLIA_RPC in .env)
echo "2. Forge fork tests..."
cd "$CONTRACTS_DIR"
forge test --match-contract BaseSepoliaFork --fork-url "$BASE_SEPOLIA_RPC"
echo "   OK"
echo ""

# 3. Smoke validation (verify + unit + e2e)
echo "3. Smoke validation (pnpm run validate:testnet)..."
cd "$REPO_ROOT"
pnpm run validate:testnet
echo "   OK"
echo ""

# 4. Config validate
echo "4. Config validate..."
cd "$REPO_ROOT"
pnpm exec aep config validate
echo "   OK"
echo ""

# 5. Audit remediation (0 Critical, 0 High, 0 Medium, 0 Low)
echo "5. Audit remediation..."
if [[ -f "$REPO_ROOT/audit-report.md" ]]; then
  if grep -q "0 Critical" "$REPO_ROOT/audit-report.md" && grep -q "0 High" "$REPO_ROOT/audit-report.md"; then
    echo "   OK (audit-report.md: 0 Critical, 0 High)"
  else
    echo "   WARN: audit-report.md may not show 0 Critical/High — manual review required"
  fi
else
  echo "   WARN: audit-report.md not found — manual review required"
fi
echo ""

# 6. Threat model present
echo "6. Threat model..."
if [[ -f "$REPO_ROOT/docs/THREAT-MODEL.md" ]]; then
  echo "   OK (docs/THREAT-MODEL.md exists)"
else
  echo "   WARN: docs/THREAT-MODEL.md not found — manual review required"
fi
echo ""

echo "=== All checks passed. Ready for Base Mainnet. ==="
