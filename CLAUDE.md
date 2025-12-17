# Myavana Chatbot System - Complete Architecture Documentation

## Overview
The Myavana Chatbot is a sophisticated AI-powered hair care advisory system built with a modular architecture supporting multiple brands. It features advanced conversation management, personalization, analytics, error recovery, and multi-model AI fallback strategies.

## Architecture Overview

### Package Structure
```
packages/
├── core/                    # Shared functionality for all bots
├── myavana/                # Myavana-specific implementation (Gemini models)
├── myavana-xai/            # Myavana implementation using xAI Grok
└── sienna-naturals/        # Sienna Naturals brand implementation
```

## Core Package (`packages/core/`)

### Key Dependencies
- **PostgreSQL**: Primary database with connection pooling
- **Redis**: Caching and session storage
- **Winston**: Comprehensive logging system
- **Genkit**: AI conversation management
- **Joi**: Input validation and sanitization

### Core Modules

#### Database Management
- **`database.js`**: Legacy database connections
- **`enhancedDatabase.js`**: Advanced connection pooling, health monitoring, caching
  - Connection pools with automatic retry logic
  - Multi-level caching (Redis + in-memory)
  - Health checks and monitoring
  - Transaction support with rollback

#### AI & Session Management
- **`ai.js`**: Genkit AI integration
- **`session.js`**: Database-backed session storage using PostgreSQL

#### User & Conversation Management
- **`user.js`**: User profile management with Redis caching
- **`conversation.js`**: Chat history, summaries, and conversation analytics
- **`hairIssues.js`**: Hair problem tracking and resolution

#### Smart Systems
- **`smartPromptManager.js`**: Context-aware prompt generation
- **`responseCache.js`**: Intelligent response caching with personalization
- **`conversationAnalytics.js`**: Comprehensive metrics and user journey tracking
- **`personalizationEngine.js`**: Dynamic response personalization based on user profiles
- **`errorRecovery.js`**: Circuit breaker patterns and error handling
- **`proactiveEngagement.js`**: Automated follow-up and engagement campaigns

#### Enhanced Features
- **`unifiedChatHandler.js`**: Centralized chat processing
- **`logger.js`**: Structured logging with multiple transports
- **`validation.js`**: Input sanitization and SQL injection prevention
- **`errorHandler.js`**: Centralized error handling
- **`healthMonitor.js`**: System health monitoring

#### Utilities
- **`utils.js`**: Product, FAQ, video, and testimonial management
- **`postResponseProcessing.js`**: Post-conversation analysis and data extraction

## Database Schema

### Core Tables

#### Users
```sql
users (
  user_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  hair_type VARCHAR(100), 
  hair_concerns TEXT[],
  location VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Conversations
```sql
conversations (
  id SERIAL PRIMARY KEY,
  conversation_id VARCHAR(255) UNIQUE,
  user_id VARCHAR(255) REFERENCES users(user_id),
  chat_history JSONB,
  summary TEXT,
  created_at TIMESTAMP
)
```

#### Sessions
```sql
sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255),
  session_data JSONB,
  last_accessed_at TIMESTAMP
)
```

### Analytics Tables

#### Conversation Metrics
```sql
conversation_metrics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  conversation_id VARCHAR(255),
  message_count INTEGER,
  ai_model_used VARCHAR(100),
  response_time_ms INTEGER,
  user_satisfaction INTEGER,
  conversion_event VARCHAR(100),
  created_at TIMESTAMP
)
```

#### User Journey Events
```sql
user_journey_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  event_type VARCHAR(100), -- welcome, query, recommendation, conversion
  event_data JSONB,
  hair_journey_stage VARCHAR(100), -- Stage 1-8
  created_at TIMESTAMP
)
```

#### AI Model Performance
```sql
ai_model_performance (
  model_name VARCHAR(100),
  request_count INTEGER,
  success_count INTEGER,
  failure_count INTEGER,
  avg_response_time_ms FLOAT,
  date_tracked DATE
)
```

### Advanced Feature Tables

#### Error Logs
```sql
error_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  conversation_id VARCHAR(255),
  error_type VARCHAR(100),
  error_message TEXT,
  model_name VARCHAR(100),
  context_data JSONB,
  recovery_attempted BOOLEAN,
  recovery_successful BOOLEAN,
  created_at TIMESTAMP
)
```

#### Hair Issues Tracking
```sql
hair_issues (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  issue_description TEXT,
  severity_level INTEGER,
  issue_category VARCHAR(100),
  resolution_status VARCHAR(50),
  created_at TIMESTAMP,
  resolved_at TIMESTAMP
)
```

#### Personalization
```sql
user_preferences (
  user_id VARCHAR(255) PRIMARY KEY,
  persona_type VARCHAR(100),
  communication_style VARCHAR(100),
  preferred_response_format VARCHAR(100),
  hair_priorities JSONB,
  product_preferences JSONB,
  engagement_preferences JSONB
)

