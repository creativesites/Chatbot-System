// conversationAnalytics.js - Comprehensive conversation analytics and metrics
const { pgClient } = require('./database');

class ConversationAnalytics {
    constructor() {
        // Define hair journey stages for tracking
        this.journeyStages = [
            'Stage 1: Something New',
            'Stage 2: I\'m Rocking This!',
            'Stage 3: Experimenting', 
            'Stage 4: Boredom',
            'Stage 5: Desperation',
            'Stage 6: Damage or Protection',
            'Stage 7: Repair/New Decision',
            'Stage 8: Myavana (Hair Nirvana)'
        ];

        // Define conversion events we want to track
        this.conversionEvents = {
            'hairai_mentioned': 'HairAI™ service mentioned',
            'hairsi_mentioned': 'HairSI™ service mentioned',
            'consultation_mentioned': 'Virtual consultation mentioned',
            'product_recommended': 'Product recommendation provided',
            'image_analyzed': 'Hair image analyzed',
            'user_satisfied': 'User expressed satisfaction',
            'followup_scheduled': 'Follow-up interaction scheduled'
        };
    }

    /**
     * Track conversation start/welcome event
     */
    async trackWelcomeEvent(userId) {
        try {
            await this.logUserJourneyEvent(userId, 'welcome', {
                event_description: 'User started new conversation',
                welcome_template_shown: true
            });

            // Initialize conversation metrics
            await this.initializeConversationMetrics(userId, 'new_conversation');
            
        } catch (error) {
            console.error('Error tracking welcome event:', error);
        }
    }

    /**
     * Detect user's hair journey stage from message content
     */
    detectHairJourneyStage(message, chatHistory = []) {
        const content = message.toLowerCase();
        
        // Stage detection keywords (from your system prompt)
        const stageKeywords = {
            'Stage 1: Something New': ['new style', 'big chop', 'new color', 'first time', 'starting over', 'fresh start', 'changed my hair', 'just cut'],
            'Stage 2: I\'m Rocking This!': ['confident', 'love my hair', 'happy with', 'feeling good', 'comfortable', 'rocking it'],
            'Stage 3: Experimenting': ['experimenting', 'trying new', 'different looks', 'curious about', 'exploring', 'want to try'],
            'Stage 4: Boredom': ['bored', 'need a change', 'update', 'stale', 'want something different', 'ready for change'],
            'Stage 5: Desperation': ['desperate', 'overwhelmed', 'hate my hair', 'don\'t know what to do', 'frustrated', 'need help'],
            'Stage 6: Damage or Protection': ['damage', 'heat damage', 'protective style', 'split ends', 'breakage', 'overprocessed'],
            'Stage 7: Repair/New Decision': ['repairing', 'restoring', 'healing', 'deciding', 'new direction', 'growing out'],
            'Stage 8: Myavana (Hair Nirvana)': ['happy', 'content', 'love my routine', 'healthy and happy', 'maintaining']
        };

        // Find the best matching stage
        let bestMatch = null;
        let maxMatches = 0;

        for (const [stage, keywords] of Object.entries(stageKeywords)) {
            const matches = keywords.filter(keyword => content.includes(keyword)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                bestMatch = stage;
            }
        }

        return bestMatch || 'Unknown';
    }

    /**
     * Track user message and analyze intent
     */
    async trackUserMessage(userId, conversationId, message, contextAnalysis = null) {
        try {
            const detectedStage = this.detectHairJourneyStage(message);
            
            // Log the user query event
            await this.logUserJourneyEvent(userId, 'user_query', {
                query: message.substring(0, 500), // Truncate long messages
                detected_stage: detectedStage,
                topics_detected: contextAnalysis?.topics || [],
                query_type: contextAnalysis?.queryType || 'general',
                query_length: message.length,
                has_context: contextAnalysis !== null
            }, detectedStage);

            // Update conversation metrics
            await this.updateConversationMetrics(userId, conversationId, {
                messageCount: 1,
                lastActivityAt: new Date()
            });

        } catch (error) {
            console.error('Error tracking user message:', error);
        }
    }

