# Publishing npm Packages

Guide for publishing AEP packages to npm. Ensure [NOTICE](../NOTICE) in the repo stays accurate for vendored dependencies.

## Publish order

Publish in dependency order so consumers never depend on unpublished packages:

1. `@aep/graph` — no `@aep/*` deps
2. `@aep/keystore` — no `@aep/*` deps (required by CLI, MCP, API, smoke-tests)
3. `@aep/sdk` — depends on `@aep/graph`
4. `@aep/indexer` — depends on `@aep/sdk`
5. `@aep/resolver` — depends on `@aep/graph`, `@aep/indexer`, `@aep/sdk`
6. `@aep/monitor` — depends on `@aep/sdk`
7. `@aep/mcp` — depends on `@aep/graph`, `@aep/keystore`, `@aep/indexer`, `@aep/resolver`, `@aep/sdk`
8. `@aep/api` — depends on `@aep/graph`, `@aep/keystore`, `@aep/indexer`, `@aep/resolver`, `@aep/sdk`
9. `aep-cli` — depends on `@aep/indexer`, `@aep/keystore`, `@aep/monitor`, `@aep/resolver`, `@aep/sdk`

## Before publishing

- Confirm the **`@aep` npm org** exists and you are logged in (`npm login`).
- Confirm the unscoped name **`aep-cli`** is available (or choose another CLI package name and update `packages/cli/package.json` `name` before publishing).
- Update [`CHANGELOG.md`](../CHANGELOG.md) and bump semver in each published `package.json`.
- Run `pnpm run verify:npm-metadata` from the repo root (`license` and `repository` fields).
- Replace `file:../x` dependencies with **published semver ranges** in each package you publish before `pnpm publish`.
- Run `pnpm run build` and `pnpm run test`.
- Spot-check tarballs from each package directory: `npm pack --dry-run` and confirm `dist/` is listed (SPDX `license` in `package.json` should match [LICENSE](../LICENSE)).

## Publish

```bash
cd packages/graph && pnpm publish --no-git-checks --access public
# Repeat for each package in the order above
```

Use `--access public` for scoped packages (`@aep/*`). `aep-cli` is unscoped; `publishConfig.access` is set to `public` for clarity.

## Post-publish

- Restore `workspace:*` / `file:../` dependencies for local monorepo development, **or** commit the updated semver ranges if the team prefers tracking published versions.
- Tag the Git repository (see `CHANGELOG.md` and release process in [OPEN-SOURCE-RELEASE.md](OPEN-SOURCE-RELEASE.md)).