personalization_metrics (
  user_id VARCHAR(255),
  persona_assigned VARCHAR(100),
  query_length INTEGER,
  response_length INTEGER,
  personalization_applied BOOLEAN,
  user_satisfaction_score INTEGER
)
```

#### Proactive Engagement
```sql
proactive_campaigns (
  campaign_name VARCHAR(255),
  campaign_type VARCHAR(100),
  target_persona VARCHAR(100),
  trigger_conditions JSONB,
  message_template JSONB,
  active BOOLEAN
)

proactive_engagement_history (
  user_id VARCHAR(255),
  campaign_id INTEGER,
  message_sent JSONB,
  delivery_status VARCHAR(50),
  user_response TEXT,
  engagement_score FLOAT
)
```

#### Cache Analytics
```sql
cache_analytics (
  cache_type VARCHAR(100),
  hit_count INTEGER,
  miss_count INTEGER,
  cache_key_pattern VARCHAR(255),
  date_tracked DATE
)
```

## Brand Implementations

### Myavana Package (`packages/myavana/`)

**AI Models**: 
- Primary: Gemini 2.0 Flash Experimental
- Fallback: Gemini 1.5 Flash  
- Final Fallback: xAI Grok 3 Mini Fast

**Key Features**:
- Multi-model fallback with circuit breakers
- Advanced error recovery
- Response personalization
- Comprehensive analytics tracking
- Image processing for hair analysis

**Files**:
- `index.js`: Main handler with multi-model support
- `constructPrompt.js`: Myavana-specific prompt engineering
- `eventHandlers.js`: Welcome events and image processing
- `system.js`: Myavana brand personality and guidelines

### Myavana-XAI Package (`packages/myavana-xai/`)

**AI Model**: xAI Grok 3 Mini Fast (single model)

**Key Features**:
- Simplified xAI-only implementation
- OpenAI SDK compatibility
- JSON response formatting
- Same core functionality as main Myavana package

### Sienna Naturals Package (`packages/sienna-naturals/`)

**Brand Focus**: Sienna Naturals products and community
- Store locator functionality
- Sienna-specific product recommendations
- Community-focused messaging

## AI Processing Flow

### 1. Request Processing
```javascript
// Request validation and parsing
const { message, from: userId, groupId: conversationId, eventName } = req.body;

// Handle special events (WELCOME, KOMMUNICATE_MEDIA_EVENT)
if (eventName === "WELCOME") {
    await handleWelcomeEvent(res, userId);
    return;
}
```

### 2. Session & Context Loading
```javascript
// Load user session and context
const [allchatsSummary, userInfo] = await Promise.all([
    core.getAllConversationsSummary(userId),
    core.getUserDetails(userId),
]);

