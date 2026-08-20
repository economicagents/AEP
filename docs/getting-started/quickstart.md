# Quick Start

**npm-first:** deploy an AEP account against the published canonical factory on Base Sepolia — no repo clone or Foundry required for step 1.

> [!NOTE]
> **Package versions:** `@economicagents/*` on the **npm registry** is **0.2.0** (August 2026). This repository's `main` branch is **0.3.0** — pin `@0.2.0` for what npm serves today, or `@latest` after the next publish. See [CLI installation](cli/installation).

Use Base Sepolia for testing. Mainnet uses the same factory address with `--rpc https://mainnet.base.org` (see [Supported chains](getting-started/supported-chains)).

---

## Prerequisites

- **Node.js** 18+
- A funded **EOA** on Base Sepolia (test ETH from a faucet)
- **`PRIVATE_KEY`** in your environment for deploy, policy updates, and execute (never commit it)
- **Foundry** only if you deploy your own factory — see [From source](#from-source-foundry) below

---

## 1. Verify the CLI

```bash
npx @economicagents/cli@0.2.0 --help
```

Optional global install: `npm install -g @economicagents/cli@0.2.0`

---

## 2. Deploy an account (published factory)

Canonical **AEPAccountFactory** (verified on Base Sepolia and Base mainnet):

`0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546`

```bash
export PRIVATE_KEY=0x...   # funded Sepolia key
export AEP_FACTORY=0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546

# Optional: predict CREATE2 address before broadcasting
npx @economicagents/cli@0.2.0 address \
  --factory "$AEP_FACTORY" \
  --rpc https://sepolia.base.org

# Deploy (writes ~/.aep/config.json)
npx @economicagents/cli@0.2.0 deploy \
  --factory "$AEP_FACTORY" \
  --rpc https://sepolia.base.org
```

Prefer a Foundry keystore over raw `PRIVATE_KEY`: `cast wallet import aep --interactive`, then `export AEP_KEYSTORE_ACCOUNT=aep` and use `-n aep` instead of `-k`.

---

## 3. Set budget policy

```bash
# Policy module addresses for your account
npx @economicagents/cli@0.2.0 modules

# Caps in USDC smallest units (6 decimals); owner-only
npx @economicagents/cli@0.2.0 policy-set \
  -m <BudgetPolicyModuleAddress> \
  --max-per-tx 1000000 \
  --max-daily 5000000 \
  --max-weekly 20000000
```

Validate config: `npx @economicagents/cli@0.2.0 config validate`

---

## 4. x402 → policy check → UserOp

Before signing an x402 payment (`Payment-Amount` / `Payment-To` headers), check on-chain policy:

```bash
npx @economicagents/cli@0.2.0 check-policy \
  -a 1000000 \
  -t 0xRecipientAddress \
  -r https://sepolia.base.org
```

Exit code **0** = allowed; **1** = denied (budget, counterparty, or rate limit).

When allowed, submit via bundler:

```bash
npx @economicagents/cli@0.2.0 execute \
  -t 0xRecipientAddress \
  -v 1000000 \
  -d 0x \
  --bundler https://your-bundler-rpc \
  -r https://sepolia.base.org
```

Runnable walkthrough: [examples/x402-policy-userop](../../examples/x402-policy-userop/README.md).

---

## Optional — intent resolution

**Hosted reference API:** `https://api.economicagents.org` is **currently unreachable** (HTTP 521 from Cloudflare as of August 2026). Do not depend on it for production — **self-host** the resolution stack or resolve locally.

From a repo clone (until a published one-liner exists):

```bash
cd packages/indexer && pnpm run build && npx aep-index sync
cd packages/api && pnpm run build && node dist/index.js   # POST /resolve on :3847
```

CLI against your local API:

```bash
npx @economicagents/cli@0.2.0 resolve \
  '{"capability":"image-generation","budget":{"max_per_unit":"0.01","max_total":"1.00"}}' \
  --api-url http://127.0.0.1:3847
```

See [REST API](reference/rest-api) and [Deployment](guides/deployment#post-deploy-services).

---

## From source (Foundry)

Use this path only when you need **your own** factory or relationship contracts — not for the first hour on the public factory.

1. Clone [github.com/economicagents/AEP](https://github.com/economicagents/AEP)
2. `cd contracts && PRIVATE_KEY=0x... forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast`
3. `npx @economicagents/cli@0.2.0 deploy --factory 0xYourFactory --rpc https://sepolia.base.org`

Full deploy, validation, and mainnet gate: [Deployment guide](guides/deployment).

---

## Config

`~/.aep/config.json` is created on first deploy.

| Key | Description |
|-----|-------------|
| `factoryAddress` | AEPAccountFactory (set by deploy) |
| `rpcUrl` | JSON-RPC URL |
| `account` | Deployed smart account |
| `owner` | Owner EOA |

Optional: `bundlerRpcUrl`, `identityRegistryAddress`, `reputationRegistryAddress`, relationship factory addresses — see [Integration](guides/integration).

---

## Next steps

- [Supported chains](getting-started/supported-chains) — Registry and USDC addresses
- [CLI commands](cli/commands) — Full reference
- [MCP tools](reference/mcp) — `npx @economicagents/mcp` for Cursor
- [COOKBOOK](COOKBOOK) — Policies, fleet, monitor
