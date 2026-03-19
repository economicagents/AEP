# Repository URLs

The canonical public GitHub location is **`https://github.com/economicagents/aep`**.

- **npm `repository` fields** in `packages/*/package.json` use this URL.
- **Next.js site** imports [`packages/web/lib/github.ts`](../packages/web/lib/github.ts); change `GITHUB_REPO` there to update footer, metadata, and docs deep links together.

If the org or repository is ever renamed, update `GITHUB_REPO` and all `repository` / `bugs` / `homepage` fields consistently.
