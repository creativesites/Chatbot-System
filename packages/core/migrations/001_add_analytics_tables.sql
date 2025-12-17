-- Analytics tables for comprehensive metrics collection
-- Run this SQL to add analytics capabilities to your database

-- Table for prompt analytics
CREATE TABLE IF NOT EXISTS prompt_analytics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    query_type VARCHAR(100),
    topics_detected JSONB,
    prompt_length INTEGER,
    faqs_used INTEGER,
    products_used INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for conversation metrics
CREATE TABLE IF NOT EXISTS conversation_metrics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    message_count INTEGER DEFAULT 0,
    ai_model_used VARCHAR(100),
    response_time_ms INTEGER,
    user_satisfaction INTEGER, -- 1-5 scale
    conversion_event VARCHAR(100), -- hairai_recommended, consultation_booked, etc
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for user journey tracking
CREATE TABLE IF NOT EXISTS user_journey_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- welcome, query, recommendation, conversion
    event_data JSONB,
    hair_journey_stage VARCHAR(100), -- Stage 1-8 from the system
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for AI model performance
CREATE TABLE IF NOT EXISTS ai_model_performance (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    request_count INTEGER DEFAULT 1,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_response_time_ms FLOAT,
    date_tracked DATE DEFAULT CURRENT_DATE,
    UNIQUE(model_name, date_tracked)
);

-- Table for response caching analytics
CREATE TABLE IF NOT EXISTS cache_analytics (
    id SERIAL PRIMARY KEY,
    cache_type VARCHAR(100) NOT NULL, -- response, faq, product, etc
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    cache_key_pattern VARCHAR(255),
    date_tracked DATE DEFAULT CURRENT_DATE,
    UNIQUE(cache_type, cache_key_pattern, date_tracked)
);



-- Indexes for better performance - run again
CREATE INDEX IF NOT EXISTS idx_prompt_analytics_user_created ON prompt_analytics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_metrics_user ON conversation_metrics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_journey_events_user ON user_journey_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_model_performance_date ON ai_model_performance(date_tracked);

-- Views for easy analytics queries
CREATE OR REPLACE VIEW daily_conversation_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_conversations,
    AVG(message_count) as avg_messages_per_conversation,
    COUNT(CASE WHEN conversion_event IS NOT NULL THEN 1 END) as conversions
FROM conversation_metrics 
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW model_reliability_stats AS
SELECT 
    model_name,
    SUM(request_count) as total_requests,
    SUM(success_count) as total_successes,
    SUM(failure_count) as total_failures,
    ROUND((SUM(success_count)::float / SUM(request_count)::float * 100), 2) as success_rate,
    ROUND(AVG(avg_response_time_ms), 2) as avg_response_time
FROM ai_model_performance 
WHERE date_tracked >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY model_name;