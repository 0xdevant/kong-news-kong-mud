import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Article } from "./types";
import {
  getArticles,
  getArticleCounts,
  upsertArticles,
  cleanOldArticles,
  purgeExcludedArticles,
} from "./db";
import { fetchRssFeeds } from "./rss";
import { filterArticles } from "./filter";
import { HK_NEWS_FEEDS } from "./sources";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.use(
  "/*",
  cors({
    origin: (origin, c) => {
      const allowed = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
      ];
      const extra = c.env.PAGES_ORIGIN;
      if (extra) allowed.push(extra);
      if (origin && allowed.includes(origin)) return origin;
      return allowed[0];
    },
    allowMethods: ["GET", "POST"],
  }),
);

app.use("/api/*", async (c, next) => {
  await next();
  if (c.req.method === "GET" && c.res.status === 200) {
    c.res.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=3600",
    );
  }
});

app.get("/api/articles", async (c) => {
  const category = c.req.query("category");
  const source = c.req.query("source");
  const limit = Math.min(parseInt(c.req.query("limit") || "80"), 200);
  const offset = parseInt(c.req.query("offset") || "0");
  const articles = await getArticles(c.env, {
    category: category || undefined,
    source: source || undefined,
    limit,
    offset,
  });
  return c.json({
    success: true,
    articles,
    count: articles.length,
  });
});

app.get("/api/init", async (c) => {
  const [counts, sourcesResult] = await Promise.all([
    getArticleCounts(c.env),
    c.env.DB.prepare(
      "SELECT source_name, COUNT(*) as count FROM articles GROUP BY source_name ORDER BY count DESC",
    ).all<{ source_name: string; count: number }>(),
  ]);

  const categories = [
    { id: "本地", label: "本地", count: counts["本地"] || 0 },
    { id: "國際", label: "國際", count: counts["國際"] || 0 },
    { id: "時事", label: "時事", count: counts["時事"] || 0 },
    { id: "其他", label: "其他", count: counts["其他"] || 0 },
  ];

  return c.json({
    success: true,
    categories,
    sources: sourcesResult.results,
  });
});

app.get("/api/search", async (c) => {
  const q = c.req.query("q") || "";
  if (q.length < 2) return c.json({ success: true, articles: [], count: 0 });

  const result = await c.env.DB.prepare(
    `SELECT * FROM articles WHERE title LIKE ? OR IFNULL(description,'') LIKE ? OR IFNULL(labels,'') LIKE ?
     ORDER BY fetched_at DESC LIMIT 80`,
  )
    .bind(`%${q}%`, `%${q}%`, `%${q}%`)
    .all<Article>();

  return c.json({
    success: true,
    articles: result.results,
    count: result.results.length,
  });
});

app.get("/api/health", async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT source_name, COUNT(*) as count, MAX(fetched_at) as latest
     FROM articles GROUP BY source_name ORDER BY count DESC`,
  ).all<{ source_name: string; count: number; latest: number }>();
  const now = Math.floor(Date.now() / 1000);
  const sources = result.results.map((r) => ({
    source: r.source_name,
    count: r.count,
    latest_ago_hours: Math.round(((now - r.latest) / 3600) * 10) / 10,
    healthy: now - r.latest < 86400 * 3,
  }));
  const total = sources.reduce((s, r) => s + r.count, 0);
  const allHealthy = sources.length === 0 || sources.every((s) => s.healthy);
  return c.json({
    status: allHealthy ? "ok" : "degraded",
    totalArticles: total,
    sources,
  });
});

app.post("/api/refresh", async (c) => {
  const secret = c.env.REFRESH_SECRET;
  if (secret) {
    const auth = c.req.header("Authorization");
    if (auth !== `Bearer ${secret}`)
      return c.json({ success: false, error: "Unauthorized" }, 401);
  }
  const results = await runRssIngestion(c.env);
  return c.json({ success: true, ...results });
});

app.post("/api/purge-excluded", async (c) => {
  const secret = c.env.REFRESH_SECRET;
  if (secret) {
    const auth = c.req.header("Authorization");
    if (auth !== `Bearer ${secret}`)
      return c.json({ success: false, error: "Unauthorized" }, 401);
  }
  const { deleted, keywordCount } = await purgeExcludedArticles(c.env);
  return c.json({ success: true, deleted, keywordCount });
});

app.post("/api/contact", async (c) => {
  try {
    const recent = await c.env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM contact_messages WHERE created_at > ?",
    )
      .bind(Math.floor(Date.now() / 1000) - 3600)
      .first<{ cnt: number }>();
    if (recent && recent.cnt >= 10)
      return c.json({ success: false, error: "提交太頻繁，請稍後再試" }, 429);

    const { name, email, message } = await c.req.json<{
      name: string;
      email: string;
      message: string;
    }>();
    if (!name || !email || !message)
      return c.json({ success: false, error: "Missing fields" }, 400);
    if (message.length > 2000)
      return c.json({ success: false, error: "Message too long" }, 400);

    await c.env.DB.prepare(
      "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)",
    )
      .bind(name.slice(0, 100), email.slice(0, 200), message.slice(0, 2000))
      .run();

    const to = c.env.CONTACT_EMAIL_TO;
    if (c.env.RESEND_API_KEY && to) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            c.env.RESEND_FROM ||
            "香港媒體 RSS <onboarding@resend.dev>",
          to,
          subject: `香港媒體 RSS 聯絡 — ${name}`,
          text: `來自: ${name}\nEmail: ${email}\n\n${message}`,
        }),
      }).catch(() => {});
    }

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: "Failed to submit" }, 500);
  }
});

async function runRssIngestion(env: Env) {
  const batches = await Promise.all(
    HK_NEWS_FEEDS.map((cfg) => fetchRssFeeds(cfg)),
  );
  const combined = batches.flat();
  const filtered = filterArticles(combined, env);
  const inserted = await upsertArticles(env, filtered);
  const cleaned = await cleanOldArticles(env, 14);
  return {
    inserted,
    fetched: combined.length,
    afterFilter: filtered.length,
    cleaned,
    feeds: HK_NEWS_FEEDS.length,
  };
}

export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const trigger = event.cron;
    console.log(`Cron: ${trigger}`);

    if (trigger === "0 0 * * *") {
      await cleanOldArticles(env, 14);
      const { deleted } = await purgeExcludedArticles(env);
      console.log(`Daily cleanup: purged ${deleted} excluded-keyword rows`);
    }

    if (trigger === "0 * * * *") {
      ctx.waitUntil(
        runRssIngestion(env).then((r) =>
          console.log(
            `Hourly RSS: fetched ${r.fetched}, inserted ${r.inserted}`,
          ),
        ),
      );
    }
  },
};
