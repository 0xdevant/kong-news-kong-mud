import { useState } from "react";
import type { Article } from "../hooks/useArticles";

/** Same as `useArticles` — dev 用 Vite proxy 嘅 `/api` */
const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** 獨媒圖：直連常被 Sucuri 擋；凡 `www.inmediahk.net` 靜態路徑交 Worker 代理（路徑白名單喺後端） */
function coverImageSrc(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  try {
    const u = new URL(imageUrl);
    if (u.hostname === "www.inmediahk.net") {
      return `${API_BASE}/api/proxy-image?u=${encodeURIComponent(imageUrl)}`;
    }
  } catch {
    /* ignore */
  }
  return imageUrl;
}

/** Matches `/api/init` category icons — placeholder when there is no cover image */
function categoryEmoji(category: string): string {
  switch (category) {
    case "本地":
      return "📍";
    case "國際":
      return "🌍";
    case "時事":
      return "🇭🇰";
    case "其他":
      return "🗂️";
    default:
      return "📌";
  }
}

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
  const [coverFailed, setCoverFailed] = useState(false);
  const coverSrc = coverImageSrc(article.image_url);
  const showImage = Boolean(coverSrc) && !coverFailed;

  return (
    <article className="group relative h-full flex flex-col bg-card rounded-xl border border-border shadow-sm shadow-black/[0.06] dark:shadow-none overflow-hidden">
      <a
        href={article.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block flex flex-col flex-1 min-h-0 hover:bg-card-hover transition-colors"
      >
        <div className="relative aspect-[2/1] w-full overflow-hidden bg-elevated dark:bg-elevated">
          {showImage ? (
            <>
              <img
                src={coverSrc!}
                alt={article.title.slice(0, 200)}
                className="h-full w-full object-contain object-center"
                loading="lazy"
                onError={() => setCoverFailed(true)}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent dark:from-black/40" />
            </>
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-brand/[0.08] via-elevated to-elevated dark:from-brand/15 dark:via-elevated dark:to-elevated"
              role="img"
              aria-label={`${article.category} · ${article.source_name}（無封面圖片）`}
            >
              <span className="text-4xl leading-none opacity-90" aria-hidden>
                {categoryEmoji(article.category)}
              </span>
              <span className="text-[10px] font-medium text-fg-muted/90 truncate max-w-[92%] px-2 text-center">
                {article.source_name}
              </span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1 min-w-0 pt-3">
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
            <h2 className="text-base font-semibold text-fg leading-snug group-hover:text-accent transition-colors pr-8 line-clamp-3">
              {article.title}
            </h2>
            {article.description && (
              <p className="text-xs text-fg-muted mt-1.5 line-clamp-2">
                {article.description}
              </p>
            )}
            <p className="text-xs text-accent mt-2 font-medium mt-auto pt-2">
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
              ? "bg-card/95 dark:bg-card/95 border-red-200 dark:border-red-800 backdrop-blur-sm"
              : "bg-card/95 dark:bg-card/95 border-border backdrop-blur-sm"
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
