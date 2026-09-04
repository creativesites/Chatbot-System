-- Additional tables for advanced features: error recovery, personalization, and proactive engagement
-- Run this SQL after 001_add_analytics_tables.sql

-- Table for error logging and recovery tracking
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

-- Table for personalization metrics
CREATE TABLE IF NOT EXISTS personalization_metrics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    persona_assigned VARCHAR(100),
    query_length INTEGER,
    response_length INTEGER,
    personalization_applied BOOLEAN DEFAULT FALSE,
    user_satisfaction_score INTEGER, -- 1-5 scale if available
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for user preferences and personalization data
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    persona_type VARCHAR(100),
    communication_style VARCHAR(100), -- concise, detailed, educational, etc.
    preferred_response_format VARCHAR(100), -- text, buttons, carousel, etc.
    hair_priorities JSONB, -- array of priorities: ["length_retention", "damage_repair", "styling", etc.]
    product_preferences JSONB, -- brand preferences, ingredient preferences, etc.
    engagement_preferences JSONB, -- frequency, time_of_day, channel preferences
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Table for proactive engagement campaigns
CREATE TABLE IF NOT EXISTS proactive_campaigns (
    id SERIAL PRIMARY KEY,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(100) NOT NULL, -- follow_up, seasonal, educational, etc.
    target_persona VARCHAR(100), -- which user personas to target
    trigger_conditions JSONB, -- conditions that trigger this campaign
    message_template JSONB, -- the message content
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for proactive engagement scheduling
CREATE TABLE IF NOT EXISTS proactive_engagement_schedule (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL, -- welcome_followup, analysis_followup, etc.
    scheduled_time TIMESTAMP NOT NULL,
    context_data JSONB,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, trigger_type) -- Only one scheduled engagement per trigger type per user
);

-- Table for proactive engagement history
CREATE TABLE IF NOT EXISTS proactive_engagement_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    campaign_id INTEGER REFERENCES proactive_campaigns(id),
    message_sent JSONB,
    delivery_status VARCHAR(50) DEFAULT 'pending', -- sent, delivered, read, responded
    user_response TEXT,
    engagement_score FLOAT, -- 0-1 score based on user interaction
    created_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP
);

-- Table for A/B testing experiments
CREATE TABLE IF NOT EXISTS ab_experiments (
    id SERIAL PRIMARY KEY,
    experiment_name VARCHAR(255) NOT NULL,
    experiment_type VARCHAR(100), -- prompt_variation, response_format, etc.
    variant_a JSONB, -- control variant
    variant_b JSONB, -- test variant
    success_metric VARCHAR(100), -- user_satisfaction, conversion_rate, etc.
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP
);

-- Table for A/B test assignments and results
CREATE TABLE IF NOT EXISTS ab_test_assignments (
    id SERIAL PRIMARY KEY,
    experiment_id INTEGER REFERENCES ab_experiments(id),
    user_id VARCHAR(255) NOT NULL,
    assigned_variant VARCHAR(10), -- 'A' or 'B'
    conversion_achieved BOOLEAN DEFAULT FALSE,
    engagement_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for hair issue tracking (extended)
CREATE TABLE IF NOT EXISTS hair_issues (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    issue_description TEXT NOT NULL,
    severity_level INTEGER, -- 1-5 scale
    issue_category VARCHAR(100), -- breakage, dryness, styling, etc.
    reported_context TEXT, -- how it was mentioned
    resolution_status VARCHAR(50) DEFAULT 'open', -- open, in_progress, resolved
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Table for product recommendations tracking
CREATE TABLE IF NOT EXISTS product_recommendations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255),
    product_id INTEGER, -- if exists in products table
    product_name VARCHAR(255),
    reason_for_recommending TEXT,
    recommendation_context JSONB, -- user query, hair profile at time of rec
    user_feedback VARCHAR(50), -- interested, not_interested, purchased
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure compatibility with existing schemas
ALTER TABLE hair_issues ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE product_recommendations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_created ON error_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_type_model ON error_logs(error_type, model_name);
CREATE INDEX IF NOT EXISTS idx_personalization_metrics_user ON personalization_metrics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_proactive_engagement_user ON proactive_engagement_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_hair_issues_user_status ON hair_issues(user_id, resolution_status);
CREATE INDEX IF NOT EXISTS idx_product_recommendations_user ON product_recommendations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_experiment ON ab_test_assignments(experiment_id, assigned_variant);

-- Views for analytics and reporting
DROP VIEW IF EXISTS error_recovery_stats CASCADE;
CREATE OR REPLACE VIEW error_recovery_stats AS
SELECT 
    error_type,
    model_name,
    COUNT(*) as total_errors,
    COUNT(CASE WHEN recovery_attempted THEN 1 END) as recovery_attempts,
    COUNT(CASE WHEN recovery_successful THEN 1 END) as successful_recoveries,
    ROUND(
        (COUNT(CASE WHEN recovery_successful THEN 1 END)::numeric / 
        NULLIF(COUNT(CASE WHEN recovery_attempted THEN 1 END), 0)::numeric * 100), 2
    ) as recovery_success_rate,
    DATE(created_at) as error_date
FROM error_logs 
GROUP BY error_type, model_name, DATE(created_at)
ORDER BY total_errors DESC;

DROP VIEW IF EXISTS personalization_effectiveness CASCADE;
CREATE OR REPLACE VIEW personalization_effectiveness AS
SELECT 
    persona_assigned,
    COUNT(*) as total_interactions,
    ROUND(AVG(user_satisfaction_score)::numeric, 2) as avg_satisfaction,
    COUNT(CASE WHEN user_satisfaction_score >= 4 THEN 1 END) as satisfied_users,
    ROUND(
        (COUNT(CASE WHEN user_satisfaction_score >= 4 THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0)::numeric * 100), 2
    ) as satisfaction_rate
FROM personalization_metrics 
WHERE persona_assigned IS NOT NULL
GROUP BY persona_assigned
ORDER BY avg_satisfaction DESC;

DROP VIEW IF EXISTS proactive_engagement_performance CASCADE;
CREATE OR REPLACE VIEW proactive_engagement_performance AS
SELECT 
    c.campaign_name,
    c.campaign_type,
    COUNT(h.id) as messages_sent,
    COUNT(CASE WHEN h.delivery_status = 'responded' THEN 1 END) as responses_received,
    ROUND(
        (COUNT(CASE WHEN h.delivery_status = 'responded' THEN 1 END)::numeric / 
        NULLIF(COUNT(h.id), 0)::numeric * 100), 2
    ) as response_rate,
    ROUND(AVG(h.engagement_score)::numeric, 2) as avg_engagement_score
FROM proactive_campaigns c
LEFT JOIN proactive_engagement_history h ON c.id = h.campaign_id
WHERE c.active = true
GROUP BY c.id, c.campaign_name, c.campaign_type
ORDER BY response_rate DESC;

-- Function to automatically update user_preferences.updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_preferences
DROP TRIGGER IF EXISTS update_user_preferences_updated_at_trigger ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at_trigger
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();