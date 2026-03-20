# Deployment

Single guide: **contract deploy** (Base Sepolia + Base mainnet), **validation**, and **local off-chain services** (indexer, graph, API, monitor). Repository layout: scripts in [`scripts/`](../../scripts/), local config in `~/.aep/config.json`.

**Quick refs**

| Chain | Chain ID | Deploy script |
|-------|-----------|---------------|
| Base Sepolia | `84532` | `./scripts/deploy-base-sepolia.sh` |
| Base mainnet | `8453` | `./scripts/deploy-base-mainnet.sh` |

**Mainnet gate source revision:** Record `git rev-parse HEAD` for the **exact commit** where `./scripts/validate-mainnet-ready.sh` passed **immediately before** you broadcast Mainnet (e.g. in release notes). Do not treat an arbitrary `main` tip as canonical unless that revision passed the gate; redeploy from that SHA or newer after contract changes; rerun the gate before any rebroadcast.

**In this page:** [Prerequisites](#prerequisites) · [Base Sepolia](#base-sepolia-testnet) · [Mainnet preflight](#mainnet-preflight-and-gate) · [Base mainnet broadcast](#base-mainnet-broadcast) · [Mainnet record & verify](#mainnet-live-addresses-and-record) · [Services](#post-deploy-services)

---

## Prerequisites

- **Node.js** 18+, **pnpm**, **Foundry** (`forge`, `cast`)
- **`.env`** at repo root (never commit): signer + RPCs. Symlink for forge: `ln -sf ../.env contracts/.env` · `chmod 600 .env`

**Signer:** Prefer **`AEP_KEYSTORE_ACCOUNT`** after `cast wallet import <name> --interactive`. Fallback: **`PRIVATE_KEY`** — never commit it; see key hygiene in [`COOKBOOK.md`](../COOKBOOK.md) and [`THREAT-MODEL.md`](../THREAT-MODEL.md).

---

## Base Sepolia (testnet)

### Deploy

```bash
./scripts/deploy-base-sepolia.sh
```

**Env:** `BASE_SEPOLIA_RPC`, **`AEP_KEYSTORE_ACCOUNT`** (preferred) or `PRIVATE_KEY`. Optional: `AEP_TREASURY_ADDRESS` (defaults to signer; use a multisig if you want production-like fee routing).

**Phases (both chain scripts):**

1. **Phase 1** — `AEPAccount` implementation + `AEPAccountFactory` (`contracts/script/Deploy.s.sol`)
2. **Phase 2** — Relationship factories: Credit, Escrow, RevenueSplitter, SLA (`DeployRelationships.s.sol`)
3. **Config** — Writes `~/.aep/config.json` with chain-specific factories + canonical registry addresses
4. **Phase 2.5** — First smart account via `pnpm exec aep deploy` (CLI builds if needed)

### Sepolia — deployed addresses (canonical)

| Contract | Address |
|----------|---------|
| AEPAccount implementation | `0x2bfd6b18F9cd3748a686F6515Fc4582abFA47C20` |
| AEPAccountFactory | `0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546` |
| CreditFacilityFactory | `0xEDE0892A7d3F0CA6BE38e47d11fC14dd1c83A002` |
| ConditionalEscrowFactory | `0x931351A26ace9DFE357A488137E6a1E8Cb11aBbF` |
| RevenueSplitterFactory | `0xbE9406f87ff717E3F70D7687577D20D3Db336FC7` |
| SLAContractFactory | `0x120d84c04E171af06BB38C99b9e602b2c51866E2` |
| First AEP account | `0x13A053aAAfa68807dfeD8FAe82C6242429D24A15` |

**Canonical (pre-deployed on Sepolia):** IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713`, ValidationRegistry `0x8004Cb1BF31DAf7788923b405b754f57acEB4272`, USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, EntryPoint `0x0000000071727De22E5E9d8BAf0edAc6f37da032`.

---

## Mainnet preflight and gate

Do **not** broadcast to Base mainnet until this gate passes on the **exact git revision** you will deploy.

**One command (loads `.env`):**

```bash
./scripts/validate-mainnet-ready.sh
```

Expect: `All checks passed. Ready for Base Mainnet.`

That runs: `pnpm run test`, `forge test --match-contract BaseSepoliaFork` (forked Sepolia), **`pnpm run validate:testnet`** (last green against **testnet** — intentional), `aep config validate`, plus `audit-report.md` / [`THREAT-MODEL.md`](../THREAT-MODEL.md) presence checks.

**Manual checklist**

- [ ] Unit + package tests green  
- [ ] Fork tests green (`BASE_SEPOLIA_RPC`)  
- [ ] `pnpm run validate:testnet` green  
- [ ] `aep config validate` green  
- [ ] Audit remediation reviewed (`audit-report.md`)  
- [ ] Threat model reviewed  

### Sepolia smoke (before mainnet)

These hit **Base Sepolia**, not mainnet:

```bash
pnpm run validate:testnet -- --verify-only   # read-only vs docs addresses
pnpm run validate:testnet -- --unit-only
pnpm run validate:testnet -- --e2e-only      # needs key, USDC, optional bundler
pnpm run validate:testnet
```

### E2E / testnet wallet env

- `BASE_SEPOLIA_RPC`, `PRIVATE_KEY` (e2e), `BUNDLER_RPC_URL` (execute path), `SKIP_E2E=1` in CI  
- **`~/.aep/config.json` rpcUrl:** `validate:testnet` / e2e loaders may use this RPC for viem clients. If you switched **`rpcUrl`** to **Base mainnet** after a mainnet deploy, keep **`BASE_SEPOLIA_RPC`** set for smoke scripts or export a Sepolia URL when running **`pnpm run validate:testnet`** so reads match the **84532** addresses in `packages/smoke-tests`. Otherwise you may see chain-id signing errors or empty contract responses.  
- **≥ ~20 USDC** on Sepolia for full relationship e2e; tests skip if underfunded.  
- Faucets: [Circle testnet](https://faucet.circle.com/), [Base Sepolia faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet), [CDP](https://portal.cdp.coinbase.com/products/faucet). Swap helper: `pnpm run swap-for-usdc` (pool may lack liquidity — use faucet if it reverts).

---

## Base mainnet (broadcast)

### Canonical dependencies (not deployed by you)

| Dependency | Address |
|------------|---------|
| IdentityRegistry | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| ReputationRegistry | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| ValidationRegistry | `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| EntryPoint (v0.7) | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |

### Before spending ETH

1. Note deploy **`git rev-parse HEAD`** (must match the revision you intend to ship; see **Mainnet gate source revision** at top of this page when in doubt).  
2. **Treasury:** For production, prefer a **Gnosis Safe on 8453** → **`AEP_TREASURY_ADDRESS`**. For an initial mainnet pass you may **omit `AEP_TREASURY_ADDRESS`** (or set it to the deployer EOA): [`deploy-base-mainnet.sh`](../../scripts/deploy-base-mainnet.sh) defaults treasury to the **signer address**, so origination/setup fees accrue to the deployer until you migrate to a Safe.  
3. **`cast chain-id --rpc-url "$BASE_MAINNET_RPC"`** → **`8453`**.  
4. **Backup config:** `cp ~/.aep/config.json ~/.aep/config.sepolia.backup.json` (copy, don’t move, if you’re still using default path for validation).  
5. Run **`./scripts/validate-mainnet-ready.sh`** successfully on **that** commit.  
6. **Fund deployer** (ETH on Base) only after 1–5; keep gas headroom (order of **~0.05–0.15 ETH** unless you tune estimates).

**`.env`:** **`BASE_MAINNET_RPC`** (required — script exits if missing), optional **`AEP_TREASURY_ADDRESS`**, `AEP_KEYSTORE_ACCOUNT` or `PRIVATE_KEY`. Optional: `AEP_SILENCE_PRIVATE_KEY_WARNING=1` if you accept plaintext key risk.

**Note:** Mainnet broadcast requires valid **`BASE_MAINNET_RPC`** and a **funded** deployer on Base in your `.env`. Then run `./scripts/deploy-base-mainnet.sh` locally.

### Execute

```bash
./scripts/deploy-base-mainnet.sh
```

- **Phase 1 / 2:** forge **exits non-zero** on failure.  
- **Phase 2.5** (`aep deploy`): script **logs** on failure — run the printed `pnpm exec aep deploy --factory … --owner … --rpc …` (+ `--account` if keystore). The CLI must use chain **8453** when `config.chainId`/ **`AEP_CHAIN_ID`** is mainnet (not hardcoded Sepolia), or signing will fail against a mainnet RPC.  
- **Post-deploy sync:** After Phase 2.5, the script runs **`scripts/sync-mainnet-docs-from-broadcast.mjs`**, which reads **`contracts/broadcast/Deploy.s.sol/8453/run-latest.json`** and **`DeployRelationships.s.sol/8453/run-latest.json`**, merges **`~/.aep/config.json`** (implementation + factories; keeps `account` and other fields from the CLI), and updates **this page’s** mainnet address table, read-only `cast` loop, and [mainnet quick reference](#mainnet-quick-reference-read-only-checks) block. (`pnpm run sync:mainnet-from-broadcast` with `--treasury`, `--owner`, `--rpc-url` for a manual rerun.)  
- **Post-deploy sign-off:** If **`ETHERSCAN_API_KEY`** (or **`BASESCAN_API_KEY`**) is set, **`pnpm run verify:mainnet-signoff`** runs automatically (treasury/factory consistency + explorer source — see [Verify on Basescan](#verify-on-basescan)). Set **`SKIP_MAINNET_SIGNOFF=1`** to skip; set **`REQUIRE_MAINNET_SIGNOFF=1`** if the script should **exit non-zero** when sign-off fails (default: print failure but do not exit, so explorer indexing lag does not block the shell after a successful broadcast).  
- **Partial deploy:** if Phase 2 failed after Phase 1, treat **`~/.aep/config.json` as incomplete** until recovered; inspect `contracts/broadcast/` and Basescan.

[`deploy-base-mainnet.sh`](../../scripts/deploy-base-mainnet.sh) sets `owner` in config to the **deployer**; first account owner matches unless you override in manual Phase 2.5.

---

## Mainnet live addresses and record

Fill this after mainnet deploy — **must match** `~/.aep/config.json` and Basescan.

| Field | Value |
|-------|--------|
| Deploy commit (SHA) | `7409a04a893a6ba360f9c37b8feb74aee391d7cd` (short: `7409a04`) — recorded by Foundry in `contracts/broadcast/Deploy*.s.sol/8453/run-latest.json` at broadcast. After a history rewrite, `git rev-parse HEAD` may differ; treat **broadcast JSON + Basescan** as the address source of truth. |
| Deploy date (UTC) | 2026-03-20 |
| Treasury | `0xdEc6bDb019BdEaA0591170313D8316F25B29D139` (deploy-time treasury; set **`AEP_TREASURY_ADDRESS`** to a Safe when ready; relationship factories use treasury at deploy time) |

| Contract | Address |
|----------|---------|
| AEPAccount implementation | `0x2bfd6b18F9cd3748a686F6515Fc4582abFA47C20` |
| AEPAccountFactory | `0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546` |
| CreditFacilityFactory | `0xEDE0892A7d3F0CA6BE38e47d11fC14dd1c83A002` |
| ConditionalEscrowFactory | `0x0A58F0E20cb6b01627AF9ae12302D1b70f50C621` |
| RevenueSplitterFactory | `0xFE6d3B2cD283e1B74810EF49c625472449331834` |
| SLAContractFactory | `0x120d84c04E171af06BB38C99b9e602b2c51866E2` |
| First AEP account (Phase 2.5) | `0x13A053aAAfa68807dfeD8FAe82C6242429D24A15` |

### Redeploy vs doc-only after `RateLimitPolicy` (L-4) fix — **March 2026**

The **March 19, 2026** audit fix (`RateLimitPolicy.setLimits` rejects `maxTxPerWindow > 0` with `windowSeconds == 0`) **does not change bytecode** for the canonical Base mainnet row above:

| Artifact | Redeploy required? | Why |
|----------|-------------------|-----|
| `AEPAccount` implementation | **No** | Does not import or embed `RateLimitPolicy`. |
| `AEPAccountFactory` | **No** | Default deploy path only instantiates `BudgetPolicy` + `CounterpartyPolicy` (see `AEPAccountFactory.sol`). |
| Relationship factories & relationship contracts | **No** | Unchanged sources. |
| `PolicyRegistry` | **No** | Unchanged. |

**`RateLimitPolicy`** is a **separate** module contract, added by owners when needed (`addPolicyModule` / CLI). To get the new `RateLimitPolicyInvalidWindow` guard on an account that already uses an old module, **deploy a new `RateLimitPolicy`** from the updated source and swap modules (remove old, add new); there is no upgrade proxy for policy modules.

**Last mainnet validation (no new broadcast):** **2026-03-20 UTC** — `./scripts/validate-mainnet-ready.sh` green; read-only `cast code` smoke on `https://mainnet.base.org` for all addresses in the table above; **`pnpm run verify:mainnet-signoff`** green (treasury vs factories, bytecode + Etherscan API v2 `getsourcecode` on Base **8453**). Repo revision valid at run: `7409a04a893a6ba360f9c37b8feb74aee391d7cd` (treat **broadcast JSON + Basescan** as the address source of truth; bump this SHA on doc-only follow-ups).

Some addresses are **identical to the Base Sepolia table** (implementation, factory, several relationship factories); that is **coincidental** (matching deployer nonce sequence on the two chains). **Contracts are separate per chain** — always use the chain’s RPC and `chainId` when calling or verifying.

### Verify on Basescan

Match [`contracts/foundry.toml`](../../contracts/foundry.toml): **`solc 0.8.28`**, `optimizer` true, `optimizer_runs` **200**, **`via_ir` true**.

```bash
forge verify-contract <ADDRESS> src/AEPAccount.sol:AEPAccount --chain base --watch
```

Repeat per contract; constructor args from scripts + [`contracts/broadcast/`](../../contracts/broadcast/) (tracked per chain id; never commit `.env` or keys). Use a Basescan-compatible API key (often `ETHERSCAN_API_KEY`).

**Automated sign-off:** With `~/.aep/config.json` on **8453** and **`ETHERSCAN_API_KEY`** in `.env` (same key as `forge verify`):

```bash
pnpm run verify:mainnet-signoff
```

**Sign-off phase 1 (script prints “M1”):** viem — `treasuryAddress` / `owner` match; `treasury()` on Credit, Escrow, SLA factories matches. **Sign-off phase 3 (script prints “M3”):** viem `getCode`, then **Etherscan API v2** `getsourcecode` (`api.etherscan.io/v2/api` + `chainid=8453` — same multichain key as forge; do not use deprecated `api.basescan.org`). Minimal first-account proxy bytecode skips the API row (verify the implementation). *These labels are automation output only — not roadmap IDs in other docs.*

**Flow:** `pnpm run verify:mainnet-forge` → wait for indexing (often a minute or two) → run **`pnpm run verify:mainnet-signoff` once**. If phase 3 fails, wait and rerun; don’t wrap it in a tight retry loop (rate limits + noise). A full pass reports treasury/factory checks and bytecode + indexed source on Base via Etherscan API v2.

### Read-only smoke (8453)

`validate:testnet` does **not** substitute for mainnet checks.

```bash
RPC="$BASE_MAINNET_RPC"
for addr in \
  0x2bfd6b18F9cd3748a686F6515Fc4582abFA47C20 \
  0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546 \
  0xEDE0892A7d3F0CA6BE38e47d11fC14dd1c83A002 \
  0x0A58F0E20cb6b01627AF9ae12302D1b70f50C621 \
  0xFE6d3B2cD283e1B74810EF49c625472449331834 \
  0x120d84c04E171af06BB38C99b9e602b2c51866E2 \
  0x13A053aAAfa68807dfeD8FAe82C6242429D24A15; do
  cast code "$addr" --rpc-url "$RPC" | head -c 20 && echo " OK $addr" || echo "FAIL $addr"
done
pnpm exec aep config validate
export AEP_CHAIN_ID=8453
```

### Governance

With **deployer as treasury**, fee collection and hot-key exposure are higher than with a multisig. Plan migration to a **Safe** for `AEP_TREASURY_ADDRESS` / ownership as traffic grows. Decide whether smart-account / policy **owners** stay on the deployer or move to a **Safe**. Who may **freeze**, change policies, **UUPS** upgrades — align with [`THREAT-MODEL.md`](../THREAT-MODEL.md).

### When to git-commit docs

Commit **after** addresses are verified. With a full mainnet deploy, **`deploy-base-mainnet.sh`** refreshes the mainnet table from **`run-latest.json`**; review the diff, run **`pnpm run verify:mainnet-forge`** if contracts are new on Basescan, then **`pnpm run verify:mainnet-signoff`** before committing if sign-off was skipped during deploy. **No secrets** (never commit `.env` or keys). `contracts/broadcast/<chainId>/` may be tracked for reproducibility—see repo `.gitignore`. Optional tag: [`OPEN-SOURCE-RELEASE.md`](../OPEN-SOURCE-RELEASE.md).

---

## Post-deploy services

Applies after **either** chain deploy. For **mainnet**, use **`AEP_CHAIN_ID=8453`**, mainnet `rpcUrl` in config, and production RPC.

### Config

```bash
pnpm exec aep config validate
```

### Indexer (intent resolution / `aep resolve` / POST /resolve)

```bash
cd packages/indexer && pnpm run build
node dist/cli.js sync --probe-x402
node dist/cli.js embed                         # after sync
```

### Graph (analytics, credit score, recommendations)

```bash
pnpm exec aep graph sync
```

### API

```bash
cd packages/api && pnpm run build && node dist/index.js
```

Default port **3847**. Env: `AEP_TREASURY_ADDRESS`, `AEP_RESOLVE_PRICE`, `AEP_RESOLVE_PRICE_PREMIUM`, `AEP_NETWORK`, `PORT`.

### Monitor

```bash
pnpm exec aep monitor
```

Uses `config.account` when `monitor.accounts` is empty; optional `monitor.webhookUrl`.

### Hosted API (mainnet)

A public reference deployment of the resolution stack is at **https://api.economicagents.org** (resolve, analytics, probe, graphql). **This repository documents contract deployment, validation, and how to run services locally or on infrastructure you control.** It does not include production hosting runbooks or operator-specific provisioning steps—document those wherever you maintain operational knowledge.

---

## Validation smoke and API checks

```bash
pnpm exec aep config validate
curl -s http://localhost:3847/health
curl -s "http://localhost:3847/analytics/account/0x13A053aAAfa68807dfeD8FAe82C6242429D24A15"
```

Sepolia verification checklist: config valid → index sync + embed → graph sync → API `/health` → monitor running → optional x402 402 on `/resolve` when treasury configured.

**Forge:** `cd contracts && forge test` (unit) or `forge test --fork-url $BASE_SEPOLIA_RPC` for forked scenarios.

**Long-running processes:** Run the API and monitor each in its own terminal (or use any process manager you prefer). Re-run indexer sync + embed and `aep graph sync` when you need fresh chain data; interval depends on your workload.

---

## Deploy additional accounts

Sepolia factory example:

```bash
pnpm exec aep deploy --factory 0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546
```

Use your chain’s factory from `config.json`. Pass `--owner`, `--rpc`, `--account` as needed.

---

## Mainnet quick reference (read-only checks)

Run from **repo root** after filling `.env`. **No broadcast** in this block — RPC reads and post-deploy checks only.

**Load env and confirm chain**

```bash
set -a && source .env && set +a
cast chain-id --rpc-url "$BASE_MAINNET_RPC"   # must print 8453
```

**Deployer address and balance** (keystore path — adjust account name)

```bash
DEPLOYER="$(cast wallet address --account "${AEP_KEYSTORE_ACCOUNT:-foundry}")"
cast balance "$DEPLOYER" --ether --rpc-url "$BASE_MAINNET_RPC"
```

If you only have `PRIVATE_KEY` in `.env`:

```bash
DEPLOYER="$(cast wallet address --private-key "$PRIVATE_KEY")"
cast balance "$DEPLOYER" --ether --rpc-url "$BASE_MAINNET_RPC"
```

**Treasury address (optional sanity)** — if you set `AEP_TREASURY_ADDRESS` to a **contract** (e.g. Safe), expect non-empty code; if treasury is the **deployer EOA**, `cast code` returns empty (normal).

```bash
T="${AEP_TREASURY_ADDRESS:-$DEPLOYER}"
cast code "$T" --rpc-url "$BASE_MAINNET_RPC" | head -c 42 && echo
```

**Post-deploy bytecode smoke** (paste addresses from `./scripts/deploy-base-mainnet.sh` output or `~/.aep/config.json`)

```bash
RPC="$BASE_MAINNET_RPC"
# Canonical Base mainnet (8453) — same as table above; override if you redeployed
AEP_IMPL='0x2bfd6b18F9cd3748a686F6515Fc4582abFA47C20'
FACTORY='0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546'
CREDIT_F='0xEDE0892A7d3F0CA6BE38e47d11fC14dd1c83A002'
ESCROW_F='0x0A58F0E20cb6b01627AF9ae12302D1b70f50C621'
SPLITTER_F='0xFE6d3B2cD283e1B74810EF49c625472449331834'
SLA_F='0x120d84c04E171af06BB38C99b9e602b2c51866E2'
FIRST_ACCOUNT='0x13A053aAAfa68807dfeD8FAe82C6242429D24A15'

for addr in "$AEP_IMPL" "$FACTORY" "$CREDIT_F" "$ESCROW_F" "$SPLITTER_F" "$SLA_F" "$FIRST_ACCOUNT"; do
  c=$(cast code "$addr" --rpc-url "$RPC")
  if [ -z "$c" ] || [ "$c" = "0x" ]; then echo "FAIL $addr"; else echo "OK $addr"; fi
done

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)" && AEP_CHAIN_ID=8453 pnpm exec aep config validate
```

**Basescan verify** — from repo root, with `ETHERSCAN_API_KEY` in `.env` and `~/.aep/config.json` on **8453**, you can submit all factory + impl verifications in one step:

```bash
pnpm run verify:mainnet-forge
```

Equivalent manual commands (from `contracts/`; constructor args must match **your** deploy — use `broadcast/Deploy.s.sol/*/run-latest.json` if unsure):

Compiler: **`solc 0.8.28`**, **`optimizer_runs` 200**, **`via_ir` true** ([`foundry.toml`](../../contracts/foundry.toml)).

```bash
cd contracts
ENTRYPOINT=0x0000000071727De22E5E9d8BAf0edAc6f37da032

# AEPAccount(EntryPoint)
forge verify-contract "$AEP_IMPL" src/AEPAccount.sol:AEPAccount \
  --chain base --watch \
  --constructor-args $(cast abi-encode "constructor(address)" "$ENTRYPOINT")

# AEPAccountFactory(EntryPoint, implementation)
forge verify-contract "$FACTORY" src/AEPAccountFactory.sol:AEPAccountFactory \
  --chain base --watch \
  --constructor-args $(cast abi-encode "constructor(address,address)" "$ENTRYPOINT" "$AEP_IMPL")

# CreditFacilityFactory(treasury) — use same address as deploy (omit env → deployer EOA)
TREASURY="${AEP_TREASURY_ADDRESS:-$DEPLOYER}"
forge verify-contract "$CREDIT_F" src/relationships/CreditFacilityFactory.sol:CreditFacilityFactory \
  --chain base --watch \
  --constructor-args $(cast abi-encode "constructor(address)" "$TREASURY")

forge verify-contract "$ESCROW_F" src/relationships/ConditionalEscrowFactory.sol:ConditionalEscrowFactory \
  --chain base --watch \
  --constructor-args $(cast abi-encode "constructor(address)" "$TREASURY")

# RevenueSplitterFactory() — no constructor arguments
forge verify-contract "$SPLITTER_F" src/relationships/RevenueSplitterFactory.sol:RevenueSplitterFactory \
  --chain base --watch

forge verify-contract "$SLA_F" src/relationships/SLAContractFactory.sol:SLAContractFactory \
  --chain base --watch \
  --constructor-args $(cast abi-encode "constructor(address)" "$TREASURY")
```

If verify fails, compare bytecode creator tx input or `--show-standard-json-input` against the **exact** commit you deployed.
