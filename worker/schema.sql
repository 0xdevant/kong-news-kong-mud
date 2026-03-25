DROP TABLE IF EXISTS articles;

CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  category TEXT NOT NULL,
  labels TEXT,
  image_url TEXT,
  fetched_at INTEGER NOT NULL,
  published_at TEXT
);

CREATE INDEX idx_articles_category ON articles(category);
CREATE INDEX idx_articles_fetched ON articles(fetched_at DESC);
CREATE INDEX idx_articles_source ON articles(source_name);
CREATE INDEX idx_articles_cat_fetched ON articles(category, fetched_at DESC);
