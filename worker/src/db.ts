import type { Article, Env } from "./types";
import {
  getExcludeKeywords,
  getClickbaitPatterns,
  appliesKeywordFilterToTitleOnly,
} from "./filter";

/** UI tab：篩選香港日曆「今日」內發佈嘅稿（`published_at_ts`），唔係資料庫 `category` 欄。 */
export const CATEGORY_TAB_TODAY = "今日";

/** RSS `pubDate` → Unix 秒；無效則 `null`（唔入「今日」）。 */
export function parsePublishedAtToUnix(publishedAt: string | null): number | null {
  if (publishedAt == null || publishedAt.trim() === "") return null;
  const ms = Date.parse(publishedAt);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

/** 香港時區「今日」00:00–24:00 對應嘅 UTC Unix 秒（同 `published_at_ts` / `fetched_at` 比較）。 */
export function hkTodayStartEndUnix(nowSec: number): {
  start: number;
  end: number;
} {
  const d = new Date(nowSec * 1000);
  const hk = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, day] = hk.split("-").map(Number);
  const startMs =
    Date.UTC(y, m - 1, day, 0, 0, 0, 0) - 8 * 60 * 60 * 1000;
  const endMs = startMs + 86400 * 1000;
  return { start: Math.floor(startMs / 1000), end: Math.floor(endMs / 1000) };
}

/**
 * 「全部」：若只按 `fetched_at` 排序，同一輪 ingest 會變成同一來源（如獨媒）連續霸屏。
 * 喺新時間序嘅池內按來源輪流出牌，每個來源內部仍係新先。
 */
function interleaveBySource(articles: Article[], max: number): Article[] {
  const bySource = new Map<string, Article[]>();
  for (const a of articles) {
    const list = bySource.get(a.source_name) ?? [];
    list.push(a);
    bySource.set(a.source_name, list);
  }
  const keys = [...bySource.keys()].sort((a, b) =>
    a.localeCompare(b, "zh-HK", { numeric: true }),
  );
  const out: Article[] = [];
  while (out.length < max) {
    let addedAny = false;
    for (const k of keys) {
      const list = bySource.get(k);
      if (list && list.length > 0) {
        out.push(list.shift()!);
        addedAny = true;
        if (out.length >= max) break;
      }
    }
    if (!addedAny) break;
  }
  return out;
}

export async function upsertArticles(
  env: Env,
  articles: Article[],
): Promise<number> {
  let inserted = 0;
  const batchSize = 20;

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const stmts = batch.map((a) => {
      const pubTs = parsePublishedAtToUnix(a.published_at);
      return env.DB.prepare(
        `INSERT OR REPLACE INTO articles (id, title, description, source_url, source_name, category, labels, image_url, fetched_at, published_at, published_at_ts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        a.id,
        a.title,
        a.description,
        a.source_url,
        a.source_name,
        a.category,
        a.labels,
        a.image_url,
        a.fetched_at,
        a.published_at,
        pubTs,
      );
    });
    await env.DB.batch(stmts);
    inserted += batch.length;
  }

  return inserted;
}

export async function getArticles(
  env: Env,
  opts: {
    category?: string;
    source?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<Article[]> {
  const { category, source, limit = 50, offset = 0 } = opts;
  const conditions: string[] = [];
  const params: unknown[] = [];

  const isTodayTab = category === CATEGORY_TAB_TODAY;
  if (category && !isTodayTab) {
    conditions.push("category = ?");
    params.push(category);
  }
  if (isTodayTab) {
    const { start, end } = hkTodayStartEndUnix(Math.floor(Date.now() / 1000));
    conditions.push("published_at_ts IS NOT NULL");
    conditions.push("published_at_ts >= ?");
    conditions.push("published_at_ts < ?");
    params.push(start, end);
  }
  if (source) {
    conditions.push("source_name = ?");
    params.push(source);
  }

  /** 無分類、無來源 =「全部」；「今日」亦交錯來源 */
  const mixAll = !category && !source;
  const mixToday = isTodayTab && !source;
  const shouldInterleave = mixAll || mixToday;
  const poolLimit = shouldInterleave
    ? Math.min(Math.max(limit * 10, limit), 500)
    : limit;

  let query = "SELECT * FROM articles";
  if (conditions.length) query += " WHERE " + conditions.join(" AND ");
  const orderBy = isTodayTab ? "published_at_ts DESC" : "fetched_at DESC";
  query += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  params.push(poolLimit, shouldInterleave ? 0 : offset);

  const result = await env.DB.prepare(query).bind(...params).all<Article>();
  const rows = result.results;
  if (shouldInterleave) {
    return interleaveBySource(rows, limit);
  }
  return rows;
}

export async function getArticleCounts(
  env: Env,
): Promise<Record<string, number>> {
  const result = await env.DB.prepare(
    "SELECT category, COUNT(*) as count FROM articles GROUP BY category",
  ).all<{ category: string; count: number }>();

  const counts: Record<string, number> = {};
  for (const row of result.results) {
    counts[row.category] = row.count;
  }
  return counts;
}

export async function countArticlesPublishedToday(env: Env): Promise<number> {
  const { start, end } = hkTodayStartEndUnix(Math.floor(Date.now() / 1000));
  const result = await env.DB.prepare(
    "SELECT COUNT(*) as n FROM articles WHERE published_at_ts IS NOT NULL AND published_at_ts >= ? AND published_at_ts < ?",
  )
    .bind(start, end)
    .first<{ n: number }>();
  return result?.n ?? 0;
}

/** 舊行只有 `published_at` 字串；逐批補 `published_at_ts` 以便「今日」可用。 */
export async function backfillPublishedAtTs(
  env: Env,
  maxRows = 500,
): Promise<number> {
  const rows = await env.DB.prepare(
    `SELECT id, published_at FROM articles
     WHERE published_at IS NOT NULL AND TRIM(published_at) != ''
       AND published_at_ts IS NULL
     LIMIT ?`,
  )
    .bind(maxRows)
    .all<{ id: string; published_at: string }>();

  let updated = 0;
  for (const row of rows.results) {
    const ts = parsePublishedAtToUnix(row.published_at);
    if (ts == null) continue;
    await env.DB.prepare(
      "UPDATE articles SET published_at_ts = ? WHERE id = ?",
    )
      .bind(ts, row.id)
      .run();
    updated++;
  }
  return updated;
}

export async function cleanOldArticles(
  env: Env,
  maxAgeDays = 14,
): Promise<number> {
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeDays * 86400;
  const result = await env.DB.prepare(
    "DELETE FROM articles WHERE fetched_at < ?",
  )
    .bind(cutoff)
    .run();
  return result.meta.changes ?? 0;
}

export async function purgeExcludedArticles(env: Env): Promise<{
  deleted: number;
  keywordCount: number;
}> {
  const keywords = [
    ...new Set([...getExcludeKeywords(env), ...getClickbaitPatterns(env)]),
  ];
  if (keywords.length === 0) return { deleted: 0, keywordCount: 0 };
  const titleOnly = appliesKeywordFilterToTitleOnly(env);
  let total = 0;
  for (const kw of keywords) {
    const like = `%${kw}%`;
    const r = titleOnly
      ? await env.DB.prepare(`DELETE FROM articles WHERE title LIKE ?`)
          .bind(like)
          .run()
      : await env.DB.prepare(
          `DELETE FROM articles WHERE title LIKE ? OR IFNULL(description,'') LIKE ? OR IFNULL(labels,'') LIKE ?`,
        )
          .bind(like, like, like)
          .run();
    total += r.meta.changes ?? 0;
  }
  return { deleted: total, keywordCount: keywords.length };
}
