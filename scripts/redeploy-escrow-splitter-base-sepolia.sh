#!/usr/bin/env bash
#
# Redeploy ConditionalEscrowFactory and RevenueSplitterFactory to Base Sepolia.
# Updates ~/.aep/config.json, docs/TESTNET-DEPLOYMENT.md, and smoke test addresses.
# Preserves Phase 1 (AEPAccount, factory) and other relationship factories.
#
# Prerequisites: .env with PRIVATE_KEY, BASE_SEPOLIA_RPC
# Optional: AEP_TREASURY_ADDRESS
#
# Usage: ./scripts/redeploy-escrow-splitter-base-sepolia.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONTRACTS_DIR="$REPO_ROOT/contracts"
AEP_DIR="${HOME}/.aep"
CONFIG_PATH="$AEP_DIR/config.json"

# Load .env
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
elif [[ -f "$CONTRACTS_DIR/.env" ]]; then
  set -a
  source "$CONTRACTS_DIR/.env"
  set +a
fi

if [[ -z "$PRIVATE_KEY" ]]; then
  echo "Error: PRIVATE_KEY not set."
  exit 1
fi

if [[ -z "$BASE_SEPOLIA_RPC" ]]; then
  echo "Error: BASE_SEPOLIA_RPC not set."
  exit 1
fi

DERIVED_ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY" 2>/dev/null) || true
if [[ -z "$DERIVED_ADDRESS" ]]; then
  echo "Error: Could not derive address from PRIVATE_KEY. Is Foundry (cast) installed?"
  exit 1
fi

TREASURY="${AEP_TREASURY_ADDRESS:-$DERIVED_ADDRESS}"

if [[ ! -f "$CONTRACTS_DIR/.env" ]] && [[ -f "$REPO_ROOT/.env" ]]; then
  ln -sf ../.env "$CONTRACTS_DIR/.env"
fi

echo "=== Redeploy ConditionalEscrowFactory + RevenueSplitterFactory (Base Sepolia) ==="
echo "RPC: $BASE_SEPOLIA_RPC"
echo ""

cd "$CONTRACTS_DIR"
tmp=$(mktemp)
forge script script/RedeployEscrowAndSplitter.s.sol --rpc-url base_sepolia --broadcast 2>&1 | tee "$tmp"
r=${PIPESTATUS[0]}
OUTPUT=$(cat "$tmp")
rm -f "$tmp"
if [[ $r -ne 0 ]]; then
  echo "Error: Redeploy failed (exit code $r)"
  exit 1
fi

ESCROW_FACTORY=$(echo "$OUTPUT" | grep -E "ConditionalEscrowFactory:" | sed -E 's/.*(0x[a-fA-F0-9]{40}).*/\1/' | tail -1)
SPLITTER_FACTORY=$(echo "$OUTPUT" | grep -E "RevenueSplitterFactory:" | sed -E 's/.*(0x[a-fA-F0-9]{40}).*/\1/' | tail -1)

if [[ -z "$ESCROW_FACTORY" || -z "$SPLITTER_FACTORY" ]]; then
  echo "Error: Could not parse addresses from forge output."
  exit 1
fi

echo ""
echo "Deployed:"
echo "  ConditionalEscrowFactory: $ESCROW_FACTORY"
echo "  RevenueSplitterFactory:   $SPLITTER_FACTORY"
echo ""

# Update config.json (merge with existing)
if [[ -f "$CONFIG_PATH" ]]; then
  CONFIG_PATH="$CONFIG_PATH" ESCROW_FACTORY="$ESCROW_FACTORY" SPLITTER_FACTORY="$SPLITTER_FACTORY" node -e "
const fs = require('fs');
const p = process.env.CONFIG_PATH;
const c = JSON.parse(fs.readFileSync(p, 'utf8'));
c.escrowFactoryAddress = process.env.ESCROW_FACTORY;
c.revenueSplitterFactoryAddress = process.env.SPLITTER_FACTORY;
fs.writeFileSync(p, JSON.stringify(c, null, 2));
console.log('Updated', p);
"
else
  echo "Warning: $CONFIG_PATH not found. Run full deploy first or create config manually."
fi

# Update docs/TESTNET-DEPLOYMENT.md and packages/smoke-tests/src/addresses.ts
REPO_ROOT="$REPO_ROOT" ESCROW_FACTORY="$ESCROW_FACTORY" SPLITTER_FACTORY="$SPLITTER_FACTORY" node -e "
const fs = require('fs');
const escrow = process.env.ESCROW_FACTORY;
const splitter = process.env.SPLITTER_FACTORY;

const deployDoc = process.env.REPO_ROOT + '/docs/TESTNET-DEPLOYMENT.md';
if (fs.existsSync(deployDoc)) {
  let s = fs.readFileSync(deployDoc, 'utf8');
  s = s.replace(/(\\| ConditionalEscrowFactory \\| )\`0x[a-fA-F0-9]{40}\`( \\|)/, '\$1\`' + escrow + '\`\$2');
  s = s.replace(/(\\| RevenueSplitterFactory \\| )\`0x[a-fA-F0-9]{40}\`( \\|)/, '\$1\`' + splitter + '\`\$2');
  fs.writeFileSync(deployDoc, s);
  console.log('Updated docs/TESTNET-DEPLOYMENT.md');
}

const addrTs = process.env.REPO_ROOT + '/packages/smoke-tests/src/addresses.ts';
if (fs.existsSync(addrTs)) {
  let s = fs.readFileSync(addrTs, 'utf8');
  s = s.replace(/conditionalEscrowFactory: \"0x[a-fA-F0-9]{40}\"( as Address)/, 'conditionalEscrowFactory: \"' + escrow + '\"$1');
  s = s.replace(/revenueSplitterFactory: \"0x[a-fA-F0-9]{40}\"( as Address)/, 'revenueSplitterFactory: \"' + splitter + '\"$1');
  fs.writeFileSync(addrTs, s);
  console.log('Updated packages/smoke-tests/src/addresses.ts');
}
"

echo ""
echo "=== Redeploy complete ==="
echo "Run: ./scripts/validate-mainnet-ready.sh"
echo ""
