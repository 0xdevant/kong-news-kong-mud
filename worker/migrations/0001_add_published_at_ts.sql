-- 「今日」tab：用 RSS 發佈時間（Unix 秒）篩選香港日曆「今日」
ALTER TABLE articles ADD COLUMN published_at_ts INTEGER;
CREATE INDEX idx_articles_pub_ts ON articles(published_at_ts DESC);
