// conversationAnalyticsFallback.js - Minimal analytics tracking
class ConversationAnalyticsFallback {
    constructor() {
        console.log('⚠️ Using ConversationAnalytics fallback implementation');
        this.events = [];
    }

    async trackWelcomeEvent(userId) {
        this.logEvent('welcome', userId, { timestamp: new Date() });
    }

    async trackUserMessage(userId, conversationId, message, contextAnalysis) {
        this.logEvent('user_message', userId, {
            conversationId,
            messageLength: message.length,
            timestamp: new Date()
        });
    }

    async trackAIResponse(userId, conversationId, response, model, responseTime, cached) {
        this.logEvent('ai_response', userId, {
            conversationId,
            model,
            responseTime,
            cached,
            timestamp: new Date()
        });
        
        // Log warnings for xAI usage
        if (model.includes('xai')) {
            console.warn('⚠️ xAI model used - this should be rare!');
        }
    }

    async trackImageAnalysis(userId, conversationId, imageUrl, result, processingTime) {
        this.logEvent('image_analysis', userId, {
            conversationId,
            processingTime,
            success: !!result,
            timestamp: new Date()
        });
    }

    async trackConversionEvent(userId, conversationId, eventType, data) {
        this.logEvent('conversion', userId, {
            conversationId,
            eventType,
            ...data,
            timestamp: new Date()
        });
    }

    async trackUserSatisfaction(userId, conversationId, score, feedback) {
        this.logEvent('satisfaction', userId, {
            conversationId,
            score,
            feedback,
            timestamp: new Date()
        });
    }

    async trackModelFailure(model, error, responseTime) {
        console.error(`🚨 Model failure: ${model} - ${error.message}`);
        this.logEvent('model_failure', 'system', {
            model,
            error: error.message,
            responseTime,
            timestamp: new Date()
        });
    }

    logEvent(type, userId, data) {
        const event = { type, userId, data, timestamp: new Date() };
        this.events.push(event);
        
        // Keep only last 1000 events in memory
        if (this.events.length > 1000) {
            this.events = this.events.slice(-1000);
        }
        
        console.log(`📊 Event tracked (fallback): ${type}`);
    }

    async getUserAnalytics(userId, days = 30) {
        const relevantEvents = this.events.filter(e => e.userId === userId);
        return {
            totalEvents: relevantEvents.length,
            eventTypes: [...new Set(relevantEvents.map(e => e.type))]
        };
    }

    detectHairJourneyStage(message) {
        // Simple stage detection
        const content = message.toLowerCase();
        if (content.includes('new') || content.includes('starting')) return 'Stage 1: Something New';
        if (content.includes('love') || content.includes('happy')) return 'Stage 2: I\'m Rocking This!';
        if (content.includes('experiment') || content.includes('try')) return 'Stage 3: Experimenting';
        if (content.includes('bored')) return 'Stage 4: Boredom';
        if (content.includes('desperate') || content.includes('help')) return 'Stage 5: Desperation';
        if (content.includes('damage') || content.includes('repair')) return 'Stage 6: Damage or Protection';
        return 'Unknown';
    }
}

module.exports = ConversationAnalyticsFallback;