# @economicagents/mcp

[MCP](https://modelcontextprotocol.io/) (Model Context Protocol) server for AEP: budget tools, intent resolution, analytics, fleet, and economic relationship readouts. Use with Cursor, Claude Desktop, or any MCP-capable client.

## Install

**npm (registry 0.2.0):**

```bash
npx @economicagents/mcp@0.2.0
npm install -g @economicagents/mcp@0.2.0   # bin: aep-mcp
```

**From monorepo:**

```bash
pnpm add @economicagents/mcp
cd packages/mcp && pnpm run build
```

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

**Cursor / IDE MCP config (recommended):**

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

**From a local clone** (contributors):

```bash
cd packages/mcp && pnpm run build && node dist/index.js
```

```json
{
  "mcpServers": {
    "aep": {
      "command": "node",
      "args": ["<path-to-clone>/packages/mcp/dist/index.js"]
    }
  }
}
```

Requires `~/.aep/config.json` (deploy an account first — see [Quick start](https://github.com/economicagents/AEP/blob/main/docs/getting-started/quickstart.md)). Intent resolution needs a synced index or self-hosted REST API.

## Build & test

```bash
pnpm run build
```

## Documentation

- [MCP reference](https://github.com/economicagents/AEP/blob/main/docs/reference/mcp.md)
- [Integration guide](https://github.com/economicagents/AEP/blob/main/docs/guides/integration.md)