    /**
     * Track AI response and model performance
     */
    async trackAIResponse(userId, conversationId, aiResponse, modelUsed, responseTimeMs, isFromCache = false) {
        try {
            // Analyze response content for conversion events
            const conversionEvents = this.analyzeResponseForConversions(aiResponse);
            
            // Track model performance
            await this.logModelPerformance(modelUsed, responseTimeMs, true);
            
            // Log AI response event
            await this.logUserJourneyEvent(userId, 'ai_response', {
                model_used: modelUsed,
                response_time_ms: responseTimeMs,
                response_length: JSON.stringify(aiResponse).length,
                from_cache: isFromCache,
                conversion_events_detected: conversionEvents
            });

            // Update conversation metrics with response details
            await this.updateConversationMetrics(userId, conversationId, {
                aiModelUsed: modelUsed,
                responseTimeMs: responseTimeMs,
                lastResponseAt: new Date()
            });

            // Track any conversion events detected
            for (const event of conversionEvents) {
                await this.trackConversionEvent(userId, conversationId, event, {
                    detected_automatically: true,
                    model_used: modelUsed
                });
            }

        } catch (error) {
            console.error('Error tracking AI response:', error);
        }
    }

    /**
     * Analyze AI response content to detect conversion events
     */
    analyzeResponseForConversions(response) {
        const events = [];
        const responseText = JSON.stringify(response).toLowerCase();

        // Check for service mentions
        if (responseText.includes('hairai') || responseText.includes('hair ai')) {
            events.push('hairai_mentioned');
        }
        
        if (responseText.includes('hairsi') || responseText.includes('hair si')) {
            events.push('hairsi_mentioned');
        }
        
        if (responseText.includes('consultation') || responseText.includes('expert')) {
            events.push('consultation_mentioned');
        }
        
        if (responseText.includes('recommend') || responseText.includes('suggestion')) {
            events.push('product_recommended');
        }

        return events;
    }

    /**
     * Track specific conversion events
     */
    async trackConversionEvent(userId, conversationId, eventType, eventData = {}) {
        try {
            // Update conversation metrics with conversion
            await this.updateConversationMetrics(userId, conversationId, {
                conversionEvent: eventType
            });

            // Log detailed conversion event
            await this.logUserJourneyEvent(userId, 'conversion', {
                conversion_type: eventType,
                conversation_id: conversationId,
                ...eventData
            });

            console.log(`Conversion event tracked: ${eventType} for user ${userId}`);

        } catch (error) {
            console.error('Error tracking conversion event:', error);
        }
    }

    /**
     * Track image analysis events
     */
    async trackImageAnalysis(userId, conversationId, imageUrl, analysisResult, processingTimeMs) {
        try {
            await this.logUserJourneyEvent(userId, 'image_analysis', {
                image_url: imageUrl,
                analysis_length: analysisResult ? analysisResult.length : 0,
                processing_time_ms: processingTimeMs,
                analysis_successful: !!analysisResult
            });

            // This is always a conversion event
            await this.trackConversionEvent(userId, conversationId, 'image_analyzed', {
                processing_time_ms: processingTimeMs,
                analysis_successful: !!analysisResult
            });

        } catch (error) {
            console.error('Error tracking image analysis:', error);
        }
    }

    /**
     * Track user satisfaction (can be called when user gives feedback)
     */
    async trackUserSatisfaction(userId, conversationId, satisfactionScore, feedback = null) {
        try {
            await this.updateConversationMetrics(userId, conversationId, {
                userSatisfaction: satisfactionScore
            });

            await this.logUserJourneyEvent(userId, 'satisfaction_feedback', {
                satisfaction_score: satisfactionScore,
                feedback: feedback,
                conversation_id: conversationId
            });

            if (satisfactionScore >= 4) {
                await this.trackConversionEvent(userId, conversationId, 'user_satisfied', {
                    satisfaction_score: satisfactionScore
                });
            }

        } catch (error) {
            console.error('Error tracking user satisfaction:', error);
        }
    }

    /**
     * Track model failures for reliability metrics
     */
    async trackModelFailure(modelName, error, responseTimeMs = null) {
        try {
            await this.logModelPerformance(modelName, responseTimeMs, false);
            
            console.log(`Model failure tracked: ${modelName} - ${error.message}`);

        } catch (trackingError) {
            console.error('Error tracking model failure:', trackingError);
        }
    }

