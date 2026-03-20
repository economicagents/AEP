# GitHub configuration

## Dependabot

[`dependabot.yml`](dependabot.yml) enables version updates for npm (workspace root) and GitHub Actions. Adjust ignore rules if a dependency should stay pinned.

## CI

[`workflows/ci.yml`](workflows/ci.yml) runs on `main` and pull requests: Foundry `build` / `fmt --check` / `test` in `contracts/`, then pnpm `verify:npm-metadata`, `build`, `test:packages`, and ESLint on `packages/web`.

## Branch protection (apply in the org/repo UI)

Recommended for `main`:

- Require pull request before merging
- Require status checks: **CI** (`contracts`, `typescript`) and **DCO** ([`workflows/dco.yml`](workflows/dco.yml))
- Require linear history (optional)
- Include administrators (optional, per policy)

## Security

- Enable **Dependency graph** and **Dependabot security updates** for the repository.
- Use **GitHub Security Advisories** for responsible disclosure; the contact URL is documented in [`SECURITY.md`](../SECURITY.md) and must stay in sync with [`packages/web/lib/github.ts`](../packages/web/lib/github.ts) (`GITHUB_REPO`).
