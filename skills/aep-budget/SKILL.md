---
name: aep-budget
description: Manage AEP (Agent Economic Protocol) budget caps, check policy, and freeze/unfreeze accounts. Use when the user wants to set spend limits, view current spend, verify if a payment would pass policy, or emergency-freeze an agent wallet. Do NOT use for general balance queries (use get_balance MCP instead).
compatibility: Requires aep CLI, PRIVATE_KEY. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "💰"
    requires:
      bins: ["aep"]
      env: ["PRIVATE_KEY"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["@economicagents/cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP Budget

## When to Use

- User wants to set or view spend limits (per-tx, daily, weekly, per-task)
- User needs to check if a payment would pass policy before signing
- User wants to emergency-freeze an agent wallet
- User asks about budget caps, remaining spend, or policy state

Manage budget caps and policy checks for AEP agent wallets. Budget enforcement is checked on-chain during transaction validation—overspend is impossible at the protocol level.

## What is AEP?

AEP (Agent Economic Protocol) is the runtime layer for economic agents—including autonomous AI agents. It extends ERC-4337 smart accounts with policy modules that enforce budget, counterparty, and rate-limit rules.

## Quick Start

### 1. Deploy an Account

```bash
aep deploy --factory 0xFactoryAddress
```

Owner derived from PRIVATE_KEY when `--owner` omitted. Or `aep deploy --owner 0x... --factory 0x...`

### 2. Set Budget Caps

```bash
# Get state
aep policy-get -m <BudgetPolicy address>

# Set basic caps (preserves per-task and windows)
aep policy-set -m <module> --max-per-tx 1000000 --max-daily 5000000 --max-weekly 20000000

# Set full caps including per-task (500k per 1hr task window)
aep policy-set -m <module> --full --max-per-tx 1000000 --max-daily 5000000 --max-weekly 20000000 \
  --max-per-task 500000 --task-window 3600
```

Caps semantics: see [references/caps.md](references/caps.md).

### 3. Check Policy (before x402 payment)

```bash
aep check-policy -a 500000 -t 0xRecipientAddress
```

### 4. Emergency Freeze

```bash
aep freeze
```

## Environment Variables

| Variable | Description | Required |
|---------|-------------|----------|
| `PRIVATE_KEY` | Owner key for policy updates and freeze | For policy-set, freeze |
| `~/.aep/config.json` | Account, RPC, factory address | Yes (created on deploy) |

## MCP Tools

Run the AEP MCP server for agent self-management:

- `get_balance` — EntryPoint deposit
- `get_policy_state` — Caps and current spend (daily, weekly, task)
- `set_budget_caps` — Update caps (owner only)

## SDK Usage

```typescript
import {
  getBudgetPolicyState,
  setBudgetCaps,
  setBudgetCapsFull,
  checkPolicy,
  setFrozen,
} from "@economicagents/sdk";

const state = await getBudgetPolicyState(moduleAddress, { rpcUrl });
// state.maxPerTx, state.spentDaily, state.spentInTask, etc.

await setBudgetCaps(moduleAddress, { maxPerTx: 1e6, maxDaily: 5e6, maxWeekly: 20e6 }, { privateKey, rpcUrl });

await setBudgetCapsFull(moduleAddress, {
  maxPerTx: 1e6, maxDaily: 5e6, maxWeekly: 20e6,
  maxPerTask: 500000, taskWindowSeconds: 3600n,
  dailyWindowSeconds: 0n, weeklyWindowSeconds: 0n,
}, { privateKey, rpcUrl });
```

## RateLimitPolicy

Limits transactions per time window. Prevents runaway agents from draining via high-frequency micro-payments.

```bash
aep rate-limit set -m <module> --max-tx 10 --window-seconds 3600
```

**Skill:** [aep-rate-limit](../aep-rate-limit/SKILL.md)

## Examples

**Example 1: Set daily spend limit**

User says: "Limit this agent to 5 USDC per day"

Actions:
1. Get BudgetPolicy module: `aep modules`
2. Set caps: `aep policy-set -m <module> --max-per-tx 1000000 --max-daily 5000000 --max-weekly 20000000`
3. Verify: `aep policy-get -m <module>`

Result: Agent cannot spend more than 5 USDC (6 decimals) per 24h window.

**Example 2: Check if payment would pass before x402**

User says: "Will a 500k payment to 0xProvider pass policy?"

Actions: Run `aep check-policy -a 500000 -t 0xProvider`

Result: Output shows allowed/denied and reason (e.g. BUDGET_EXCEEDED, COUNTERPARTY_BLOCKED).

## Links

- [Architecture](../../docs/ARCHITECTURE.md)
- [Cookbook](../../docs/COOKBOOK.md)
