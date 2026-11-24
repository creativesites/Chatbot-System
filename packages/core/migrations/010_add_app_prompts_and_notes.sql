-- Migration 010: Self-serve App Prompts & Persistent Conversation Notes
-- Run against myavana-dashboard-bot Postgres database (idempotent).

CREATE TABLE IF NOT EXISTS app_prompts (
    prompt_key VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    prompt_text TEXT NOT NULL,
    screen VARCHAR(100) DEFAULT 'home',
    starter_chips JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    updated_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_prompts (prompt_key, title, prompt_text, screen, starter_chips)
VALUES
  (
    'consult_expert_advice',
    'Get Expert Advice',
    'I have questions about booking a consultation and preparing for it',
    'home',
    '["How do I prepare for my consultation?", "What happens during a HairScope scan?", "Virtual vs in-person consultation"]'::jsonb
  ),
  (
    'request_stylist',
    'Request a Stylist',
    'I am looking for a certified MYAVANA stylist near me',
    'home',
    '["Find a stylist in Atlanta, GA", "Share my location", "What services do MYAVANA salons offer?"]'::jsonb
  ),
  (
    'new_analysis',
    'New Analysis',
    'I want to start a new HairAI analysis and learn about my hair profile',
    'home',
    '["How does HairAI work?", "What is included in my HairID?"]'::jsonb
  ),
  (
    'hair_diary',
    'Hair Diary',
    'Help me log a wash day or check-in in my hair diary',
    'timeline',
    '["Log today''s wash day", "Check my moisture progress", "Review my recent entries"]'::jsonb
  )
ON CONFLICT (prompt_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS conversation_notes (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    author VARCHAR(255) DEFAULT 'Team Member',
    note_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_notes_conv_id
    ON conversation_notes (conversation_id, created_at DESC);
