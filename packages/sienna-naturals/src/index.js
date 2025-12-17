// Cloud Run compatible Sienna Naturals Chatbot Server
const core = require('myavana-bot-test-core');
const express = require('express');
const { gemini15Flash, googleAI, gemini20FlashExp } = require('@genkit-ai/googleai');
const { performance } = require('perf_hooks');
const { constructPrompt } = require('./constructPrompt');
const { handleWelcomeEvent, handleImageMessage } = require('./eventHandlers');
const OpenAI = require('openai');
require('dotenv').config();

// Enhanced functionality imports (with fallbacks if not available)
const smartPromptManager = core.smartPromptManager || {
    analyzeQueryContext: async () => ({ type: 'general', topics: [] }),
    buildSmartPrompt: async (userId, message, chatHistory, userInfo, allchatsSummary) => {
        const { constructPrompt } = require('./constructPrompt');
        return await constructPrompt(userId, userInfo, chatHistory, allchatsSummary, false);
    }
};
const responseCache = core.responseCache || {
    getCachedResponse: async () => null,
    cacheResponse: async () => {}
};
const analytics = core.conversationAnalytics || {
    trackAIResponse: async () => {},
    trackCacheHit: async () => {}
};
const personalization = core.personalizationEngine || {
    getPersonalizedResponse: async (userId, message, response) => response
};
const errorRecovery = core.errorRecovery || {
    canMakeRequest: () => true,
    recordSuccess: async () => {},
    recordFailure: async () => {}
};

// Helper functions
function cleanKommunicateResponse(jsonObj) {
    try {
        if (!Array.isArray(jsonObj)) {
            jsonObj = [jsonObj];
        }
        
        const cleanedList = jsonObj.flatMap((item) => {
            if (Array.isArray(item)) {
                return cleanKommunicateResponse(item);
            }
            
            if (item.platform === "kommunicate") {
                delete item.platform;
            }
            
            return item;
        });
        
        return cleanedList;
    } catch (error) {
        console.error("Error parsing AI response JSON:", error);
        return jsonObj;
    }
}

class SiennaNaturalsChatbotServer {
    constructor() {
        this.app = express();
        this.initialized = false;
        this.initPromise = this.initializeSystem();
    }

    async initializeSystem() {
        try {
            console.log('🚀 Initializing Sienna Naturals Chatbot Server...');

            // Initialize databases
            if (core.pgClient && core.pgClient.end) {
                console.log('✅ Database connections established');
            } else {
                console.log('❌ Database connections not established');
            }

            // Initialize xAI client as fallback
            try {
                this.xai = new OpenAI({
                    apiKey: process.env.XAI_API_KEY,
                    baseURL: 'https://api.x.ai/v1',
                    timeout: 360000,
                });
                
                if (process.env.XAI_API_KEY) {
                    console.log('✅ xAI client initialized successfully');
                } else {
                    console.warn('⚠️ WARNING: XAI_API_KEY not found in environment variables');
                }
            } catch (xaiError) {
                console.error('❌ ERROR: Failed to initialize xAI client:', xaiError);
            }

            // Setup Express middleware
            this.setupMiddleware();

            // Setup routes
            this.setupRoutes();

            // Setup error handling
            this.setupErrorHandling();

            // Setup graceful shutdown for Cloud Run
            this.setupGracefulShutdown();

            this.initialized = true;
            console.log('✅ Sienna Naturals Chatbot Server initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize system:', error);
            throw error;
        }
    }

