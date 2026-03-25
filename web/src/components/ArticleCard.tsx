import type { Article } from "../hooks/useArticles";

function formatTime(a: Article): string {
  if (a.published_at) {
    const d = new Date(a.published_at);
    if (!Number.isNaN(d.getTime()))
      return d.toLocaleString("zh-HK", { dateStyle: "medium", timeStyle: "short" });
  }
  return new Date(a.fetched_at * 1000).toLocaleString("zh-HK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ArticleCard({
  article,
  isFav,
  onToggleFav,
}: {
  article: Article;
  isFav?: boolean;
  onToggleFav?: (id: string) => void;
}) {
  return (
    <article className="group relative bg-card rounded-xl border border-border shadow-sm shadow-black/[0.06] dark:shadow-none overflow-hidden">
      <a
        href={article.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 hover:bg-card-hover transition-colors"
      >
        <div className="flex gap-3">
          {article.image_url && (
            <img
              src={article.image_url}
              alt=""
              className="w-20 h-20 object-cover rounded-lg shrink-0 bg-elevated dark:bg-elevated"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted mb-1">
              <span className="font-medium text-accent">{article.source_name}</span>
              <span>·</span>
              <span>{article.category}</span>
              <span>·</span>
              <time dateTime={article.published_at || undefined}>
                {formatTime(article)}
              </time>
            </div>
            <h2 className="text-base font-semibold text-fg leading-snug group-hover:text-accent transition-colors pr-8">
              {article.title}
            </h2>
            {article.description && (
              <p className="text-xs text-fg-muted mt-1.5 line-clamp-1">
                {article.description}
              </p>
            )}
            <p className="text-xs text-accent mt-2 font-medium">
              閱讀全文（原文網站）→
            </p>
          </div>
        </div>
      </a>
      {onToggleFav && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFav(article.id);
          }}
          className={`absolute top-3 right-3 z-[1] p-1.5 rounded-full shadow-sm border transition-colors ${
            isFav
              ? "bg-card border-red-200 dark:border-red-800"
              : "bg-card border-border"
          }`}
          aria-label={isFav ? "取消收藏" : "收藏"}
        >
          <svg
            className={`w-4 h-4 ${isFav ? "text-red-500" : "text-fg-muted"}`}
            viewBox="0 0 24 24"
            fill={isFav ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      )}
    </article>
  );
}
