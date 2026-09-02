-- Migration 007: Local Agent Memory (self-hosted, TAM-inspired)
-- Durable, semantic long-term memory for the D2C widget's context, built entirely
-- on this Postgres instance via pgvector (no external memory-service vendor).
-- Requires the `vector` extension to be enabled on the target Postgres instance
-- (supported on modern RDS Postgres versions) before this migration is run.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agent_memories (
    id                      SERIAL PRIMARY KEY,
    user_id                 VARCHAR(255) NOT NULL,
    memory_type             VARCHAR(50),          -- fact | preference | episodic
    content                 TEXT NOT NULL,
    embedding               vector(768),          -- matches the Google embedding model's output dimension
    importance_score        FLOAT DEFAULT 0.5,
    source_conversation_id  VARCHAR(255),
    created_at              TIMESTAMP DEFAULT NOW(),
    last_accessed_at        TIMESTAMP DEFAULT NOW(),
    access_count            INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_agent_memories_user      ON agent_memories (user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding ON agent_memories USING hnsw (embedding vector_cosine_ops);