    setupMiddleware() {
        this.app.set('trust proxy', true);
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Basic rate limiting
        const requestCounts = new Map();
        this.app.use((req, res, next) => {
            const ip = req.ip;
            const now = Date.now();
            const windowStart = now - (15 * 60 * 1000);
            
            if (!requestCounts.has(ip)) {
                requestCounts.set(ip, []);
            }
            
            const requests = requestCounts.get(ip).filter(time => time > windowStart);
            
            if (requests.length >= 100) {
                return res.status(429).json({
                    error: true,
                    message: 'Too many requests from this IP, please try again later'
                });
            }
            
            requests.push(now);
            requestCounts.set(ip, requests);
            next();
        });

        // CORS headers
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });
    }

    setupRoutes() {
        console.log('🛣️ Setting up routes...');
        
        this.app.use((req, res, next) => {
            console.log('📨 Incoming request:', {
                method: req.method,
                path: req.path,
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                contentType: req.get('Content-Type'),
                timestamp: new Date().toISOString()
            });
            next();
        });

        // Health check endpoints
        this.app.get('/health', (req, res) => {
            console.log('🏥 Health check requested');
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                initialized: this.initialized
            });
        });

        this.app.get('/healthz', (req, res) => {
            console.log('🏥 Healthz check requested');
            res.status(200).json({
                status: 'ok',
                timestamp: new Date().toISOString()
            });
        });

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Sienna Naturals Chatbot Server',
                status: 'running',
                version: require('../package.json').version,
                timestamp: new Date().toISOString()
            });
        });

        // Main chat endpoints
        this.app.post('/', async (req, res) => {
            console.log('📡 Received POST request to root path');
            await this.handleChatRequest(req, res);
        });

        this.app.post('/webhook', async (req, res) => {
            console.log('📡 Received POST request to /webhook');
            await this.handleChatRequest(req, res);
        });

        this.app.post('/sienna-naturals', async (req, res) => {
            console.log('📡 Received POST request to /sienna-naturals');
            await this.handleChatRequest(req, res);
        });

        this.app.post('/chat', async (req, res) => {
            console.log('📡 Received POST request to /chat');
            await this.handleChatRequest(req, res);
        });

        console.log('✅ Routes configured successfully!');
    }

    async callXAIFallback(aiPrompt, message, chatHistory) {
        console.log('🔄 ===== xAI GROK FALLBACK PROCESSING =====');
        console.log('📊 xAI Input Analysis:', {
            promptLength: aiPrompt.length,
            estimatedPromptTokens: Math.ceil(aiPrompt.length / 4),
            messageLength: message.length,
            chatHistoryLength: chatHistory.length,
            historyItemsToInclude: Math.min(chatHistory.length, 10),
            timestamp: new Date().toISOString()
        });
        
        try {
            console.log('🔧 Preparing xAI message structure...');
            const messages = [
                { role: 'system', content: aiPrompt },
                ...chatHistory.slice(-10),
                { role: 'user', content: message }
            ];
            
            console.log('📤 Sending request to xAI Grok API...');
            const xaiApiStartTime = performance.now();
            const response = await this.xai.chat.completions.create({
                model: 'grok-3-mini-fast',
                messages: messages,
                temperature: 1.1,
                response_format: { type: 'json_object' },
            });
            const xaiApiTime = performance.now() - xaiApiStartTime;
            
            console.log('✅ xAI API response received in', xaiApiTime.toFixed(2), 'ms');
            
            const output = response.choices[0].message.content;
            console.log('📝 xAI Raw Output Analysis:', {
                outputLength: output.length,
                outputType: typeof output,
                estimatedTokens: Math.ceil(output.length / 4)
            });
            
            const parseStartTime = performance.now();
            const parsedOutput = JSON.parse(output);
            const parseTime = performance.now() - parseStartTime;
            
            console.log('✅ JSON parsing successful in', parseTime.toFixed(2), 'ms');
            console.log('✅✅✅ xAI Grok fallback completed successfully!');
            
            return parsedOutput;
        } catch (xaiError) {
            console.error('❌❌❌ xAI GROK FALLBACK FAILED!');
            console.error('❌ xAI Error Details:', {
                message: xaiError.message,
                name: xaiError.name,
                status: xaiError.status,
                code: xaiError.code
            });
            throw xaiError;
        }
    }

    async handleChatRequest(req, res) {
        const requestId = Math.random().toString(36).substr(2, 9);
        console.log('🚀 ===== NEW SIENNA NATURALS REQUEST START =====');
        console.log('🆔 Request ID:', requestId);
        console.log('📅 Timestamp:', new Date().toISOString());
        
        try {
            const start = performance.now();
            const { message, from: userId, groupId: conversationId, eventName, metadata } = req.body;
            
            console.log('📊 Request Details:', {
                requestId,
                userId: userId || 'undefined',
                conversationId: conversationId || 'undefined',
                eventName: eventName || 'undefined',
                messageLength: message ? message.length : 0
            });

            if (eventName === "WELCOME") {
                console.log('👋 Processing WELCOME event for user:', userId);
                await handleWelcomeEvent(res, userId);
                console.log('✅ Welcome event handled successfully');
                return;
            }

            // Load session
            console.log('📂 Loading session for user:', userId);
            const session = await core.ai.loadSession(userId, {
                store: new core.DatabaseSessionStore(),
            });
            console.log('✅ Session loaded successfully');

            // Fetch user details and conversation history
            console.log('📊 Fetching user data and conversation history...');
            const [allchatsSummary, userInfo] = await Promise.all([
                core.getAllConversationsSummary(userId),
                core.getUserDetails(userId),
            ]);
            console.log('✅ User data fetched successfully');

            console.log('📜 Loading conversation history...');
            let chatHistory = await core.getConversationHistory(conversationId, userId);
            
            if (!Array.isArray(chatHistory)) {
                console.log('⚠️ Chat history is not an array, initializing empty array');
                chatHistory = [];
            }
            console.log('✅ Conversation history loaded');

            if (eventName === "KOMMUNICATE_MEDIA_EVENT") {
                console.log('🖼️ Processing KOMMUNICATE_MEDIA_EVENT (image message)...');
                const handled = await handleImageMessage(eventName, metadata, userId, conversationId, chatHistory, res, message, userInfo, session);
                
                if (handled) {
                    console.log('✅ Image message handled successfully');
                    return;
                }
            }

            // Add user message to chat history
            const timestampedUserSaid = `${new Date().toISOString()} - User Said: ${message}`;
            chatHistory.push({ role: 'user', content: timestampedUserSaid });

            // Context analysis and smart prompt generation
            console.log('🧠 ===== ENHANCED PROMPT GENERATION =====');
            const contextAnalysis = await smartPromptManager.analyzeQueryContext(message, chatHistory);
            
            // Check response cache first
            const cachedResponse = await responseCache.getCachedResponse(
                message, 
                { userId, userProfile: userInfo }, 
                contextAnalysis
            );
            
            if (cachedResponse) {
                console.log('⚡ Serving cached response');
                res.json(cachedResponse);
                await analytics.trackCacheHit(userId, conversationId, message);
                return;
            }

            // Build smart prompt
            const aiPrompt = await smartPromptManager.buildSmartPrompt(userId, message, chatHistory, userInfo, allchatsSummary);
            console.log('✅ Smart prompt generation completed');

            // AI Model Processing with enhanced error recovery
            let aiOutput = null;
            let modelUsed = '';
            let responseStartTime = performance.now();
            
            try {
                // Check if primary model is available via circuit breaker
                if (errorRecovery.canMakeRequest('gemini20FlashExp')) {
                    console.log('🚀 Trying PRIMARY MODEL: GEMINI 2.0 FLASH EXPERIMENTAL');
                    
                    const chat = session.chat({
                        model: gemini20FlashExp,
                        system: aiPrompt,
                        config: {
                            temperature: 1.1,
                        },
                    });
                    
                    const { output } = await chat.send(message);
                    aiOutput = output;
                    modelUsed = 'gemini20FlashExp';
                    
                    // Record successful request
                    await errorRecovery.recordSuccess('gemini20FlashExp');
                    console.log('✅ GEMINI 2.0 FLASH EXPERIMENTAL SUCCESS!');
                    
                } else {
                    throw new Error('Primary model circuit breaker is open');
                }
                
            } catch (primaryError) {
                console.log('❌ Primary model failed, trying fallback');
                await errorRecovery.recordFailure('gemini20FlashExp', primaryError);
                
                try {
                    if (errorRecovery.canMakeRequest('gemini15Flash')) {
                        console.log('🔄 Trying FALLBACK MODEL: GEMINI 1.5 FLASH');
                        
                        const chat = core.ai.chat({
                            model: gemini15Flash,
                            system: aiPrompt,
                            config: {
                                temperature: 1.1,
                            },
                        });

                        const { output } = await chat.send(message);
                        aiOutput = output;
                        modelUsed = 'gemini15Flash';
                        
                        await errorRecovery.recordSuccess('gemini15Flash');
                        console.log('✅ GEMINI 1.5 FLASH FALLBACK SUCCESS!');
                        
                    } else {
                        throw new Error('Fallback model circuit breaker is open');
                    }
                    
                } catch (fallbackError) {
                    console.log('❌ Fallback model failed, trying xAI');
                    await errorRecovery.recordFailure('gemini15Flash', fallbackError);
                    
                    if (this.xai && process.env.XAI_API_KEY && errorRecovery.canMakeRequest('xai-grok-3-mini-fast')) {
                        console.log('🚨 Trying FINAL FALLBACK: xAI GROK');
                        
                        aiOutput = await this.callXAIFallback(aiPrompt, message, chatHistory);
                        modelUsed = 'xai-grok-3-mini-fast';
                        
                        await errorRecovery.recordSuccess('xai-grok-3-mini-fast');
                        console.log('✅ xAI GROK FINAL FALLBACK SUCCESS!');
                        
                    } else {
                        console.error('❌ All AI models failed or unavailable');
                        throw new Error('All AI models failed');
                    }
                }
            }
            
            if (!aiOutput) {
                throw new Error('No AI output received from any model');
            }

            const responseTime = performance.now() - responseStartTime;
            console.log('✅ AI Model processing completed with:', modelUsed);

            // Response processing and personalization
            console.log('🔄 Processing and personalizing response...');
            let cleanedResponse;
            if (modelUsed.includes('xai-grok')) {
                cleanedResponse = aiOutput.messages ? aiOutput.messages : aiOutput;
            } else {
                cleanedResponse = cleanKommunicateResponse(aiOutput);
            }

            // Apply personalization
            const personalizedResponse = await personalization.getPersonalizedResponse(
                userId, 
                message, 
                cleanedResponse, 
                { contextAnalysis, modelUsed, responseTime, userInfo }
            );

            // Send response to client
            console.log('📤 Sending personalized response to client');
            res.json(personalizedResponse);

            // Analytics and caching (async)
            setImmediate(async () => {
                try {
                    // Track analytics
                    await analytics.trackAIResponse(userId, conversationId, personalizedResponse, modelUsed, responseTime);
                    
                    // Cache the response
                    await responseCache.cacheResponse(message, personalizedResponse, { userId, userProfile: userInfo }, contextAnalysis);
                    
                    // Add to chat history
                    chatHistory.push({ role: 'assistant', content: aiOutput });

                    // Post-processing
                    const postProcessData = await core.postProcessConversation(chatHistory, message);
                    await core.postResponseProcessing(postProcessData, userId, aiOutput, allchatsSummary, conversationId, chatHistory, JSON.stringify(aiOutput));
                    
                    console.log('✅ Analytics and post-processing completed');
                } catch (analyticsError) {
                    console.error('❌ Analytics/post-processing failed:', analyticsError.message);
                }
            });
            
            const totalTime = performance.now() - start;
            console.log('🎉 REQUEST COMPLETED SUCCESSFULLY!');
            console.log('📊 Performance Metrics:', {
                requestId,
                totalTime: totalTime.toFixed(2) + 'ms',
                modelUsed,
                success: true
            });
            
        } catch (error) {
            console.error('❌ CRITICAL REQUEST FAILURE:', error);
            
            const errorResponse = {
                error: true,
                message: 'Internal server error - chatbot temporarily unavailable',
                requestId: requestId || 'unknown',
                timestamp: new Date().toISOString()
            };
            
            return res.status(500).json(errorResponse);
        }
    }

    setupErrorHandling() {
        this.app.use((req, res) => {
            console.warn('Route not found:', {
                method: req.method,
                path: req.path,
                ip: req.ip
            });
            
            res.status(404).json({
                error: true,
                message: 'Endpoint not found',
                path: req.path
            });
        });

        this.app.use((error, req, res, next) => {
            console.error('Express error handler:', error);
            
            res.status(500).json({
                error: true,
                message: 'Internal server error',
                requestId: req.headers['x-request-id'] || 'unknown',
                timestamp: new Date().toISOString()
            });
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Promise Rejection:', {
                reason: reason?.message || reason,
                stack: reason?.stack
            });
        });

        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', {
                error: error.message,
                stack: error.stack
            });
        });
    }

    setupGracefulShutdown() {
        const signals = ['SIGTERM', 'SIGINT'];
        
        signals.forEach(signal => {
            process.on(signal, () => {
                console.log(`Received ${signal}, starting graceful shutdown...`);
                this.shutdown(signal);
            });
        });
    }

    async shutdown(reason) {
        console.log(`Shutting down server due to: ${reason}`);
        
        if (this.server) {
            this.server.close(() => {
                console.log('HTTP server closed');
            });
        }

        try {
            if (core.pgClient && core.pgClient.end) {
                await core.pgClient.end();
                console.log('PostgreSQL connection closed');
            }
            if (core.redisClient && core.redisClient.quit) {
                await core.redisClient.quit();
                console.log('Redis connection closed');
            }
        } catch (closeError) {
            console.error('Error closing database connections:', closeError);
        }

        console.log('Graceful shutdown completed');
        process.exit(0);
    }

    async start(port = process.env.PORT || 8080) {
        await this.initPromise;
        
        this.server = this.app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Sienna Naturals Chatbot Server running on port ${port}`, {
                port,
                environment: process.env.NODE_ENV || 'production',
                version: require('../package.json').version,
                timestamp: new Date().toISOString()
            });
        });

        return this.server;
    }

    getHandler() {
        return this.app;
    }
}

// Legacy handler function (maintains compatibility)
const siennaNaturalsHandler = async (req, res) => {
    if (!global.siennaNaturalsServerInstance) {
        global.siennaNaturalsServerInstance = new SiennaNaturalsChatbotServer();
        await global.siennaNaturalsServerInstance.initPromise;
    }
    
    return global.siennaNaturalsServerInstance.handleChatRequest(req, res);
};

// Export for use as module
module.exports = SiennaNaturalsChatbotServer;

// For Cloud Run inline function
module.exports.siennaNaturalsHandler = async (req, res) => {
    if (!global.siennaNaturalsServerInstance) {
        global.siennaNaturalsServerInstance = new SiennaNaturalsChatbotServer();
        await global.siennaNaturalsServerInstance.initPromise;
    }
    
    return global.siennaNaturalsServerInstance.app(req, res);
};

// Legacy handler for compatibility
module.exports.handler = siennaNaturalsHandler;

// Start server if this file is run directly
if (require.main === module) {
    const server = new SiennaNaturalsChatbotServer();
    server.start();
}