# Changelog

All notable changes to AEP (Agent Economic Protocol) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] — 2026-08-20

### Added

- **Keystore:** `AEP_KEYSTORE_PASSWORD_FILE` — read the keystore password from a file (path validated for traversal) for non-interactive agents instead of embedding `FOUNDRY_PASSWORD` in the environment.
- **CLI (`aep`):** Agent-oriented output — global `--json` and `--keystore-password-file`; `emitResult` / structured tx and state reads; `-n` / `--keystore-account` (deprecated `-a` on deploy/address); deploy `--skip-config-write` and `--if-not-configured`; execute `--data -`; resolve `--intent-file`; fleet freeze `--dry-run`; help examples on high-traffic commands; Vitest smoke tests for help, hints, and `config validate --json`.
- **`aep-index` / `aep-graph`:** Commander CLIs with `-h` / `--help`, `-r` / `--rpc`, and examples; default bare invocation remains sync.
- **Web:** Remove waitlist — live Base mainnet + hosted API messaging on the landing page; delete `POST /api/waitlist`, `WaitlistFlow`, and waitlist CSS.
- **Web:** Docs navigation, layout, and reading UX overhaul.
- **Web:** Landing page shared sections and scroll motion.
- **Foundry tests:** Expanded unit, fuzz, invariant, and pinned **Base mainnet fork** coverage (`BaseMainnetFork.t.sol` at block **50000000**); **`contracts/TEST.md`**. Suite: **261 tests** passing (1 skipped fork test), **~81%** line coverage on `contracts/src/`.

### Changed

- **Web:** Portless local dev; `/docs/mcp` redirect.
- **Web / README:** API gated-beta framing vs competitors; env docs without Resend waitlist dependency.

### Fixed

- **Indexer:** Postgres advisory lock (`pg_advisory_lock`) around `runMigrations` so concurrent callers (parallel Vitest PG suites, overlapping sync jobs) no longer race `CREATE EXTENSION vector` and hit `23505` on `pg_extension_name_index`.
- **Graph (`getFleetAlerts`):** Cap `eth_getLogs` queries to **2000-block** chunks; scan chunks **sequentially** with up to three retries and linear backoff on public-RPC rate-limit errors (fixes CI failures against `sepolia.base.org` and similar providers).

### Security

- **Smart contracts:** AI-assisted **internal** audit pass (August 20, 2026) — **not** a third-party firm audit. Remediated **H-1**, **M-1–M-3**, and **L-4–L-11** across `AEPAccount`, `PaymentDecoder`, policy modules, and economic relationship contracts (including fee-on-transfer edges, frozen-account semantics, and factory defaults). Updated **`audit-report.md`** and **`docs/THREAT-MODEL.md`**. Canonical mainnet factory/account addresses unchanged; operators deploy new policy module instances to pick up module-level fixes.

## [0.2.0] — 2026-03-25

### Added

- **MPP / Tempo session paywall:** optional `AEP_PAYWALL_BACKEND=mpp` on the REST API (`mppx`); SDK helpers (`interceptMpp402Response`, `fetchWithMppPolicyCheck`, Tempo chain exports, `resolveTempoChainId`); CLI `aep resolve --api-url` MPP client path; indexer probe **`paymentKind`** (x402 vs mpp). See **`docs/guides/monetization.md`** and **`skills/aep-mpp/SKILL.md`**.
- **`@economicagents/viem-rpc`** — single implementation of `transportFromRpcUrl` for HTTP(S) and WebSocket(S) JSON-RPC; depended on by **graph**, **sdk**, **indexer**, and **monitor** (publish before **graph** on npm).
- **Base mainnet post-deploy automation:** `./scripts/deploy-base-mainnet.sh` runs **`scripts/sync-mainnet-docs-from-broadcast.mjs`** (reads `contracts/broadcast/**/8453/run-latest.json`) to refresh **`docs/guides/deployment.md`** (mainnet table, smoke loop, mainnet quick-reference block) and merge **`~/.aep/config.json`**. Optional **`pnpm run verify:mainnet-signoff`** when `ETHERSCAN_API_KEY` is set (`SKIP_MAINNET_SIGNOFF`, `REQUIRE_MAINNET_SIGNOFF`). Root script **`pnpm run sync:mainnet-from-broadcast`**. **`generate-config.js`** writes **`aepAccountImplementationAddress`** / **`implementationAddress`** when **`AEP_ACCOUNT_IMPL`** is set.
- **Base mainnet validation record (2026-03-20):** Canonical on-chain addresses in **`docs/guides/deployment.md`** unchanged after initial mainnet deploy. Full gate `./scripts/validate-mainnet-ready.sh` + **`pnpm run verify:mainnet-signoff`** documented in that guide.
- `scripts/publish-npm-packages.sh` and root scripts `publish:packages` / `publish:packages:dry-run` for ordered npm releases.
- **Base mainnet (operational):** On-chain addresses after first mainnet broadcast recorded in **`docs/guides/deployment.md`** (*Mainnet live addresses and record*).

### Changed

- **viem** (workspace) bumped for canonical **`tempo`** / **`tempoModerato`** chain definitions; **`mppx`** dependency on **sdk**, **api**, **cli**.
- **npm scope `@economicagents`** — the `@aep` scope was not available on npm; all publishable packages use **`@economicagents/<name>`** (GitHub org/repo unchanged: `economicagents/AEP`).
- Monorepo root is **`@economicagents/workspace`** (private); every package under `packages/*` is **`@economicagents/<folder>`** (including **`@economicagents/cli`**; global binary **`aep`**).

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

[Unreleased]: https://github.com/economicagents/AEP/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/economicagents/AEP/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/economicagents/AEP/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/economicagents/AEP/releases/tag/v0.1.0
