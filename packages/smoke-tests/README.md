# @economicagents/smoke-tests

**Contributors & CI:** Base Sepolia validation — deployment address checks, read-only RPC tests, optional E2E (credit, escrow, splitter, SLA). **Not required** when you only install `@economicagents/*` from npm for an application.

## Install

Used as a workspace package in [economicagents/AEP](https://github.com/economicagents/AEP). From repo root:

```bash
pnpm install
```

## Usage

```bash
pnpm run validate:testnet
```

| Flag | Description |
|------|-------------|
| `--verify-only` | Verify deployment addresses only |
| `--unit-only` | Unit tests against live RPC |
| `--e2e-only` | E2E tests (credit, escrow, splitter, SLA) |

## Configuration

| Env | Description |
|-----|-------------|
| BASE_SEPOLIA_RPC | Base Sepolia RPC URL |
| AEP_KEYSTORE_ACCOUNT or PRIVATE_KEY | Signer (keystore preferred) |
| BUNDLER_RPC_URL | For execute E2E |
| SKIP_E2E=1 | Skip E2E in CI |

## Build & test

```bash
pnpm run build
pnpm run test
```

## Documentation

- [Deployment](https://github.com/economicagents/AEP/blob/main/docs/guides/deployment.md) — Addresses, mainnet gate, smoke workflow
