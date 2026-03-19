---
name: aep-monetization
description: AEP monetization: treasury, fees, API paywall. Use when configuring revenue streams, origination fees, escrow/SLA setup fees, or x402 paywall for POST /resolve.
compatibility: Requires forge for deployment. Set AEP_TREASURY_ADDRESS, AEP_RESOLVE_PRICE for API paywall. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "💵"
    requires:
      bins: ["forge", "aep"]
      env: ["PRIVATE_KEY"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["aep-cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP Monetization

## When to Use

- User wants to configure treasury or fee collection
- User asks about origination fee, setup fee, or API paywall
- User needs fee-free mode for testnet

**Status:** Implemented. Treasury, relationship fees (credit origination, escrow/SLA setup), and API x402 paywall are live. Production deployment pending treasury address setup.

## Treasury

All revenue flows to a single AEP Treasury address on Base (USDC).

- **Config:** `treasuryAddress` in `~/.aep/config.json`
- **Env:** `AEP_TREASURY_ADDRESS` overrides config
- **Deployment:** Set `AEP_TREASURY_ADDRESS` when running `forge script script/DeployRelationships.s.sol` to deploy factories with fee collection

## Fee Details

See [references/fees-and-env.md](references/fees-and-env.md) for revenue streams table, env vars, and relationship contract fee details.

## Managed Resolution API (x402 Paywall)

When `AEP_TREASURY_ADDRESS` and `AEP_RESOLVE_PRICE` are set, `POST /resolve` is gated via x402. Endpoints: Standard = `POST /resolve` ($0.005), Premium = `POST /resolve/premium` ($0.02). When disabled, API runs free. MCP and CLI use local resolver; no paywall.

## Fee-Free Mode

Deploy factories with `AEP_TREASURY_ADDRESS` unset for testnet. When treasury is `address(0)`, passing fee > 0 will revert. Use fee = 0 for all creates.

## Deployment

```bash
# Deploy relationship factories with treasury (production)
AEP_TREASURY_ADDRESS=0x... PRIVATE_KEY=0x... forge script script/DeployRelationships.s.sol --rpc-url https://sepolia.base.org --broadcast

# Deploy without treasury (testnet, no fees)
PRIVATE_KEY=0x... forge script script/DeployRelationships.s.sol --rpc-url https://sepolia.base.org --broadcast
```

## Backward Compatibility

- **Existing deployments:** Factories deployed before this change have no constructor and no fee logic. They remain fee-free.
- **New deployments:** Factories deployed with `DeployRelationships.s.sol` accept `treasury` in constructor. Pass fee = 0 for no fee when treasury is set.

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [aep-relationships](../aep-relationships/SKILL.md)
- [aep-deploy](../aep-deploy/SKILL.md)
