# AEP Cookbook

Single reference for AEP deployment, policies, integration, and operations. For detailed guidance, see the skills in `skills/`.

> [!IMPORTANT]
> Never commit `PRIVATE_KEY` or expose it in logs. Use environment variables or a secure key manager. Prefer `PRIVATE_KEY` env over `--private-key` flag (avoids process listing). Use hardware wallet for production.

---

## Quick Start

1. **Deploy factory:** `cd contracts && forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast` (requires .env with PRIVATE_KEY, BASE_SEPOLIA_RPC) → note factory address
2. **Deploy account:** `aep deploy --factory 0xFactoryAddress` (owner derived from PRIVATE_KEY) or `aep deploy --owner 0x... --factory 0x...`
3. **Set policies:** `aep policy-set -m <module> --max-per-tx 1000000 --max-daily 5000000 --max-weekly 20000000` (get module via `aep modules`)
4. **Optional — relationships:** `cd contracts && forge script script/DeployRelationships.s.sol --rpc-url base_sepolia --broadcast` (treasury derived from PRIVATE_KEY) → add factory addresses to `~/.aep/config.json`
5. **Optional — intent resolution:** `cd packages/indexer && pnpm run build && node dist/cli.js sync` (index at `~/.aep/index/`)
6. **Optional — API:** `cd packages/api && pnpm run build && node dist/index.js` (POST /resolve on port 3847)

**Full config** (`~/.aep/config.json`): `factoryAddress`, `rpcUrl`, `account` (from deploy); for counterparty: `identityRegistryAddress`, `reputationRegistryAddress`; for execute: `bundlerRpcUrl`; for resolve: `indexPath`; for relationships: `creditFacilityFactoryAddress`, `escrowFactoryAddress`, `revenueSplitterFactoryAddress`, `slaFactoryAddress`; for monitor: `monitor.accounts`, `monitor.facilities`, `monitor.slas`, `monitor.webhookUrl`, `monitor.pollIntervalMs`; for fleet: `fleets`.

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
| Execute UserOp | `aep execute -t 0xRecipient -v 1000000 -d 0x --bundler https://...` |

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

**Skills:** [aep-budget](../skills/aep-budget/SKILL.md), [aep-rate-limit](../skills/aep-rate-limit/SKILL.md)

### CounterpartyPolicy

- **Default:** All allowed except block list
- **Address allow list:** Only allowlisted addresses
- **Agent allow list:** Only wallets of allowed ERC-8004 agent IDs
- **Global min-reputation:** Only verified agents with reputation >= min

**Skill:** [aep-counterparty](../skills/aep-counterparty/SKILL.md)

### RateLimitPolicy

`aep rate-limit set -m <module> --max-tx <n> --window-seconds <s>` — set max transactions per window (owner only). Example: `aep rate-limit set -m 0x... --max-tx 10 --window-seconds 3600` (10 tx/hour).

**Skill:** [aep-rate-limit](../skills/aep-rate-limit/SKILL.md)

---

## Deployment

**Full testnet deployment:** See [Deployment guide](guides/deployment.md) for `deploy-base-sepolia.sh`, deployed addresses, mainnet preflight, and post-deploy services.

### Base Sepolia Addresses

| Contract | Address |
|----------|---------|
| EntryPoint v0.7 | 0x0000000071727De22E5E9d8BAf0edAc6f37da032 |
| Identity Registry (ERC-8004) | 0x8004A818BFB912233c491871b3d84c89A494BD9e |
| Reputation Registry (ERC-8004) | 0x8004B663056A597Dffe9eCcC1965A193B7388713 |
| Validation Registry (ERC-8004) | 0x8004Cb1BF31DAf7788923b405b754f57acEB4272 |
| USDC | 0x036CbD53842c5426634e7929541eC2318f3dCF7e |
| AEPAccountFactory | Deploy via Deploy.s.sol |
| CreditFacilityFactory | Deploy via DeployRelationships.s.sol |
| ConditionalEscrowFactory | Deploy via DeployRelationships.s.sol |
| RevenueSplitterFactory | Deploy via DeployRelationships.s.sol |
| SLAContractFactory | Deploy via DeployRelationships.s.sol |

**Skill:** [aep-deploy](../skills/aep-deploy/SKILL.md)

---

## Integration

### MCP Config

