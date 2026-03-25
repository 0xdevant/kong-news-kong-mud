import type { Article, Env } from "./types";

/**
 * Filter keywords from Worker env (`FILTER_*`) or `.dev.vars` — not hardcoded in source.
 */

function normalizeKeywordEnv(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/[\u201C\u201D\uFF02]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function parseKeywordList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const s = normalizeKeywordEnv(raw);
  try {
    const p = JSON.parse(s) as unknown;
    if (Array.isArray(p))
      return p.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    /* fall through */
  }
  if (s.startsWith("[") && s.endsWith("]")) {
    const inner = s.slice(1, -1).trim();
    if (inner)
      return inner
        .split(/[,\n]/)
        .map((x) => x.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    return [];
  }
  return s
    .split(/[,\n]/)
    .map((x) => x.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

export function getExcludeKeywords(env: Env): string[] {
  return [...new Set(parseKeywordList(env.FILTER_EXCLUDE_KEYWORDS))];
}

export function getClickbaitPatterns(env: Env): string[] {
  return [...new Set(parseKeywordList(env.FILTER_CLICKBAIT_PATTERNS))];
}

export function filterArticles(articles: Article[], env: Env): Article[] {
  const exclude = getExcludeKeywords(env);
  const clickbait = getClickbaitPatterns(env);
  return articles.filter((a) => {
    const text = (
      a.title +
      " " +
      (a.description || "") +
      " " +
      (a.labels || "")
    ).toLowerCase();
    if (exclude.some((kw) => text.includes(kw.toLowerCase()))) return false;
    if (clickbait.some((kw) => text.includes(kw.toLowerCase()))) return false;
    return true;
  });
}
