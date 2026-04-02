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

/** When true, keyword filters only inspect `title` (recommended for HK news RSS). */
export function appliesKeywordFilterToTitleOnly(env: Env): boolean {
  return env.FILTER_APPLY_TO_TITLE_ONLY === "true";
}

function matchTextForFilter(a: Article, titleOnly: boolean): string {
  if (titleOnly) return a.title.toLowerCase();
  return (
    a.title +
    " " +
    (a.description || "") +
    " " +
    (a.labels || "")
  ).toLowerCase();
}

export function filterArticles(articles: Article[], env: Env): Article[] {
  const exclude = getExcludeKeywords(env);
  const clickbait = getClickbaitPatterns(env);
  const titleOnly = appliesKeywordFilterToTitleOnly(env);
  return articles.filter((a) => {
    const text = matchTextForFilter(a, titleOnly);
    if (exclude.some((kw) => text.includes(kw.toLowerCase()))) return false;
    if (clickbait.some((kw) => text.includes(kw.toLowerCase()))) return false;
    return true;
  });
}
