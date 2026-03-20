---
name: aep-deploy
description: Deploy AEP factory, accounts, and economic relationship contracts. Use when deploying to Base Sepolia, creating new AEP accounts, or setting up factory and config.
compatibility: Requires forge, aep CLI, PRIVATE_KEY. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "🚀"
    requires:
      bins: ["forge", "aep"]
      env: ["PRIVATE_KEY"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["@economicagents/cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP Deploy

## When to Use

- User wants to deploy AEP factory or account
- User needs Base Sepolia contract addresses
- User asks about deployment, forge script, or config setup

All deployment scripts and relationship contracts are implemented and tested on Base Sepolia.

## Prerequisites

- Foundry (forge)
- Node.js 18+
- RPC URL (e.g., https://sepolia.base.org)
- Private key with ETH for gas

## Deploy Account Factory

```bash
cd contracts
PRIVATE_KEY=0x... forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast
```

Output: `AEPAccountFactory` address. Add to `~/.aep/config.json`:

```json
{
  "factoryAddress": "0x...",
  "rpcUrl": "https://sepolia.base.org"
}
```

## Deploy Account

```bash
aep deploy --owner 0xYourAddress --factory 0xFactoryAddress
```

Config is saved to `~/.aep/config.json`.

## Deploy Economic Relationship Contracts

```bash
cd contracts
# With treasury (fee collection)
AEP_TREASURY_ADDRESS=0x... PRIVATE_KEY=0x... forge script script/DeployRelationships.s.sol --rpc-url https://sepolia.base.org --broadcast

# Without treasury (no fees, testnet)
PRIVATE_KEY=0x... forge script script/DeployRelationships.s.sol --rpc-url https://sepolia.base.org --broadcast
```

Add factory addresses to `~/.aep/config.json`:

```json
{
  "creditFacilityFactoryAddress": "0x...",
  "escrowFactoryAddress": "0x...",
  "revenueSplitterFactoryAddress": "0x...",
  "slaFactoryAddress": "0x...",
  "treasuryAddress": "0x..."
}
```

## Full Config (Optional)

For full functionality, add to `~/.aep/config.json`:

| Key | Purpose |
|-----|---------|
| `identityRegistryAddress` | CounterpartyPolicy agent allowlist (ERC-8004) |
| `reputationRegistryAddress` | CounterpartyPolicy min-reputation |
| `bundlerRpcUrl` | Execute UserOp (e.g. Pimlico, Stackup) |
| `indexPath` | Intent resolution (default `~/.aep/index/`) |

Base Sepolia ERC-8004: IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713`.

## Base Sepolia Addresses

See [references/addresses.md](references/addresses.md) for full address table.

## Optional: Indexer (Intent Resolution)

```bash
cd packages/indexer && pnpm run build && node dist/cli.js sync [--rpc <url>] [--probe-x402]
```

Optionally run `node dist/cli.js embed` for semantic search. Index at `~/.aep/index/` by default. See [aep-integration](../aep-integration/SKILL.md).

## Optional: REST API (self-hosted)

```bash
cd packages/api && pnpm run build && node dist/index.js
```

Without treasury/pricing env, `POST /resolve` runs without x402. With paywall: set `AEP_TREASURY_ADDRESS` and pricing env per [aep-monetization](../aep-monetization/SKILL.md).

## Validation (testnet smoke)

Before mainnet or after redeploying contracts, run:

```bash
pnpm run validate:testnet
```

Flags: `--verify-only`, `--unit-only`, `--e2e-only`. Env: `BASE_SEPOLIA_RPC`, `PRIVATE_KEY`, `BUNDLER_RPC_URL` (for execute). See docs/guides/deployment.md (mainnet preflight).

## Examples

**Example 1: Deploy new AEP account on Base Sepolia**

**Scenario:** Deploy an AEP account for testing.

Steps:
1. Deploy factory: `cd contracts && PRIVATE_KEY=0x... forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast`
2. Note factory address from output
3. Deploy account: `aep deploy --factory 0xFactoryAddress`
4. Add factory to `~/.aep/config.json` if not auto-saved

Result: Account deployed; config updated with `account` address.

**Example 2: Deploy relationship contracts with fees**

**Scenario:** Deploy escrow and credit factories with a treasury.

Steps:
1. Set `AEP_TREASURY_ADDRESS=0x...` and `PRIVATE_KEY=0x...`
2. Run `forge script script/DeployRelationships.s.sol --rpc-url https://sepolia.base.org --broadcast`
3. Add returned factory addresses to `~/.aep/config.json`

Result: Factories deployed with fee collection; ready for credit/escrow creation.

## Troubleshooting

**Error: forge script fails with "PRIVATE_KEY not set"**

Cause: Private key not available to forge.

Solution: Set `PRIVATE_KEY=0x...` in environment or create `contracts/.env` with `PRIVATE_KEY=0x...` (ensure .env is gitignored).

**Error: forge script fails with "insufficient funds"**

Cause: Deployer address has no ETH for gas on Base Sepolia.

Solution: Fund the deployer address with Base Sepolia ETH (faucet or bridge).

**Error: aep deploy fails with "factory address required"**

Cause: Factory not deployed or config missing.

Solution: Deploy factory first via `forge script script/Deploy.s.sol`. Add `factoryAddress` to `~/.aep/config.json`.

## Base mainnet

Use Base mainnet RPC (e.g. `https://mainnet.base.org`) and follow **[docs/guides/deployment.md](../../docs/guides/deployment.md)** for the mainnet gate, scripts, and canonical addresses. Sepolia reference table: [references/addresses.md](references/addresses.md).

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [Architecture](../../docs/ARCHITECTURE.md)
