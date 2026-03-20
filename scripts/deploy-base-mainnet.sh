#!/usr/bin/env bash
#
# AEP Base Mainnet Full Deployment
# Deploys Phase 1 (Economic Account) and Phase 2 (Economic Relationships) contracts,
# then generates ~/.aep/config.json.
#
# Prerequisites: AEP_KEYSTORE_ACCOUNT (preferred) or PRIVATE_KEY, BASE_MAINNET_RPC
# Optional: AEP_TREASURY_ADDRESS (defaults to address derived from signer)
# Optional: ETHERSCAN_API_KEY — runs pnpm run verify:mainnet-signoff after sync
# Optional: SKIP_MAINNET_SIGNOFF=1 — skip sign-off; REQUIRE_MAINNET_SIGNOFF=1 — fail deploy if sign-off fails
#
# Usage: ./scripts/deploy-base-mainnet.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$REPO_ROOT/contracts"
AEP_DIR="${HOME}/.aep"
CONFIG_PATH="$AEP_DIR/config.json"

# Canonical Base Mainnet addresses (no deployment needed)
IDENTITY_REGISTRY="0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
REPUTATION_REGISTRY="0x8004BAa17C55a88189AE136b182e5fdA19dE9b63"
VALIDATION_REGISTRY="0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58"
USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
ENTRYPOINT="0x0000000071727De22E5E9d8BAf0edAc6f37da032"

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
  echo "Warning: No .env found at $REPO_ROOT/.env or $CONTRACTS_DIR/.env"
fi

if [[ -z "$BASE_MAINNET_RPC" ]]; then
  echo "Error: BASE_MAINNET_RPC not set. Add to .env or export before running."
  exit 1
fi

# Resolve signer: keystore (preferred) or PRIVATE_KEY (fallback)
USE_KEYSTORE=false
DERIVED_ADDRESS=""
KEYSTORE_ACCOUNT="${AEP_KEYSTORE_ACCOUNT:-foundry}"

if [[ -n "$KEYSTORE_ACCOUNT" ]]; then
  DERIVED_ADDRESS=$(cast wallet address --account "$KEYSTORE_ACCOUNT" 2>/dev/null) || true
  if [[ -n "$DERIVED_ADDRESS" ]]; then
    USE_KEYSTORE=true
  fi
fi

if [[ -z "$DERIVED_ADDRESS" ]] && [[ -n "$PRIVATE_KEY" ]]; then
  if [[ "$AEP_SILENCE_PRIVATE_KEY_WARNING" != "1" ]]; then
    echo "Warning: PRIVATE_KEY in .env is insecure. Prefer: cast wallet import aep --interactive, then set AEP_KEYSTORE_ACCOUNT=aep"
  fi
  DERIVED_ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY" 2>/dev/null) || true
fi

if [[ -z "$DERIVED_ADDRESS" ]]; then
  echo "Error: No signer. Set AEP_KEYSTORE_ACCOUNT (run: cast wallet import aep --interactive) or PRIVATE_KEY. Is Foundry (cast) installed?"
  exit 1
fi

# Forge loads .env from project root (contracts/). Symlink if needed.
if [[ ! -f "$CONTRACTS_DIR/.env" ]] && [[ -f "$REPO_ROOT/.env" ]]; then
  ln -sf ../.env "$CONTRACTS_DIR/.env"
  echo "Linked .env to contracts/ for forge"
fi

TREASURY="${AEP_TREASURY_ADDRESS:-$DERIVED_ADDRESS}"
RPC_URL="${BASE_MAINNET_RPC}"

echo "=== AEP Base Mainnet Deployment ==="
echo "RPC: $RPC_URL"
echo "Treasury: ${TREASURY:-<not set, fee-free>}"
echo ""

