-- Migration 003: Sienna Naturals Enhancements and Optimizations
-- Extends the database schema with Sienna Naturals specific tables and optimizations
-- Run this after 001_add_analytics_tables.sql and 002_add_advanced_features_tables.sql

-- Sienna Naturals specific brand tracking
CREATE TABLE IF NOT EXISTS brand_interactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255),
    brand_name VARCHAR(100) NOT NULL, -- 'sienna_naturals', 'myavana', etc.
    interaction_type VARCHAR(100), -- product_inquiry, store_locator, discount_request
    interaction_data JSONB,
    user_satisfaction INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Store locator requests (Sienna Naturals specific)
CREATE TABLE IF NOT EXISTS store_locator_requests (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    location_query VARCHAR(255),
    user_location JSONB, -- {city, state, zip, coordinates if available}
    stores_found INTEGER DEFAULT 0,
    stores_data JSONB, -- array of store information returned
    created_at TIMESTAMP DEFAULT NOW()
);

-- Product availability tracking by brand
CREATE TABLE IF NOT EXISTS product_availability_tracking (
    id SERIAL PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    availability_status VARCHAR(50) DEFAULT 'available', -- available, out_of_stock, discontinued
    inventory_level VARCHAR(50), -- high, medium, low
    last_checked TIMESTAMP DEFAULT NOW(),
    notifications_sent INTEGER DEFAULT 0,
    UNIQUE(brand_name, product_name)
);

-- Enhanced circuit breaker states for AI models
CREATE TABLE IF NOT EXISTS circuit_breaker_states (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL UNIQUE,
    state VARCHAR(20) DEFAULT 'closed', -- closed, open, half_open
    failure_count INTEGER DEFAULT 0,
    last_failure_time TIMESTAMP,
    last_success_time TIMESTAMP,
    threshold_failures INTEGER DEFAULT 5,
    timeout_duration INTERVAL DEFAULT '5 minutes',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Response caching with brand-specific keys
CREATE TABLE IF NOT EXISTS response_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(512) NOT NULL UNIQUE, -- hash of query + user context + brand
    brand_name VARCHAR(100),
    cached_response JSONB NOT NULL,
    user_context_hash VARCHAR(64), -- hash of user profile for personalization
    query_hash VARCHAR(64), -- hash of the query
    context_analysis JSONB, -- context analysis data
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
);

-- Smart prompt analytics
CREATE TABLE IF NOT EXISTS smart_prompt_analytics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255),
    brand_name VARCHAR(100),
    query_analysis JSONB, -- topics, intent, complexity
    prompt_strategy VARCHAR(100), -- educational, sales, support, etc.
    context_elements_used JSONB, -- faqs, products, previous_conversations
    prompt_length INTEGER,
    response_quality_score FLOAT, -- 0-1 based on user engagement
    created_at TIMESTAMP DEFAULT NOW()
);

