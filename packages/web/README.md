# @aep/web

Landing page and documentation site for the Agent Economic Protocol (AEP). Built with Next.js.

## Overview

- **Landing page** — Single scrollable page with hero, problem, capabilities, and CTA sections
- **Docs site** — Served at `/docs/*` from the `docs/` directory (quickstart, cookbook, deployment, architecture, threat model, API reference)

## Install

From monorepo: `pnpm install` at repo root.

## Build & Dev

```bash
# From repo root
pnpm run build:web   # or: pnpm --filter @aep/web build

# Development
pnpm run dev:web     # or: pnpm --filter @aep/web dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docs

Docs are loaded from `docs/` via `lib/docs.ts`. Add a slug in `SLUG_TO_FILE` and `DocNavLinks.tsx` to expose a new doc.

## Deployment

Deploy to Cloudflare Pages or Vercel. The app is static-friendly; docs are rendered at build time.

## Configuration

No required env vars for basic run. SEO/GEO use `NEXT_PUBLIC_*` or metadata in layout/page components.
