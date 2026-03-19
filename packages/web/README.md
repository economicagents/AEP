# @economicagents/web

Landing page and documentation site for the Agent Economic Protocol (AEP). Built with Next.js.

## Overview

- **Landing page** — Single scrollable page with hero, problem, capabilities, and CTA sections
- **Docs site** — Served at `/docs/*` from the `docs/` directory (quickstart, cookbook, deployment, architecture, threat model, API reference)

## Install

From monorepo: `pnpm install` at repo root.

## Build & Dev

```bash
# From repo root
pnpm run build:web   # or: pnpm --filter @economicagents/web build

# Development
pnpm run dev:web     # or: pnpm --filter @economicagents/web dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docs

Docs are loaded from `docs/` via `lib/docs.ts`. Add a slug in `SLUG_TO_FILE` and `DocNavLinks.tsx` to expose a new doc.

## Deployment

### Cloudflare Workers (recommended)

The site uses OpenNext for Cloudflare. Deploy via CLI or Workers Builds:

**CLI deploy:**
```bash
cd packages/web && pnpm run deploy
```

**Workers Builds (Git integration):** In Cloudflare Dashboard → Workers & Pages → aep-web → Settings → Builds, use:

| Setting | Value |
|---------|-------|
| Root directory | `packages/web` |
| Build command | `pnpm run build:cf` |
| Deploy command | `npx wrangler deploy` |

> **Important:** Use `build:cf` (not `build`). The `build:cf` script pre-bundles docs for Workers (no Node.js `fs` at runtime) and runs OpenNext.

### Other platforms

The app is static-friendly; docs are rendered at build time. Can also deploy to Vercel with `next build`.

## Configuration

No required env vars for basic run. SEO/GEO use `NEXT_PUBLIC_*` or metadata in layout/page components.
