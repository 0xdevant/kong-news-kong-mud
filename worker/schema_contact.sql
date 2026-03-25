-- Run once on existing DB: wrangler d1 execute hk-news-rss-db --remote --file=schema_contact.sql
-- (and --local for dev)

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
