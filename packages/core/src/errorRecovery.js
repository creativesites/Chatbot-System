// errorRecovery.js - Enhanced error recovery and graceful degradation
const { pgClient } = require('./database');

class ErrorRecoveryManager {
    constructor() {
        // Define recovery strategies for different error types
        this.recoveryStrategies = {
            'rate_limit': {
                retryAfter: 60000, // 1 minute
                maxRetries: 3,
                backoffMultiplier: 2,
                fallbackAction: 'switch_model'
            },
            'timeout': {
                retryAfter: 5000, // 5 seconds
                maxRetries: 2,
                backoffMultiplier: 1.5,
                fallbackAction: 'reduce_context'
            },
            'service_unavailable': {
                retryAfter: 30000, // 30 seconds
                maxRetries: 2,
                backoffMultiplier: 2,
                fallbackAction: 'switch_model'
            },
            'parsing_error': {
                retryAfter: 0,
                maxRetries: 1,
                backoffMultiplier: 1,
                fallbackAction: 'simplify_prompt'
            },
            'context_too_large': {
                retryAfter: 0,
                maxRetries: 1,
                backoffMultiplier: 1,
                fallbackAction: 'reduce_context'
            }
        };

        // Circuit breaker states for different services
        this.circuitBreakers = {
            'gemini20FlashExp': { failures: 0, lastFailure: null, state: 'closed' },
            'gemini15Flash': { failures: 0, lastFailure: null, state: 'closed' },
            'xai-grok-3-mini-fast': { failures: 0, lastFailure: null, state: 'closed' }
        };

        // Thresholds
        this.circuitBreakerThreshold = 5; // failures
        this.circuitBreakerTimeout = 300000; // 5 minutes
        this.emergencyResponses = [
            {
                "messageType": "html",
                "message": "<html><head><style>body{font-family:'Archivo',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:'Archivo Expanded Black',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}i{font-style:italic;color:#4a4d68;}span{font-weight:600;letter-spacing:-0.04em;color:#222323;}</style></head><body><p>I'm experiencing some technical difficulties right now. <i>Let me connect you with one of our hair experts who can help you personally!</i></p><p>In the meantime, you can:</p><ul><li>Book a <span class='highlight'>virtual consultation</span></li><li>Try our <span class='highlight'>HairAI™</span> analysis</li><li>Browse our hair care tips</li></ul></body></html>"
            }
        ];
    }

    /**
     * Classify error type for appropriate recovery strategy
     */
    classifyError(error) {
        const errorMessage = error.message ? error.message.toLowerCase() : '';
        const errorStatus = error.status || error.statusCode;

        // Rate limiting errors
        if (errorStatus === 429 || errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
            return 'rate_limit';
        }

        // Service unavailable
        if (errorStatus === 503 || errorMessage.includes('service unavailable') || errorMessage.includes('temporarily unavailable')) {
            return 'service_unavailable';
        }

        // Timeout errors
        if (errorMessage.includes('timeout') || errorMessage.includes('timed out') || errorStatus === 408) {
            return 'timeout';
        }

        // JSON parsing errors
        if (errorMessage.includes('json') || errorMessage.includes('parse') || errorMessage.includes('unexpected')) {
            return 'parsing_error';
        }

        // Context size errors
        if (errorMessage.includes('context') || errorMessage.includes('too large') || errorMessage.includes('token limit')) {
            return 'context_too_large';
        }

        return 'unknown';
    }

    /**
     * Check if circuit breaker allows request
     */
    canMakeRequest(modelName) {
        const breaker = this.circuitBreakers[modelName];
        if (!breaker) return true;

        // If circuit is open, check if timeout has passed
        if (breaker.state === 'open') {
            if (Date.now() - breaker.lastFailure > this.circuitBreakerTimeout) {
                breaker.state = 'half-open';
                return true;
            }
            return false;
        }

        return true;
    }

    /**
     * Record success for circuit breaker
     */
    recordSuccess(modelName) {
        const breaker = this.circuitBreakers[modelName];
        if (breaker) {
            breaker.failures = 0;
            breaker.state = 'closed';
        }
    }

    /**
     * Record failure for circuit breaker
     */
    recordFailure(modelName) {
        const breaker = this.circuitBreakers[modelName];
        if (breaker) {
            breaker.failures++;
            breaker.lastFailure = Date.now();
            
            if (breaker.failures >= this.circuitBreakerThreshold) {
                breaker.state = 'open';
                console.warn(`Circuit breaker OPEN for ${modelName} after ${breaker.failures} failures`);
            }
        }
    }

