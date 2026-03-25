# Agent context — 港聞講乜 (`kong-news-kong-mud`)

HK news **RSS aggregator** (no HTML crawling). Teasers only; users open **原文** on publishers’ sites.

## Layout

| Path | Role |
|------|------|
| `worker/` | Cloudflare **Worker** — Hono API, RSS ingest, D1, cron |
| `web/` | **Vite + React** — UI; `web/functions/api/[[path]].ts` proxies `/api/*` → Worker (same-origin in prod) |

## Cloudflare names (current)

- **Worker script:** `kong-news-kong-mud-worker` (URL pattern: `https://kong-news-kong-mud-worker.<account>.workers.dev`)
- **Pages project:** `kong-news-kong-mud` → public URL **`https://news.clawify.dev`** (custom domain; `PAGES_ORIGIN` matches this for CORS)
- **D1:** still **`hk-news-rss-db`** + same `database_id` in `worker/wrangler.toml` (legacy name; do not rename without migration)

`worker/wrangler.toml` sets `PAGES_ORIGIN` to **`https://news.clawify.dev`**. Redeploy the Worker whenever this changes.

## Commands

- Root: `npm run deploy` → Worker deploy, then web build + Pages upload.
- Dev: `cd worker && npm run dev` (8787); `cd web && npm run dev` (5173, proxies `/api`). First load empty until `POST /api/refresh` on the Worker (or cron).

## Secrets & auth

- **`CLOUDFLARE_API_TOKEN`:** GitHub Actions → deploy (Workers + Pages + D1).
- **`REFRESH_SECRET`** (optional): if set on the Worker, `POST /api/refresh` and `POST /api/purge-excluded` require `Authorization: Bearer <secret>`. Generate locally: `openssl rand -hex 32`; set with `cd worker && npx wrangler secret put REFRESH_SECRET` **after** the Worker exists (`wrangler deploy` once).

## Cron (account limit)

Only **one** cron in `worker/wrangler.toml` (`0 * * * *`). Handler runs RSS **hourly**; **daily** cleanup/purge runs when `getUTCHours() === 0` (00:00 UTC). Do not add a second `crons` entry without checking the account’s trigger limit.

## Product rules

- **Feeds:** `worker/src/sources.ts` — map WordPress/RSS `<category>` → `本地 | 國際 | 時事 | 其他` via `categoryMap`; `worker/src/rss.ts` resolves multi-tag items by **priority** (本地 → 國際 → 時事 → 其他).
- **Web:** Favourites = `localStorage` key `gangwen_favs`; theme = `gangwen_theme`.
- **Rate limiting:** Same pattern as ho-lou-sou — GET cache headers + `limit` caps; contact form global hourly cap in D1; no per-IP API throttle in code unless you add Cloudflare rules.

## Docs

See [`README.md`](README.md) for API table, env vars, and Resend/contact notes.
