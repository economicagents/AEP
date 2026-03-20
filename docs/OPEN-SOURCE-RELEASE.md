# Open source release checklist

Use this with [REPOSITORY.md](REPOSITORY.md) (canonical GitHub URL) and [PUBLISHING.md](PUBLISHING.md).

## Before going public

1. **Secret and credential scan** — Run `./scripts/secret-scan.sh` (install [Gitleaks](https://github.com/gitleaks/gitleaks) or [TruffleHog](https://github.com/trufflesecurity/trufflehog) first). Scan **full git history**, not only the working tree. Rotate any leaked keys, RPC URLs with embedded secrets, or tokens.
2. **Broadcast / deploy artifacts** — Confirm deployment broadcast directories with sensitive data are not tracked (see repo `.gitignore`).

## GitHub organization

See [.github/GITHUB-SETUP.md](../.github/GITHUB-SETUP.md) for Dependabot, **CI** (`.github/workflows/ci.yml`), branch protection expectations, and security advisory usage.

## npm

Verify metadata: `pnpm run verify:npm-metadata`. Confirm the **`@economicagents`** org and package names on npm before the first publish.

## GitHub release (example `v0.1.0`)

1. Align `CHANGELOG.md` and published package versions on the same semver.
2. `git tag -s v0.1.0 -m "v0.1.0"` (or unsigned tag per project policy), then `git push origin v0.1.0`.
3. Create a **GitHub Release** from that tag; paste the **\[0.1.0\]** section from `CHANGELOG.md` as the description.

## Base mainnet contract revision

After deploying to Base **8453**, update **`docs/guides/deployment.md`** (*Mainnet live addresses and record*) so factory and account addresses match `~/.aep/config.json` and [Basescan](https://basescan.org/). Commit that doc update on the same or a follow-up revision. Never commit **`.env`**, keystores, or private keys. **`contracts/broadcast/`** may be tracked for reproducibility (per `.gitignore`; only standard Foundry artifacts). Optional: add a short **Release** note or tag when mainnet addresses are production-stable.

## Smoke test after npm publish

On a machine **without** this monorepo: `npm install -g @economicagents/cli@<version>` then `aep --help` (and one read-only command such as `aep config validate` if config exists).
