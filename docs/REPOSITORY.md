# Repository (canonical source)

## Public GitHub

**Canonical URL:** **`https://github.com/economicagents/AEP`**

GitHub accepts lowercase paths (`/economicagents/aep`); they redirect here. Use **`AEP`** in links and package metadata so the URL matches the organization’s primary repo name.

This repository is the **single source of truth** for development: contracts (Foundry), every package under `packages/` (each npm name is **`@economicagents/<folder>`**; the repo root is the private **`@economicagents/workspace`** package), docs, skills, scripts, and CI. There is no slimmer “core-only” public repo—if something looks missing locally, it is almost always an uninitialized **submodule** (see README § Clone).

## npm and site metadata

- **`repository` / `bugs` / `homepage`** in `packages/*/package.json` should use `https://github.com/economicagents/AEP.git` (and matching issues URL).
- **Next.js** deep links use [`packages/web/lib/github.ts`](../packages/web/lib/github.ts) (`GITHUB_REPO`).

## Prior private remotes

Earlier work may have lived on a private org/user remote. That history is **not** required to build or contribute: clone this public repo, use issues and PRs here only, and **archive** the old remote in GitHub settings when you no longer need it.

## Renames

If the org or repository slug ever changes, update `GITHUB_REPO`, all `repository` fields, and this document together.
