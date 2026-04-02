import type { Article, Env, NewsCategory, SourceConfig } from "./types";

interface RssItem {
  title: string;
  link: string;
  guid: string;
  /** `<description>` HTML (excerpt; often no image) */
  excerptHtml: string;
  /** `content:encoded` full post HTML — featured images usually here */
  contentEncoded: string;
  /** Raw `<item>...</item>` inner XML for `media:*` / `enclosure` */
  itemInnerXml: string;
  pubDate: string;
  categories: string[];
}

function extractText(xml: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, "i");
  const match = xml.match(re);
  if (!match) return "";
  let text = match[1];
  const cdata = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) text = cdata[1];
  return text.trim();
}

function extractAllText(xml: string, tag: string): string[] {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)</${escaped}>`, "gi");
  const results: string[] = [];
  let match;
  while ((match = re.exec(xml)) !== null) {
    let text = match[1];
    const cdata = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    if (cdata) text = cdata[1];
    results.push(text.trim());
  }
  return results;
}

/** Skip emoji / tracking pixels that WordPress and FB embeds use as first <img>. */
function isUsableImageUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u.startsWith("http")) return false;
  if (u.includes("fbcdn.net/images/emoji")) return false;
  if (u.includes("twemoji")) return false;
  if (u.includes("s.w.org/images/core/emoji")) return false;
  if (u.includes("gravatar.com/avatar") && /[?&]s=(\d+)/i.exec(u)?.[1] === "16")
    return false;
  return true;
}

/** Prefer largest candidate from `srcset` (e.g. WordPress `300w, 768w, 1024w`). */
function pickLargestSrcsetUrl(srcset: string): string | null {
  let best: { w: number; url: string } | null = null;
  for (const part of srcset.split(",")) {
    const bits = part.trim().split(/\s+/);
    if (bits.length < 1) continue;
    const url = bits[0]?.trim();
    if (!url || !/^https?:\/\//i.test(url)) continue;
    const desc = bits[1];
    const w =
      desc?.endsWith("w") && /^\d+$/.test(desc.slice(0, -1))
        ? parseInt(desc.slice(0, -1), 10)
        : 0;
    if (!best || w > best.w) best = { w: w || 0, url };
  }
  return best?.url ?? null;
}

/** Skip 1×1 / decorative pixels so we don't pick them over column_images. */
function isLikelyDecorativeOrTrackingImg(tag: string): boolean {
  const w = tag.match(/\swidth=["']?(\d+)/i)?.[1];
  const h = tag.match(/\sheight=["']?(\d+)/i)?.[1];
  if (w && h) {
    const wi = parseInt(w, 10);
    const hi = parseInt(h, 10);
    if (wi <= 1 && hi <= 1) return true;
  }
  return false;
}

/** Prefer on-site hero (`column_images`) over Flickr / inline body shots (獨媒等). */
function rssImagePreferenceScore(url: string): number {
  const u = url.toLowerCase();
  let s = 0;
  if (u.includes("inmediahk.net/files/column_images")) s += 200;
  else if (u.includes("inmediahk.net/files/")) s += 80;
  else if (u.includes("inmediahk.net")) s += 40;
  if (/flickr\.com|twimg\.com|pbs\.twimg|fbcdn\.net\/images\/emoji/i.test(u))
    s -= 60;
  return s;
}

/** Collect src / data-src / srcset from every `<img>`; decode `&amp;` in URLs; pick best candidate. */
function extractUsableImageFromHtml(html: string): string | null {
  if (!html) return null;
  const tagRe = /<img\b[^>]*>/gi;
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const tag = m[0];
    if (isLikelyDecorativeOrTrackingImg(tag)) continue;
    let raw: string | null = null;
    const srcset = tag.match(/\ssrcset=["']([^"']+)["']/i)?.[1];
    if (srcset) {
      const fromSet = pickLargestSrcsetUrl(srcset);
      if (fromSet) raw = decodeBasicHtmlEntities(fromSet.trim());
    }
    if (!raw) {
      const attr =
        tag.match(/\ssrc=["']([^"']+)["']/i)?.[1] ||
        tag.match(/\sdata-src=["']([^"']+)["']/i)?.[1] ||
        tag.match(/\sdata-lazy-src=["']([^"']+)["']/i)?.[1];
      if (attr) raw = decodeBasicHtmlEntities(attr.trim());
    }
    if (raw && isUsableImageUrl(raw)) candidates.push(raw);
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => rssImagePreferenceScore(b) - rssImagePreferenceScore(a));
  return candidates[0];
}

function extractMediaThumbnailUrl(itemXml: string): string | null {
  const m =
    itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
    itemXml.match(/<media:thumbnail[^>]*\surl=["']([^"']+)["']/i);
  return m ? m[1].trim() : null;
}

function extractMediaContentImageUrl(itemXml: string): string | null {
  const re = /<media:content([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(itemXml)) !== null) {
    const tag = m[0];
    const urlMatch = tag.match(/\surl=["']([^"']+)["']/i);
    if (!urlMatch) continue;
    const u = urlMatch[1].trim();
    if (
      /medium=["']image["']/i.test(tag) ||
      /type=["']image\//i.test(tag) ||
      /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(u)
    )
      return u;
  }
  return null;
}

function extractEnclosureImageUrl(itemXml: string): string | null {
  const m = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*\/?>/i);
  if (!m) return null;
  const url = m[1];
  const typeM = itemXml.match(/<enclosure[^>]+type=["']([^"']+)["']/i);
  const t = typeM ? typeM[1] : "";
  if (t.startsWith("image/") || /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url))
    return url.trim();
  return null;
}

function absoluteImageUrl(baseUrl: string, src: string | null): string | null {
  if (!src) return null;
  const s = src.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  try {
    return new URL(s, baseUrl).href;
  } catch {
    return s;
  }
}

function pickCandidate(raw: string | null, link: string): string | null {
  const abs = absoluteImageUrl(link, raw);
  if (!abs || !isUsableImageUrl(abs)) return null;
  return abs;
}

/** Raw `<item>` blob 內掃出獨媒 `files/`、`sites/default/files/`（避開 Drupal namespace / extractText 變種導致冇 `content:encoded`）。 */
function extractInmediaBestImageUrlFromRawBlob(blob: string): string | null {
  if (!blob.includes("inmediahk.net")) return null;
  const normalized = blob.replace(/&amp;/g, "&");
  const re =
    /https:\/\/www\.inmediahk\.net\/(?:files\/|sites\/default\/files\/)[^\s"'<>]+\.(?:jpe?g|png|gif|webp)/gi;
  const seen = new Set<string>();
  const candidates: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const u = m[0];
    if (!seen.has(u)) {
      seen.add(u);
      candidates.push(u);
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) => rssImagePreferenceScore(b) - rssImagePreferenceScore(a),
  );
  return candidates[0];
}

function pickItemImageUrl(
  itemXml: string,
  link: string,
  description: string,
  contentEncoded: string,
): string | null {
  const fromHtml =
    extractUsableImageFromHtml(contentEncoded) ||
    extractUsableImageFromHtml(description);
  if (fromHtml) {
    const p = pickCandidate(fromHtml, link);
    if (p) return p;
  }
  const fromMedia =
    extractMediaThumbnailUrl(itemXml) ||
    extractMediaContentImageUrl(itemXml) ||
    extractEnclosureImageUrl(itemXml);
  const pMedia = pickCandidate(fromMedia, link);
  if (pMedia) return pMedia;
  if (link.includes("inmediahk.net")) {
    const raw = extractInmediaBestImageUrlFromRawBlob(
      itemXml + description + contentEncoded,
    );
    return pickCandidate(raw, link);
  }
  return null;
}

function decodeBasicHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseOgImageFromHtml(html: string): string | null {
  const head = html.slice(0, 150_000);
  const og =
    head.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ) ||
    head.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    );
  const tw =
    head.match(
      /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    ) ||
    head.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    );
  const raw = (og?.[1] || tw?.[1] || "").trim();
  if (!raw) return null;
  return decodeBasicHtmlEntities(raw);
}

/** WordPress post featured image when RSS body has no <img> (e.g. embed-only HTML). */
async function fetchWordPressFeaturedImageUrl(
  pageUrl: string,
): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4500);
  try {
    const u = new URL(pageUrl);
    const path = u.pathname.replace(/\/+$/, "");
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    const slug = segments[segments.length - 1];
    const api = `${u.origin}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1`;
    const r = await fetch(api, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; gangwen-gongmat/1.0; +https://news.clawify.dev)",
        Accept: "application/json",
      },
      signal: ctrl.signal,
    });
    if (!r.ok) return null;
    const posts = (await r.json()) as unknown;
    if (!Array.isArray(posts) || posts.length === 0) return null;
    const post = posts[0] as Record<string, unknown>;
    const emb = post._embedded as Record<string, unknown> | undefined;
    const wm = emb?.["wp:featuredmedia"] as
      | Record<string, unknown>[]
      | undefined;
    const src = wm?.[0]?.source_url as string | undefined;
    if (src && typeof src === "string") return src;
    const jet = post.jetpack_featured_media_url as string | undefined;
    if (jet && typeof jet === "string") return jet;
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchOgImageFromPage(pageUrl: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4500);
  try {
    const r = await fetch(pageUrl, {
      headers: {
        /** Match RSS fetch — Drupal/Sucuri 易擋 generic bot UA */
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "zh-HK,zh-Hant;q=0.9,en;q=0.7",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!r.ok) return null;
    const html = await r.text();
    const raw = parseOgImageFromHtml(html);
    if (!raw) return null;
    try {
      return new URL(raw, pageUrl).href;
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Liber (and similar) items **past the RSS window** stay in D1 but are never
 * re-upserted, so `wordpressFeaturedFallback` in `fetchRssFeeds` never runs for them.
 * Patch `image_url` from WordPress REST for stored rows still missing a cover.
 */
export async function backfillWordPressFeaturedForStoredArticles(
  env: Env,
): Promise<number> {
  if (env.FETCH_OG_IMAGE === "false") return 0;
  const max = 60;
  const result = await env.DB.prepare(
    `SELECT id, source_url FROM articles
     WHERE (image_url IS NULL OR image_url = '')
       AND source_url LIKE '%liber-research.com%'
     ORDER BY fetched_at DESC LIMIT ?`,
  )
    .bind(max)
    .all<{ id: string; source_url: string }>();

  const rows = result.results;
  if (rows.length === 0) return 0;

  let updated = 0;
  const chunkSize = 5;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (row) => {
        const wp = await fetchWordPressFeaturedImageUrl(row.source_url);
        if (wp && isUsableImageUrl(wp)) {
          await env.DB.prepare(`UPDATE articles SET image_url = ? WHERE id = ?`)
            .bind(wp, row.id)
            .run();
          updated++;
        }
      }),
    );
  }
  return updated;
}

/** Stored 獨媒 rows with no RSS image — try `og:image` from article HTML (Drupal). */
export async function backfillInmediaOgImages(env: Env): Promise<number> {
  if (env.FETCH_OG_IMAGE === "false") return 0;
  const max = 50;
  const result = await env.DB.prepare(
    `SELECT id, source_url FROM articles
     WHERE (image_url IS NULL OR image_url = '')
       AND source_url LIKE '%inmediahk.net%'
     ORDER BY fetched_at DESC LIMIT ?`,
  )
    .bind(max)
    .all<{ id: string; source_url: string }>();

  const rows = result.results;
  if (rows.length === 0) return 0;

  let updated = 0;
  const chunkSize = 5;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (row) => {
        const og = await fetchOgImageFromPage(row.source_url);
        if (og && isUsableImageUrl(og)) {
          await env.DB.prepare(`UPDATE articles SET image_url = ? WHERE id = ?`)
            .bind(og, row.id)
            .run();
          updated++;
        }
      }),
    );
  }
  return updated;
}

/** When RSS has no usable <img>: try WordPress `wp-json` featured image, then page og:image (capped per ingest). */
export async function enrichArticlesWithOgImages(
  articles: Article[],
  env: Env,
): Promise<void> {
  if (env.FETCH_OG_IMAGE === "false") return;
  const max = Math.min(
    100,
    Math.max(0, parseInt(env.FETCH_OG_IMAGE_MAX || "25", 10) || 25),
  );
  const without = articles.filter((a) => !a.image_url);
  const inmedia = without.filter((a) => a.source_name === "獨立媒體");
  const others = without.filter((a) => a.source_name !== "獨立媒體");
  /** 合併順序：獨媒放前，避免 slice 被其他來源食晒 og 配額 */
  const targets = [...inmedia, ...others].slice(0, max);
  const chunkSize = 5;
  for (let i = 0; i < targets.length; i += chunkSize) {
    const chunk = targets.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (a) => {
        const wp = await fetchWordPressFeaturedImageUrl(a.source_url);
        if (wp && isUsableImageUrl(wp)) {
          a.image_url = wp;
          return;
        }
        const og = await fetchOgImageFromPage(a.source_url);
        if (og && isUsableImageUrl(og)) a.image_url = og;
      }),
    );
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Drupal / 獨媒 RSS 有時將 `<div class="field …">` 以 entity 寫入 excerpt（`&lt;div …&gt;`），
 * 要先解碼再剷 tag，否則 teaser 會變成「內文」顯示一堆 `&lt;div`。
 */
function decodeHtmlEntitiesDeep(s: string): string {
  let out = s;
  for (let iter = 0; iter < 12; iter++) {
    const next = out
      .replace(/&#(\d+);/g, (_, n) => {
        const code = Number(n);
        return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
      })
      .replace(/&#x([0-9a-fA-F]+);/gi, (_, h) => {
        const code = parseInt(h, 16);
        return code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
      })
      .replace(/&nbsp;/gi, " ")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    if (next === out) break;
    out = next;
  }
  return out;
}

function plainTextFromRssHtml(html: string): string {
  if (!html) return "";
  const decoded = decodeHtmlEntitiesDeep(html);
  return stripHtml(decoded);
}

/** One-line teaser only — keeps full reporting on the publisher’s site */
const TEASER_MAX_CHARS = 72;

function toTeaser(plain: string): string | null {
  const t = plain.replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (t.length <= TEASER_MAX_CHARS) return t;
  return t.slice(0, TEASER_MAX_CHARS - 1) + "…";
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const guidRaw = extractText(itemXml, "guid");
    const descRaw = extractText(itemXml, "description");
    const contentRaw = extractText(itemXml, "content:encoded");
    items.push({
      title: extractText(itemXml, "title"),
      link: extractText(itemXml, "link"),
      guid: guidRaw || extractText(itemXml, "link"),
      excerptHtml: descRaw,
      contentEncoded: contentRaw,
      itemInnerXml: itemXml,
      pubDate: extractText(itemXml, "pubDate"),
      categories: extractAllText(itemXml, "category"),
    });
  }
  return items;
}

/** When an item has multiple RSS tags that map to different buckets, pick one winner.
 * WordPress often lists a broad tag (e.g. 新聞→時事) before a specific one (本地時事→本地);
 * first-match-only would never assign 本地/國際. Order: more “place/topic” specific first. */
const CATEGORY_PRIORITY: NewsCategory[] = ["本地", "國際", "時事", "其他"];

function categorizeItem(
  categories: string[],
  categoryMap: Record<string, NewsCategory>,
  defaultCategory: NewsCategory,
): NewsCategory {
  const buckets = new Set<NewsCategory>();
  for (const cat of categories) {
    const mapped = categoryMap[cat];
    if (mapped) buckets.add(mapped);
  }
  if (buckets.size === 0) return defaultCategory;
  for (const p of CATEGORY_PRIORITY) {
    if (buckets.has(p)) return p;
  }
  return defaultCategory;
}

/** 獨立媒體 RSS 無 category；路徑形如 `/node/政經/…`、`/node/國際/…` */
function inferInmediaCategoryFromUrl(link: string): NewsCategory | null {
  const sectionMap: Record<string, NewsCategory> = {
    政經: "時事",
    國際: "國際",
    社區: "本地",
    保育: "其他",
    生活: "其他",
    文藝: "其他",
    體育: "其他",
  };
  try {
    const u = new URL(link);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] !== "node" || !parts[1]) return null;
    const section = decodeURIComponent(parts[1]);
    return sectionMap[section] ?? null;
  } catch {
    return null;
  }
}

function stableId(prefix: string, guid: string, link: string): string {
  const key = guid || link;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return prefix + Math.abs(hash).toString(36);
}

/** 部分站（如 thecollectivehk.com）對「Chrome」UA 回 403 HTML；輪換 UA 直至拿到真 RSS。 */
const RSS_FETCH_USER_AGENTS = [
  "Mozilla/5.0 (compatible; RSS reader; +https://news.clawify.dev)",
  "curl/8.7.1",
  "Feedly/1.0 (+https://feedly.com)",
] as const;

async function fetchFeedXml(feedUrl: string, sourceName: string): Promise<string | null> {
  let origin: string;
  try {
    origin = new URL(feedUrl).origin;
  } catch {
    origin = "";
  }
  for (const ua of RSS_FETCH_USER_AGENTS) {
    const resp = await fetch(feedUrl, {
      headers: {
        "User-Agent": ua,
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Language": "zh-HK,zh-Hant;q=0.9,en;q=0.7",
        ...(origin ? { Referer: `${origin}/` } : {}),
      },
    });
    if (!resp.ok) continue;
    const xml = await resp.text();
    if (/<item[\s>]/i.test(xml) || /<rss[\s>]/i.test(xml)) return xml;
  }
  console.error(
    JSON.stringify({
      event: "rss_feed_fetch_no_xml",
      source: sourceName,
      url: feedUrl,
      triedUas: RSS_FETCH_USER_AGENTS.length,
    }),
  );
  return null;
}

export async function fetchRssFeeds(config: SourceConfig): Promise<Article[]> {
  const articles: Article[] = [];
  const seen = new Set<string>();
  const now = Math.floor(Date.now() / 1000);
  const prefix = config.name
    .replace(/\s+/g, "")
    .slice(0, 4)
    .toLowerCase() + "_";

  for (const feedUrl of config.urls) {
    try {
      const xml = await fetchFeedXml(feedUrl, config.name);
      if (!xml) continue;

      const items = parseRssItems(xml);

      for (const item of items) {
        if (!item.link) continue;
        const dedupeKey = item.guid || item.link;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        let category = categorizeItem(
          item.categories,
          config.categoryMap,
          config.defaultCategory,
        );
        if (config.inmediaPathCategory) {
          const inferred = inferInmediaCategoryFromUrl(item.link);
          if (inferred) category = inferred;
        }
        const teaserPlain =
          plainTextFromRssHtml(item.excerptHtml) ||
          plainTextFromRssHtml(item.contentEncoded);
        const desc = toTeaser(teaserPlain) || null;

        let imageUrl = pickItemImageUrl(
          item.itemInnerXml,
          item.link,
          item.excerptHtml,
          item.contentEncoded,
        );
        if (!imageUrl && config.wordpressFeaturedFallback) {
          const wp = await fetchWordPressFeaturedImageUrl(item.link);
          if (wp && isUsableImageUrl(wp)) imageUrl = wp;
        }

        articles.push({
          id: stableId(prefix, item.guid, item.link),
          title: item.title,
          description: desc || null,
          source_url: item.link,
          source_name: config.name,
          category,
          labels: item.categories.length ? item.categories.join(",") : null,
          image_url: imageUrl,
          fetched_at: now,
          published_at: item.pubDate || null,
        });
      }
    } catch (e) {
      const err =
        e instanceof Error
          ? { name: e.name, message: e.message }
          : { name: "unknown", message: String(e) };
      console.error(
        JSON.stringify({
          event: "rss_feed_fetch_failed",
          source: config.name,
          url: feedUrl,
          error: err,
        }),
      );
    }
  }

  return articles;
}
