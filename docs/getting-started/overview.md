# Platform Overview

AEP (Agent Economic Protocol) is the runtime layer for economic agents—including autonomous AI agents. It extends ERC-4337 smart accounts with policy modules that enforce budget, counterparty, and rate-limit rules at the validation layer—so agents can spend safely, onchain.

## Core Capabilities

### Budget Governance

Set per-transaction, daily, weekly, and per-task spend caps. Overspend is impossible at the protocol level; policy modules are checked during `validateUserOp` before execution.

### Intent-Based Procurement

Resolve natural-language intents (e.g. "image generation under $1") to execution plans with providers, prices, and reputation. Uses ERC-8004 for identity and reputation; x402 for payment flow.

### Economic Relationships

Credit facilities, conditional escrow, revenue splitters, and SLA contracts—all onchain. Deploy and manage via CLI, SDK, or MCP.

### Policy Modules

- **BudgetPolicy** — Caps and spend tracking
- **CounterpartyPolicy** — Allow/block lists, min-reputation
- **RateLimitPolicy** — Max transactions per window

## Architecture

```
┌─────────────────┐
│  Your Agent     │
└────────┬────────┘
         │ Intent / UserOp
         ▼
┌─────────────────┐
│  AEP SDK / CLI   │
│  MCP / REST API  │
├─────────────────┤
│ Policy Check    │
│ Intent Resolve  │
└────────┬────────┘
         │ validateUserOp
         ▼
┌─────────────────┐
│  AEPAccount     │
│  (ERC-4337)     │
├─────────────────┤
│ BudgetPolicy    │
│ Counterparty    │
│ RateLimit       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Base (EVM)     │
└─────────────────┘
```

## Integration Options

| Method | Best For | Complexity |
|-------|----------|------------|
| [CLI](cli/installation) | Scripts, ops, local dev | Low |
| [SDK](sdk/installation) | Custom apps, integrations | Medium |
| [MCP](reference/mcp) | Cursor, OpenClaw, AI agents | Low |
| [REST API](reference/rest-api) | Self-hosted or remote resolution, optional paywall | Medium |

## Next Steps

- [Quick Start](getting-started/quickstart) — 0 to AEP in 15 minutes
- [Supported Chains](getting-started/supported-chains) — Base Sepolia, Base mainnet
- [CLI Installation](cli/installation) — Install and configure the CLI
