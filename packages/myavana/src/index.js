// Cloud Run compatible MyavanaChatbotServer
const core = require('myavana-bot-test-core');
const express = require('express');
const { googleAI } = require('@genkit-ai/google-genai');
const { performance } = require('perf_hooks');
const { constructPrompt } = require('./constructPrompt');
const { handleWelcomeEvent, handleImageMessage } = require('./eventHandlers');
const { buildMessageContext } = require('myavana-bot-test-core/src/messageContextBuilder');
const { globalTools, createUserTools } = require('myavana-bot-test-core/src/agentTools');
require('dotenv').config();

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

class MyavanaChatbotServer {
    constructor() {
        this.app = express();
        this.initialized = false;
        this.initPromise = this.initializeSystem();
    }

    async initializeSystem() {
        try {
            console.log('🚀 Initializing Myavana Chatbot Server...');

            // Initialize databases
            //await core.connectDatabases();
            // check if the database is connected
            if (core.pgClient && core.pgClient.end) {
                console.log('✅ Database connections established');
            } else {
                console.log('❌ Database connections not established');
            }
            //console.log('✅ skipped Database connections established');

            // Setup Express middleware
            this.setupMiddleware();

            // Setup routes
            this.setupRoutes();

            // Setup error handling
            this.setupErrorHandling();

            // Setup graceful shutdown for Cloud Run
            this.setupGracefulShutdown();

            this.initialized = true;
            console.log('✅ Myavana Chatbot Server initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize system:', error);
            throw error; // Don't exit process in Cloud Run
        }
    }