-- User engagement patterns
CREATE TABLE IF NOT EXISTS user_engagement_patterns (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    brand_name VARCHAR(100),
    total_interactions INTEGER DEFAULT 0,
    avg_session_duration INTERVAL,
    preferred_interaction_time TIME,
    preferred_day_of_week INTEGER, -- 0-6, 0=Sunday
    response_style_preference VARCHAR(100), -- detailed, concise, visual, etc.
    topic_preferences JSONB, -- array of preferred topics
    engagement_score FLOAT DEFAULT 0, -- 0-1 based on overall engagement
    last_interaction TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Model performance benchmarks
CREATE TABLE IF NOT EXISTS model_performance_benchmarks (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    brand_name VARCHAR(100),
    benchmark_type VARCHAR(100), -- response_time, accuracy, user_satisfaction
    benchmark_value FLOAT,
    sample_size INTEGER,
    measurement_date DATE DEFAULT CURRENT_DATE,
    measurement_context JSONB, -- conditions during measurement
    UNIQUE(model_name, brand_name, benchmark_type, measurement_date)
);

-- Advanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_interactions_user_brand ON brand_interactions(user_id, brand_name, created_at);
CREATE INDEX IF NOT EXISTS idx_store_locator_location ON store_locator_requests(user_location);
CREATE INDEX IF NOT EXISTS idx_response_cache_key ON response_cache(cache_key, expires_at) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_response_cache_brand_context ON response_cache(brand_name, user_context_hash) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_smart_prompt_user_brand ON smart_prompt_analytics(user_id, brand_name, created_at);
CREATE INDEX IF NOT EXISTS idx_user_engagement_brand ON user_engagement_patterns(brand_name, engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_model ON circuit_breaker_states(model_name, state);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_conversation_metrics_composite ON conversation_metrics(user_id, ai_model_used, created_at);
CREATE INDEX IF NOT EXISTS idx_user_journey_composite ON user_journey_events(user_id, event_type, hair_journey_stage, created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_composite ON error_logs(model_name, error_type, recovery_successful, created_at);

-- Partitioning preparation (for high-volume tables)
-- Note: These are preparation steps for future partitioning
CREATE INDEX IF NOT EXISTS idx_conversation_metrics_created_monthly ON conversation_metrics(DATE_TRUNC('month', created_at));
CREATE INDEX IF NOT EXISTS idx_user_journey_events_created_monthly ON user_journey_events(DATE_TRUNC('month', created_at));
CREATE INDEX IF NOT EXISTS idx_error_logs_created_monthly ON error_logs(DATE_TRUNC('month', created_at));

-- Views for Sienna Naturals specific analytics
CREATE OR REPLACE VIEW sienna_naturals_user_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_interactions,
    COUNT(CASE WHEN interaction_type = 'product_inquiry' THEN 1 END) as product_inquiries,
    COUNT(CASE WHEN interaction_type = 'store_locator' THEN 1 END) as store_locator_requests,
    COUNT(CASE WHEN interaction_type = 'discount_request' THEN 1 END) as discount_requests,
    AVG(user_satisfaction) as avg_satisfaction
FROM brand_interactions 
WHERE brand_name = 'sienna_naturals'
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW brand_performance_comparison AS
SELECT 
    brand_name,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_interactions,
    AVG(user_satisfaction) as avg_satisfaction,
    COUNT(CASE WHEN user_satisfaction >= 4 THEN 1 END) as satisfied_interactions,
    ROUND(
        COUNT(CASE WHEN user_satisfaction >= 4 THEN 1 END)::float / 
        COUNT(CASE WHEN user_satisfaction IS NOT NULL THEN 1 END) * 100, 2
    ) as satisfaction_rate
FROM brand_interactions 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY brand_name
ORDER BY satisfaction_rate DESC;

CREATE OR REPLACE VIEW cache_performance_stats AS
SELECT 
    brand_name,
    COUNT(*) as total_cached_responses,
    SUM(hit_count) as total_cache_hits,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_cache_entries,
    AVG(hit_count) as avg_hits_per_entry,
    ROUND(
        COUNT(CASE WHEN hit_count > 0 THEN 1 END)::float / 
        COUNT(*) * 100, 2
    ) as cache_utilization_rate
FROM response_cache
GROUP BY brand_name
ORDER BY cache_utilization_rate DESC;

CREATE OR REPLACE VIEW model_circuit_breaker_status AS
SELECT 
    model_name,
    state,
    failure_count,
    last_failure_time,
    last_success_time,
    CASE 
        WHEN state = 'open' AND last_failure_time + timeout_duration < NOW() THEN 'ready_for_half_open'
        WHEN state = 'closed' AND failure_count >= threshold_failures THEN 'approaching_threshold'
        ELSE 'normal'
    END as status_indicator
FROM circuit_breaker_states
ORDER BY 
    CASE state
        WHEN 'open' THEN 1
        WHEN 'half_open' THEN 2
        WHEN 'closed' THEN 3
    END,
    failure_count DESC;

-- Functions for automatic maintenance
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM response_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_engagement_patterns()
RETURNS VOID AS $$
BEGIN
    -- Update engagement scores based on recent activity
    UPDATE user_engagement_patterns 
    SET 
        engagement_score = COALESCE((
            SELECT 
                CASE 
                    WHEN AVG(user_satisfaction) >= 4.5 THEN 0.9
                    WHEN AVG(user_satisfaction) >= 4.0 THEN 0.8
                    WHEN AVG(user_satisfaction) >= 3.5 THEN 0.7
                    WHEN AVG(user_satisfaction) >= 3.0 THEN 0.6
                    ELSE 0.5
                END
            FROM brand_interactions bi 
            WHERE bi.user_id = user_engagement_patterns.user_id
            AND bi.created_at >= NOW() - INTERVAL '30 days'
        ), 0.5),
        total_interactions = COALESCE((
            SELECT COUNT(*) 
            FROM brand_interactions bi 
            WHERE bi.user_id = user_engagement_patterns.user_id
        ), 0),
        last_interaction = COALESCE((
            SELECT MAX(created_at) 
            FROM brand_interactions bi 
            WHERE bi.user_id = user_engagement_patterns.user_id
        ), last_interaction),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updates
CREATE OR REPLACE FUNCTION update_user_engagement_on_interaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_engagement_patterns (user_id, brand_name, total_interactions, last_interaction)
    VALUES (NEW.user_id, NEW.brand_name, 1, NEW.created_at)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        total_interactions = user_engagement_patterns.total_interactions + 1,
        last_interaction = NEW.created_at,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_engagement_on_brand_interaction ON brand_interactions;
CREATE TRIGGER update_engagement_on_brand_interaction
    AFTER INSERT ON brand_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_engagement_on_interaction();

-- Initialize circuit breaker states for known models
INSERT INTO circuit_breaker_states (model_name, state, threshold_failures, timeout_duration)
VALUES 
    ('gemini20FlashExp', 'closed', 5, '5 minutes'),
    ('gemini15Flash', 'closed', 5, '5 minutes'),
    ('xai-grok-3-mini-fast', 'closed', 3, '10 minutes')
ON CONFLICT (model_name) DO NOTHING;

-- Create materialized views for expensive queries (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_brand_performance AS
SELECT 
    brand_name,
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_interactions,
    AVG(user_satisfaction) as avg_satisfaction,
    COUNT(CASE WHEN interaction_type = 'product_inquiry' THEN 1 END) as product_inquiries,
    COUNT(CASE WHEN interaction_type = 'store_locator' THEN 1 END) as store_requests,
    COUNT(CASE WHEN user_satisfaction >= 4 THEN 1 END) as satisfied_users
FROM brand_interactions
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY brand_name, DATE(created_at)
ORDER BY date DESC, brand_name;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_brand_performance_unique ON daily_brand_performance (brand_name, date);

-- Comments for documentation
COMMENT ON TABLE brand_interactions IS 'Tracks user interactions specific to each brand (Sienna Naturals, Myavana)';
COMMENT ON TABLE store_locator_requests IS 'Tracks store locator requests for physical location recommendations';
COMMENT ON TABLE response_cache IS 'Intelligent response caching with brand and user context';
COMMENT ON TABLE circuit_breaker_states IS 'Circuit breaker states for AI model reliability';
COMMENT ON TABLE smart_prompt_analytics IS 'Analytics for smart prompt generation effectiveness';
COMMENT ON TABLE user_engagement_patterns IS 'User engagement patterns and preferences by brand';

COMMENT ON FUNCTION cleanup_expired_cache() IS 'Removes expired cache entries, should be run periodically';
COMMENT ON FUNCTION update_engagement_patterns() IS 'Updates user engagement scores based on recent activity';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;