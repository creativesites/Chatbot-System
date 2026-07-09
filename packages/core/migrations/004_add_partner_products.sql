-- Migration 004: Partner products table
-- Stores products from Myavana partner brands that the AI can recommend.
-- The searchServices agent tool queries this table alongside Myavana's own services.

CREATE TABLE IF NOT EXISTS partner_products (
    id           SERIAL PRIMARY KEY,
    brand_name   VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description  TEXT,
    category     VARCHAR(100),          -- e.g. 'shampoo', 'conditioner', 'styler', 'treatment'
    hair_types   TEXT[],                -- e.g. ARRAY['4a','4b','4c']
    hair_concerns TEXT[],               -- e.g. ARRAY['moisture','breakage','frizz']
    price_usd    NUMERIC(8,2),
    url          TEXT,
    image_url    TEXT,
    in_stock     BOOLEAN DEFAULT TRUE,
    active       BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE (brand_name, product_name)
);

CREATE INDEX IF NOT EXISTS idx_partner_products_brand   ON partner_products (brand_name);
CREATE INDEX IF NOT EXISTS idx_partner_products_category ON partner_products (category);
CREATE INDEX IF NOT EXISTS idx_partner_products_active   ON partner_products (active) WHERE active = TRUE;
