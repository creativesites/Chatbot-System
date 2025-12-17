// errorRecoveryFallback.js - Critical error recovery fallback
class ErrorRecoveryManagerFallback {
    constructor() {
        console.log('⚠️ Using ErrorRecoveryManager fallback implementation');
        
        this.modelFailures = {
            'gemini20FlashExp': 0,
            'gemini15Flash': 0,
            'gemini15Pro': 0,
            'xai-grok-3-mini-fast': 0
        };
        
        this.failureThreshold = 3;
        this.resetInterval = 300000; // 5 minutes
        
        // Reset failure counts periodically
        setInterval(() => this.resetFailureCounts(), this.resetInterval);
    }

    classifyError(error) {
        const message = (error.message || '').toLowerCase();
        
        if (message.includes('rate limit') || message.includes('quota')) {
            return 'rate_limit';
        }
        if (message.includes('timeout')) {
            return 'timeout';
        }
        if (message.includes('context') || message.includes('token')) {
            return 'context_too_large';
        }
        if (message.includes('json') || message.includes('parse')) {
            return 'parsing_error';
        }
        return 'unknown';
    }

    canMakeRequest(modelName) {
        return this.modelFailures[modelName] < this.failureThreshold;
    }

    recordSuccess(modelName) {
        if (this.modelFailures[modelName] > 0) {
            this.modelFailures[modelName]--;
            console.log(`✅ ${modelName} success recorded, failures: ${this.modelFailures[modelName]}`);
        }
    }

    recordFailure(modelName) {
        this.modelFailures[modelName]++;
        console.warn(`❌ ${modelName} failure recorded, total: ${this.modelFailures[modelName]}`);
        
        if (this.modelFailures[modelName] >= this.failureThreshold) {
            console.error(`🚨 ${modelName} has reached failure threshold!`);
        }
    }

    async attemptRecovery(error, operation, modelName, attempt = 1) {
        const errorType = this.classifyError(error);
        console.log(`🔄 Recovery attempt ${attempt} for ${errorType} error on ${modelName}`);
        
        this.recordFailure(modelName);
        
        // Simple retry logic
        if (attempt > 2) {
            console.error(`Max retries exceeded for ${modelName}`);
            return null;
        }
        
        // Wait before retry based on error type
        const delays = {
            rate_limit: 60000,
            timeout: 5000,
            context_too_large: 0,
            parsing_error: 1000,
            unknown: 2000
        };
        
        const delay = delays[errorType] || 2000;
        
        if (delay > 0) {
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return null; // Let caller handle retry
    }

    getEmergencyResponse() {
        return {
            messageType: 'html',
            message: '<html><head><style>body{font-family:\'Archivo\',sans-serif;background-color:#f5f5f7;color:#222323;font-size:15px;line-height:1.5;}.highlight{font-family:\'Archivo Expanded Black\',sans-serif;font-size:14px;text-transform:uppercase;background-color:#fce5d7;color:#222323;padding:2px 6px;border-radius:4px;}</style></head><body><p>I\'m experiencing some technical difficulties. Let me connect you with a MYAVANA expert!</p><p>Try our <span class="highlight">HairAI™</span> analysis or book a consultation.</p></body></html>',
            metadata: {
                contentType: '300',
                templateId: '12',
                payload: [
                    { title: 'Connect to expert', message: 'Connect me to a human expert' },
                    { title: 'Learn about HairAI™', message: 'Tell me about HairAI™' },
                    { title: 'Book consultation', message: 'I want to book a consultation' }
                ]
            },
            emergency: true
        };
    }

    getReducedContext(chatHistory, maxMessages = 3) {
        if (!chatHistory || chatHistory.length <= maxMessages) {
            return chatHistory;
        }
        return chatHistory.slice(-maxMessages);
    }

    getSimplifiedPrompt(prompt) {
        // Extract essential parts only
        const lines = prompt.split('\n');
        const essential = lines.filter(line => {
            const lower = line.toLowerCase();
            return lower.includes('you are mya') ||
                   lower.includes('critical') ||
                   lower.includes('json') ||
                   lower.includes('user:');
        });
        return essential.join('\n');
    }

    getAvailableModels() {
        return Object.entries(this.modelFailures)
            .filter(([model, failures]) => failures < this.failureThreshold)
            .map(([model]) => model);
    }

    resetFailureCounts() {
        for (const model in this.modelFailures) {
            if (this.modelFailures[model] > 0) {
                this.modelFailures[model] = Math.max(0, this.modelFailures[model] - 1);
            }
        }
        console.log('🔄 Model failure counts decremented');
    }

    getHealthStatus() {
        const status = {};
        for (const [model, failures] of Object.entries(this.modelFailures)) {
            status[model] = {
                available: failures < this.failureThreshold,
                failures,
                health: failures === 0 ? 'healthy' : failures < this.failureThreshold ? 'degraded' : 'unhealthy'
            };
        }
        return status;
    }
}

module.exports = ErrorRecoveryManagerFallback;