import type { Article } from "../hooks/useArticles";
import ArticleCard from "./ArticleCard";
import ArticleCardSkeleton from "./ArticleCardSkeleton";

export default function ArticleList({
  articles,
  loading,
  error,
  emptyMessage,
  isFav,
  onToggleFav,
  onRetry,
}: {
  articles: Article[];
  loading: boolean;
  error: string | null;
  /** When set and list is empty, show this instead of the default ingest hint. */
  emptyMessage?: string;
  isFav?: (id: string) => boolean;
  onToggleFav?: (id: string) => void;
  /** 載入失敗時重試（例如重新 fetch 列表） */
  onRetry?: () => void;
}) {
  if (loading && articles.length === 0) {
    return (
      <div className="px-4 pt-2 pb-8">
        <p className="text-sm text-fg-muted mb-3" aria-live="polite">
          載入緊…
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <ArticleCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-4 py-12 text-center space-y-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95 active:opacity-90 transition-opacity"
          >
            重試
          </button>
        )}
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
