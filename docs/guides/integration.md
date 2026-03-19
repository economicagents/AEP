# Integration

MCP, OpenClaw, and execute UserOp integration.

> [!IMPORTANT]
> Never commit `PRIVATE_KEY` or expose it in logs. Use environment variables or a secure key manager.

---

## MCP Config

Add the AEP MCP server to Cursor or compatible IDE:

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

Tools: `get_balance`, `get_policy_state`, `set_budget_caps`, `resolve_intent`, `get_analytics`, `get_credit_score`, `get_recommendations`, `fleet_summary`, `fleet_accounts`, `fleet_alerts`, `credit_state`, `escrow_state`, `splitter_state`, `sla_state`.

See [MCP Tools](reference/mcp) for full reference.

---

## OpenClaw Skills

```bash
cp -r skills/aep-budget skills/aep-counterparty skills/aep-x402 skills/aep-rate-limit skills/aep-relationships ~/.openclaw/skills/
```

Or symlink: `ln -s /path/to/AEP/skills/aep-budget ~/.openclaw/skills/aep-budget` (and similarly for aep-counterparty, aep-x402, aep-rate-limit, aep-relationships)

See [Installing Skills](skills/installing).

---

## Execute UserOp

```bash
aep execute -t 0xRecipient -v 1000000 -d 0x --bundler https://...
```

Requires `bundlerRpcUrl` in config or `--bundler` flag.

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy factory | `cd contracts && forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast` |
| Deploy account | `aep deploy --factory 0x...` (or `--owner 0x...`) |
| Set budget caps | `aep policy-set -m <module> --max-per-tx 1000000 --max-daily 5000000 --max-weekly 20000000` |
| Block address | `aep counterparty add-block 0x... -m <module>` |
| Allow list mode | `aep counterparty set-use-allow-list true -m <module>` |
| Check policy (x402) | `aep check-policy -a 500000 -t 0xRecipient` |
| Emergency freeze | `aep freeze` |
| On-chain monitor | `aep monitor` |
| Provider probe | `aep provider probe <url>` or `aep provider probe --agent-id <id>` |

---

## Policy Modules

### BudgetPolicy

| Cap | Description | 0 = |
|-----|-------------|-----|
| maxPerTx | Max per transaction | Unlimited |
| maxDaily | Max per daily window | Unlimited |
| maxWeekly | Max per weekly window | Unlimited |
| maxPerTask | Max per task window | Disabled |
| taskWindowSeconds | Task window length | Disabled |

### CounterpartyPolicy

- **Default:** All allowed except block list
- **Address allow list:** Only allowlisted addresses
- **Agent allow list:** Only wallets of allowed ERC-8004 agent IDs
- **Global min-reputation:** Only verified agents with reputation >= min

### RateLimitPolicy

`aep rate-limit set -m <module> --max-tx <n> --window-seconds <s>`

---

## Economic Relationships

| Contract | CLI prefix |
|----------|------------|
| CreditFacility | `aep credit` |
| ConditionalEscrow | `aep escrow` |
| RevenueSplitter | `aep splitter` |
| SLAContract | `aep sla` |

MCP tools: `credit_state`, `escrow_state`, `splitter_state`, `sla_state`.
