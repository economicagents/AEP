# Changelog

All notable changes to AEP (Agent Economic Protocol) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`@economicagents/viem-rpc`** — single implementation of `transportFromRpcUrl` for HTTP(S) and WebSocket(S) JSON-RPC; depended on by **graph**, **sdk**, **indexer**, and **monitor** (publish before **graph** on npm).
- **Base mainnet post-deploy automation:** `./scripts/deploy-base-mainnet.sh` runs **`scripts/sync-mainnet-docs-from-broadcast.mjs`** (reads `contracts/broadcast/**/8453/run-latest.json`) to refresh **`docs/guides/deployment.md`** (mainnet table, smoke loop, mainnet quick-reference block) and merge **`~/.aep/config.json`**. Optional **`pnpm run verify:mainnet-signoff`** when `ETHERSCAN_API_KEY` is set (`SKIP_MAINNET_SIGNOFF`, `REQUIRE_MAINNET_SIGNOFF`). Root script **`pnpm run sync:mainnet-from-broadcast`**. **`generate-config.js`** now writes **`aepAccountImplementationAddress`** / **`implementationAddress`** when **`AEP_ACCOUNT_IMPL`** is set.
- **Base mainnet validation record (2026-03-20):** After `RateLimitPolicy` L-4 remediation, canonical on-chain addresses in **`docs/guides/deployment.md`** are unchanged (no redeploy). Full gate `./scripts/validate-mainnet-ready.sh` + **`pnpm run verify:mainnet-signoff`** documented in that guide.
- `scripts/publish-npm-packages.sh` and root scripts `publish:packages` / `publish:packages:dry-run` for ordered npm releases
- **Base mainnet (operational):** On-chain addresses after first mainnet broadcast are recorded in **`docs/guides/deployment.md`** (*Mainnet live addresses and record*). Source revision for the last green preflight is noted at the top of that guide; set `BASE_MAINNET_RPC` and run `./scripts/deploy-base-mainnet.sh` locally to broadcast.

### Changed

- **npm scope `@economicagents`** — the `@aep` scope was not available on npm; all publishable packages use **`@economicagents/<name>`** (GitHub org/repo unchanged: `economicagents/AEP`).
- Monorepo root is **`@economicagents/workspace`** (private); every package under `packages/*` is **`@economicagents/<folder>`** (including **`@economicagents/cli`**; global binary **`aep`**)

### Security

- **RateLimitPolicy:** `setLimits` now reverts with `RateLimitPolicyInvalidWindow` when `maxTxPerWindow > 0` and `windowSeconds == 0` (audit L-4). Existing mainnet factory/account/factory addresses unchanged; operators using `RateLimitPolicy` deploy new module instances to pick up the guard.

## [0.1.0] — 2026-03-19

### Added

- Economic account (ERC-4337, policy modules)
- Intent resolution (indexer, resolver, MCP, CLI, REST API)
- Economic relationships (CreditFacility, ConditionalEscrow, RevenueSplitter, SLAContract)
- Agent economic graph (credit score, analytics, recommendations)
- Monetization (treasury, x402 paywall, relationship fees, fleet, Analytics Pro)
- On-chain event monitor
- Fleet management
- Provider probe
- Open source release documentation: `docs/OPEN-SOURCE-RELEASE.md`, `docs/REPOSITORY.md`, `docs/formal-verification.md`, root `NOTICE`
- Dependabot config (`.github/dependabot.yml`), npm publish metadata check (`pnpm run verify:npm-metadata`), secret scan helper (`scripts/secret-scan.sh`)

### Changed

- Canonical GitHub URLs point to `https://github.com/economicagents/AEP` (`packages/web/lib/github.ts`, `docs/REPOSITORY.md`, package metadata)
- Quick start canonical path: `docs/getting-started/quickstart.md` (stub retained at `docs/quickstart.md`)
- Public framing: `audit-report.md` titled and summarized as an **AI-assisted** security review, not a third-party audit

### Security

- Smart contract security review (AI-assisted, post-remediation). See audit-report.md.

[Unreleased]: https://github.com/economicagents/AEP/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/economicagents/AEP/releases/tag/v0.1.0
