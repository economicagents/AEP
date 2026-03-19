# Base Mainnet Readiness Checklist

Run this checklist before deploying to Base Mainnet to ensure 100% confidence.

## Pre-Mainnet Validation

**Run all checks:** `./scripts/validate-mainnet-ready.sh` (loads `.env`, runs 1–6 below)

- [ ] **Unit tests** — `pnpm run test` (contracts + packages) passes
- [ ] **Forge fork tests** — `cd contracts && forge test --match-contract BaseSepoliaFork --fork-url $BASE_SEPOLIA_RPC` passes
- [ ] **Smoke validation** — `pnpm run validate:testnet` passes (verify + unit + e2e)
- [ ] **Config validate** — `aep config validate` passes
- [ ] **Audit remediation** — 0 Critical, 0 High, 0 Medium, 0 Low (see audit-report.md)
- [ ] **Threat model** — docs/THREAT-MODEL.md reviewed

## Mainnet Deployment

**Deploy:** `./scripts/deploy-base-mainnet.sh`

**Prerequisites:** `.env` with:
- `PRIVATE_KEY` — deployer private key
- `BASE_MAINNET_RPC` — e.g. `https://mainnet.base.org`
- `AEP_TREASURY_ADDRESS` — optional; defaults to address derived from PRIVATE_KEY. **Use multisig for production.**

**What the script does:**
1. Phase 1 — Deploy AEPAccount implementation + AEPAccountFactory
2. Phase 2 — Deploy relationship factories (CreditFacility, Escrow, RevenueSplitter, SLA) — includes I-13/I-14 remediated contracts
3. Generate `~/.aep/config.json` with chainId 8453 and Base Mainnet canonical addresses (ERC-8004, USDC, EntryPoint)
4. Phase 2.5 — Deploy first AEP account (builds CLI if needed)

**Canonical Base Mainnet addresses** (no deployment): IdentityRegistry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, ReputationRegistry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`, ValidationRegistry `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58`, USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, EntryPoint `0x0000000071727De22E5E9d8BAf0edAc6f37da032`.

## Post-Mainnet Deploy

- [ ] **Config** — Script writes ~/.aep/config.json. Set `AEP_CHAIN_ID=8453` in env when running CLI/API/indexer/monitor for mainnet.
- [ ] **Validate** — `aep config validate` (uses config.json; ensure chainId 8453)
- [ ] **Treasury** — Use multisig for treasury and owner in production
- [ ] **RPC** — BASE_MAINNET_RPC configured and tested

## Smoke Test Commands

```bash
# Verify deployed contracts exist (read-only, no key)
pnpm run validate:testnet -- --verify-only

# Unit tests against live Base Sepolia
pnpm run validate:testnet -- --unit-only

# E2E tests (requires PRIVATE_KEY, USDC, optional BUNDLER_RPC_URL)
pnpm run validate:testnet -- --e2e-only

# Full validation
pnpm run validate:testnet
```

## Environment for E2E

- `BASE_SEPOLIA_RPC` — required
- `PRIVATE_KEY` — required for E2E (wallet address derived from it)
- `BUNDLER_RPC_URL` — required for execute flow
- `SKIP_E2E=1` — skip E2E in CI

**Wallet funding:** E2E credit/escrow/splitter/SLA tests require ≥20 USDC on Base Sepolia. These tests skip when balance is insufficient.

- **USDC Faucet:** [Circle Testnet Faucet](https://faucet.circle.com/) — 20 USDC per request, every 2 hours, Base Sepolia supported. No account required.
- **ETH faucets:** [Base Sepolia faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) (ETH + USDC), [CDP Portal](https://portal.cdp.coinbase.com/products/faucet) (ETH + USDC).
- **Swap ETH→USDC:** `pnpm run swap-for-usdc [ETH_AMOUNT]` — swaps via Uniswap V3. The WETH/USDC pool on Base Sepolia often has no liquidity; if the swap reverts (STF), use the faucet instead.
