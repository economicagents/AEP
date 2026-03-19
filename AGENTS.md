# AEP — Agent Memory

## Learned User Preferences

- No external runtime dependencies: no Alchemy, Infura, Supabase, or hosted APIs. Use direct RPC (user-provided URL), self-hosted bundler, and on-chain state only.
- Use forkable references only: eth-infinitism/account-abstraction and resources/awesome-4337.md are for examples/resources/forkable codebases—not as live dependencies or third-party services.
- Prefer lightweight, robust, optimal, secure architectural and codebase design. When design quality is criticized (sizing, spacing, typography, syntax formatting), fix systematically; prefer standardized, congruent visual treatment over excessive variance.
- When filling gaps or making design decisions, consult AGENTS.md, public docs (`docs/ARCHITECTURE.md`, `docs/THREAT-MODEL.md`, `docs/COOKBOOK.md`), and any local implementation notes under `resources-internal/` (optional, gitignored); follow existing patterns. When in doubt, choose the approach most consistent with the project and published docs.
- Continue-implementation and finalize-implementation commands are AEP-specific: use forge (contracts), pnpm (SDK/CLI), not Zig. Validation: `pnpm run test` (runs forge test from contracts/ + pnpm -r test); forge build, forge fmt --check; pnpm run build; align with docs/THREAT-MODEL.md.
- Do not defer, leave TODOs, or note things for later—resolve gaps in the current step.
- Resolve every error and warning; do not suppress, ignore, or cast away type issues unless there is a documented, pre-existing exception.
- Prefer Foundry keystore (cast wallet import); allow PRIVATE_KEY as fallback with warnings. Never store plaintext private keys in .env as the primary path.

## Learned Workspace Facts

- AEP (Agent Economic Protocol) is the runtime layer for economic agent commerce on ERC-4337, ERC-8004, and x402. A fuller implementation spec may exist only locally under resources-internal (gitignored); shipped public truth lives in docs (ARCHITECTURE, THREAT-MODEL, COOKBOOK, BACKLOG) and README.
- Monorepo: `contracts/` (Foundry); `packages/` sdk, cli, indexer, resolver, graph, mcp, api, monitor, keystore, smoke-tests, benchmark, web. Runtime config is `~/.aep/config.json` with overrides `AEP_CONFIG_PATH` and `AEP_CHAIN_ID` (84532 Base Sepolia, 8453 Base mainnet). Internal `@aep/*` deps use `workspace:*` (not `file:../…`) so pnpm symlinks `packages/*` and dependents resolve built `dist/` after `pnpm -r run build`.
- Economic account stack: smart account, BudgetPolicy, CounterpartyPolicy (allow/block lists, min reputation, getDenyReason), RateLimitPolicy, AEPAccountFactory, PolicyRegistry (Ownable2Step), SDK, CLI, x402 interceptor (reasons include REPUTATION_TOO_LOW), UserOp execute path, frozen kill switch, owner-gated policy changes and UUPS upgrades.
- Intent resolution: Zod intent schema; indexer syncs ERC-8004 into `~/.aep/index` (`aep-index sync`, optional `embed`); hybrid discovery when search index exists else legacy expansion; resolver discover/filter/score/plan with max_total enforcement; MCP `resolve_intent`, REST `POST /resolve`, CLI `aep resolve`, benchmark harness.
- Economic relationships: CreditFacility, ConditionalEscrow (including multi-milestone and factory setupFee), RevenueSplitter, SLAContract and factories; SDK/CLI/MCP coverage for credit, escrow, splitter, and SLA; monetization via factory fees and optional API x402 paywall (treasury env/config)—see docs/COOKBOOK.md and skills/aep-monetization.
- Graph package: sync, credit score, analytics, recommendations; CLI `aep graph *`; resolver optional `accountAddress`+`graphPath` boost; `better-sqlite3` with sql.js fallback in tests; store tracks `dbPath` for cache invalidation.
- MCP and REST: budget/policy/balance, resolve_intent, analytics, credit score, recommendations, fleet summary/accounts/alerts, relationship state tools; API also probe, graphql, analytics pro routes; uses `~/.aep/config.json` and optional API keys (`AEP_FLEET_API_KEY`, `AEP_ANALYTICS_PRO_API_KEY`).
- Operations: `packages/monitor` / `aep monitor` for on-chain alerts; docs/INCIDENT-RESPONSE-PLAYBOOK.md; deployment scripts and docs/TESTNET-DEPLOYMENT.md as the canonical testnet address source; `pnpm run validate:testnet` smoke path; docs/MAINNET-READINESS.md checklist.
- On-chain integration: ERC-4337 core vendored under `contracts/src/vendor/` (eth-infinitism v0.7); OpenZeppelin via forge install; Base Sepolia EntryPoint v0.7 `0x0000000071727De22E5E9d8BAf0edAc6f37da032`; ERC-8004 registry addresses and USDC testnet token documented in deployment docs.
- Security documentation: docs/THREAT-MODEL.md; `audit-report.md` is a post-remediation AI-assisted contract review (not a substitute for a third-party audit)—frame honestly for external audiences; historical Slither and remediation notes live in that report.
- Publishing: npm publication has been deferred while the repo is private; when going public, publish `@aep/*` and `aep-cli` per docs/PUBLISHING.md (order: graph → keystore → sdk → indexer → resolver → monitor → mcp → api → cli). Run `pnpm run verify:npm-metadata` before publishing.
- Canonical public GitHub URL: `https://github.com/economicagents/aep` (see docs/REPOSITORY.md and packages/web/lib/github.ts).
- Open-sourcing: docs/OPEN-SOURCE-RELEASE.md, scripts/secret-scan.sh; GitHub CI on `main`/PRs (`.github/workflows/ci.yml`: Foundry + pnpm + ESLint web) plus DCO (`.github/workflows/dco.yml`).
