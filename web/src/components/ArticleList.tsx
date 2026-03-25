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
            暫無文章。請撳右上角「重新整理」由伺服器再載入一次；若仍然空白，可能資料庫尚未更新，請稍後再試。
          </>
        )}
      </div>
    );
  }

  return (
    <ul className="px-4 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 pb-8">
      {articles.map((a) => (
        <li key={a.id} className="min-w-0">
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
