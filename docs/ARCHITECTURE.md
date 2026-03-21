# AEP Architecture

## Overview

AEP (Agent Economic Protocol) provides the runtime layer for economic agents by extending ERC-4337 smart accounts with policy modules that enforce budget, counterparty, and rate-limit rules at the validation layer.

## Contract Hierarchy

```
AEPAccount (ERC-4337 BaseAccount)
├── Policy modules (IPolicyModule)
│   ├── BudgetPolicy
│   ├── CounterpartyPolicy
│   └── RateLimitPolicy
├── PaymentDecoder (library)
└── UUPSUpgradeable
```

### AEPAccount

The main account contract extends ERC-4337's BaseAccount. Key responsibilities:

- **Validation:** During `validateUserOp`, verifies the signature and calls `check(userOp)` on each registered policy module. All must pass (return 0) for the UserOp to be valid.
- **Execution:** `execute` and `executeBatch` dispatch calls; after success, call `recordSpend` on each policy module.
- **Governance:** Owner can add/remove policy modules, set frozen state, upgrade (UUPS).

### Policy Modules

Each module implements `IPolicyModule`:

- `check(userOp)` — Returns 0 for pass, 1 for fail. Called during `validateUserOp`.
- `checkPolicy(amount, recipient)` — View for x402 interceptor; returns whether payment would pass.
- `recordSpend(callData)` — Called after successful execution; updates state (e.g., spend tracking).

### validateUserOp Flow

```
EntryPoint.handleOps
  → AEPAccount.validateUserOp
    → _validateSignature (ECDSA recover)
    → for each policy module: module.check(userOp)
    → if any returns 1: revert
  → execute (if validation passed)
    → _call
    → for each policy module: module.recordSpend(callData)
```

## Factory and PolicyRegistry

- **AEPAccountFactory:** CREATE2 deployment. `deployAccount` and `deployFromTemplate` create accounts with default BudgetPolicy and CounterpartyPolicy.
- **PolicyRegistry:** Singleton storing reusable budget templates (maxPerTx, maxDaily, maxWeekly, per-task, window config). `deployFromTemplate` uses a template to configure the BudgetPolicy.

## SDK and CLI

- **SDK:** TypeScript (viem) for deploying accounts, configuring policies, checking policy, executing UserOps, and x402 interception.
- **CLI:** Commander-based CLI for manual operations. Config stored in `~/.aep/config.json`.

## x402 Integration

The x402 flow: client requests resource → server returns 402 with Payment-Amount and Payment-To → client signs payment → retries with PAYMENT-SIGNATURE.

AEP intercepts before signing: `intercept402Response` parses headers, calls `checkPolicyDetailed` on the account's modules, and returns a structured result (allowed or reason: BUDGET_EXCEEDED, COUNTERPARTY_BLOCKED, etc.). The agent can adapt (find cheaper alternative, request human approval) before signing.

## MCP Server

Exposes tools for agent frameworks including budget/policy (`get_balance`, `get_policy_state`, `set_budget_caps`), `resolve_intent`, analytics, fleet, and relationship state. See [reference/mcp.md](reference/mcp.md) for the full list.

## Monetization

Revenue flows to a single AEP Treasury address (USDC on Base):

```
x402 pay per resolve (POST /resolve)  ──→ AEP Treasury
Credit facility origination fee       ──→ AEP Treasury
Escrow setup fee                     ──→ AEP Treasury
SLA contract setup fee              ──→ AEP Treasury
```

- **Managed Resolution API:** When `AEP_TREASURY_ADDRESS` is set, `POST /resolve` is gated via x402 (x402-hono middleware). Price configurable via `AEP_RESOLVE_PRICE`.
- **Relationship factories:** CreditFacilityFactory, ConditionalEscrowFactory, SLAContractFactory accept a treasury in the constructor. When fee > 0, the caller pays to treasury at creation.
- See [COOKBOOK](COOKBOOK.md) and skills/aep-monetization for details.
