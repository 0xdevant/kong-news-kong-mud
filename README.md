# 港聞講乜

Aggregates **official RSS feeds** from Hong Kong outlets (no HTML crawling). Each item shows the **title** plus a **short teaser** (~72 characters) from the feed; the UI shows **one line** and pushes users to **閱讀全文** on the publisher’s site.

Based on the same stack patterns as **ho-lou-sou** (reference repo: **`/Users/ant/Desktop/ho-lou-sou`**, sibling folder `ho-lou-sou`): **Vite + React** (Cloudflare Pages) and **Hono** on a **Cloudflare Worker** with **D1**. When matching **好路數**-style UI, compare that repo — see `.cursor/rules/ho-lou-sou-reference.mdc`.

## Live (deployed)

| What | URL |
|------|-----|
| **Website** | [https://news.clawify.dev](https://news.clawify.dev) (custom domain on Pages; `kong-news-kong-mud.pages.dev` still works as the default Pages host) |
| **API** | 瀏覽器用 **same-origin** `https://news.clawify.dev/api/*`；本機 `curl` / `npm run refresh:prod` 亦建議用同一個 host（經 Pages Function 轉發），避免依賴 `*.workers.dev` 公開 DNS。 |

The **D1 database** is still named `hk-news-rss-db` in Cloudflare (same `database_id` in [`worker/wrangler.toml`](worker/wrangler.toml)); only app/Worker/Pages names changed to `kong-news-kong-mud-*`.

CORS: `PAGES_ORIGIN` is set to **`https://news.clawify.dev`** in [`worker/wrangler.toml`](worker/wrangler.toml) so the browser origin matches the custom domain. Redeploy the Worker after changing it. Add **`news.clawify.dev`** under the Pages project’s **Custom domains** and point DNS (e.g. CNAME `news` → `kong-news-kong-mud.pages.dev`) in the `clawify.dev` zone.

**Browser API calls** use same-origin `/api/*` via a [Pages Function](web/functions/api/[[path]].ts) that proxies to the Worker (avoids cross-origin issues with `workers.dev`).

Populate or refresh the database manually (recommended once after first deploy):

```bash
curl -X POST https://news.clawify.dev/api/refresh
```

Hourly cron also runs RSS ingestion; D1 was migrated on first deploy.

## Feeds

Configured in [`worker/src/sources.ts`](worker/src/sources.ts):

- [獨立媒體](https://www.inmediahk.net/rss.xml)、[香城公民媒體](https://hkcitizenmedia.com/feed/)、[綠豆](https://greenbean.media/feed/)、[本土研究社](https://liber-research.com/feed/)、[《大學線》CUHK](https://ubeat.com.cuhk.edu.hk/feed/)、[集誌社](https://thecollectivehk.com/feed/)

To add more outlets: confirm a working RSS URL, add a `SourceConfig` entry, redeploy.

## One-command deploy

From repo root (needs [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) and `npx wrangler login` once):

```bash
npm run deploy
```

This runs **`deploy:worker`** (`cd worker && wrangler deploy`) then **`deploy:web`** (`vite build` + `wrangler pages deploy`). The site uses **same-origin** `/api/*` via [Pages Functions](web/functions/api/[[path]].ts) — no `VITE_API_URL` required for that setup.

### After deploy — 「本地／國際」仍然係 0？

分類數字嚟自 **遠端 D1** 已 ingest 嘅文章。RSS 邏輯同 `sources.ts` 對照表喺 **Worker**；若從未成功對遠端跑 ingest，或改咗分類／feed 未再入庫，tab 會係 0。

**部署後請對遠端手動跑一次入庫**（用自訂網域，同瀏覽器打 `/api` 一致）：

```bash
curl -X POST https://news.clawify.dev/api/refresh
```

若已設定 **`REFRESH_SECRET`**：

```bash
curl -X POST "https://news.clawify.dev/api/refresh" \
  -H "Authorization: Bearer YOUR_SECRET"
```

**驗證分類：**

```bash
curl -s "https://news.clawify.dev/api/init"
```

應見 `categories` 內 `本地` / `國際` 等嘅 `count`（視 RSS 而定；`sources.ts` 內各 feed 正常會有）。之後 cron 會每小時再拉。

## Auto deploy (GitHub Actions)

Every push to **`main`** runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) and deploys the Worker + Pages.

**One-time setup:** In the GitHub repo → **Settings → Secrets and variables → Actions** → **New repository secret**:

| Name | Description |
|------|-------------|
| `CLOUDFLARE_API_TOKEN` | [Create](https://dash.cloudflare.com/profile/api-tokens) an API token with **Workers Scripts**, **Pages**, and **D1** (or use the **Edit Cloudflare Workers** template and add Pages if needed). |

Push this project to GitHub on the `main` branch; each new commit triggers a deploy. Without the secret, the workflow fails until you add it.

## Development

```bash
npm install
cd worker && npx wrangler d1 execute hk-news-rss-db --local --file=schema.sql
```

**Local app (Worker + Vite together):** from repo root:

```bash
npm run dev
```

This starts **Wrangler** on **`http://127.0.0.1:8788`** and **Vite** on **`http://localhost:5173`** (or the next free port if 5173 is busy). The web app proxies **`/api`** to the worker ([`web/vite.config.ts`](web/vite.config.ts) → port **8788**, matching [`worker/package.json`](worker/package.json) `wrangler dev --port 8788`).

Or run two terminals manually: `cd worker && npm run dev` and `cd web && npm run dev`.

Open the Vite URL (e.g. `http://localhost:5173`). First load will be empty until ingestion runs.

**Easiest — pull RSS into local D1:**

```bash
npm run refresh:local
```

（喺 **repo 根目錄** 或 **`cd worker`** 之後都可以跑同一個指令；兩邊都有 `refresh:local` script。）

會 `POST` 本機 `http://127.0.0.1:8788/api/refresh`；若 `worker/.dev.vars` 有 `REFRESH_SECRET`，腳本會自動帶 Bearer。開住 `npm run dev` 時，亦可以撳頂部 **重新整理** 圖示 —— 本機開發模式會先跑同一個 ingest，再更新列表。

Equivalent manual curl:

```bash
curl -X POST http://127.0.0.1:8788/api/refresh
```

**分類數字（本地／國際等）：** 來自 D1 裏每篇文章的 `category`，由 RSS 的 `<category>` 經 [`worker/src/sources.ts`](worker/src/sources.ts) 對照表決定。成功 ingest 後不應長期為 0；若仍是 0，代表尚未成功寫入資料（例如未跑 refresh、或只連到沒有資料的環境）。

**本機與 [news.clawify.dev](https://news.clawify.dev) 資料唔一樣係正常：** 預設 `npm run dev` 用 **本機 D1**（`.wrangler/state` 入面嘅 SQLite），同 Cloudflare 上面 **遠端 D1** 係兩個資料庫。正式站有 cron／人手 refresh，本機要自己 ingest 先有同類分佈。可以二揀一：

1. **填滿本機庫：** 起好 Worker 之後執行 `curl -X POST http://127.0.0.1:8788/api/refresh`（有 `REFRESH_SECRET` 就要帶 Bearer）。
2. **用正式站同一個遠端 D1 做開發：** 在 repo root 跑 **`npm run dev:remote`**（Worker 用 `wrangler dev --remote`，Vite 不變）；瀏覽器經 proxy 打嘅 `/api` 會讀到線上資料，分類會同 news.clawify.dev 一致（需已登入 `wrangler`、有權限連該 D1）。

**封面圖：** 不少來源在 RSS 裏只有文字、沒有真正相片（或第一張圖是表情符號）。Worker 會略過這類網址，並在 ingest 時為缺圖文章抓取頁面的 **og:image**（每輪有上限，見 [`.dev.vars.example`](worker/.dev.vars.example) 的 `FETCH_OG_IMAGE*`）。

Optional: `worker/.dev.vars` from [`.dev.vars.example`](worker/.dev.vars.example). If `REFRESH_SECRET` is set, use `Authorization: Bearer <secret>` on `/api/refresh` and `/api/purge-excluded`.

**Contact form:** messages are stored in D1 (`contact_messages`). Optional **Resend** email: set `RESEND_API_KEY`, `CONTACT_EMAIL_TO`, and (recommended) `RESEND_FROM` with a verified sender in [Resend](https://resend.com).

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/articles` | `category`, `source`, `limit`, `offset` |
| GET | `/api/init` | Category and source counts |
| GET | `/api/search?q=` | Search title / description / labels |
| GET | `/api/health` | Per-source freshness |
| POST | `/api/contact` | Contact form JSON `{ name, email, message }` |
| POST | `/api/refresh` | Run RSS ingestion (optional Bearer secret) |
| POST | `/api/purge-excluded` | Delete rows matching `FILTER_*` env keywords |

Cron (see [`worker/wrangler.toml`](worker/wrangler.toml)): one **hourly** trigger; RSS every hour, cleanup / purge at **00:00 UTC** only (keeps a single cron on free-tier limits).

## Licence

Project code is yours to license. **News content belongs to the respective publishers**; this app only displays syndicated feed snippets and links to originals.
