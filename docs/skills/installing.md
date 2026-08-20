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

MCP tools are provided by **`@economicagents/mcp`** on npm (registry **0.2.0**). Add to `~/.cursor/mcp.json`:

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

Skills provide additional context for agents; the MCP server exposes the tools (`get_balance`, `get_policy_state`, `set_budget_caps`, `resolve_intent`, etc.). Full tool list: [MCP reference](../reference/mcp).

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

Build first: `cd packages/mcp && pnpm run build`.

## Install AEP CLI

Most skills require the AEP CLI. Prefer npx (no global install):

```bash
npx @economicagents/cli@0.2.0 --help
```

Or: `npm install -g @economicagents/cli@0.2.0`

Set `PRIVATE_KEY` or `AEP_KEYSTORE_ACCOUNT` for deploy, policy-set, and execute operations.

## Next steps

- [Available skills](skills/available) — Full list
- [aep-budget](../skills/aep-budget) — Budget management
