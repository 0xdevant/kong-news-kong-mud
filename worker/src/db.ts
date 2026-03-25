import type { Article, Env } from "./types";
import { getExcludeKeywords, getClickbaitPatterns } from "./filter";

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

  let query = "SELECT * FROM articles";
  if (conditions.length) query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY fetched_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const result = await env.DB.prepare(query).bind(...params).all<Article>();
  return result.results;
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
  let total = 0;
  for (const kw of keywords) {
    const like = `%${kw}%`;
    const r = await env.DB.prepare(
      `DELETE FROM articles WHERE title LIKE ? OR IFNULL(description,'') LIKE ? OR IFNULL(labels,'') LIKE ?`,
    )
      .bind(like, like, like)
      .run();
    total += r.meta.changes ?? 0;
  }
  return { deleted: total, keywordCount: keywords.length };
}
