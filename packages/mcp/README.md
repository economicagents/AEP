# @aep/mcp

MCP (Model Context Protocol) server for AEP. Exposes tools for budget management, intent resolution, analytics, fleet, and economic relationships.

## Install

```bash
pnpm add @aep/mcp
```

From monorepo: `cd packages/mcp && pnpm run build`.

## Tools

| Tool | Description |
|------|-------------|
| `get_balance` | Account EntryPoint deposit |
| `get_policy_state` | BudgetPolicy caps and spend |
| `set_budget_caps` | Set BudgetPolicy caps (owner only) |
| `resolve_intent` | Resolve intent to execution plan |
| `get_analytics` | Account P&L, spend patterns |
| `get_credit_score` | Credit score for account |
| `get_recommendations` | Provider recommendations |
| `fleet_summary` | Fleet overview |
| `fleet_accounts` | Fleet account list |
| `fleet_alerts` | Fleet on-chain alerts |
| `credit_state` | CreditFacility state |
| `escrow_state` | ConditionalEscrow state |
| `splitter_state` | RevenueSplitter state |
| `sla_state` | SLAContract state |

## Usage

```bash
cd packages/mcp && pnpm run build && node dist/index.js
```

Add to Cursor/IDE MCP config:

```json
{
  "mcpServers": {
    "aep": {
      "command": "node",
      "args": ["/path/to/AEP/packages/mcp/dist/index.js"]
    }
  }
}
```

Requires `~/.aep/config.json`. `set_budget_caps` requires `AEP_KEYSTORE_ACCOUNT` (preferred) or `PRIVATE_KEY` env.

## Build & Test

```bash
pnpm run build
pnpm run test
```

## Docs

- [Cookbook](../../docs/COOKBOOK.md) — MCP integration
