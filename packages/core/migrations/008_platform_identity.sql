-- Migration 008: Platform Identity Links
-- Maps internal canonical myavana_user_id to external provider identities
-- (wordpress, kommunicate, mobile, widget_anon)

CREATE TABLE IF NOT EXISTS identity_links (
    id SERIAL PRIMARY KEY,
    myavana_user_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'wordpress', 'kommunicate', 'widget_anon', 'mobile'
    external_id VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_identity_links_lookup ON identity_links(provider, external_id);
CREATE INDEX IF NOT EXISTS idx_identity_links_canonical ON identity_links(myavana_user_id);
