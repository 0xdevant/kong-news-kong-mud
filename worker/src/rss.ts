import type { Article, NewsCategory, SourceConfig } from "./types";

interface RssItem {
  title: string;
  link: string;
  guid: string;
  description: string;
  pubDate: string;
  categories: string[];
}

function extractText(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(re);
  if (!match) return "";
  let text = match[1];
  const cdata = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) text = cdata[1];
  return text.trim();
}

function extractAllText(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g");
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

function extractFirstImage(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/);
  return match ? match[1] : null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
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
    items.push({
      title: extractText(itemXml, "title"),
      link: extractText(itemXml, "link"),
      guid: guidRaw || extractText(itemXml, "link"),
      description: extractText(itemXml, "description") || extractText(itemXml, "content:encoded"),
      pubDate: extractText(itemXml, "pubDate"),
      categories: extractAllText(itemXml, "category"),
    });
  }
  return items;
}

function categorizeItem(
  categories: string[],
  categoryMap: Record<string, NewsCategory>,
  defaultCategory: NewsCategory,
): NewsCategory {
  for (const cat of categories) {
    if (categoryMap[cat]) return categoryMap[cat];
  }
  return defaultCategory;
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
      const resp = await fetch(feedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; hk-news-rss/1.0; RSS reader; +https://github.com/)",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
      });
      if (!resp.ok) {
        console.error(`RSS ${config.name} HTTP ${resp.status} for ${feedUrl}`);
        continue;
      }

      const xml = await resp.text();
      const items = parseRssItems(xml);

      for (const item of items) {
        if (!item.link) continue;
        const dedupeKey = item.guid || item.link;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const category = categorizeItem(
          item.categories,
          config.categoryMap,
          config.defaultCategory,
        );
        const imageUrl = extractFirstImage(item.description);
        const desc = toTeaser(stripHtml(item.description));

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
      console.error(`Failed to fetch feed ${feedUrl}:`, e);
    }
  }

  return articles;
}
