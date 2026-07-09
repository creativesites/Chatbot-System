-- Migration 005: Hair trends table
-- Stores AI-generated and admin-curated trend awareness data.
-- Refreshed every 48h by trendManager.generateTrends().
-- The trendManager serves relevant rows into per-message context so the AI
-- stays current without the trends being baked into the 24h cached system prompt.

CREATE TABLE IF NOT EXISTS hair_trends (
    id              SERIAL PRIMARY KEY,
    trend_name      VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,                  -- one sentence: what it is and why it works
    category        VARCHAR(50)  NOT NULL,           -- 'technique' | 'ingredient' | 'style' | 'wellness'
    relevance_stages INT[],                          -- journey stage numbers this applies to (null = all)
    hair_types      TEXT[],                          -- hair types this is most relevant for (null = all)
    trend_score     FLOAT DEFAULT 0.5,               -- 0.0-1.0, how current/hot this trend is
    source          VARCHAR(100) DEFAULT 'ai-generated', -- 'ai-generated' | 'admin-curated'
    active          BOOLEAN DEFAULT TRUE,
    generated_at    TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP DEFAULT (NOW() + INTERVAL '48 hours')
);

CREATE INDEX IF NOT EXISTS idx_hair_trends_active    ON hair_trends (active, expires_at);
CREATE INDEX IF NOT EXISTS idx_hair_trends_category  ON hair_trends (category);
CREATE INDEX IF NOT EXISTS idx_hair_trends_stages    ON hair_trends USING GIN (relevance_stages);
