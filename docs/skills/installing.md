# Installing skills

**Optional:** Wire repo skill packs into OpenClaw or Cursor MCP. Skip this if you only use the SDK or CLI from npm.

## OpenClaw

Copy or symlink skills to `~/.openclaw/skills/`:

```bash
cp -r skills/aep-budget skills/aep-counterparty skills/aep-x402 skills/aep-mpp skills/aep-rate-limit skills/aep-relationships ~/.openclaw/skills/
```

Or symlink from repo:

```bash
ln -s /path/to/AEP/skills/aep-budget ~/.openclaw/skills/aep-budget
ln -s /path/to/AEP/skills/aep-counterparty ~/.openclaw/skills/aep-counterparty
ln -s /path/to/AEP/skills/aep-x402 ~/.openclaw/skills/aep-x402
ln -s /path/to/AEP/skills/aep-mpp ~/.openclaw/skills/aep-mpp
ln -s /path/to/AEP/skills/aep-rate-limit ~/.openclaw/skills/aep-rate-limit
ln -s /path/to/AEP/skills/aep-relationships ~/.openclaw/skills/aep-relationships
```

## Cursor (MCP)

MCP tools are provided by the AEP MCP server. Add to `~/.cursor/mcp.json`:

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

Skills provide additional context for agents; the MCP server exposes the tools (`get_balance`, `get_policy_state`, `set_budget_caps`, `resolve_intent`, etc.).

## Install AEP CLI

Most skills require the AEP CLI:

```bash
pnpm add -g @economicagents/cli
```

Set `PRIVATE_KEY` for deploy, policy-set, and execute operations.

## Next Steps

- [Available Skills](skills/available) — Full list
- [aep-budget](skills/aep-budget) — Budget management
