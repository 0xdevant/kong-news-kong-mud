import type { Article } from "../hooks/useArticles";
import ArticleCard from "./ArticleCard";

export default function ArticleList({
  articles,
  loading,
  error,
  emptyMessage,
  isFav,
  onToggleFav,
}: {
  articles: Article[];
  loading: boolean;
  error: string | null;
  /** When set and list is empty, show this instead of the default ingest hint. */
  emptyMessage?: string;
  isFav?: (id: string) => boolean;
  onToggleFav?: (id: string) => void;
}) {
  if (loading && articles.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-fg-muted">載入中…</div>
    );
  }
  if (error) {
    return (
      <div className="px-4 py-12 text-center text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }
  if (articles.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-fg-muted">
        {emptyMessage ?? (
          <>
            暫無文章。請確認 Worker 已執行{" "}
            <code className="text-xs">POST /api/refresh</code> 或等待定時更新。
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="px-4 space-y-3 pb-8">
      {articles.map((a) => (
        <li key={a.id}>
          <ArticleCard
            article={a}
            isFav={isFav?.(a.id)}
            onToggleFav={onToggleFav}
          />
        </li>
      ))}
    </ul>
  );
}