# Phase 1: Deploy Economic Account
echo "--- Phase 1: Deploying Economic Account (Deploy.s.sol) ---"
cd "$CONTRACTS_DIR"
tmp1=$(mktemp)
if [[ "$USE_KEYSTORE" == "true" ]]; then
  unset PRIVATE_KEY
  forge script script/Deploy.s.sol --rpc-url base_mainnet --account "$KEYSTORE_ACCOUNT" --sender "$DERIVED_ADDRESS" --broadcast 2>&1 | tee "$tmp1"
else
  forge script script/Deploy.s.sol --rpc-url base_mainnet --broadcast 2>&1 | tee "$tmp1"
fi
r1=${PIPESTATUS[0]}
PHASE1_OUTPUT=$(cat "$tmp1")
rm -f "$tmp1"
if [[ $r1 -ne 0 ]]; then
  echo ""
  echo "Error: Phase 1 failed (exit code $r1)"
  exit 1
fi

ACCOUNT_IMPL=$(echo "$PHASE1_OUTPUT" | grep -E "AEPAccount implementation:" | sed -E 's/.*(0x[a-fA-F0-9]{40}).*/\1/' | tail -1)
FACTORY=$(echo "$PHASE1_OUTPUT" | grep -E "AEPAccountFactory:" | sed -E 's/.*(0x[a-fA-F0-9]{40}).*/\1/' | tail -1)

if [[ -z "$ACCOUNT_IMPL" || -z "$FACTORY" ]]; then
  echo "Error: Could not parse Phase 1 addresses. Check forge output above."
  exit 1
fi

echo ""
echo "Phase 1 deployed:"
echo "  AEPAccount implementation: $ACCOUNT_IMPL"
echo "  AEPAccountFactory: $FACTORY"
echo ""

# Phase 2: Deploy Economic Relationships
echo "--- Phase 2: Deploying Economic Relationships (DeployRelationships.s.sol) ---"
export AEP_TREASURY_ADDRESS="$TREASURY"
tmp2=$(mktemp)
if [[ "$USE_KEYSTORE" == "true" ]]; then
  unset PRIVATE_KEY
  forge script script/DeployRelationships.s.sol --rpc-url base_mainnet --account "$KEYSTORE_ACCOUNT" --sender "$DERIVED_ADDRESS" --broadcast 2>&1 | tee "$tmp2"
else
  forge script script/DeployRelationships.s.sol --rpc-url base_mainnet --broadcast 2>&1 | tee "$tmp2"
fi
r2=${PIPESTATUS[0]}
PHASE2_OUTPUT=$(cat "$tmp2")
rm -f "$tmp2"
if [[ $r2 -ne 0 ]]; then
  echo ""
  echo "Error: Phase 2 failed (exit code $r2)"
  exit 1
fi

CREDIT_FACTORY=$(echo "$PHASE2_OUTPUT" | grep -E "CreditFacilityFactory:" | sed -E 's/.*(0x[a-fA-F0-9]{40}).*/\1/' | tail -1)
ESCROW_FACTORY=$(echo "$PHASE2_OUTPUT" | grep -E "ConditionalEscrowFactory:" | sed -E 's/.*(0x[a-fA-F0-9]{40}).*/\1/' | tail -1)
SPLITTER_FACTORY=$(echo "$PHASE2_OUTPUT" | grep -E "RevenueSplitterFactory:" | sed -E 's/.*(0x[a-fA-F0-9]{40}).*/\1/' | tail -1)
SLA_FACTORY=$(echo "$PHASE2_OUTPUT" | grep -E "SLAContractFactory:" | sed -E 's/.*(0x[a-fA-F0-9]{40}).*/\1/' | tail -1)

if [[ -z "$CREDIT_FACTORY" || -z "$ESCROW_FACTORY" || -z "$SPLITTER_FACTORY" || -z "$SLA_FACTORY" ]]; then
  echo "Error: Could not parse Phase 2 addresses. Check forge output above."
  exit 1
fi

echo ""
echo "Phase 2 deployed:"
echo "  CreditFacilityFactory: $CREDIT_FACTORY"
echo "  ConditionalEscrowFactory: $ESCROW_FACTORY"
echo "  RevenueSplitterFactory: $SPLITTER_FACTORY"
echo "  SLAContractFactory: $SLA_FACTORY"
echo ""

