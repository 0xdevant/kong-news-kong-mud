export interface Env {
  DB: D1Database;
  WORKER_ENV: string;
  /** Optional: your Cloudflare Pages URL for CORS (e.g. https://hk-news.pages.dev) */
  PAGES_ORIGIN?: string;
  REFRESH_SECRET?: string;
  /** JSON array or comma-separated exclude keywords (title/description/labels) */
  FILTER_EXCLUDE_KEYWORDS?: string;
  FILTER_CLICKBAIT_PATTERNS?: string;
  /** Optional: Resend API for contact form notifications */
  RESEND_API_KEY?: string;
  /** Recipient for contact notifications (e.g. you@domain.com) */
  CONTACT_EMAIL_TO?: string;
  /** Resend "from" (verified domain in Resend dashboard) */
  RESEND_FROM?: string;
}

/** Normalized article row (RSS-only; link out for full story) */
export interface Article {
  id: string;
  title: string;
  description: string | null;
  source_url: string;
  source_name: string;
  category: NewsCategory;
  labels: string | null;
  image_url: string | null;
  fetched_at: number;
  published_at: string | null;
}

export type NewsCategory = "本地" | "國際" | "時事" | "其他";

export interface SourceConfig {
  name: string;
  urls: string[];
  categoryMap: Record<string, NewsCategory>;
  defaultCategory: NewsCategory;
}
