# Contributing to AEP

Thank you for your interest in contributing to the Agent Economic Protocol (AEP).

## Cursor / multi-repo workspaces

**`AGENTS.md` is not in this repository.** If you use a parent folder workspace (e.g. `AEP/` + `AEP-Internal/` together), keep agent memory in **`AGENTS.md` at that parent** so Cursor applies it to both trees. Clones of this repo alone do not include that file.

## Development Setup

Clone **with submodules** (or run `git submodule update --init --recursive` once). See [README § Clone](README.md#clone).

```bash
pnpm install
pnpm run build
pnpm run test
```

See [README](README.md) for prerequisites (Node.js 18+, Foundry, pnpm). From a fresh machine you can use `pnpm run bootstrap` (submodules + `forge build` + install + build).

## Code Style

- **Solidity:** `forge fmt` before commit
- **TypeScript:** Follow existing patterns; no unnecessary dependencies
- **Docs:** Markdown with consistent heading levels and link style

## Pull Request Process

1. Open an issue or discussion for significant changes
2. Create a branch from `main`
3. Run `pnpm run test` and `forge fmt --check` before submitting
4. Keep PRs focused; link related issues
5. **Sign your commits** — Every commit must include `Signed-off-by: Name <email>` in the commit message. See [Developer Certificate of Origin](https://developercertificate.org/) (DCO).

## Documentation

- [Document map](docs/DOCUMENT-MAP.md) — Index of `docs/`
- [Backlog](docs/BACKLOG.md) — Known gaps for integrators
- [Incident response](docs/INCIDENT-RESPONSE-PLAYBOOK.md) — Operating accounts safely
- [Publishing](docs/PUBLISHING.md) — npm releases (maintainers)
- [Open source release](docs/OPEN-SOURCE-RELEASE.md) — Public-release checklist (maintainers)
- [Repository](docs/REPOSITORY.md) — Canonical GitHub URL for metadata

## Architecture

- **No external runtime deps:** Use direct RPC (user-provided URL), self-hosted bundler. No Alchemy, Infura, or hosted APIs.
- **Forkable references only:** ERC-4337 core is vendored from eth-infinitism; use forkable examples, not third-party services.
- **Config:** `~/.aep/config.json`; override via `AEP_CONFIG_PATH`, `AEP_CHAIN_ID`.

## Security

Report vulnerabilities privately. See [SECURITY.md](SECURITY.md) for details.

## License

By contributing, you agree that your contributions will be licensed under Apache-2.0 and that you have the right to submit them under that license. See [LICENSE](LICENSE).

