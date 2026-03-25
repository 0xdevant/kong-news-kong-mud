# 香港媒體 RSS 一覽

Aggregates **official RSS feeds** from Hong Kong outlets (no HTML crawling). Headlines and short excerpts are stored; users open **original articles** on each publisher’s site.

Based on the same stack patterns as **ho-lou-sou** (see `../ho-lou-sou` on your machine): **Vite + React** (Cloudflare Pages) and **Hono** on a **Cloudflare Worker** with **D1**.

## Live (deployed)

| What | URL |
|------|-----|
| **Website** | [https://hk-news-rss-web.pages.dev](https://hk-news-rss-web.pages.dev) |
| **API (Worker)** | `https://hk-news-rss-worker.cloudflare-underfeed523.workers.dev` |

CORS: `PAGES_ORIGIN` is set to `https://hk-news-rss-web.pages.dev` in [`worker/wrangler.toml`](worker/wrangler.toml). If you add a **custom domain** on Pages, add that origin to `PAGES_ORIGIN` and redeploy the Worker.

Populate or refresh the database manually:

```bash
curl -X POST https://hk-news-rss-worker.cloudflare-underfeed523.workers.dev/api/refresh
```

Hourly cron also runs RSS ingestion; D1 was migrated on first deploy.

## Feeds

Configured in [`worker/src/sources.ts`](worker/src/sources.ts):

- [香城公民媒體](https://hkcitizenmedia.com/feed/)
- [綠豆 Green Bean Media](https://greenbean.media/feed/)

To add **獨立媒體** or others: confirm a working RSS URL, add a `SourceConfig` entry, redeploy.

## One-command deploy

From repo root (uses the Worker URL baked into the web build):

```bash
npm run deploy
```

This runs `deploy:worker` then `deploy:web` (build with `VITE_API_URL` + Pages upload).

## Development

```bash
npm install
cd worker && npx wrangler d1 execute hk-news-rss-db --local --file=schema.sql
```

Terminal 1 — Worker (port 8787):

```bash
cd worker && npm run dev
```

Terminal 2 — Web (proxies `/api` to the worker):

```bash
cd web && npm run dev
```

Open `http://localhost:5173`. First load will be empty until ingestion runs:

```bash
curl -X POST http://127.0.0.1:8787/api/refresh
```

Optional: `worker/.dev.vars` from [`.dev.vars.example`](worker/.dev.vars.example). If `REFRESH_SECRET` is set, use `Authorization: Bearer <secret>` on `/api/refresh` and `/api/purge-excluded`.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/articles` | `category`, `source`, `limit`, `offset` |
| GET | `/api/init` | Category and source counts |
| GET | `/api/search?q=` | Search title / description / labels |
| GET | `/api/health` | Per-source freshness |
| POST | `/api/refresh` | Run RSS ingestion (optional Bearer secret) |
| POST | `/api/purge-excluded` | Delete rows matching `FILTER_*` env keywords |

Cron (see [`worker/wrangler.toml`](worker/wrangler.toml)): hourly RSS fetch, daily cleanup / purge pass.

## Licence

Project code is yours to license. **News content belongs to the respective publishers**; this app only displays syndicated feed snippets and links to originals.
