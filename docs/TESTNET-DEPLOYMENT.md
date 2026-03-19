# AEP Deployment — Base Sepolia & Base Mainnet

Single source of truth for deployment status, commands, and testing.

---

## Deploy Scripts

### Base Sepolia (Testnet)

```bash
./scripts/deploy-base-sepolia.sh
```

**Prerequisites:** `.env` with `AEP_KEYSTORE_ACCOUNT` (preferred) or `PRIVATE_KEY`, `BASE_SEPOLIA_RPC`. Optional: `AEP_TREASURY_ADDRESS` (defaults to address derived from signer). Recommended: `cast wallet import aep --interactive` then `AEP_KEYSTORE_ACCOUNT=aep`.

### Base Mainnet

```bash
./scripts/deploy-base-mainnet.sh
```

**Prerequisites:** `.env` with `PRIVATE_KEY`, `BASE_MAINNET_RPC` (e.g. `https://mainnet.base.org`). Optional: `AEP_TREASURY_ADDRESS`. **Use multisig for treasury and owner in production.**

**What both scripts do:**

1. **Phase 1** — Deploy AEPAccount implementation + AEPAccountFactory (Foundry)
2. **Phase 2** — Deploy relationship factories (CreditFacility, Escrow, RevenueSplitter, SLA)
3. **Config** — Generate `~/.aep/config.json` with chain-specific addresses
4. **Phase 2.5** — Deploy first AEP account (owner derived from keystore or PRIVATE_KEY)

---

## Deployed Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| AEPAccount implementation | `0x2bfd6b18F9cd3748a686F6515Fc4582abFA47C20` |
| AEPAccountFactory | `0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546` |
| CreditFacilityFactory | `0xEDE0892A7d3F0CA6BE38e47d11fC14dd1c83A002` |
| ConditionalEscrowFactory | `0x931351A26ace9DFE357A488137E6a1E8Cb11aBbF` |
| RevenueSplitterFactory | `0xbE9406f87ff717E3F70D7687577D20D3Db336FC7` |
| SLAContractFactory | `0x120d84c04E171af06BB38C99b9e602b2c51866E2` |
| First AEP account | `0x13A053aAAfa68807dfeD8FAe82C6242429D24A15` |

**Canonical (pre-deployed):** IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713`, ValidationRegistry `0x8004Cb1BF31DAf7788923b405b754f57acEB4272`, USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, EntryPoint `0x0000000071727De22E5E9d8BAf0edAc6f37da032`.

---

## Post-Deploy Phases

### Verify Config

```bash
pnpm exec aep config validate
```

### Phase 4: Provider Index (Intent Resolution)

Required for POST /resolve.

```bash
cd packages/indexer && pnpm run build
cd packages/indexer && node dist/cli.js sync --probe-x402
cd packages/indexer && node dist/cli.js embed
```

### Phase 5: Agent Economic Graph

Required for analytics, credit score, recommendations.

```bash
pnpm exec aep graph sync
```

### Phase 6: API Service

```bash
cd packages/api && pnpm run build && node dist/index.js
```

Listens on port 3847. Env: `AEP_TREASURY_ADDRESS`, `AEP_RESOLVE_PRICE` (0.005), `AEP_RESOLVE_PRICE_PREMIUM` (0.02), `AEP_NETWORK` (base-sepolia), `PORT`.

### Phase 7: On-Chain Monitor

```bash
pnpm exec aep monitor
```

Uses `config.account` when `monitor.accounts` is empty. Set `monitor.webhookUrl` for alerts.

---

## Testing Steps

```bash
# Config
pnpm exec aep config validate

# API health
curl http://localhost:3847/health
# {"status":"ok"}

# Analytics
curl "http://localhost:3847/analytics/account/0x13A053aAAfa68807dfeD8FAe82C6242429D24A15"
```

---

## Forge Tests

All tests pass with and without fork: `cd contracts && forge test` (unit) or `forge test --fork-url $BASE_SEPOLIA_RPC` (fork). Fork-safe tests use fresh contracts (ReceiveHelper) instead of makeAddr for ETH recipients.

## Verification Checklist

- [ ] Config validate passes
- [ ] Index sync complete; embed run
- [ ] Graph sync complete
- [ ] API responds to GET /health
- [ ] Monitor runs (uses config.account)
- [ ] x402 paywall: POST /resolve returns 402 when unpaid (when AEP_TREASURY_ADDRESS set)

---

## Process Management

| Process | Command |
|---------|---------|
| API | `cd packages/api && node dist/index.js` |
| Monitor | `pnpm exec aep monitor` |

**pm2:**

```bash
cd packages/api && pm2 start dist/index.js --name aep-api
pm2 start "pnpm exec aep monitor" --name aep-monitor --cwd /path/to/AEP
```

**systemd:** See internal DEPLOYMENT.md for full service unit examples.

---

## Cron (Recommended)

| Job | Schedule | Command |
|-----|----------|---------|
| Index sync | Every 6 hours | `cd /path/to/AEP/packages/indexer && node dist/cli.js sync --probe-x402` |
| Index embed | After sync | `cd /path/to/AEP/packages/indexer && node dist/cli.js embed` |
| Graph sync | Every 15 min | `cd /path/to/AEP && pnpm exec aep graph sync` |

---

## Deploy Additional Account

```bash
pnpm exec aep deploy --factory 0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546
```

Owner derived from PRIVATE_KEY. Config updated automatically.
