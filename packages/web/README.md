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

The floating **documentation assistant** uses `POST /api/docs-chat`. It answers from the same bundled markdown as this site (retrieval + **[Vercel AI Gateway](https://vercel.com/docs/ai-gateway)** and the **AI SDK**; default model **`openai/gpt-4o-mini`**). Usage is billed to your **Vercel team credits** via the gateway. It does not query live chain state—only the published docs corpus.

| Variable | Purpose |
| -------- | ------- |
| `AI_GATEWAY_API_KEY` | Required for the assistant to run (create a key under your Vercel team’s AI Gateway). If unset, the API returns **503**. Works on Cloudflare Workers when set as a **runtime** Worker secret. |
| `AEP_DOCS_CHAT_MODEL` | Optional gateway model id `provider/model` (default: `openai/gpt-4o-mini`). See [AI Gateway models](https://vercel.com/docs/ai-gateway/models). |
| `NEXT_PUBLIC_AEP_DOCS_CHAT` | Set to `0` or `false` to hide the widget. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Optional. When both are set, **IP rate limits** apply (~10/min and ~60/hour per client IP) via [@upstash/ratelimit](https://github.com/upstash/ratelimit). If Redis is unreachable or misconfigured, the route **fails open** (allows requests) so the assistant stays available. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Optional **Cloudflare Turnstile**. When `TURNSTILE_SECRET_KEY` is set, the API requires a verified `turnstileToken` in the JSON body; the widget appears when the site key is set. |

**Limits:** request bodies over **512 KiB** (`Content-Length`) get **413**. The model call times out after **60s** (**504**). Provider **429**-style errors are returned as **429**. Prefer **Cloudflare WAF / rate limiting** on `POST /api/docs-chat` as an extra layer.

**Runtime vs build:** The route reads `AI_GATEWAY_API_KEY` at **request time** (`process.env` or Worker `env` via OpenNext). It must be a **runtime** secret—not only a build variable. [OpenNext env guide](https://opennext.js.org/cloudflare/howtos/env-vars).

**Cloudflare Workers:**

```bash
cd packages/web && npx wrangler secret put AI_GATEWAY_API_KEY
```

Or set **Variables and Secrets** in the dashboard. Use [`wrangler deploy --keep-vars`](https://developers.cloudflare.com/workers/wrangler/commands/#deploy) when needed so dashboard vars are not dropped.

**Workers Builds:** Put `NEXT_PUBLIC_*` in **Build variables and secrets**; put `AI_GATEWAY_API_KEY`, Upstash, and Turnstile in **runtime** for the Worker.

Local development: set `AI_GATEWAY_API_KEY` in `.env` (not committed). Vercel-hosted deploys can use [OIDC / keyless](https://vercel.com/docs/ai-gateway/authentication) for the gateway; Cloudflare should use an explicit **`AI_GATEWAY_API_KEY`**.
