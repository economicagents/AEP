# @economicagents/web

Next.js **landing page** and **documentation site** for AEP (`/docs/*`). **Integrators** usually read [economicagents.org/docs](https://economicagents.org/docs) or the markdown under `docs/` in the repo; this package is for **building or hosting** that site yourself.

## What it includes

- Marketing landing (hero, capabilities, CTA)
- Docs routes generated from the repository `docs/` tree (quickstart, cookbook, deployment, architecture, threat model, API reference, etc.)

## Install

Workspace package in [economicagents/AEP](https://github.com/economicagents/AEP). From repo root:

```bash
pnpm install
```

## Build & dev

```bash
# From repo root
pnpm run build:web   # or: pnpm --filter @economicagents/web build

pnpm run dev:web     # or: pnpm --filter @economicagents/web dev
```

Open [http://localhost:3000](http://localhost:3000).

## Site operators: adding docs

Docs are wired in `packages/web` (e.g. `lib/docs.ts`, `DocNavLinks.tsx`). Add slugs there when you introduce new markdown under `docs/`.

## Deployment (hosting the site)

### Cloudflare Workers

The app targets OpenNext on Cloudflare.

**CLI:**

```bash
cd packages/web && pnpm run deploy
```

**Workers Builds** (dashboard): root directory **`packages/web`**, build **`pnpm run build:cf`**, deploy **`npx wrangler deploy`**. Use **`build:cf`** (not plain `build`) so docs are pre-bundled for the Worker runtime.

### Other platforms

Static-friendly; `next build` works on Vercel and similar hosts if you adapt env and output.

## Configuration

No env vars required for a basic local run. SEO uses `NEXT_PUBLIC_*` or layout metadata as needed.
