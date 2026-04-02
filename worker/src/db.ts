import type { Article, Env } from "./types";
import {
  getExcludeKeywords,
  getClickbaitPatterns,
  appliesKeywordFilterToTitleOnly,
} from "./filter";

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
    const stmts = batch.map((a) =>
      env.DB.prepare(
        `INSERT OR REPLACE INTO articles (id, title, description, source_url, source_name, category, labels, image_url, fetched_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ),
    );
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

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }
  if (source) {
    conditions.push("source_name = ?");
    params.push(source);
  }

  /** 無分類、無來源 =「全部」tab → 拉大一池再交錯，避免單一來源連續出現 */
  const mixAll = !category && !source;
  const poolLimit = mixAll ? Math.min(Math.max(limit * 10, limit), 500) : limit;

  let query = "SELECT * FROM articles";
  if (conditions.length) query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY fetched_at DESC LIMIT ? OFFSET ?";
  params.push(poolLimit, mixAll ? 0 : offset);

  const result = await env.DB.prepare(query).bind(...params).all<Article>();
  const rows = result.results;
  if (mixAll) {
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
