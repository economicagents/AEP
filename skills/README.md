# AEP skills

Optional **markdown skill packs** for Cursor, Claude Code, OpenClaw, and similar tools. They complement the main integration path (**SDK**, **CLI**, **contracts**); you do not need them to build on AEP.

**Typical requirements:** `aep` CLI where noted, Foundry `forge` for deploy skills, and `PRIVATE_KEY` / keystore only for operations that sign. Chains: Base Sepolia or Base mainnet unless stated otherwise.

## Trigger Phrase Index

| Trigger | Skill |
|---------|-------|
| budget, spend limits, policy check, freeze | aep-budget |
| rate limit, tx per window, throttling | aep-rate-limit |
| counterparty, allow list, block list, reputation | aep-counterparty |
| x402, 402 Payment Required, payment interception | aep-x402 |
| deploy, factory, forge script, config setup | aep-deploy |
| MCP, OpenClaw, execute UserOp, bundler | aep-integration |
| index sync, aep-index, provider crawl, probe | aep-indexer |
| resolve intent, aep resolve, execution plan | aep-intent-resolution |
| credit, escrow, revenue splitter, SLA | aep-relationships |
| monitor, Frozen, DefaultDeclared, BreachDeclared | aep-monitor |
| fleet, fleet summary, fleet alerts | aep-fleet |
| graph, analytics, credit score, recommendations | aep-graph |
| treasury, fees, paywall, origination fee | aep-monetization |
| key hierarchy, kill switch, emergency freeze | aep-key-management |
| formal verification, Halmos, Certora, invariant | aep-formal-verification |

## Budget & Policies

| Skill | Description |
|-------|-------------|
| [aep-budget](aep-budget/SKILL.md) | Budget caps, policy check, freeze/unfreeze |
| [aep-rate-limit](aep-rate-limit/SKILL.md) | RateLimitPolicy — max tx per window |
| [aep-counterparty](aep-counterparty/SKILL.md) | Allow/block lists, min-reputation |
| [aep-x402](aep-x402/SKILL.md) | x402 payment interception, policy check before signing |

## Deployment & Integration

| Skill | Description |
|-------|-------------|
| [aep-deploy](aep-deploy/SKILL.md) | Deploy factory, accounts, relationship contracts |
| [aep-integration](aep-integration/SKILL.md) | MCP setup, OpenClaw skills, execute UserOp |

## Intent Resolution & Index

| Skill | Description |
|-------|-------------|
| [aep-indexer](aep-indexer/SKILL.md) | Provider index sync, BM25/vector search, provider probe |
| [aep-intent-resolution](aep-intent-resolution/SKILL.md) | Resolve intents to execution plans |

## Economic Relationships

| Skill | Description |
|-------|-------------|
| [aep-relationships](aep-relationships/SKILL.md) | CreditFacility, Escrow, RevenueSplitter, SLA |

## Operations & Analytics

| Skill | Description |
|-------|-------------|
| [aep-monitor](aep-monitor/SKILL.md) | On-chain event monitoring |
| [aep-fleet](aep-fleet/SKILL.md) | Fleet management |
| [aep-graph](aep-graph/SKILL.md) | Economic graph, analytics, credit score, recommendations |

## Other

| Skill | Description |
|-------|-------------|
| [aep-monetization](aep-monetization/SKILL.md) | Treasury, fees, API paywall |
| [aep-key-management](aep-key-management/SKILL.md) | Key hierarchy, kill switch |
| [aep-formal-verification](aep-formal-verification/SKILL.md) | Formal verification (in progress) |

## OpenClaw

Copy skills to `~/.openclaw/skills/` or symlink from this directory. See [aep-integration](aep-integration/SKILL.md).
