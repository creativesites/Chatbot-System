-- Migration 006: Chatbot funnel events
-- Tracks D2C conversion-funnel milestones (intake, paywall, purchase, HHCP delivery,
-- consult triage) emitted by the widget/backend, independent of the single-column
-- conversation_metrics.conversion_event, so funnel drop-off can be queried per stage.

CREATE TABLE IF NOT EXISTS chatbot_funnel_events (
    id                  SERIAL PRIMARY KEY,
    user_id             VARCHAR(255),
    conversation_id     VARCHAR(255),
    event_type          VARCHAR(100), -- intake_completed | paywall_shown | purchase_completed | hhcp_delivered | consult_triaged
    metadata            JSONB,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_user         ON chatbot_funnel_events (user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_conversation ON chatbot_funnel_events (conversation_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_type_created  ON chatbot_funnel_events (event_type, created_at);
