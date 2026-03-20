---
name: aep-integration
description: AEP integration: MCP setup, OpenClaw skills, execute UserOp. Use when configuring MCP server, adding AEP skills to OpenClaw, or executing UserOps via bundler.
compatibility: Requires aep CLI. Set AEP_KEYSTORE_ACCOUNT (preferred) or PRIVATE_KEY for policy updates. Base Sepolia or Base mainnet.
metadata:
  version: 1.0.0
  openclaw:
    emoji: "🔌"
    requires:
      bins: ["aep"]
    install:
      - id: pnpm
        kind: pnpm
        packages: ["@economicagents/cli"]
        bins: ["aep"]
        label: "Install AEP CLI (pnpm)"
---

# AEP Integration

## When to Use

- User wants to add AEP MCP server to Cursor
- User needs to add AEP skills to OpenClaw
- User asks about execute UserOp, bundler, or integration setup

## MCP Setup

Add to your MCP config (e.g., Cursor):

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

Ensure `~/.aep/config.json` has `account` and `rpcUrl`. Set `AEP_KEYSTORE_ACCOUNT` (preferred) or `PRIVATE_KEY` for `set_budget_caps`.

**Tools:** `get_balance`, `get_policy_state`, `set_budget_caps`, `resolve_intent`, `get_analytics`, `get_credit_score`, `get_recommendations`, `fleet_summary`, `fleet_accounts`, `fleet_alerts`, `credit_state`, `escrow_state`, `splitter_state`, `sla_state`.

## OpenClaw Setup

### Install AEP CLI

```bash
pnpm add -g @economicagents/cli
```

Or build from a [local clone](https://github.com/economicagents/AEP) of the repository:

```bash
cd packages/cli && pnpm run build
# Add to PATH or use: pnpm exec aep (from repo root)
```

### Add AEP Skills to OpenClaw

Copy the skill directories to OpenClaw's skills location:

```bash
cp -r skills/aep-budget skills/aep-counterparty skills/aep-x402 skills/aep-rate-limit \
  skills/aep-relationships skills/aep-deploy skills/aep-monetization skills/aep-integration \
  skills/aep-intent-resolution skills/aep-monitor skills/aep-fleet skills/aep-graph skills/aep-indexer \
  ~/.openclaw/skills/
```

Or symlink from the AEP repo for each skill.

### OpenClaw Config

Ensure `~/.aep/config.json` has `account` and `rpcUrl`. Set `AEP_KEYSTORE_ACCOUNT` (preferred) or `PRIVATE_KEY` for policy updates. OpenClaw will load the skills and use the `aep` CLI for budget and counterparty management.

## Execute UserOp

Requires a bundler RPC URL (e.g., Pimlico, Stackup).

```bash
aep execute -t 0xRecipient -v 1000000 -d 0x --bundler https://...
```

Or via SDK:

```typescript
import { execute } from "@economicagents/sdk";

const hash = await execute(
  [{ to: recipient, value: amount, data: "0x" }],
  { account, privateKey, rpcUrl, bundlerRpcUrl, entryPointAddress }
);
```

## REST API (self-hosted, optional x402)

```bash
cd packages/api
pnpm run build
# Without treasury / pricing → no x402 gate on POST /resolve
node dist/index.js

# With x402 paywall on POST /resolve
AEP_TREASURY_ADDRESS=0x... AEP_RESOLVE_PRICE=0.005 node dist/index.js
```

## Intent Resolution

Sync the provider index before using `aep resolve` or MCP `resolve_intent`:

```bash
aep-index sync [--rpc <url>] [--probe-x402]
```

From a local clone: `cd packages/indexer && pnpm run build && node dist/cli.js sync`

Optionally run `aep-index embed` for semantic capability matching. Index stored at `~/.aep/index/` by default.

## Config Validation

Validate config format and paths before operations:

```bash
aep config validate
```

## Examples

**Example 1: Add AEP MCP to Cursor**

**Scenario:** Add the AEP MCP server to Cursor.

Steps:
1. Add MCP config with `command: node`, `args: [path/to/packages/mcp/dist/index.js]`
2. Ensure `~/.aep/config.json` has `account`, `rpcUrl`, `factoryAddress`
3. Set `PRIVATE_KEY` for policy updates

Result: MCP connected; tools `get_balance`, `get_policy_state`, `set_budget_caps`, etc. available.

**Example 2: Execute a payment via bundler**

**Scenario:** Send 0.001 ETH to a recipient via UserOp.

Steps:
1. Add `bundlerRpcUrl` to `~/.aep/config.json`
2. Run `aep execute -t 0xRecipient -v 1000000000000000 -d 0x --bundler https://...`

Result: UserOp submitted; transaction hash returned.

## Troubleshooting

**Error: MCP connection refused or "Could not connect"**

Cause: MCP server not running or path incorrect.

Solution:
1. Verify path: `packages/mcp/dist/index.js` exists (run `pnpm run build` in packages/mcp)
2. Check Cursor Settings > Extensions > MCP for connection status
3. Ensure Node.js can execute the path

**Error: Config validation fails**

Cause: Missing or invalid `~/.aep/config.json`.

Solution: Run `aep config validate` to see specific errors. Required: `account`, `rpcUrl`, `factoryAddress`. Deploy first via `aep deploy` if no account exists.

**Error: set_budget_caps fails**

Cause: `PRIVATE_KEY` not set or signer is not account owner.

Solution: Set `PRIVATE_KEY` env var. Only the account owner can update policy modules.

## Links

- [Cookbook](../../docs/COOKBOOK.md)
- [aep-budget](../aep-budget/SKILL.md)
- [aep-counterparty](../aep-counterparty/SKILL.md)
- [aep-x402](../aep-x402/SKILL.md)
- [aep-relationships](../aep-relationships/SKILL.md)