    /**
     * Attempt recovery with exponential backoff
     */
    async attemptRecovery(error, operation, modelName, attempt = 1) {
        const errorType = this.classifyError(error);
        const strategy = this.recoveryStrategies[errorType] || this.recoveryStrategies['unknown'];

        console.log(`Recovery attempt ${attempt} for ${errorType} error on ${modelName}`);

        // Record failure for circuit breaker
        this.recordFailure(modelName);

        // Check if we should retry
        if (attempt > strategy.maxRetries) {
            console.log(`Max retries exceeded for ${errorType}, moving to fallback`);
            return this.executeFailover(errorType, error, operation);
        }

        // Calculate backoff delay
        const delay = strategy.retryAfter * Math.pow(strategy.backoffMultiplier, attempt - 1);
        
        if (delay > 0) {
            console.log(`Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
        }

        try {
            const result = await operation();
            this.recordSuccess(modelName);
            return result;
        } catch (retryError) {
            return this.attemptRecovery(retryError, operation, modelName, attempt + 1);
        }
    }

    /**
     * Execute failover based on error type
     */
    async executeFailover(errorType, originalError, originalOperation) {
        const strategy = this.recoveryStrategies[errorType];
        
        console.log(`Executing failover strategy: ${strategy.fallbackAction}`);

        switch (strategy.fallbackAction) {
            case 'switch_model':
                // This should be handled by the calling code
                throw new Error(`FAILOVER_SWITCH_MODEL: ${originalError.message}`);
                
            case 'reduce_context':
                // This should be handled by the calling code to reduce prompt size
                throw new Error(`FAILOVER_REDUCE_CONTEXT: ${originalError.message}`);
                
            case 'simplify_prompt':
                // This should be handled by the calling code to use simpler prompt
                throw new Error(`FAILOVER_SIMPLIFY_PROMPT: ${originalError.message}`);
                
            default:
                return this.getEmergencyResponse();
        }
    }

    /**
     * Get emergency response when all else fails
     */
    getEmergencyResponse() {
        return {
            success: true,
            response: this.emergencyResponses[0],
            metadata: {
                emergency: true,
                reason: 'All AI models failed, providing emergency response'
            }
        };
    }

    /**
     * Get reduced context version of chat history
     */
    getReducedContext(chatHistory, maxMessages = 3) {
        if (!chatHistory || chatHistory.length <= maxMessages) {
            return chatHistory;
        }

        // Keep the most recent messages
        return chatHistory.slice(-maxMessages);
    }

    /**
     * Get simplified prompt (remove non-essential parts)
     */
    getSimplifiedPrompt(originalPrompt) {
        // Extract just the core system instruction and user context
        const lines = originalPrompt.split('\n');
        const essentialLines = lines.filter(line => {
            const lowerLine = line.toLowerCase();
            return lowerLine.includes('you are mya') ||
                   lowerLine.includes('core instructions') ||
                   lowerLine.includes('user information') ||
                   lowerLine.includes('response format');
        });

        return essentialLines.join('\n') || 'You are Mya, a helpful MYAVANA hair care assistant. Provide helpful hair care advice in JSON format.';
    }

    /**
     * Get available models based on circuit breaker states
     */
    getAvailableModels() {
        const available = [];
        
        for (const [modelName, breaker] of Object.entries(this.circuitBreakers)) {
            if (this.canMakeRequest(modelName)) {
                available.push(modelName);
            }
        }

        return available;
    }

    /**
     * Log error for analysis
     */
    async logError(userId, conversationId, error, modelName, context = {}) {
        try {
            const query = `
                INSERT INTO error_logs (
                    user_id, conversation_id, error_type, error_message, 
                    model_name, context_data, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `;

            await pgClient.query(query, [
                userId,
                conversationId,
                this.classifyError(error),
                error.message,
                modelName,
                JSON.stringify(context)
            ]);

        } catch (logError) {
            console.error('Failed to log error:', logError);
            // Don't throw - error logging shouldn't break the recovery process
        }
    }

    /**
     * Get error recovery statistics
     */
    async getRecoveryStats() {
        try {
            const query = `
                SELECT 
                    error_type,
                    model_name,
                    COUNT(*) as error_count,
                    COUNT(DISTINCT user_id) as affected_users,
                    DATE(created_at) as error_date
                FROM error_logs 
                WHERE created_at >= NOW() - INTERVAL '24 hours'
                GROUP BY error_type, model_name, DATE(created_at)
                ORDER BY error_count DESC
            `;

            const result = await pgClient.query(query);
            return result.rows;

        } catch (error) {
            console.error('Error getting recovery stats:', error);
            return [];
        }
    }

    /**
     * Reset circuit breaker (for manual intervention)
     */
    resetCircuitBreaker(modelName) {
        if (this.circuitBreakers[modelName]) {
            this.circuitBreakers[modelName] = {
                failures: 0,
                lastFailure: null,
                state: 'closed'
            };
            console.log(`Circuit breaker reset for ${modelName}`);
        }
    }

    /**
     * Health check for all models
     */
    getHealthStatus() {
        const status = {};
        
        for (const [modelName, breaker] of Object.entries(this.circuitBreakers)) {
            status[modelName] = {
                state: breaker.state,
                failures: breaker.failures,
                available: this.canMakeRequest(modelName),
                lastFailure: breaker.lastFailure
            };
        }

        return status;
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ErrorRecoveryManager;