    /**
     * Initialize conversation metrics record
     */
    async initializeConversationMetrics(userId, conversationId) {
        try {
            const query = `
                INSERT INTO conversation_metrics (user_id, conversation_id, created_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (conversation_id) DO NOTHING
            `;
            await pgClient.query(query, [userId, conversationId]);

        } catch (error) {
            console.error('Error initializing conversation metrics:', error);
        }
    }

    /**
     * Update conversation metrics
     */
    async updateConversationMetrics(userId, conversationId, updates) {
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;

            // Build dynamic update query
            for (const [field, value] of Object.entries(updates)) {
                const dbField = this.camelToSnakeCase(field);
                
                if (field === 'messageCount') {
                    fields.push(`${dbField} = ${dbField} + $${paramCount}`);
                } else {
                    fields.push(`${dbField} = $${paramCount}`);
                }
                values.push(value);
                paramCount++;
            }

            if (fields.length === 0) return;

            const query = `
                UPDATE conversation_metrics 
                SET ${fields.join(', ')}, updated_at = NOW()
                WHERE user_id = $${paramCount} AND conversation_id = $${paramCount + 1}
            `;
            
            await pgClient.query(query, [...values, userId, conversationId]);

        } catch (error) {
            console.error('Error updating conversation metrics:', error);
        }
    }

    /**
     * Log user journey events
     */
    async logUserJourneyEvent(userId, eventType, eventData, hairJourneyStage = null) {
        try {
            const query = `
                INSERT INTO user_journey_events (user_id, event_type, event_data, hair_journey_stage, created_at)
                VALUES ($1, $2, $3, $4, NOW())
            `;
            
            await pgClient.query(query, [
                userId,
                eventType,
                JSON.stringify(eventData),
                hairJourneyStage
            ]);

        } catch (error) {
            console.error('Error logging user journey event:', error);
        }
    }

    /**
     * Log AI model performance
     */
    async logModelPerformance(modelName, responseTimeMs, success) {
        try {
            const query = `
                INSERT INTO ai_model_performance (model_name, request_count, success_count, failure_count, avg_response_time_ms, date_tracked)
                VALUES ($1, 1, $2, $3, $4, CURRENT_DATE)
                ON CONFLICT (model_name, date_tracked)
                DO UPDATE SET 
                    request_count = ai_model_performance.request_count + 1,
                    success_count = ai_model_performance.success_count + $2,
                    failure_count = ai_model_performance.failure_count + $3,
                    avg_response_time_ms = (ai_model_performance.avg_response_time_ms * ai_model_performance.request_count + $4) / (ai_model_performance.request_count + 1)
            `;

            const successCount = success ? 1 : 0;
            const failureCount = success ? 0 : 1;

            await pgClient.query(query, [
                modelName,
                successCount,
                failureCount,
                responseTimeMs || 0
            ]);

        } catch (error) {
            console.error('Error logging model performance:', error);
        }
    }

    /**
     * Get analytics summary for a user
     */
    async getUserAnalytics(userId, days = 30) {
        try {
            const query = `
                SELECT 
                    COUNT(DISTINCT conversation_id) as total_conversations,
                    COUNT(*) as total_events,
                    COUNT(CASE WHEN event_type = 'conversion' THEN 1 END) as total_conversions,
                    array_agg(DISTINCT hair_journey_stage) FILTER (WHERE hair_journey_stage IS NOT NULL) as journey_stages,
                    array_agg(DISTINCT event_type) as event_types
                FROM user_journey_events 
                WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
            `;

            const result = await pgClient.query(query, [userId]);
            return result.rows[0] || {};

        } catch (error) {
            console.error('Error getting user analytics:', error);
            return {};
        }
    }

    /**
     * Get daily analytics summary
     */
    async getDailyAnalytics(date = null) {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            const query = `
                SELECT * FROM daily_conversation_stats WHERE date = $1
            `;

            const result = await pgClient.query(query, [targetDate]);
            return result.rows[0] || {};

        } catch (error) {
            console.error('Error getting daily analytics:', error);
            return {};
        }
    }

    /**
     * Utility function to convert camelCase to snake_case
     */
    camelToSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}

module.exports = ConversationAnalytics;