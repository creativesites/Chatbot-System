-- Complete Migration Runner Script
-- Run this to apply all migrations in the correct order
-- This script is safe to run multiple times (idempotent)

-- Migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT NOW(),
    checksum VARCHAR(64)
);

-- Check if migration has been applied
CREATE OR REPLACE FUNCTION migration_applied(migration_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM schema_migrations WHERE schema_migrations.migration_name = migration_applied.migration_name);
END;
$$ LANGUAGE plpgsql;

-- Apply migration if not already applied
CREATE OR REPLACE FUNCTION apply_migration(migration_name TEXT, migration_checksum TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    IF NOT migration_applied(migration_name) THEN
        INSERT INTO schema_migrations (migration_name, checksum) 
        VALUES (migration_name, migration_checksum);
        RAISE NOTICE 'Applied migration: %', migration_name;
    ELSE
        RAISE NOTICE 'Migration already applied: %', migration_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Start migration process
DO $$
BEGIN
    RAISE NOTICE 'Starting database migrations for Sienna Naturals Enhanced System...';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;

-- Core tables (should already exist, but ensure they're there)
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    hair_type VARCHAR(100),
    hair_concerns TEXT[],
    location VARCHAR(255),
    brand_preference VARCHAR(100) DEFAULT 'myavana',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) REFERENCES users(user_id),
    chat_history JSONB,
    summary TEXT,
    brand VARCHAR(100) DEFAULT 'myavana',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    session_data JSONB,
    brand VARCHAR(100),
    last_accessed_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days'
);

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_users_brand_created ON users(brand_preference, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user_brand ON conversations(user_id, brand, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);

SELECT apply_migration('000_core_tables');

-- Migration 001: Analytics Tables
DO $$
BEGIN
    IF NOT migration_applied('001_add_analytics_tables') THEN
        RAISE NOTICE 'Applying Migration 001: Analytics Tables...';
        
        -- All the analytics tables from 001_add_analytics_tables.sql
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

        CREATE TABLE IF NOT EXISTS conversation_metrics (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            conversation_id VARCHAR(255) NOT NULL,
            message_count INTEGER DEFAULT 0,
            ai_model_used VARCHAR(100),
            response_time_ms INTEGER,
            user_satisfaction INTEGER,
            conversion_event VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_journey_events (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            event_type VARCHAR(100) NOT NULL,
            event_data JSONB,
            hair_journey_stage VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW()
        );

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

        CREATE TABLE IF NOT EXISTS cache_analytics (
            id SERIAL PRIMARY KEY,
            cache_type VARCHAR(100) NOT NULL,
            hit_count INTEGER DEFAULT 0,
            miss_count INTEGER DEFAULT 0,
            cache_key_pattern VARCHAR(255),
            date_tracked DATE DEFAULT CURRENT_DATE,
            UNIQUE(cache_type, cache_key_pattern, date_tracked)
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_prompt_analytics_user_created ON prompt_analytics(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_conversation_metrics_user ON conversation_metrics(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_user_journey_events_user ON user_journey_events(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_ai_model_performance_date ON ai_model_performance(date_tracked);

        -- Views
        DROP VIEW IF EXISTS daily_conversation_stats CASCADE;
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

        DROP VIEW IF EXISTS model_reliability_stats CASCADE;
        CREATE OR REPLACE VIEW model_reliability_stats AS
        SELECT 
            model_name,
            SUM(request_count) as total_requests,
            SUM(success_count) as total_successes,
            SUM(failure_count) as total_failures,
            ROUND((SUM(success_count)::numeric / NULLIF(SUM(request_count), 0)::numeric * 100), 2) as success_rate,
            ROUND(AVG(avg_response_time_ms)::numeric, 2) as avg_response_time
        FROM ai_model_performance 
        WHERE date_tracked >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY model_name;

        SELECT apply_migration('001_add_analytics_tables');
    END IF;
END $$;

-- Migration 002: Advanced Features
DO $$
BEGIN
    IF NOT migration_applied('002_add_advanced_features_tables') THEN
        RAISE NOTICE 'Applying Migration 002: Advanced Features Tables...';
        
        -- All tables from 002_add_advanced_features_tables.sql
        CREATE TABLE IF NOT EXISTS error_logs (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            conversation_id VARCHAR(255),
            error_type VARCHAR(100) NOT NULL,
            error_message TEXT,
            model_name VARCHAR(100),
            context_data JSONB,
            recovery_attempted BOOLEAN DEFAULT FALSE,
            recovery_successful BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS personalization_metrics (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            persona_assigned VARCHAR(100),
            query_length INTEGER,
            response_length INTEGER,
            personalization_applied BOOLEAN DEFAULT FALSE,
            user_satisfaction_score INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_preferences (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL UNIQUE,
            persona_type VARCHAR(100),
            communication_style VARCHAR(100),
            preferred_response_format VARCHAR(100),
            hair_priorities JSONB,
            product_preferences JSONB,
            engagement_preferences JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS proactive_campaigns (
            id SERIAL PRIMARY KEY,
            campaign_name VARCHAR(255) NOT NULL,
            campaign_type VARCHAR(100) NOT NULL,
            target_persona VARCHAR(100),
            trigger_conditions JSONB,
            message_template JSONB,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS proactive_engagement_schedule (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            trigger_type VARCHAR(100) NOT NULL,
            scheduled_time TIMESTAMP NOT NULL,
            context_data JSONB,
            sent BOOLEAN DEFAULT FALSE,
            sent_at TIMESTAMP,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(user_id, trigger_type)
        );

        CREATE TABLE IF NOT EXISTS proactive_engagement_history (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            campaign_id INTEGER REFERENCES proactive_campaigns(id),
            message_sent JSONB,
            delivery_status VARCHAR(50) DEFAULT 'pending',
            user_response TEXT,
            engagement_score FLOAT,
            created_at TIMESTAMP DEFAULT NOW(),
            responded_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS hair_issues (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            issue_description TEXT NOT NULL,
            severity_level INTEGER,
            issue_category VARCHAR(100),
            reported_context TEXT,
            resolution_status VARCHAR(50) DEFAULT 'open',
            resolution_notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            resolved_at TIMESTAMP
        );

        ALTER TABLE hair_issues ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_error_logs_user_created ON error_logs(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_error_logs_type_model ON error_logs(error_type, model_name);
        CREATE INDEX IF NOT EXISTS idx_personalization_metrics_user ON personalization_metrics(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
        CREATE INDEX IF NOT EXISTS idx_proactive_engagement_user ON proactive_engagement_history(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_hair_issues_user_status ON hair_issues(user_id, resolution_status);

        -- Update trigger for user_preferences
        CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS update_user_preferences_updated_at_trigger ON user_preferences;
        CREATE TRIGGER update_user_preferences_updated_at_trigger
            BEFORE UPDATE ON user_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_user_preferences_updated_at();

        SELECT apply_migration('002_add_advanced_features_tables');
    END IF;
END $$;

-- Migration 003: Sienna Naturals Enhancements
DO $$
BEGIN
    IF NOT migration_applied('003_sienna_naturals_enhancements') THEN
        RAISE NOTICE 'Applying Migration 003: Sienna Naturals Enhancements...';
        
        -- Brand-specific tables
        CREATE TABLE IF NOT EXISTS brand_interactions (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            conversation_id VARCHAR(255),
            brand_name VARCHAR(100) NOT NULL,
            interaction_type VARCHAR(100),
            interaction_data JSONB,
            user_satisfaction INTEGER,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS store_locator_requests (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            location_query VARCHAR(255),
            user_location JSONB,
            stores_found INTEGER DEFAULT 0,
            stores_data JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS circuit_breaker_states (
            id SERIAL PRIMARY KEY,
            model_name VARCHAR(100) NOT NULL UNIQUE,
            state VARCHAR(20) DEFAULT 'closed',
            failure_count INTEGER DEFAULT 0,
            last_failure_time TIMESTAMP,
            last_success_time TIMESTAMP,
            threshold_failures INTEGER DEFAULT 5,
            timeout_duration INTERVAL DEFAULT '5 minutes',
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS response_cache (
            id SERIAL PRIMARY KEY,
            cache_key VARCHAR(512) NOT NULL UNIQUE,
            brand_name VARCHAR(100),
            cached_response JSONB NOT NULL,
            user_context_hash VARCHAR(64),
            query_hash VARCHAR(64),
            context_analysis JSONB,
            hit_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours'
        );

        CREATE TABLE IF NOT EXISTS user_engagement_patterns (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL UNIQUE,
            brand_name VARCHAR(100),
            total_interactions INTEGER DEFAULT 0,
            avg_session_duration INTERVAL,
            preferred_interaction_time TIME,
            preferred_day_of_week INTEGER,
            response_style_preference VARCHAR(100),
            topic_preferences JSONB,
            engagement_score FLOAT DEFAULT 0,
            last_interaction TIMESTAMP,
            updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_brand_interactions_user_brand ON brand_interactions(user_id, brand_name, created_at);
        CREATE INDEX IF NOT EXISTS idx_response_cache_key ON response_cache(cache_key, expires_at) WHERE expires_at > NOW();
        CREATE INDEX IF NOT EXISTS idx_circuit_breaker_model ON circuit_breaker_states(model_name, state);
        CREATE INDEX IF NOT EXISTS idx_user_engagement_brand ON user_engagement_patterns(brand_name, engagement_score DESC);

        -- Initialize circuit breaker states
        INSERT INTO circuit_breaker_states (model_name, state, threshold_failures, timeout_duration)
        VALUES 
            ('gemini20FlashExp', 'closed', 5, '5 minutes'),
            ('gemini15Flash', 'closed', 5, '5 minutes'),
            ('xai-grok-3-mini-fast', 'closed', 3, '10 minutes')
        ON CONFLICT (model_name) DO NOTHING;

        -- Trigger for engagement patterns
        CREATE OR REPLACE FUNCTION update_user_engagement_on_interaction()
        RETURNS TRIGGER AS $func$
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
        $func$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS update_engagement_on_brand_interaction ON brand_interactions;
        CREATE TRIGGER update_engagement_on_brand_interaction
            AFTER INSERT ON brand_interactions
            FOR EACH ROW
            EXECUTE FUNCTION update_user_engagement_on_interaction();

        SELECT apply_migration('003_sienna_naturals_enhancements');
    END IF;
END $$;

-- Final cleanup and optimization
DO $$
BEGIN
    RAISE NOTICE 'Running post-migration optimizations...';
    
    -- Update statistics
    ANALYZE;
    
    -- Clean up any expired cache entries
    DELETE FROM response_cache WHERE expires_at < NOW();
    
    RAISE NOTICE 'All migrations completed successfully!';
    RAISE NOTICE 'Database is now ready for Sienna Naturals Enhanced System';
    
    -- Show migration status
    RAISE NOTICE 'Applied migrations:';
    FOR rec IN SELECT migration_name, applied_at FROM schema_migrations ORDER BY applied_at LOOP
        RAISE NOTICE '  - % (applied: %)', rec.migration_name, rec.applied_at;
    END LOOP;
END $$;

-- Verification queries
SELECT 'Migration Status' as info;
SELECT migration_name, applied_at FROM schema_migrations ORDER BY applied_at;

SELECT 'Table Counts' as info;
SELECT 
    schemaname as schema,
    tablename as table_name,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY tablename;