-- 009_add_conversation_title.sql
--
-- Conversation titles were derived at read time from the summary column. That
-- column was being filled with the placeholder "conversation summary not
-- available." (getAllConversationsSummary's no-data fallback, persisted by
-- postResponseProcessing), so every conversation in the history drawer showed
-- the same title and the same useless summary.
--
-- Titles are now stored alongside the summary so the history drawer reads real
-- values instead of re-deriving them, and so the dashboard and the widget agree
-- on what a conversation is called.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- Rows whose summary is one of the placeholder strings carry no information;
-- clearing them lets the backfill rebuild both fields from the real exchange.
UPDATE conversations
SET summary = NULL
WHERE summary IS NOT NULL
  AND LOWER(BTRIM(summary)) IN (
    'conversation summary not available.',
    'no conversation history available.',
    'conversation active.',
    'hair journey discussion'
  );

CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
    ON conversations (user_id, COALESCE(updated_at, created_at) DESC);
