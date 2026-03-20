# CLI Commands Reference

Full reference for `aep` CLI commands.

## Account

| Command | Description |
|---------|-------------|
| `aep deploy` | Deploy a new AEP account |
| `aep address` | Get predicted account address |
| `aep balance` | Get account deposit (EntryPoint balance) |
| `aep freeze` | Freeze account (blocks all operations) |
| `aep unfreeze` | Unfreeze account |

### deploy

```bash
aep deploy --factory <address> [--owner <address>] [--salt <hex>] [-r <rpc>] [-k <private-key>]
```

Deploy a new AEP account. Owner derived from PRIVATE_KEY when `--owner` omitted.

### address

```bash
aep address --factory <address> [--owner <address>] [--salt <hex>] [-r <rpc>]
```

Get predicted CREATE2 address before deploy.

---

## Config

| Command | Description |
|---------|-------------|
| `aep config validate` | Validate ~/.aep/config.json |

---

## Policy

| Command | Description |
|---------|-------------|
| `aep modules` | List policy module addresses |
| `aep policy-get` | Get BudgetPolicy state (caps and spend) |
| `aep policy-set` | Set BudgetPolicy caps (owner only) |
| `aep rate-limit` | RateLimitPolicy configuration |
| `aep counterparty` | CounterpartyPolicy (allowlist, blocklist, min-reputation) |
| `aep check-policy` | Check if payment would pass policy (x402) |

### policy-set

```bash
aep policy-set -m <module> --max-per-tx <n> --max-daily <n> [--max-weekly <n>] [--full --max-per-task <n> --task-window <s>]
```

### rate-limit set

```bash
aep rate-limit set -m <module> --max-tx <n> --window-seconds <s>
```

### counterparty

Subcommands: `add-block`, `remove-block`, `add-allow`, `remove-allow`, `set-use-allow-list`, `set-use-agent-allow-list`, `set-min-reputation`, `add-agent-allow`, `clear-agent-allow`, `add-verified-agent`, `remove-verified-agent`.

---

## Execution

| Command | Description |
|---------|-------------|
| `aep execute` | Build, sign, submit UserOp via bundler |

```bash
aep execute -t <recipient> -v <amount> -d <calldata> [--bundler <url>]
```

---

## Intent Resolution

| Command | Description |
|---------|-------------|
| `aep resolve` | Resolve intent to execution plan |

```bash
aep resolve '{"capability":"image-generation","budget":{"max_per_unit":"0.01","max_total":"1.00"}}'
```

Use `--api-url <url>` to call managed API (paywalled when enabled).

---

## Graph & Analytics

| Command | Description |
|---------|-------------|
| `aep graph sync` | Sync economic graph to SQLite |
| `aep analytics` | Account analytics |
| `aep credit-score` | Credit score for account |
| `aep recommendations` | Provider recommendations |

---

## Fleet

| Command | Description |
|---------|-------------|
| `aep fleet list` | List configured fleets |
| `aep fleet summary <id>` | Fleet aggregate analytics |
| `aep fleet alerts <id>` | Fleet on-chain alerts |
| `aep fleet freeze <id>` | Freeze all accounts in fleet |

---

## Monitor

| Command | Description |
|---------|-------------|
| `aep monitor` | On-chain event monitoring |

Watches for Frozen, DefaultDeclared, BreachDeclared, PolicyRecordSpendFailed, UserOperationRevertReason. Optional webhook POST via config.

---

## Economic Relationships

| Command | Description |
|---------|-------------|
| `aep credit` | Credit facility (create, deposit, draw, repay, etc.) |
| `aep escrow` | Conditional escrow (create, fund, release, etc.) |
| `aep splitter` | Revenue splitter (create, distribute) |
| `aep sla` | SLA contract (create, stake, declare breach, unstake) |

---

## Provider

| Command | Description |
|---------|-------------|
| `aep provider probe <url>` | Probe provider x402 endpoint |
| `aep provider probe --agent-id <id>` | Probe by ERC-8004 agent ID |

---

## Global Options

| Option | Description |
|-------|-------------|
| `-r, --rpc <url>` | RPC URL |
| `-k, --private-key <key>` | Private key (env: PRIVATE_KEY) |
