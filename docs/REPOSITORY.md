# Repository (canonical source)

**GitHub:** [`https://github.com/economicagents/AEP`](https://github.com/economicagents/AEP)

Use this URL when linking to the project, opening issues, or checking **`repository`**, **`bugs`**, and **`homepage`** fields in [`@economicagents/*` packages on npm](https://www.npmjs.com/search?q=scope%3Aeconomicagents). GitHub also accepts lowercase paths; they redirect to the canonical form.

## What is in this monorepo

- **Contracts** — Foundry project under `contracts/`
- **Packages** — TypeScript libraries and apps under `packages/` (published package names are **`@economicagents/<folder>`**)
- **Documentation** — `docs/` (start at [DOCUMENT-MAP.md](DOCUMENT-MAP.md))
- **Skills** — Optional AI-agent skill packs under `skills/`

There is no separate “minimal” checkout: everything needed to build and integrate lives here. If `contracts/lib/` looks empty, initialize **git submodules** (see [README](../README.md) § Clone).

## Docs site

The published documentation site resolves GitHub links using [`packages/web/lib/github.ts`](../packages/web/lib/github.ts) (`GITHUB_REPO`).
