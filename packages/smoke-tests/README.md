# @economicagents/smoke-tests

Base Sepolia E2E smoke tests and validation. Verify deployment, run unit tests against live RPC, optional E2E (credit, escrow, splitter, SLA).

## Install

From monorepo: `pnpm install` at repo root (smoke-tests is a workspace package).

## Usage

```bash
pnpm run validate:testnet
```

Flags:

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

## Build & Test

```bash
pnpm run build
pnpm run test
```

## Docs

- [Mainnet Readiness](../../docs/MAINNET-READINESS.md)
- [Testnet Deployment](../../docs/TESTNET-DEPLOYMENT.md)