# Generate config
echo "--- Generating config ---"
mkdir -p "$AEP_DIR"

if [[ -f "$SCRIPT_DIR/generate-config.js" ]]; then
  CHAIN_ID=8453 \
  AEP_ACCOUNT_IMPL="$ACCOUNT_IMPL" \
  AEP_ACCOUNT_FACTORY="$FACTORY" \
  CREDIT_FACILITY_FACTORY="$CREDIT_FACTORY" \
  ESCROW_FACTORY="$ESCROW_FACTORY" \
  REVENUE_SPLITTER_FACTORY="$SPLITTER_FACTORY" \
  SLA_FACTORY="$SLA_FACTORY" \
  RPC_URL="$RPC_URL" \
  TREASURY="$TREASURY" \
  OWNER="$DERIVED_ADDRESS" \
  node "$SCRIPT_DIR/generate-config.js" > "$CONFIG_PATH"
elif [[ -f "$SCRIPT_DIR/generate-config.ts" ]]; then
  CHAIN_ID=8453 \
  AEP_ACCOUNT_IMPL="$ACCOUNT_IMPL" \
  AEP_ACCOUNT_FACTORY="$FACTORY" \
  CREDIT_FACILITY_FACTORY="$CREDIT_FACTORY" \
  ESCROW_FACTORY="$ESCROW_FACTORY" \
  REVENUE_SPLITTER_FACTORY="$SPLITTER_FACTORY" \
  SLA_FACTORY="$SLA_FACTORY" \
  RPC_URL="$RPC_URL" \
  TREASURY="$TREASURY" \
  OWNER="$DERIVED_ADDRESS" \
  npx tsx "$SCRIPT_DIR/generate-config.ts" > "$CONFIG_PATH" 2>/dev/null || true
fi

# Fallback: inline JSON
if [[ ! -s "$CONFIG_PATH" ]]; then
  AEP_ACCOUNT_FACTORY="$FACTORY" \
  CREDIT_FACILITY_FACTORY="$CREDIT_FACTORY" \
  ESCROW_FACTORY="$ESCROW_FACTORY" \
  REVENUE_SPLITTER_FACTORY="$SPLITTER_FACTORY" \
  SLA_FACTORY="$SLA_FACTORY" \
  RPC_URL="$RPC_URL" \
  TREASURY="$TREASURY" \
  OWNER="$DERIVED_ADDRESS" \
  AEP_DIR="$AEP_DIR" \
  IDENTITY_REGISTRY="$IDENTITY_REGISTRY" \
  REPUTATION_REGISTRY="$REPUTATION_REGISTRY" \
  VALIDATION_REGISTRY="$VALIDATION_REGISTRY" \
  ENTRYPOINT="$ENTRYPOINT" \
  USDC="$USDC" \
  AEP_ACCOUNT_IMPL="$ACCOUNT_IMPL" \
  node -e "
const c = {
  rpcUrl: process.env.RPC_URL,
  chainId: 8453,
  factoryAddress: process.env.AEP_ACCOUNT_FACTORY,
  aepAccountFactoryAddress: process.env.AEP_ACCOUNT_FACTORY,
  identityRegistryAddress: process.env.IDENTITY_REGISTRY,
  reputationRegistryAddress: process.env.REPUTATION_REGISTRY,
  validationRegistryAddress: process.env.VALIDATION_REGISTRY,
  creditFacilityFactoryAddress: process.env.CREDIT_FACILITY_FACTORY,
  escrowFactoryAddress: process.env.ESCROW_FACTORY,
  revenueSplitterFactoryAddress: process.env.REVENUE_SPLITTER_FACTORY,
  slaFactoryAddress: process.env.SLA_FACTORY,
  entryPointAddress: process.env.ENTRYPOINT,
  usdcAddress: process.env.USDC,
  indexPath: process.env.AEP_DIR + '/index',
  graphPath: process.env.AEP_DIR + '/graph',
  monitor: { accounts: [], facilities: [], slas: [], pollIntervalMs: 12000, statePath: process.env.AEP_DIR + '/monitor' }
};
if (process.env.AEP_ACCOUNT_IMPL) {
  c.aepAccountImplementationAddress = process.env.AEP_ACCOUNT_IMPL;
  c.implementationAddress = process.env.AEP_ACCOUNT_IMPL;
}
if (process.env.TREASURY) c.treasuryAddress = process.env.TREASURY;
if (process.env.OWNER) c.owner = process.env.OWNER;
console.log(JSON.stringify(c, null, 2));
" > "$CONFIG_PATH"
fi

