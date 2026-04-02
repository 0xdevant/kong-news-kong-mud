import { useState, useEffect, useCallback } from "react";
import { isSearchQueryAllowed } from "../utils/searchQuery";

export interface Article {
  id: string;
  title: string;
  description: string | null;
  source_url: string;
  source_name: string;
  category: string;
  labels: string | null;
  image_url: string | null;
  fetched_at: number;
  published_at: string | null;
}

export interface CategoryInfo {
  id: string;
  label: string;
  /** Emoji — same pattern as ho-lou-sou (`/api/init` returns `icon`) */
  icon?: string;
  count: number;
}

export interface SourceInfo {
  source_name: string;
  count: number;
}

/** Empty = same-origin `/api` (Pages Functions proxy in production); dev uses Vite proxy. */
const API_BASE = import.meta.env.VITE_API_URL ?? "";

const CACHE_TTL = 5 * 60 * 1000;
const apiCache = new Map<string, { data: unknown; ts: number }>();

async function cachedFetch<T>(url: string, skipCache = false): Promise<T> {
  if (!skipCache) {
    const hit = apiCache.get(url);
    if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data as T;
  }
  const resp = await fetch(url);
  const data = await resp.json();
  apiCache.set(url, { data, ts: Date.now() });
  return data as T;
}

export function useArticles(category?: string, source?: string) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(
    async (skipCache = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (source) params.set("source", source);
        params.set("limit", "100");
        const url = `${API_BASE}/api/articles?${params}`;
        const data = await cachedFetch<{
          success: boolean;
          articles: Article[];
        }>(url, skipCache);
        if (data.success) setArticles(data.articles);
        else setError("無法載入");
      } catch {
        setError("網絡錯誤");
      } finally {
        setLoading(false);
      }
    },
    [category, source],
  );

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return { articles, loading, error, refresh: () => fetchArticles(true) };
}

export function useInit() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);

  const load = useCallback(() => {
    const url = `${API_BASE}/api/init`;
    return fetch(url)
      .then((r) => r.json())
      .then(
        (data: {
          success: boolean;
          categories: CategoryInfo[];
          sources: SourceInfo[];
        }) => {
          if (data.success) {
            setCategories(data.categories);
            setSources(data.sources);
          }
        },
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { categories, sources, refreshInit: load };
}

export function useSearch() {
  const [results, setResults] = useState<Article[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    if (!isSearchQueryAllowed(q)) {
      setResults([]);
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const url = `${API_BASE}/api/search?q=${encodeURIComponent(q)}`;
      const data = await cachedFetch<{
        success: boolean;
        articles: Article[];
      }>(url, true);
      if (data.success) setResults(data.articles);
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  }, []);

  return { results, searching, search };
}