    setupMiddleware() {
        // Trust proxy for accurate IP addresses (important for Cloud Run)
        this.app.set('trust proxy', true);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Basic rate limiting (simple in-memory for Cloud Run)
        const requestCounts = new Map();
        this.app.use((req, res, next) => {
            const ip = req.ip;
            const now = Date.now();
            const windowStart = now - (15 * 60 * 1000); // 15 minutes
            
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
        
        // Add middleware to log all incoming requests
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

        // Health check endpoints (important for Cloud Run)  
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

        // Root endpoint - Handle both GET and POST
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Myavana Chatbot Server',
                status: 'running',
                version: require('../package.json').version,
                timestamp: new Date().toISOString()
            });
        });

        // Main chat endpoint - POST to root path (common for Cloud Run)
        this.app.post('/', async (req, res) => {
            console.log('📡 Received POST request to root path');
            await this.handleChatRequest(req, res);
        });

        // Additional chat endpoints
        this.app.post('/webhook', async (req, res) => {
            console.log('📡 Received POST request to /webhook');
            await this.handleChatRequest(req, res);
        });

        // Legacy endpoint support
        this.app.post('/myavana', async (req, res) => {
            console.log('📡 Received POST request to /myavana');
            await this.handleChatRequest(req, res);
        });

        // Chat endpoint (alternative)
        this.app.post('/chat', async (req, res) => {
            console.log('📡 Received POST request to /chat');
            await this.handleChatRequest(req, res);
        });

        console.log('✅ Routes configured successfully!');
        console.log('🛣️ Available routes:');
        console.log('   GET  /         - Service information');
        console.log('   GET  /health   - Health check');
        console.log('   GET  /healthz  - Health check (K8s style)');
        console.log('   POST /         - Main chat endpoint');
        console.log('   POST /webhook  - Webhook chat endpoint');
        console.log('   POST /myavana  - Legacy chat endpoint');
        console.log('   POST /chat     - Alternative chat endpoint');
    }

    /**
     * Main request handler for all chat POST endpoints.
     * Handles WELCOME, image, and text message events.
     * Sends the AI response synchronously, then runs post-processing non-blocking.
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async handleChatRequest(req, res) {
        const requestId = Math.random().toString(36).substr(2, 9);
        console.log('🚀 ===== NEW REQUEST START =====');
        console.log('🆔 Request ID:', requestId);
        console.log('📅 Timestamp:', new Date().toISOString());
        
        try {
            const start = performance.now();
            const { message, from: userId, groupId: conversationId, eventName, metadata } = req.body;
            const safeMessage = message || '';
            // 1. Start fetching everything in parallel immediately
            const dataPromise = Promise.all([
                core.getAllConversationsSummary(userId),
                core.getUserDetails(userId),
                core.ai.loadSession(userId, { store: new core.DatabaseSessionStore() })
            ]);
            
            console.log('📊 Request Details:', {
                requestId,
                userId: userId || 'undefined',
                conversationId: conversationId || 'undefined',
                eventName: eventName || 'undefined',
                messageLength: safeMessage.length
            });

            if (eventName === "WELCOME") {
                console.log('👋 Processing WELCOME event for user:', userId);
                await handleWelcomeEvent(res, userId);
                console.log('✅ Welcome event handled successfully');
                console.log('🏁 ===== WELCOME REQUEST COMPLETED =====');
                return;
            }

            // 3. Destructure the results
            const [allchatsSummary, userInfo, session] = await dataPromise;
            
            console.log('✅ User data fetched successfully');

            if (eventName === "KOMMUNICATE_MEDIA_EVENT") {
                console.log('🖼️ Processing KOMMUNICATE_MEDIA_EVENT (image message)...');
                console.log('📜 Loading conversation history...');
            let fastchatHistory = await core.getConversationHistory(conversationId, userId);
            
            if (!Array.isArray(fastchatHistory)) {
                console.log('⚠️ Chat history is not an array, initializing empty array');
                fastchatHistory = [];
            }
            
            console.log('✅ Conversation history loaded');
                const handled = await handleImageMessage(eventName, metadata, userId, conversationId, fastchatHistory, res, message, userInfo, session);
                
                if (handled) {
                    console.log('✅ Image message handled successfully');
                    console.log('🏁 ===== IMAGE REQUEST COMPLETED =====');
                    return;
                }
            }

             // ===== NEW: CHECK CACHE VALIDITY FIRST =====
            // This is a fast DB lookup - no expensive prompt construction yet!
            console.log('🔍 Checking cache validity...');
            const cacheCheckStart = performance.now();
            const cacheStatus = await core.cacheManager.checkCacheValidity(userId);
            console.log('✅ Cache check complete:', (performance.now() - cacheCheckStart).toFixed(0), 'ms');
            console.log('📊 Cache status:', cacheStatus);

            let aiPrompt = null;
            let cacheResult = null;

            // ===== CONDITIONAL PROMPT CONSTRUCTION =====
            // Only construct prompt if we need to create/refresh cache OR use it without cache
            if (!cacheStatus.hasValidCache) {
                console.log('🧠 No valid cache - constructing prompt...');
                const promptStart = performance.now();

                aiPrompt = await constructPrompt(userId, userInfo, allchatsSummary, false);
                console.log('✅ Prompt built:', (performance.now() - promptStart).toFixed(0), 'ms');

                // Create cache with the new prompt
                console.log('🗄️ Creating cache...');
                const cacheStart = performance.now();
                cacheResult = await core.cacheManager.getOrCreateCache(userId, aiPrompt);
                console.log('✅ Cache ready:', (performance.now() - cacheStart).toFixed(0), 'ms');
            } else {
                console.log('✅ Valid cache exists - skipping prompt construction!');
                
                // Use existing cache - no prompt construction needed!
                cacheResult = {
                    cacheName: cacheStatus.cacheName,
                    isNewCache: false
                };

                // Optionally refresh cache in background if it's expiring soon
                if (cacheStatus.needsRefresh) {
                    console.log('🔄 Scheduling background cache refresh');
                    setImmediate(async () => {
                        try {
                            const freshPrompt = await constructPrompt(userId, userInfo, allchatsSummary, false);
                            await core.cacheManager.getOrCreateCache(userId, freshPrompt);
                            console.log('✅ Background cache refresh complete');
                        } catch (error) {
                            console.error('❌ Background cache refresh failed:', error.message);
                        }
                    });
                }
            }

            // Build per-message dynamic context (persona, style directives)
            // Prepended to the user message — keeps the 24h cached system prompt intact
            const messageContext = await buildMessageContext(userId, chatHistory);
            const messageWithContext = messageContext ? `${messageContext}${safeMessage}` : safeMessage;

            // Assemble tools for this request: global (searchServices, lookupFAQ)
            // + per-user dynamic tools (saveHairGoal, getUserHairProfile)
            const chatTools = [...globalTools, ...createUserTools(userId)];

            // Try primary model first (Gemini 3.0 Flash Preview with caching)
            console.log('🤖 ===== AI MODEL PROCESSING PHASE =====');
            console.log('🤖 Starting AI model processing with caching...');
            if (messageContext) console.log('🎭 Persona context injected:', messageContext.trim());

            let aiOutput = null;
            let modelUsed = '';
            let responseStartTime = performance.now();
            console.log('⏱️ Response timer started', responseStartTime.toFixed(2), 'ms');
            
            try {
                console.log('🚀 ===== TRYING PRIMARY MODEL: GEMINI 3.0 FLASH PREVIEW WITH CACHE =====');
                console.log('📤 Initializing Gemini 3.0 Flash Preview...');
               
                
                const modelInitStartTime = performance.now();
                
                // Create chat with or without cache
                let chat;
                if (cacheResult.cacheName) {
                    console.log('✅ Using cached system instructions:', cacheResult.cacheName);
                    
                    chat = session.chat({
                        model: googleAI.model('gemini-3-flash-preview'),
                        cache: cacheResult.cacheName, // Use cached system instructions
                        tools: chatTools,
                        config: {
                            temperature: 1.1,
                        },
                    });
                } else {
                    console.log('⚠️ Cache unavailable, using standard chat without cache');
                    
                    chat = session.chat({
                        model: googleAI.model('gemini-3-flash-preview'),
                        system: aiPrompt, // Fallback to regular system prompt
                        tools: chatTools,
                        config: {
                            temperature: 1.1,
                        },
                    });
                }


                const apiCallStartTime = performance.now();
                const { output } = await chat.send(messageWithContext);
                const apiCallTime = performance.now() - apiCallStartTime;
                
                console.log('⏱️ API Call Duration:', apiCallTime.toFixed(2) + 'ms');
                
                // Guard against null/empty outputs (can happen with cached requests)
                const isEmptyOutput =
                    output == null ||
                    (typeof output === 'string' && output.trim().length === 0) ||
                    (Array.isArray(output) && output.length === 0) ||
                    (typeof output === 'object' && !Array.isArray(output) && Object.keys(output).length === 0);
                
                if (isEmptyOutput) {
                    if (cacheResult.cacheName) {
                        console.warn('⚠️ Empty output with cache. Retrying Gemini 3.0 without cache...');
                        if (!aiPrompt) {
                            aiPrompt = await constructPrompt(userId, userInfo, allchatsSummary, false);
                        }
                        const retryChat = session.chat({
                            model: googleAI.model('gemini-3-flash-preview'),
                            system: aiPrompt,
                            tools: chatTools,
                            config: {
                                temperature: 1.1,
                            },
                        });
                        const { output: retryOutput } = await retryChat.send(safeMessage);
                        
                        const isEmptyRetryOutput =
                            retryOutput == null ||
                            (typeof retryOutput === 'string' && retryOutput.trim().length === 0) ||
                            (Array.isArray(retryOutput) && retryOutput.length === 0) ||
                            (typeof retryOutput === 'object' && !Array.isArray(retryOutput) && Object.keys(retryOutput).length === 0);
                        
                        if (isEmptyRetryOutput) {
                            throw new Error('Empty AI output from Gemini 3.0 (retry without cache)');
                        }
                        
                        aiOutput = retryOutput;
                        modelUsed = 'gemini30FlashPreview-retry';
                    } else {
                        throw new Error('Empty AI output from Gemini 3.0 Flash Preview');
                    }
                } else {
                    aiOutput = output;
                    modelUsed = cacheResult.cacheName ? 'gemini30FlashPreview-cached' : 'gemini30FlashPreview';
                }
                
                console.log('✅✅✅ GEMINI 3.0 FLASH PREVIEW SUCCESS!');
                console.log('📊 Response Stats:', {
                    responseTime: apiCallTime.toFixed(2) + 'ms',
                    outputLength: typeof output === 'string' ? output.length : JSON.stringify(output).length,
                    outputType: typeof output,
                    estimatedResponseTokens: typeof output === 'string' ? Math.ceil(output.length / 4) : Math.ceil(JSON.stringify(output).length / 4),
                    model: 'gemini3FlashPreview',
                    usedCache: !!cacheResult.cacheName,
                    cacheImpact: cacheResult.cacheName ? 'Prompt tokens from cache (reduced cost)' : 'Full prompt sent'
                });
                
                // Log output preview
                const outputPreview = typeof output === 'string' ? output : JSON.stringify(output);
                console.log('📝 Response Preview (first 300 chars):', outputPreview.substring(0, 300) + (outputPreview.length > 300 ? '...' : ''));
                console.log('🚀 ===== GEMINI 3.0 SUCCESS - SKIPPING FALLBACKS =====');
                
            } catch (primaryError) {
                const primaryFailTime = performance.now() - responseStartTime;
                console.error('❌❌❌ PRIMARY MODEL FAILED: GEMINI 3.0 FLASH PREVIEW');
                console.error('❌ Primary Error Details:', {
                    message: primaryError.message,
                    name: primaryError.name,
                    status: primaryError.status,
                    code: primaryError.code,
                    failureTime: primaryFailTime.toFixed(2) + 'ms',
                    requestId: requestId,
                    userId: userId,
                    timestamp: new Date().toISOString(),
                    wasUsingCache: !!cacheResult.cacheName
                });
                
                try {
                    console.log('🔄 ===== TRYING FALLBACK MODEL: GEMINI 2.5 FLASH =====');
                    console.log('📤 Initializing Gemini 2.5 Flash fallback...');
                    console.log('📊 Fallback Model Configuration:', {
                        model: 'gemini25Flash',
                        temperature: 1.1,
                        systemPromptLength: aiPrompt ? aiPrompt.length : 0,
                        userMessageLength: safeMessage.length,
                        reason: 'Primary model (Gemini 3.0) failed',
                        cacheAvailable: false // Gemini 2.5 doesn't support the same caching
                    });
                    
                    const fallbackInitStartTime = performance.now();
                    // Ensure we have a prompt for fallback (cache path may skip construction)
                    if (!aiPrompt) {
                        aiPrompt = await constructPrompt(userId, userInfo, allchatsSummary, false);
                    }
                    
                    const chat = core.ai.chat({
                        model: googleAI.model('gemini-2.5-flash'),
                        system: aiPrompt, // Use full prompt for fallback
                        tools: chatTools,
                        config: {
                            temperature: 1.1,
                        },
                    });
                    console.log('✅ Fallback chat session initialized in', (performance.now() - fallbackInitStartTime).toFixed(2), 'ms');

                    console.log('💬 Sending message to Gemini 2.5:', {
                        messagePreview: safeMessage.substring(0, 200) + (safeMessage.length > 200 ? '...' : ''),
                        fullMessageLength: safeMessage.length,
                        timestamp: new Date().toISOString()
                    });
                    
                    const fallbackApiCallStartTime = performance.now();
                    const { output } = await chat.send(messageWithContext);
                    const fallbackApiCallTime = performance.now() - fallbackApiCallStartTime;
                    
                    // Guard against null/empty outputs
                    const isEmptyFallbackOutput =
                        output == null ||
                        (typeof output === 'string' && output.trim().length === 0) ||
                        (Array.isArray(output) && output.length === 0) ||
                        (typeof output === 'object' && !Array.isArray(output) && Object.keys(output).length === 0);
                    
                    if (isEmptyFallbackOutput) {
                        throw new Error('Empty AI output from Gemini 2.5 Flash');
                    }
                    
                    aiOutput = output;
                    modelUsed = 'gemini25Flash';
                    
                    console.log('✅✅✅ GEMINI 2.5 FLASH FALLBACK SUCCESS!');
                    console.log('📊 Fallback Response Stats:', {
                        responseTime: fallbackApiCallTime.toFixed(2) + 'ms',
                        outputLength: typeof output === 'string' ? output.length : JSON.stringify(output).length,
                        outputType: typeof output,
                        estimatedResponseTokens: typeof output === 'string' ? Math.ceil(output.length / 4) : Math.ceil(JSON.stringify(output).length / 4),
                        model: 'gemini25Flash'
                    });
                    
                    const outputPreview = typeof output === 'string' ? output : JSON.stringify(output);
                    console.log('📝 Fallback Response Preview (first 300 chars):', outputPreview.substring(0, 300) + (outputPreview.length > 300 ? '...' : ''));
                    console.log('🔄 ===== GEMINI 2.5 FALLBACK SUCCESS =====');
                    
                } catch (fallbackError) {
                    const fallbackFailTime = performance.now() - responseStartTime;
                    console.error('❌❌❌ FALLBACK MODEL FAILED: GEMINI 2.5 FLASH');
                    console.error('❌ Fallback Error Details:', {
                        message: fallbackError.message,
                        name: fallbackError.name,
                        status: fallbackError.status,
                        code: fallbackError.code,
                        fallbackFailureTime: fallbackFailTime.toFixed(2) + 'ms',
                        totalFailureTime: (performance.now() - responseStartTime).toFixed(2) + 'ms',
                        requestId: requestId,
                        userId: userId,
                        timestamp: new Date().toISOString()
                    });
                    
                    console.error('❌❌❌ COMPLETE AI FAILURE - NO FALLBACK AVAILABLE');
                    throw new Error('All AI models failed');
                }
            }
            if (!aiOutput) {
                throw new Error('No AI output received from any model');
            }
            
            console.log('✅✅✅ AI MODEL SUCCESS!');
            console.log('🎆 Final AI Output received from:', modelUsed);

            const responseTime = performance.now() - responseStartTime;
            const totalTime = performance.now() - start;
            
            console.log('🎯 ===== AI MODEL PROCESSING COMPLETE =====');
            console.log('📊 Final AI Processing Summary:', {
                finalModelUsed: modelUsed,
                usedCaching: modelUsed.includes('cached'),
                aiResponseTime: (responseTime / 1000).toFixed(3) + 's',
                totalProcessingTime: (totalTime / 1000).toFixed(3) + 's',
                success: true,
                outputReceived: !!aiOutput,
                outputType: typeof aiOutput,
                requestId: requestId,
                costSavings: modelUsed.includes('cached') ? 'Significant (cached prompt tokens)' : 'None'
            });

            console.log('🔄 ===== RESPONSE PROCESSING PHASE =====');
            console.log('🧹 Processing and cleaning AI response...');

            // Handle response format (Gemini)
            let cleanedResponse;
            console.log('🔄 Processing Gemini response format...');
            cleanedResponse = cleanKommunicateResponse(aiOutput);
            
            console.log('✅ Response processing and cleaning completed!');

            // Send response to client
            console.log('📤 ===== SENDING RESPONSE TO CLIENT =====');
            res.json(cleanedResponse);
            console.log('✅✅✅ RESPONSE TRANSMITTED SUCCESSFULLY!');

            // Post-processing (non-blocking)
            setImmediate(async () => {
                console.log('🔄 ===== STARTING POST-PROCESSING =====');
                try {
                    console.log('📜 Loading conversation history...');
                    let chatHistory = await core.getConversationHistory(conversationId, userId);
                    
                    if (!Array.isArray(chatHistory)) {
                        console.log('⚠️ Chat history is not an array, initializing empty array');
                        chatHistory = [];
                    }

                    // Add user message to chat history
                    const timestampedUserSaid = `${new Date().toISOString()} - User Said: ${message}`;
                    chatHistory.push({ role: 'user', content: timestampedUserSaid });

                    // Add AI response to chat history
                    chatHistory.push({ role: 'assistant', content: aiOutput });
                    const postProcessData = await core.postProcessConversation(chatHistory, message);
                    await core.postResponseProcessing(postProcessData, userId, aiOutput, allchatsSummary, conversationId, chatHistory, JSON.stringify(aiOutput));
                    console.log('✅ Post-processing completed successfully!');
                } catch (postProcessError) {
                    console.error('❌ Post-processing failed:', postProcessError.message);
                }
            });
            
            const finalTotalTime = performance.now() - start;
            console.log('🎉 ===== COMPLETE REQUEST SUMMARY =====');
            console.log('📊 Complete Performance Metrics:', {
                requestId: requestId,
                modelUsed: modelUsed,
                usedCaching: modelUsed.includes('cached'),
                cacheStatus: cacheResult.isNewCache ? 'Created new' : (cacheResult.cacheName ? 'Used existing' : 'Not available'),
                totalRequestTime: finalTotalTime.toFixed(2) + 'ms',
                success: true
            });
            console.log('🏁 ===== REQUEST LIFECYCLE COMPLETE =====');
            return;
            
        } catch (error) {
            console.error('❌❌❌ CRITICAL REQUEST FAILURE!');
            console.error('❌❌❌ Global Error Handler Caught:', error);
            
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
        // 404 handler
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

        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('Express error handler:', error);
            
            res.status(500).json({
                error: true,
                message: 'Internal server error',
                requestId: req.headers['x-request-id'] || 'unknown',
                timestamp: new Date().toISOString()
            });
        });

        // Unhandled promise rejections (Cloud Run friendly)
        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Promise Rejection:', {
                reason: reason?.message || reason,
                stack: reason?.stack,
                promise: promise.toString()
            });
        });

        // Uncaught exceptions (Cloud Run friendly)
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', {
                error: error.message,
                stack: error.stack
            });
            // In Cloud Run, don't call process.exit(1) immediately
            // Let the container restart naturally
        });
    }

    setupGracefulShutdown() {
        // Cloud Run sends SIGTERM for graceful shutdown
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
        
        // Stop accepting new connections
        if (this.server) {
            this.server.close(() => {
                console.log('HTTP server closed');
            });
        }

        // Close database connections
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
        // Wait for initialization to complete
        await this.initPromise;
        
        this.server = this.app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Myavana Chatbot Server running on port ${port}`, {
                port,
                environment: process.env.NODE_ENV || 'production',
                version: require('../package.json').version,
                timestamp: new Date().toISOString()
            });
        });

        return this.server;
    }

    // For Cloud Run inline function usage
    getHandler() {
        return this.app;
    }
}

// Export for use as module
module.exports = MyavanaChatbotServer;

// For Cloud Run inline function
module.exports.myavanaHandler = async (req, res) => {
    if (!global.myavanaServerInstance) {
        global.myavanaServerInstance = new MyavanaChatbotServer();
        await global.myavanaServerInstance.initPromise;
    }
    
    return global.myavanaServerInstance.app(req, res);
};

// Start server if this file is run directly
if (require.main === module) {
    const server = new MyavanaChatbotServer();
    server.start();
}