echo "Config written to $CONFIG_PATH"

# Phase 2.5: Deploy first AEP account
echo ""
echo "--- Phase 2.5: Deploying first AEP account ---"
cd "$REPO_ROOT"
if [[ ! -f packages/cli/dist/cli.js ]]; then
  echo "Building CLI..."
  pnpm run build
fi
DEPLOY_OPTS="--factory $FACTORY --owner $DERIVED_ADDRESS --rpc $RPC_URL"
if [[ "$USE_KEYSTORE" == "true" ]]; then
  DEPLOY_OPTS="$DEPLOY_OPTS --account $KEYSTORE_ACCOUNT"
fi
if pnpm exec aep deploy $DEPLOY_OPTS; then
  echo "First account deployed and added to config"
else
  echo "Note: First account deploy failed. Run manually: pnpm exec aep deploy --factory $FACTORY"
fi
cd "$CONTRACTS_DIR"

echo ""
echo "--- Post-deploy: sync docs + config from contracts/broadcast (8453 run-latest) ---"
if node "$REPO_ROOT/scripts/sync-mainnet-docs-from-broadcast.mjs" \
  --repo-root "$REPO_ROOT" \
  --chain-id 8453 \
  --config-path "$CONFIG_PATH" \
  --treasury "$TREASURY" \
  --owner "$DERIVED_ADDRESS" \
  --rpc-url "$RPC_URL"; then
  echo "docs/guides/deployment.md and $CONFIG_PATH updated from broadcast."
else
  echo "Error: sync-mainnet-docs-from-broadcast.mjs failed — update docs and config manually."
  exit 1
fi

if [[ "${SKIP_MAINNET_SIGNOFF:-}" == "1" ]]; then
  echo "Skipping verify:mainnet-signoff (SKIP_MAINNET_SIGNOFF=1). Run after forge verify indexing if needed."
elif [[ -z "${ETHERSCAN_API_KEY:-}" ]] && [[ -z "${BASESCAN_API_KEY:-}" ]]; then
  echo "Skipping verify:mainnet-signoff: set ETHERSCAN_API_KEY in .env for automated sign-off (or run it later)."
else
  echo "--- verify:mainnet-signoff (treasury/factories + bytecode/source) ---"
  if ! (cd "$REPO_ROOT" && pnpm run verify:mainnet-signoff); then
    echo "verify:mainnet-signoff failed. Often explorer indexing lags: run pnpm run verify:mainnet-forge, wait, then pnpm run verify:mainnet-signoff"
    if [[ "${REQUIRE_MAINNET_SIGNOFF:-}" == "1" ]]; then
      exit 1
    fi
  fi
fi

echo ""
echo "=== Base Mainnet Deployment Complete ==="
echo ""
echo "Deployed addresses:"
echo "  AEPAccountFactory:           $FACTORY"
echo "  CreditFacilityFactory:       $CREDIT_FACTORY"
echo "  ConditionalEscrowFactory:    $ESCROW_FACTORY"
echo "  RevenueSplitterFactory:      $SPLITTER_FACTORY"
echo "  SLAContractFactory:          $SLA_FACTORY"
echo ""
echo "Validate config: pnpm exec aep config validate"
echo "Post-deploy (verify, Basescan, record addresses): docs/guides/deployment.md — Mainnet live addresses and record"
