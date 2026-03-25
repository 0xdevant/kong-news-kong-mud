# Agent context — 港聞講乜 (`kong-news-kong-mud`)

HK news **RSS aggregator** (no HTML crawling). Teasers only; users open **原文** on publishers’ sites.

## Layout

| Path | Role |
|------|------|
| `worker/` | Cloudflare **Worker** — Hono API, RSS ingest, D1, cron |
| `web/` | **Vite + React** — UI; `web/functions/api/[[path]].ts` proxies `/api/*` → Worker (same-origin in prod) |
| **好路數** UI 對照（本機） | `../ho-lou-sou` → `/Users/ant/Desktop/ho-lou-sou` — 姊妹專案；講「跟好路數」時以呢個 repo 為準，唔靠猜測。見 `.cursor/rules/ho-lou-sou-reference.mdc` |

## Cloudflare names (current)

- **Worker script:** `kong-news-kong-mud-worker` (URL pattern: `https://kong-news-kong-mud-worker.<account>.workers.dev`)
- **Pages project:** `kong-news-kong-mud` → public URL **`https://news.clawify.dev`** (custom domain; `PAGES_ORIGIN` matches this for CORS)
- **D1:** still **`hk-news-rss-db`** + same `database_id` in `worker/wrangler.toml` (legacy name; do not rename without migration)

`worker/wrangler.toml` sets `PAGES_ORIGIN` to **`https://news.clawify.dev`**. Redeploy the Worker whenever this changes.

## Commands

- Root: `npm run deploy` → Worker deploy, then web build + Pages upload. After changing RSS/category logic or first deploy, **`POST` the Worker `/api/refresh`** (remote) so D1 has rows with `本地` / `國際` etc.; see README **After deploy**.
- Dev: **`npm run dev`** from repo root (Worker **8788** + Vite **5173** or next free port; `/api` proxied in [`web/vite.config.ts`](web/vite.config.ts)). Or two terminals: `cd worker && npm run dev`, `cd web && npm run dev`. First load empty until ingest: **`npm run refresh:local`** (works from **repo root or `worker/`**), or header **重新整理** in dev (also `POST /api/refresh`), or cron.
- **Local D1 ≠ remote D1:** default `wrangler dev` uses **local** persistence; production uses **remote** `hk-news-rss-db`. Category counts on [news.clawify.dev](https://news.clawify.dev) won’t match local until local ingest runs, or use **`npm run dev:remote`** (Worker `wrangler dev --remote`) to hit the same remote D1 as prod.
- **Tab counts** (`本地` / `國際` / …): `GROUP BY category` on D1; categories from RSS `<category>` + maps in [`worker/src/sources.ts`](worker/src/sources.ts). Zeros usually mean no successful ingest to that DB.
- **Covers:** RSS often has no real `<img>`; ingest may fill **og:image** (see `FETCH_OG_IMAGE*` in `worker/.dev.vars.example`).

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
