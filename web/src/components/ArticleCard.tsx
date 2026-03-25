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

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="group bg-card rounded-xl border border-border shadow-sm shadow-black/[0.06] dark:shadow-none overflow-hidden">
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
            <h2 className="text-base font-semibold text-fg leading-snug group-hover:text-accent transition-colors">
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
    </article>
  );
}
