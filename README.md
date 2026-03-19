# Agent Economic Protocol (AEP)

The runtime layer for economic agent commerce. AEP turns autonomous agents from blind spenders into rational economic actors by embedding budget governance, counterparty rules, and persistent economic relationships into on-chain infrastructure.

**Builds on:** ERC-4337 · ERC-8004 · x402

**Canonical source:** [`github.com/economicagents/AEP`](https://github.com/economicagents/AEP) — this repository is the full monorepo (contracts, all `packages/*`, docs, CI). If your checkout looks “empty” under `contracts/lib/erc-8004-contracts`, you cloned **without submodules**; see [Clone](#clone) below.

---

## Clone

The ERC-8004 contracts are a **Git submodule**. A plain `git clone` leaves `contracts/lib/erc-8004-contracts` empty and **Foundry will not build** until submodules are initialized.

```bash
git clone --recurse-submodules https://github.com/economicagents/AEP.git
cd AEP
```

Already cloned without submodules:

```bash
git submodule update --init --recursive
```

From repo root you can also run:

```bash
./scripts/bootstrap-repo.sh
```

That initializes submodules, runs `forge build` in `contracts/`, then `pnpm install` and `pnpm run build`.

---

## Repo Hierarchy

```
AEP/
├── contracts/           # Foundry (Solidity)
│   ├── src/
│   │   ├── AEPAccount.sol         # ERC-4337 smart account + policy orchestration
│   │   ├── AEPAccountFactory.sol  # CREATE2 deployment
│   │   ├── policies/              # BudgetPolicy, CounterpartyPolicy, RateLimitPolicy
│   │   ├── libraries/             # PaymentDecoder
│   │   ├── interfaces/
│   │   └── vendor/                # Vendored ERC-4337 core (eth-infinitism v0.7)
│   ├── script/Deploy.s.sol
│   └── test/
├── packages/
│   ├── sdk/            # TypeScript (viem) — account, policy, x402 interceptor, execute, intent schema
│   ├── cli/            # Commander — deploy, policy, execute, resolve, fleet, monitor, relationships
│   ├── indexer/        # Provider discovery — syncs ERC-8004 to local index (aep-index sync)
│   ├── graph/          # Economic graph — syncs payments, credit events to graph.db; credit score, recommendations
│   ├── resolver/       # Intent resolution — discover, filter, score, plan (+ recommendation boost)
│   ├── monitor/        # On-chain event monitor — Frozen, DefaultDeclared, BreachDeclared, etc.
│   ├── mcp/            # MCP server — budget, resolve_intent, analytics, fleet, relationships
│   ├── api/            # REST API — POST /resolve, GET /analytics/*, GET /fleet/*, POST /probe, POST /graphql
│   ├── benchmark/      # Benchmark harness — AEP-resolved vs naive (cost, latency, quality)
│   └── web/            # Landing page + docs site (Next.js)
├── docs/
│   ├── ARCHITECTURE.md, THREAT-MODEL.md, deployment.md
│   ├── COOKBOOK.md      # Consolidated reference
│   └── BACKLOG.md       # Deferred work, limitations
├── skills/
│   ├── aep-budget/, aep-counterparty/, aep-x402/, aep-rate-limit/
│   ├── aep-deploy/, aep-integration/, aep-intent-resolution/, aep-indexer/
│   ├── aep-relationships/, aep-monitor/, aep-fleet/, aep-graph/
│   ├── aep-monetization/, aep-key-management/, aep-formal-verification/
│   └── README.md
├── audit-report.md     # AI-assisted security review (post-remediation); not a third-party audit
└── LICENSE
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **Foundry** (forge, anvil)
- **Indexer (optional):** For BM25 search, `better-sqlite3` (v12+) is an optional dep with prebuilt binaries for Node 18–24. If unavailable, the indexer falls back to legacy keyword discovery. `sqlite-vec` is optional for future vector search.

### Build & Test

```bash
# Full test suite (contracts + packages, from repo root)
pnpm install
pnpm run build
pnpm run test

# Or run individually:
pnpm run test:contracts   # forge test -vvv (from contracts/)
pnpm run test:packages   # vitest for sdk, indexer, graph, resolver, monitor
```

### Install from npm (consumers)

Maintainers publish **`@economicagents/*`** libraries (including **`@economicagents/cli`**, which installs the **`aep`** command) to the public registry; see [docs/PUBLISHING.md](docs/PUBLISHING.md) and `pnpm run publish:packages` / `publish:packages:dry-run` in this repo.

```bash
npm install -g @economicagents/cli
aep --help
```

In an application:

```bash
npm install @economicagents/sdk viem zod
```

The docs site package **`@economicagents/web`** is not published; deploy it from source (e.g. Cloudflare / Vercel) if you self-host the marketing site.

```bash
# Contracts only (from contracts/)
cd contracts
forge build
forge test -vvv
forge fmt --check
```

### Deploy (Base Sepolia)

Copy `.env.example` to `.env`, fill `PRIVATE_KEY`, then symlink for forge: `ln -sf ../.env contracts/.env`. Never commit `.env`; use `chmod 600 .env`.

**Full hosted deployment:** `./scripts/deploy-base-sepolia.sh` — deploys factories, first account, and generates config. See [docs/TESTNET-DEPLOYMENT.md](docs/TESTNET-DEPLOYMENT.md) for post-deploy phases and testing.

1. Deploy factory and implementation (manual):

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
```

2. Use the printed factory address with the CLI:

```bash
aep deploy --factory 0xFactoryAddress
```

**EntryPoint v0.7:** `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `aep deploy` | Deploy new AEP account (requires `--factory`; owner derived from `PRIVATE_KEY`) |
| `aep address` | Get predicted CREATE2 address |
| `aep config validate` | Validate config.json format, paths, addresses |
| `aep balance` | Get EntryPoint deposit |
| `aep check-policy` | Check if payment would pass policy (for x402) |
| `aep freeze` / `aep unfreeze` | Kill switch — block all operations |
| `aep modules` | List policy module addresses |
| `aep policy-get` | Read BudgetPolicy caps and spend |
| `aep policy-set` | Update BudgetPolicy caps (use `--full` for per-task and window params) |
| `aep execute` | Build, sign, submit UserOp via bundler (requires `--bundler`, `--to`) |
| `aep counterparty set-reputation-registry` | Set CounterpartyPolicy reputation registry |
| `aep counterparty set-identity-registry` | Set IdentityRegistry for agent allowlist |
| `aep counterparty set-min-reputation` | Set min-reputation threshold |
| `aep counterparty add-allow` / `remove-allow` | Address allow list |
| `aep counterparty add-block` / `remove-block` | Block list |
| `aep counterparty add-agent-allow` / `clear-agent-allow` | Agent allow list |
| `aep counterparty set-use-allow-list` / `set-use-agent-allow-list` | Enable allow list modes |
| `aep counterparty set-use-global-min-reputation` | Enable global min-reputation (verified agents only) |
| `aep counterparty add-verified-agent` / `remove-verified-agent` | Verified set for global min-reputation |
| `aep counterparty reputation-summary` | Get reputation summary for an agent |
| `aep resolve` | Resolve intent to execution plan (requires synced index) |
| `aep graph sync` | Sync economic graph (payments, credit events) |
| `aep analytics <address>` | Get account analytics (P&L, spend patterns) |
| `aep credit-score <address>` | Get credit score |
| `aep recommendations <address>` | Get provider recommendations (collaborative filtering) |
| `aep fleet list` / `summary` / `alerts` / `freeze` | Fleet management (multi-account) |
| `aep provider probe <url>` | Probe provider health (x402, uptime) |
| `aep monitor` | On-chain event monitor (Frozen, DefaultDeclared, BreachDeclared) |
| `aep rate-limit set` | Set RateLimitPolicy (max tx per window) |
| `aep credit create/deposit/draw/repay/freeze/unfreeze/default/withdraw/state` | Credit facility |
| `aep escrow create/fund/acknowledge/submit-validation/release/dispute/state` | Conditional escrow |
| `aep splitter create/distribute/state` | Revenue splitter |
| `aep sla create/stake/breach/unstake/state` | SLA contract |

Config: `~/.aep/config.json` (created on first deploy). Override: `AEP_CONFIG_PATH`. Chain: `AEP_CHAIN_ID` (84532 Base Sepolia, 8453 Base mainnet). See [Cookbook](docs/COOKBOOK.md) for full config (counterparty, execute, resolve, relationships, monitor, fleet).

### Provider Index (Intent Resolution)

Sync the ERC-8004 provider index before using `aep resolve` or `resolve_intent`:

```bash
cd packages/indexer && pnpm run build && node dist/cli.js sync [--rpc <url>] [--index-path <path>] [--probe-x402]
```

Optionally run `aep-index embed` after sync for semantic capability matching (BM25 + vector search):

```bash
node dist/cli.js embed [--index-path <path>]
```

Index stored at `~/.aep/index/` by default. Sync builds an FTS5 (BM25) search index; embed adds vector embeddings for hybrid search.

### MCP Server

Run the AEP MCP server for agent budget management and intent resolution:

```bash
cd packages/mcp && pnpm run build && node dist/index.js
```

Or add to Cursor/IDE MCP config. Tools: `get_balance`, `get_policy_state`, `set_budget_caps`, `resolve_intent`, `get_analytics`, `get_credit_score`, `get_recommendations`, `fleet_summary`, `fleet_accounts`, `fleet_alerts`, `credit_state`, `escrow_state`, `splitter_state`, `sla_state`. Requires `~/.aep/config.json`; `PRIVATE_KEY` for `set_budget_caps`.

### REST API

```bash
cd packages/api && pnpm run build && node dist/index.js
```

Port 3847 (override: `PORT`). Endpoints: POST /resolve, POST /resolve/premium, GET /analytics/*, GET /analytics/pro/*, GET /fleet/:id/summary|accounts|alerts, POST /probe, POST /graphql. x402 paywall when `AEP_TREASURY_ADDRESS` set.

---

## SDK Usage

```typescript
import {
  createAccount,
  getAccountAddress,
  checkPolicy,
  checkPolicyDetailed,
  getDeposit,
  setFrozen,
  getPolicyModules,
  getBudgetPolicyState,
  setBudgetCaps,
  execute,
  getReputationSummary,
  interceptPayment,
  intercept402Response,
  fetchWithPolicyCheck,
  baseSepolia,
  ERC8004_BASE_SEPOLIA,
} from "@economicagents/sdk";

// x402 interceptor — call before signing payment (returns BUDGET_EXCEEDED, COUNTERPARTY_BLOCKED, RATE_LIMIT, etc.)
const result = await interceptPayment(accountAddress, amount, recipient, { rpcUrl });
if (!result.allowed) console.log("Rejected:", result.reason);

// Or use fetchWithPolicyCheck to wrap fetch and intercept 402 responses
const fetchResult = await fetchWithPolicyCheck(accountAddress, url, undefined, { rpcUrl });

// Execute UserOp via bundler
const hash = await execute(
  [{ to: recipient, value: amount, data: "0x" }],
  { account, privateKey, rpcUrl, bundlerRpcUrl, entryPointAddress }
);
```

---

## Implementation Progress

| Scope | Status |
|-------|--------|
| **Economic Account** | **Complete** |
| | AEP Smart Account (ERC-4337 + policy modules) | ✅ |
| | BudgetPolicy (per-tx, daily, weekly, per-task, configurable windows), CounterpartyPolicy (allow/block lists, min-reputation), RateLimitPolicy | ✅ |
| | AEPAccountFactory (CREATE2, deployFromTemplate) | ✅ |
| | PolicyRegistry (template storage, deploy from template) | ✅ |
| | SDK + CLI | ✅ |
| | x402 interceptor (richer rejection reasons) | ✅ |
| | SDK execute (UserOp build/sign/submit) | ✅ |
| | MCP manage_budget (get_balance, get_policy_state, set_budget_caps) | ✅ |
| | ERC-8004 integration (IdentityRegistry, ReputationRegistry) | ✅ |
| **Intent Resolution** | **Complete** |
| | Intent schema (JSON, Zod) | ✅ |
| | Provider index (ERC-8004 crawl, reputation, x402 probe) | ✅ |
| | Hybrid capability search (BM25 + optional vector, RRF fusion) | ✅ |
| | Resolver (discover, filter, score, plan) | ✅ |
| | MCP resolve_intent | ✅ |
| | CLI aep resolve | ✅ |
| | Benchmark harness (cost, latency, quality) | ✅ |
| | REST API (POST /resolve) | ✅ |
| | Multi-step intent decomposition, max_total enforcement | ✅ |
| **Economic Relationships** | **Complete** |
| | CreditFacility, ConditionalEscrow (multi-milestone), RevenueSplitter, SLAContract | ✅ |
| | SDK, CLI (aep credit/escrow/splitter/sla), MCP (credit_state, escrow_state, splitter_state, sla_state) | ✅ |
| **Agent Economic Graph** | **Complete** |
| | Economic graph DB (packages/graph), credit scoring, analytics API, recommendation engine | ✅ |
| | Resolver recommendation boost (accountAddress + graphPath) | ✅ |
| **Monetization** | **Complete** |
| | Treasury, x402 paywall (Standard $0.005, Premium $0.02), relationship fees, fleet ($500/mo), Analytics Pro ($50/mo) | ✅ |

**ERC-8004 Base Sepolia:** IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713`, ValidationRegistry `0x8004Cb1BF31DAf7788923b405b754f57acEB4272`

See [Backlog](docs/BACKLOG.md) for deferred work and [Cookbook](docs/COOKBOOK.md) for operations.

---

## Monetization

Revenue streams: managed resolution API (x402 paywall), credit origination fees, escrow/SLA setup fees, fleet management, Analytics Pro. See [Cookbook](docs/COOKBOOK.md) and skills/aep-monetization.

- **API paywall:** Set `AEP_TREASURY_ADDRESS` to gate POST /resolve (Standard $0.005), POST /resolve/premium ($0.02).
- **Relationship fees:** `--origination-fee`, `--setup-fee` on `aep credit create`, `aep escrow create`, `aep sla create`.

---

## Deferred & Limitations

- **Deferred:** PostgreSQL/pgvector (index uses local JSON + SQLite); Python SDK; continuous provider health monitor (on-demand probe only); operator/session keys.
- **Limitations:** Indexer optional deps (`better-sqlite3`, `sqlite-vec`) fall back to legacy keyword discovery if unavailable. See [Backlog](docs/BACKLOG.md).

---

## Testing

- **Contracts:** 140 Foundry tests across 11 suites (AEPAccount, BudgetPolicy, CounterpartyPolicy, RateLimitPolicy, PaymentDecoder, PolicyRegistry, CreditFacility, ConditionalEscrow, RevenueSplitter, SLAContract, invariant)
- **SDK:** Vitest tests for x402 interceptor (`pnpm run test` in packages/sdk)
- **Indexer:** Vitest tests for search-store (`pnpm run test` in packages/indexer)
- **Resolver:** Vitest tests for discover (`pnpm run test` in packages/resolver)
- **CLI:** Manual verification via `pnpm run build` and `node dist/cli.js --help`
- **Benchmark:** `cd packages/benchmark && pnpm run benchmark` — compares AEP-resolved vs naive procurement

```bash
cd contracts
forge test -vvv
forge test --match-contract AEPAccountTest
forge test --match-contract BudgetPolicyTest
forge test --match-contract CounterpartyPolicyTest
forge test --match-contract RateLimitPolicyTest
forge test --match-contract PaymentDecoderTest
forge test --match-contract CreditFacilityTest
forge test --match-contract ConditionalEscrowTest
forge test --match-contract RevenueSplitterTest
forge test --match-contract SLAContractTest
```

---

## Smart contract security review

**Report:** [audit-report.md](audit-report.md) — **AI-assisted** deep review (methodology and limitations in the report). For production or high-value deployments, plan a **human-led third-party audit** in addition to your own review.

**Status:** Post-remediation. 0 Critical, 0 High, 0 Medium, 0 Low, 0 Informational in the latest revision (historical findings I-11 through I-14 remediated; see report tables).

---

## Best Practices

- **No external runtime deps:** User-provided RPC; no Alchemy, Infura, or hosted APIs
- **Forkable references only:** ERC-4337 core vendored from eth-infinitism; no third-party service lock-in
- **Config:** Factory address required for deploy/address; deploy factory first
- **Kill switch:** `aep freeze` blocks all operations; use on suspected key compromise

---

## Documentation

**User-facing** (hosted at [economicagents.org/docs](https://economicagents.org/docs) or via `pnpm run dev:web`):

- [Quick Start](docs/getting-started/quickstart.md) — 0 to AEP in 15 minutes
- [Cookbook](docs/COOKBOOK.md) — Deploy, policies, integration, economic relationships, fleet, monitor
- [Deployment](docs/deployment.md) — Base Sepolia and Base Mainnet
- [Architecture](docs/ARCHITECTURE.md) — Account, policy modules, factory, validateUserOp flow
- [Threat Model](docs/THREAT-MODEL.md) — Attack surfaces and mitigations
- [API Reference](docs/api.md) — REST API, intent schema, MCP tools, CLI commands

**Internal** (repo-only, for contributors):

- [Backlog](docs/BACKLOG.md) — Deferred work, limitations
- [Incident Response](docs/INCIDENT-RESPONSE-PLAYBOOK.md) — Security and ops procedures
- [Publishing](docs/PUBLISHING.md) — npm publish workflow
- [Open source release](docs/OPEN-SOURCE-RELEASE.md) — Pre-public checklist (secrets, history)
- [Testnet Deployment](docs/TESTNET-DEPLOYMENT.md) — Post-deploy phases
- [Mainnet Readiness](docs/MAINNET-READINESS.md) — Pre-launch checklist

- [Contributing](CONTRIBUTING.md) — How to contribute

## Security

See [docs/THREAT-MODEL.md](docs/THREAT-MODEL.md) for attack surfaces and mitigations.

---

## License

[Apache-2.0](LICENSE). Third-party and vendored components: [NOTICE](NOTICE).
