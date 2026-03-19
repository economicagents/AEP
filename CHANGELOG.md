# Changelog

All notable changes to AEP (Agent Economic Protocol) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Security

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

- Canonical GitHub URLs point to `https://github.com/economicagents/aep` (`packages/web/lib/github.ts`, `docs/REPOSITORY.md`, package metadata)
- Quick start canonical path: `docs/getting-started/quickstart.md` (stub retained at `docs/quickstart.md`)
- Public framing: `audit-report.md` titled and summarized as an **AI-assisted** security review, not a third-party audit

### Security

- Smart contract security review (AI-assisted, post-remediation). See audit-report.md.

[Unreleased]: https://github.com/economicagents/aep/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/economicagents/aep/releases/tag/v0.1.0