```json title="~/.cursor/mcp.json"
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

### OpenClaw Skills

```bash
cp -r skills/aep-budget skills/aep-counterparty skills/aep-x402 skills/aep-rate-limit skills/aep-relationships ~/.openclaw/skills/
```

Or symlink: `ln -s /path/to/AEP/skills/aep-budget ~/.openclaw/skills/aep-budget` (and similarly for aep-counterparty, aep-x402, aep-rate-limit, aep-relationships)

**Skill:** [aep-integration](../skills/aep-integration/SKILL.md)

---

## Economic Relationships

| Contract | CLI prefix |
|----------|------------|
| CreditFacility | `aep credit` |
| ConditionalEscrow | `aep escrow` |
| RevenueSplitter | `aep splitter` |
| SLAContract | `aep sla` |

MCP tools: `credit_state`, `escrow_state`, `splitter_state`, `sla_state`.

> [!WARNING]
> **Validator selection:** Escrow and SLA contracts rely on validator honesty. Use reputable validators; consider multi-sig for high-value flows. See [THREAT-MODEL § Validator Selection](THREAT-MODEL.md#validator-selection).

**Skill:** [aep-relationships](../skills/aep-relationships/SKILL.md)

---

## Monetization

- **Treasury:** `treasuryAddress` in `~/.aep/config.json` or `AEP_TREASURY_ADDRESS` env
- **API paywall:** Set `AEP_TREASURY_ADDRESS` (or `treasuryAddress` in config) and `AEP_RESOLVE_PRICE` to gate `POST /resolve` via x402
- **Relationship fees:** `--origination-fee` (credit), `--setup-fee` (escrow, SLA). Use 0 for no fee.
- **Fee-free mode:** Deploy relationship factories with `AEP_TREASURY_ADDRESS` unset

### Resolution paths and paywall

| Path | Paywall | Use case |
|------|---------|----------|
| **Managed API** (`POST /resolve`) | Yes, when treasury set | Hosted resolution service |
| **MCP** (`resolve_intent`) | No | Self-hosted agents; uses local resolver |
| **CLI** (`aep resolve`) | No | Local resolver. Use `aep resolve --api-url <url>` to call managed API (paywalled when enabled) |

**Skill:** [aep-monetization](../skills/aep-monetization/SKILL.md)

---

## Fleet Management

Manage multiple AEP accounts as a fleet. Config in `~/.aep/config.json`:

```json
{
  "fleets": {
    "fleet-1": {
      "accounts": ["0x...", "0x..."],
      "name": "Production Agents"
    }
  }
}
```

| Command | Description |
|---------|-------------|
| `aep fleet list` | List configured fleets |
| `aep fleet summary <id>` | Aggregate analytics for fleet |
| `aep fleet freeze <id>` | Freeze all accounts (PRIVATE_KEY = owner) |

API: `GET /fleet/:id/summary`, `/fleet/:id/accounts`, `/fleet/:id/alerts`. When `AEP_FLEET_API_KEY` is set, these require `Authorization: Bearer <key>` or `X-Fleet-API-Key`.

---

## On-Chain Event Monitor

Run `aep monitor` to watch for security-relevant events (Frozen, DefaultDeclared, BreachDeclared, PolicyRecordSpendFailed, UserOperationRevertReason). Alerts emitted as JSON lines to stdout; optional webhook POST.

**Config** (`~/.aep/config.json`):

```json
{
  "monitor": {
    "accounts": ["0x..."],
    "facilities": ["0x..."],
    "slas": ["0x..."],
    "webhookUrl": "https://...",
    "pollIntervalMs": 12000
  }
}
```

If `monitor` is omitted, uses `account` for accounts. See [INCIDENT-RESPONSE-PLAYBOOK](INCIDENT-RESPONSE-PLAYBOOK.md).

---

## Key Management

> [!CAUTION]
> **Owner (cold):** Master key — upgrades, policy changes, emergency freeze. Store in hardware wallet. Compromise allows full account control.

- **Kill switch:** `aep freeze` blocks all execution on suspected compromise.
- **Operator/session keys:** Deferred; owner-only implemented.

**Skill:** [aep-key-management](../skills/aep-key-management/SKILL.md)

---

## Links

- [Architecture](ARCHITECTURE.md) — Contract hierarchy, validateUserOp flow
- [Threat Model](THREAT-MODEL.md) — Attack surfaces and mitigations
- [Deployment](guides/deployment.md) — Sepolia, mainnet, validation, local services
