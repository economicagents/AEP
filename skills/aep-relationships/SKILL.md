---
name: aep-relationships
description: AEP economic relationship contracts (CreditFacility, ConditionalEscrow, RevenueSplitter, SLAContract). Use when creating credit lines, escrows, revenue splits, or SLAs between AEP accounts.
compatibility: Requires aep CLI, PRIVATE_KEY. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "🤝"
    requires:
      bins: ["aep"]
      env: ["PRIVATE_KEY"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["aep-cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP Economic Relationship Contracts

## When to Use

- User wants to create a credit facility, escrow, revenue splitter, or SLA

Economic relationship contracts turn stateless x402 spot transactions into persistent economic bonds between AEP accounts. Implemented and available on Base Sepolia.

**Config:** Add `creditFacilityFactoryAddress`, `escrowFactoryAddress`, `revenueSplitterFactoryAddress`, `slaFactoryAddress` to `~/.aep/config.json` (from `forge script script/DeployRelationships.s.sol`). See [aep-deploy](../aep-deploy/SKILL.md).

## Contracts

### CreditFacility

On-chain credit line. Lender deposits USDC; borrower draws against limit. Reputation check via ERC-8004 before each draw.

**Flow:** create → deposit → draw → repay → withdraw. Lender can freeze/unfreeze. On default (after deadline): lender calls `default`. Lender withdraws excess when drawn=0.

### ConditionalEscrow

Escrow for multi-step agent workflows. Consumer deposits; provider executes; release on ERC-8004 validation.

**State machine:** FUNDED → IN_PROGRESS → VALIDATING → RELEASED | DISPUTED

### RevenueSplitter

Splits token balance among recipients by fixed weights (basis points, sum=10000).

### SLAContract

Staking-backed SLA. Provider stakes; consumer claims on breach (validation response below threshold).

## CLI

See [references/cli-reference.md](references/cli-reference.md) for full command reference.

## SDK

```typescript
import {
  createCreditFacility,
  getCreditFacilityState,
  creditDeposit,
  creditDraw,
  creditRepay,
  creditWithdraw,
  createEscrow,
  getEscrowState,
  escrowFund,
  escrowRelease,
  createRevenueSplitter,
  splitterDistribute,
  createSLA,
  slaStake,
  slaDeclareBreach,
  ERC8004_BASE_SEPOLIA,
  USDC_BASE_SEPOLIA,
} from "@aep/sdk";

const { facility } = await createCreditFacility({
  lender,
  borrower,
  token: USDC_BASE_SEPOLIA,
  limit: 1000e6,
  minReputation: 80,
  repaymentInterval: 30 * 86400,
  reputationRegistry: ERC8004_BASE_SEPOLIA.reputationRegistry,
  identityRegistry: ERC8004_BASE_SEPOLIA.identityRegistry,
  borrowerAgentId: 1n,
  factoryAddress,
  rpcUrl,
  privateKey,
});
```

## MCP Tools

- `credit_state` — Get CreditFacility state
- `escrow_state` — Get ConditionalEscrow state
- `splitter_state` — Get RevenueSplitter state
- `sla_state` — Get SLAContract state

## Addresses (Base Sepolia)

- **USDC:** 0x036CbD53842c5426634e7929541eC2318f3dCF7e
- **ValidationRegistry:** 0x8004Cb1BF31DAf7788923b405b754f57acEB4272

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [aep-monetization](../aep-monetization/SKILL.md) — Fees