let chatHistory = await core.getConversationHistory(conversationId, userId);
```

### 3. Smart Prompt Generation
```javascript
// Context analysis and smart prompt building
const contextAnalysis = await smartPromptManager.analyzeQueryContext(message, chatHistory);
const aiPrompt = await smartPromptManager.buildSmartPrompt(userId, message, chatHistory, userInfo, allchatsSummary);
```

### 4. Response Caching
```javascript
// Check for cached responses
const cachedResponse = await responseCache.getCachedResponse(
    message, 
    { userId, userProfile: userInfo }, 
    contextAnalysis
);
```

### 5. AI Model Processing (Myavana)
```javascript
// Multi-model fallback strategy
try {
    // Primary: Gemini 2.0 Flash Experimental
    if (errorRecovery.canMakeRequest('gemini20FlashExp')) {
        const { output } = await chat.send(message);
        modelUsed = 'gemini20FlashExp';
    }
} catch (primaryError) {
    // Fallback: Gemini 1.5 Flash
    try {
        const { output } = await chat.send(message);
        modelUsed = 'gemini15Flash';
    } catch (fallbackError) {
        // Final fallback: xAI Grok
        aiOutput = await callXAIFallback(aiPrompt, message, chatHistory);
        modelUsed = 'xai-grok-3-mini-fast';
    }
}
```

### 6. Response Personalization
```javascript
// Apply personalization
const personalizedResponse = await personalization.getPersonalizedResponse(
    userId, 
    message, 
    cleanedResponse, 
    { contextAnalysis, modelUsed, responseTime, userInfo }
);
```

### 7. Analytics & Caching
```javascript
// Track metrics and cache response
await analytics.trackAIResponse(userId, conversationId, personalizedResponse, modelUsed, responseTime);
await responseCache.cacheResponse(message, personalizedResponse, { userId, userProfile: userInfo }, contextAnalysis);
```

### 8. Post-Processing
```javascript
// Extract hair issues, update user profile, save conversation
const postProcessData = await core.postProcessConversation(chatHistory, message);
await core.postResponseProcessing(postProcessData, userId, aiOutput, allchatsSummary, conversationId, chatHistory);
```

## Key Features for Dashboard Development

### Analytics & Metrics
- Real-time conversation metrics
- AI model performance tracking
- User satisfaction scores
- Conversion event tracking
- Error recovery statistics
- Cache performance analytics

### User Journey Tracking
- 8-stage hair journey progression
- Event-based user interactions
- Personalization effectiveness
- Proactive engagement performance

### Business Intelligence Views
```sql
-- Daily conversation statistics
daily_conversation_stats
-- Model reliability metrics  
model_reliability_stats
-- Error recovery analysis
error_recovery_stats
-- Personalization effectiveness
personalization_effectiveness
-- Proactive engagement performance
proactive_engagement_performance
```

### Health Monitoring
- Database connection health
- Redis connectivity status
- AI model availability
- Response time monitoring
- Error rate tracking

### Personalization Data
- User personas and preferences
- Communication style preferences
- Product recommendation history
- Hair issue resolution tracking
- Engagement preferences

## Dashboard Integration Points

### User Management
- User profile API: `core.getUserDetails(userId)`
- User preferences: `user_preferences` table
- Hair issue tracking: `hair_issues` table

### Conversation Analytics
- Conversation history: `core.getConversationHistory(conversationId, userId)`
- Analytics data: `conversation_metrics`, `user_journey_events`
- AI performance: `ai_model_performance`

### Real-time Monitoring
- Health checks: `DatabaseManager.healthCheck()`
- Error monitoring: `error_logs` table
- Cache performance: `cache_analytics` table

### Campaign Management
- Proactive campaigns: `proactive_campaigns` table
- Engagement history: `proactive_engagement_history`
- A/B testing: `ab_experiments`, `ab_test_assignments`

## Development Commands

### Core Package
```bash
cd packages/core
npm test          # Run tests
npm run lint      # ESLint validation
npm run coverage  # Test coverage
```

### Database Migrations
```bash
# Run migrations in order
psql -d myavana_db -f packages/core/migrations/001_add_analytics_tables.sql
psql -d myavana_db -f packages/core/migrations/002_add_advanced_features_tables.sql
```

### Environment Variables
```env
# Database
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=myavana_db
PG_POOL_MAX=20
PG_POOL_MIN=5

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AI APIs
GOOGLE_API_KEY=your_gemini_key
XAI_API_KEY=your_xai_key

# Environment
NODE_ENV=production
```

## Security Features
- SQL injection prevention via Joi validation
- Input sanitization for all user inputs
- Secure session management
- Redis connection security
- Error message sanitization
- Rate limiting capabilities

This documentation provides the complete context needed for dashboard development, including database schema, API endpoints, analytics data, and integration points for building comprehensive administrative and monitoring interfaces.