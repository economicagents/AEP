# Publishing npm Packages

Guide for publishing AEP packages to npm. Ensure [NOTICE](../NOTICE) in the repo stays accurate for vendored dependencies.

## Publish order

Publish in dependency order so consumers never depend on unpublished packages:

1. `@economicagents/viem-rpc` — shared viem HTTP/WSS transport; no `@economicagents/*` deps
2. `@economicagents/graph` — depends on `@economicagents/viem-rpc`
3. `@economicagents/keystore` — no `@economicagents/*` deps (required by CLI, MCP, API, smoke-tests)
4. `@economicagents/sdk` — depends on `@economicagents/graph`, `@economicagents/viem-rpc`
5. `@economicagents/indexer` — depends on `@economicagents/sdk`, `@economicagents/viem-rpc`
6. `@economicagents/resolver` — depends on `@economicagents/graph`, `@economicagents/indexer`, `@economicagents/sdk`
7. `@economicagents/monitor` — depends on `@economicagents/sdk`, `@economicagents/viem-rpc`
8. `@economicagents/mcp` — depends on `@economicagents/graph`, `@economicagents/keystore`, `@economicagents/indexer`, `@economicagents/resolver`, `@economicagents/sdk`
9. `@economicagents/api` — depends on `@economicagents/graph`, `@economicagents/keystore`, `@economicagents/indexer`, `@economicagents/resolver`, `@economicagents/sdk`
10. `@economicagents/cli` — depends on `@economicagents/indexer`, `@economicagents/keystore`, `@economicagents/monitor`, `@economicagents/resolver`, `@economicagents/sdk`

## Authentication

- **Interactive:** `npm login` (browser or one-time password), then run `pnpm run publish:packages` from this repo. If npm returns **EOTP**, pass a current authenticator code: `NPM_OTP=123456 pnpm run publish:packages` (re-run with a fresh code if the chain publishes multiple packages and one step expires the OTP).
- **Two-factor (required to publish):** npm returns **403** (“Two-factor authentication or granular access token with bypass 2fa enabled is required”) until you enable **2FA** on your account (**Account → Security**) and use an OTP when publishing, *or* use a **granular access token** with **Publish** permission and **“Bypass two-factor authentication”** enabled for automation.
- **Token (CI or scripts):** create a **granular** access token on [npmjs.com](https://www.npmjs.com/) with publish rights to the **`@economicagents`** scope, then either:
  - `npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN` (writes to user `~/.npmrc`), or
  - `export NPM_TOKEN=...` and prepend to `~/.npmrc`: `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`  
  Never commit tokens or `.npmrc` files that contain them.

## Before publishing

- Confirm the **`@economicagents` npm org** exists on [npmjs.com](https://www.npmjs.com/) and your user has **publish** rights to that scope (2FA as required by npm).
- All first-party libraries and the CLI use the **`@economicagents/*`** scope on npm. Install the CLI globally with `npm install -g @economicagents/cli` (command on your PATH is still **`aep`**).
- Update [`CHANGELOG.md`](../CHANGELOG.md) and bump semver in **every** published `package.json` you are releasing (keep versions aligned across `@economicagents/*` for a given release).
- Run `pnpm run verify:npm-metadata` from the repo root (`license` and `repository` fields).
- Run `pnpm run build` and `pnpm run test`.
- Workspace dependencies use `workspace:*`; **`pnpm publish` rewrites them** to the published semver of each dependency when you publish from this monorepo—no manual `file:` replacement needed.
- Spot-check tarballs: `pnpm run publish:packages:dry-run` or per package `npm pack --dry-run` and confirm `dist/` is listed (SPDX `license` in `package.json` should match [LICENSE](../LICENSE)).

## Publish (automated)

From repo root, in dependency order (same as the list above):

```bash
pnpm run publish:packages:dry-run   # optional: no upload
pnpm run publish:packages           # uploads after npm login
```

## Publish (manual)

```bash
cd packages/graph && pnpm publish --no-git-checks --access public
# Repeat for each package in the order above
```

Use `--access public` for scoped packages (`@economicagents/*`, including `@economicagents/cli`).

## Packages not on npm

- **`@economicagents/web`** — `private: true`; deploy the site separately (e.g. Vercel, Cloudflare Pages). Not published as a library.
- **`@economicagents/benchmark`**, **`@economicagents/smoke-tests`** — tooling in-repo only unless you explicitly choose to publish later.

## Post-publish

- After publishing from this monorepo, keep using `workspace:*` for local development (or commit semver ranges if you intentionally track published versions in `package.json`).
- Tag the Git repository (see `CHANGELOG.md` and release process in [OPEN-SOURCE-RELEASE.md](OPEN-SOURCE-RELEASE.md)).
