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

No env vars are required for a basic local run (SEO uses `NEXT_PUBLIC_*` or layout metadata as needed).

### Documentation assistant (optional)

The floating **documentation assistant** uses `POST /api/docs-chat`. It answers from the same bundled markdown as this site (retrieval + **Anthropic Claude Haiku**; default model `claude-3-5-haiku-20241022`). It does not query live chain state—only the published docs corpus.

| Variable | Purpose |
| -------- | ------- |
| `ANTHROPIC_API_KEY` | Required for the assistant to run. If unset, the API returns **503** and the UI explains that the feature is not configured. |
| `AEP_DOCS_CHAT_MODEL` | Optional override for the Messages API model id (default: `claude-3-5-haiku-20241022`). |
| `NEXT_PUBLIC_AEP_DOCS_CHAT` | Set to `0` or `false` to hide the widget (e.g. forks without an API key). |

**Limits:** request bodies over **512 KiB** (`Content-Length`) get **413**. The Anthropic request times out after **60s** (**504**). Anthropic **429** is passed through as **429**. For production, add **Cloudflare WAF / rate limiting** in front of the Worker.

**Cloudflare Workers:** set the secret for production:

```bash
cd packages/web && npx wrangler secret put ANTHROPIC_API_KEY
```

Local development: add `ANTHROPIC_API_KEY` to your environment (e.g. shell or a local env file not committed).
