# MCP Tools

Add the AEP MCP server to Cursor or any MCP-compatible client. Tools cover balance, policy, intent resolution, analytics, fleet, and economic relationships.

## Install via npx (recommended)

**Registry version:** `@economicagents/mcp` **0.2.0** on npm (August 2026). Repo `main` is **0.3.0**.

Add to `~/.cursor/mcp.json` (or your client's MCP config):

```json
{
  "mcpServers": {
    "aep": {
      "command": "npx",
      "args": ["-y", "@economicagents/mcp@0.2.0"]
    }
  }
}
```

The published bin is **`aep-mcp`**. Smoke-test locally:

```bash
npx @economicagents/mcp@0.2.0
# MCP servers wait on stdio — configure via Cursor rather than running interactively
```

### Global install (alternative)

```bash
npm install -g @economicagents/mcp@0.2.0
```

```json
{
  "mcpServers": {
    "aep": {
      "command": "aep-mcp"
    }
  }
}
```

### From monorepo (contributors)

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

Requires `pnpm run build` in `packages/mcp` first.

## Prerequisites

Most tools read `~/.aep/config.json` (account, RPC, factories). Deploy an account first — see [Quick start](../getting-started/quickstart).

Intent resolution (`resolve_intent`) needs a synced provider index (`aep-index sync`) or a reachable REST API you operate — the hosted reference at `https://api.economicagents.org` is **currently offline** (HTTP 521); self-host from `packages/api` or use CLI `aep resolve` against your instance.

## For AI agents

When to use each tool:

| Tool | When to use |
|------|-------------|
| `get_balance` | Check account EntryPoint deposit |
| `get_policy_state` | View budget caps and current spend |
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

## Tools reference

| Tool | Description |
|------|-------------|
| get_balance | Account EntryPoint deposit |
| get_policy_state | BudgetPolicy caps and spend |
| set_budget_caps | Set BudgetPolicy caps (owner only) |
| resolve_intent | Resolve intent to execution plan |
| get_analytics | Account P&L, spend patterns |
| get_credit_score | Credit score for account |
| get_recommendations | Provider recommendations |
| fleet_summary | Fleet overview |
| fleet_accounts | Fleet account list |
| fleet_alerts | Fleet on-chain alerts |
| credit_state | CreditFacility state |
| escrow_state | ConditionalEscrow state |
| splitter_state | RevenueSplitter state |
| sla_state | SLAContract state |

See also [Installing skills](../skills/installing) for OpenClaw skill packs (optional context, not a substitute for MCP).
