# Deployment

Deploy AEP to Base Sepolia (testnet) or Base Mainnet.

---

## Prerequisites

- **Node.js** 18+
- **Foundry** (forge, cast)
- **pnpm**
- `.env` with `AEP_KEYSTORE_ACCOUNT` (preferred) or `PRIVATE_KEY`, and RPC URL

Recommended: `cast wallet import aep --interactive` then set `AEP_KEYSTORE_ACCOUNT=aep` in `.env`. Copy `.env.example` to `.env`, fill values, then `ln -sf ../.env contracts/.env` for forge. Never commit `.env`; use `chmod 600 .env`.

---

## Base Sepolia (Testnet)

```bash
./scripts/deploy-base-sepolia.sh
```

**Env:** `AEP_KEYSTORE_ACCOUNT` (preferred) or `PRIVATE_KEY`, `BASE_SEPOLIA_RPC`. Optional: `AEP_TREASURY_ADDRESS` (defaults to address derived from signer).

The script deploys:
1. AEPAccount implementation + AEPAccountFactory
2. Relationship factories (CreditFacility, Escrow, RevenueSplitter, SLA)
3. Generates `~/.aep/config.json` with chain-specific addresses
4. Deploys first AEP account (owner derived from keystore or PRIVATE_KEY)

### Deployed Addresses (Base Sepolia)

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

## Base Mainnet

```bash
./scripts/deploy-base-mainnet.sh
```

**Env:** `AEP_KEYSTORE_ACCOUNT` (preferred) or `PRIVATE_KEY`, `BASE_MAINNET_RPC` (e.g. `https://mainnet.base.org`). Optional: `AEP_TREASURY_ADDRESS`. **Use multisig for treasury and owner in production.**

**Canonical Base Mainnet addresses** (no deployment): IdentityRegistry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, ReputationRegistry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`, ValidationRegistry `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`, USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, EntryPoint `0x0000000071727De22E5E9d8BAf0edAc6f37da032`.

---

## Post-Deploy

### Verify Config

```bash
aep config validate
```

### Provider Index (Intent Resolution)

Required for `aep resolve` and POST /resolve:

```bash
cd packages/indexer && pnpm run build && node dist/cli.js sync --probe-x402 && node dist/cli.js embed
```

Or with `aep-index` installed: `aep-index sync --probe-x402` then `aep-index embed`.

### Economic Graph

Required for analytics, credit score, recommendations:

```bash
aep graph sync
```

### API Service

```bash
cd packages/api && pnpm run build && node dist/index.js
```

Listens on port 3847. Env: `AEP_TREASURY_ADDRESS`, `AEP_RESOLVE_PRICE`, `AEP_RESOLVE_PRICE_PREMIUM`, `AEP_NETWORK`, `PORT`.

### On-Chain Monitor

```bash
aep monitor
```

Uses `config.account` when `monitor.accounts` is empty. Set `monitor.webhookUrl` in config for alerts.

---

## Mainnet Readiness Checklist

Before Base Mainnet deployment:

- [ ] `pnpm run test` passes
- [ ] `pnpm run validate:testnet` passes
- [ ] `aep config validate` passes
- [ ] Audit remediation complete (see audit-report.md)
- [ ] [Threat Model](reference/threat-model) reviewed
- [ ] Treasury and owner use multisig in production

---

## Deploy Additional Account

```bash
aep deploy --factory 0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546
```

Owner derived from PRIVATE_KEY when `--owner` is omitted. Config updated automatically.
