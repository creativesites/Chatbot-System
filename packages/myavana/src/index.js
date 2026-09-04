// Cloud Run compatible MyavanaChatbotServer
const core = require('myavana-bot-test-core');
const express = require('express');
const { performance } = require('perf_hooks');
const { constructPrompt } = require('./constructPrompt');
const { handleWelcomeEvent, handleImageMessage } = require('./eventHandlers');
const { buildMessageContext } = require('myavana-bot-test-core/src/messageContextBuilder');
const { globalTools, createUserTools } = require('myavana-bot-test-core/src/agentTools');
const {
    encodeFrame,
    createDeltaFrame,
    createBlockFrame,
    createActionFrame,
    createDoneFrame,
    createErrorFrame,
    parseModelOutput,
} = require('../../chat-protocol/src');
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

            // Initialize databases — must actually connect, not just check the client
            // objects exist. Without this, every request that touches Postgres/Redis
            // (getUserDetails, getAllConversationsSummary, funnel events, etc.) fails
            // with "ClientClosedError: The client is closed".
            await core.connectDatabases();
            console.log('✅ Database connections established');

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

        // Streaming chat endpoint — for the self-hosted web widget only.
        // Kommunicate/mobile keep using the blocking routes above, untouched.
        this.app.post('/chat/stream', async (req, res) => {
            console.log('📡 Received POST request to /chat/stream');
            await this.handleStreamChatRequest(req, res);
        });

        // Funnel-event logging — for the widget to report conversion milestones.
        this.app.post('/events', async (req, res) => {
            await this.handleEventRequest(req, res);
        });

        // Speech-to-Text audio transcription endpoint (gemini-3.5-transcribe)
        this.app.post('/audio/transcribe', async (req, res) => {
            console.log('🎙️ Received POST request to /audio/transcribe');
            await this.handleAudioTranscribeRequest(req, res);
        });

        // Live Voice Chat session commit endpoint (persists live transcripts to DB & history)
        this.app.post('/chat/live/commit', async (req, res) => {
            console.log('💾 Received POST request to /chat/live/commit');
            await this.handleLiveVoiceCommitRequest(req, res);
        });

        // Conversation History & Session Management
        this.app.get('/conversations', async (req, res) => {
            const userId = req.query.userId || req.headers['x-user-id'];
            if (!userId) {
                return res.status(400).json({ error: true, message: 'userId is required' });
            }
            try {
                const list = await core.getUserConversationsList(String(userId));
                return res.json({ success: true, conversations: list || [] });
            } catch (err) {
                console.error('Error fetching conversations:', err);
                return res.status(500).json({ error: true, message: err.message });
            }
        });

        this.app.get('/conversations/:id', async (req, res) => {
            const userId = req.query.userId || req.headers['x-user-id'];
            const conversationId = req.params.id;
            if (!userId || !conversationId) {
                return res.status(400).json({ error: true, message: 'userId and conversationId are required' });
            }
            try {
                const history = await core.getConversationHistory(conversationId, String(userId));
                return res.json({ success: true, conversationId, chatHistory: history || [] });
            } catch (err) {
                console.error('Error fetching conversation history:', err);
                return res.status(500).json({ error: true, message: err.message });
            }
        });

        this.app.post('/conversations/new', async (req, res) => {
            const newId = (globalThis.crypto && globalThis.crypto.randomUUID)
                ? globalThis.crypto.randomUUID()
                : `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            return res.json({ success: true, conversationId: newId });
        });

        console.log('✅ Routes configured successfully!');
        console.log('🛣️ Available routes:');
        console.log('   GET  /             - Service information');
        console.log('   GET  /health       - Health check');
        console.log('   GET  /healthz      - Health check (K8s style)');
        console.log('   POST /             - Main chat endpoint');
        console.log('   POST /webhook      - Webhook chat endpoint');
        console.log('   POST /myavana      - Legacy chat endpoint');
        console.log('   POST /chat         - Alternative chat endpoint');
        console.log('   POST /chat/stream  - Streaming chat endpoint (widget)');
        console.log('   POST /events       - Funnel-event logging (widget)');
        console.log('   POST /audio/transcribe - Audio transcription (gemini-3.5-transcribe)');
        console.log('   POST /chat/live/commit - Commit live voice session to history');
        console.log('   GET  /conversations - List user past conversations');
        console.log('   GET  /conversations/:id - Retrieve specific conversation turns');
        console.log('   POST /conversations/new - Generate fresh conversation session');
    }

    /**
     * Shared setup for a chat turn: checks/refreshes the Gemini context cache,
     * (re)builds the system prompt when needed, builds the per-message dynamic
     * context (persona/trend/driver/memory), assembles tools, and creates the
     * Genkit chat session. Used by both the blocking (Kommunicate/mobile) and
     * streaming (widget) routes — only what they do with `chat` differs.
     *
     * @param {object} opts
     * @param {string} opts.userId
     * @param {string} opts.allchatsSummary
     * @param {object} opts.userInfo
     * @param {object} opts.session - Genkit session (from core.ai.loadSession)
     * @param {Array}  opts.chatHistory
     * @param {string} opts.safeMessage
     * @param {'kommunicate'|'widget'} [opts.channel='kommunicate']
     * @param {object} [opts.experienceContext]
     * @returns {Promise<{chat: object, messageWithContext: string, cacheResult: object, aiPrompt: string|null, chatTools: Array, messageContext: string}>}
     */
    async prepareChatTurn({ userId, allchatsSummary, userInfo, session, chatHistory, safeMessage, channel = 'kommunicate', experienceContext }) {
        // widget-channel prompts use a different output-format instruction (plain text vs
        // Kommunicate JSON), so they must not share a cache slot with the kommunicate channel
        const cacheKey = channel === 'widget' ? `${userId}_widget` : userId;

        console.log('🔍 Checking cache validity...', { channel, cacheKey });
        const cacheCheckStart = performance.now();
        const cacheStatus = await core.cacheManager.checkCacheValidity(cacheKey);
        console.log('✅ Cache check complete:', (performance.now() - cacheCheckStart).toFixed(0), 'ms', cacheStatus);

        let aiPrompt = null;
        let cacheResult = null;

        if (!cacheStatus.hasValidCache) {
            console.log('🧠 No valid cache - constructing prompt...');
            aiPrompt = await constructPrompt(userId, userInfo, allchatsSummary, false, channel);
            cacheResult = await core.cacheManager.getOrCreateCache(cacheKey, aiPrompt);
            console.log('✅ Cache ready');
        } else {
            console.log('✅ Valid cache exists - skipping prompt construction!');
            cacheResult = { cacheName: cacheStatus.cacheName, isNewCache: false };

            if (cacheStatus.needsRefresh) {
                console.log('🔄 Scheduling background cache refresh');
                setImmediate(async () => {
                    try {
                        const freshPrompt = await constructPrompt(userId, userInfo, allchatsSummary, false, channel);
                        await core.cacheManager.getOrCreateCache(cacheKey, freshPrompt);
                        console.log('✅ Background cache refresh complete');
                    } catch (error) {
                        console.error('❌ Background cache refresh failed:', error.message);
                    }
                });
            }
        }

        // Build per-message dynamic context (persona, trends, driver, memory, experienceContext)
        // Prepended to the user message — keeps the 24h cached system prompt intact
        const messageContext = await buildMessageContext(userId, chatHistory, safeMessage, experienceContext);
        const messageWithContext = messageContext ? `${messageContext}${safeMessage}` : safeMessage;
        if (messageContext) console.log('🎭 Context injected:', messageContext.trim());

        // Assemble tools for this request: global (searchServices, lookupFAQ)
        // + per-user dynamic tools (saveHairGoal, getUserHairProfile)
        const chatTools = [...globalTools, ...createUserTools(userId)];

        const chatConfig = {
            model: 'gemini-3.7-flash',
            tools: chatTools,
            config: { temperature: 1.1 },
        };
        const chat = cacheResult.cacheName
            ? session.chat({ ...chatConfig, cache: cacheResult.cacheName })
            : session.chat({ ...chatConfig, system: aiPrompt });

        return { chat, messageWithContext, cacheResult, aiPrompt, chatTools, messageContext };
    }

    /**
     * Sends messageWithContext on the primary model (with cache-retry-on-empty-output),
     * falling back to the secondary model on any failure. Blocking — returns the final
     * output. Used by the non-streaming routes; the streaming route uses this only for
     * its fallback branch (sendStream failures fall back to a single blocking response).
     *
     * @param {object} opts
     * @returns {Promise<{aiOutput: any, modelUsed: string}>}
     */
    async sendWithFallback({ chat, messageWithContext, safeMessage, cacheResult, aiPrompt, chatTools, userId, userInfo, allchatsSummary, session, channel = 'kommunicate' }) {
        let aiOutput = null;
        let modelUsed = '';

        try {
            console.log('🚀 ===== TRYING PRIMARY MODEL: GEMINI 3.7 FLASH WITH CACHE =====');
            const { output } = await chat.send(messageWithContext);

            const isEmptyOutput =
                output == null ||
                (typeof output === 'string' && output.trim().length === 0) ||
                (Array.isArray(output) && output.length === 0) ||
                (typeof output === 'object' && !Array.isArray(output) && Object.keys(output).length === 0);

            if (isEmptyOutput) {
                if (cacheResult.cacheName) {
                    console.warn('⚠️ Empty output with cache. Retrying without cache...');
                    if (!aiPrompt) {
                        aiPrompt = await constructPrompt(userId, userInfo, allchatsSummary, false, channel);
                    }
                    const retryChat = session.chat({
                        model: 'gemini-3.7-flash',
                        system: aiPrompt,
                        tools: chatTools,
                        config: { temperature: 1.1 },
                    });
                    const { output: retryOutput } = await retryChat.send(messageWithContext);

                    const isEmptyRetryOutput =
                        retryOutput == null ||
                        (typeof retryOutput === 'string' && retryOutput.trim().length === 0) ||
                        (Array.isArray(retryOutput) && retryOutput.length === 0) ||
                        (typeof retryOutput === 'object' && !Array.isArray(retryOutput) && Object.keys(retryOutput).length === 0);

                    if (isEmptyRetryOutput) {
                        throw new Error('Empty AI output from Gemini 3.7 (retry without cache)');
                    }

                    aiOutput = retryOutput;
                    modelUsed = 'gemini37Flash-retry';
                } else {
                    throw new Error('Empty AI output from Gemini 3.7 Flash');
                }
            } else {
                aiOutput = output;
                modelUsed = cacheResult.cacheName ? 'gemini37Flash-cached' : 'gemini37Flash';
            }
            console.log('✅✅✅ GEMINI 3.7 FLASH SUCCESS!');
        } catch (primaryError) {
            console.error('❌❌❌ PRIMARY MODEL FAILED: GEMINI 3.7 FLASH:', primaryError.message);
            ({ aiOutput, modelUsed } = await this.sendFallbackModel({
                messageWithContext, aiPrompt, chatTools, userId, userInfo, allchatsSummary, channel,
            }));
        }

        if (!aiOutput) {
            throw new Error('No AI output received from any model');
        }

        return { aiOutput, modelUsed };
    }

    /**
     * Sends messageWithContext on the secondary model only (Gemini 3.6 Flash, no cache).
     * Extracted so both sendWithFallback's catch branch and the streaming route's
     * sendStream-failure branch can reach the fallback model without redundantly
     * retrying the primary model first.
     *
     * @param {object} opts
     * @returns {Promise<{aiOutput: any, modelUsed: string}>}
     */
    async sendFallbackModel({ messageWithContext, aiPrompt, chatTools, userId, userInfo, allchatsSummary, channel = 'kommunicate' }) {
        if (!aiPrompt) {
            aiPrompt = await constructPrompt(userId, userInfo, allchatsSummary, false, channel);
        }

        const candidateModels = ['gemini-flash-lite-latest', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
        for (const candidate of candidateModels) {
            console.log(`🔄 ===== TRYING FALLBACK MODEL: ${candidate.toUpperCase()} =====`);
            try {
                const fallbackChat = core.ai.chat({
                    model: candidate,
                    system: aiPrompt,
                    tools: chatTools,
                    config: { temperature: 1.0 },
                });
                const response = await fallbackChat.send(messageWithContext);
                const output = channel === 'widget' ? response.text : response.output;

                const isEmptyFallbackOutput =
                    output == null ||
                    (typeof output === 'string' && output.trim().length === 0) ||
                    (Array.isArray(output) && output.length === 0) ||
                    (typeof output === 'object' && !Array.isArray(output) && Object.keys(output).length === 0);

                if (!isEmptyFallbackOutput) {
                    console.log(`✅✅✅ ${candidate.toUpperCase()} FALLBACK SUCCESS!`);
                    return { aiOutput: output, modelUsed: candidate };
                }
            } catch (fallbackError) {
                console.error(`❌❌❌ FALLBACK MODEL FAILED: ${candidate.toUpperCase()}:`, fallbackError.message);
            }
        }
        throw new Error('All AI models failed');
    }

    /**
     * Shared post-processing after a turn's response has been sent: updates
     * conversation history, extracts hair issues/profile updates, and extracts
     * durable Local Agent Memory facts. Non-blocking — call via setImmediate.
     *
     * @param {object} opts
     */
    async runPostProcessing({ userId, conversationId, message, aiOutput, allchatsSummary }) {
        console.log('🔄 ===== STARTING POST-PROCESSING =====');
        try {
            let chatHistory = await core.getConversationHistory(conversationId, userId);
            if (!Array.isArray(chatHistory)) {
                chatHistory = [];
            }

            const timestampedUserSaid = `${new Date().toISOString()} - User Said: ${message}`;
            chatHistory.push({ role: 'user', content: timestampedUserSaid });
            chatHistory.push({ role: 'assistant', content: aiOutput });

            const postProcessData = await core.postProcessConversation(chatHistory, message);
            await core.postResponseProcessing(postProcessData, userId, aiOutput, allchatsSummary, conversationId, chatHistory, JSON.stringify(aiOutput));

            // Local Agent Memory extraction — independent of the rest of post-processing
            await core.extractAndStoreMemories(userId, conversationId, chatHistory);

            console.log('✅ Post-processing completed successfully!');
        } catch (postProcessError) {
            console.error('❌ Post-processing failed:', postProcessError.message);
        }
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
            const { message, from, userId: bodyUserId, groupId, conversationId: bodyConvId, eventName, metadata, experienceContext } = req.body;
            const userId = from || bodyUserId || (experienceContext && (experienceContext.wpUserId || experienceContext.userId)) || 'guest';
            const conversationId = groupId || bodyConvId || (experienceContext && experienceContext.conversationId) || 'conv_default';
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
                    console.log('🏁 ===== IMAGE REQUEST COMPLETED =====');
                    return;
                }
            }

            // ===== SHARED CHAT-TURN SETUP (cache, prompt, context, tools) =====
            const { chat, messageWithContext, cacheResult, aiPrompt, chatTools } = await this.prepareChatTurn({
                userId, allchatsSummary, userInfo, session, chatHistory, safeMessage, channel: 'kommunicate',
            });

            // ===== AI MODEL PROCESSING (primary + fallback) =====
            console.log('🤖 ===== AI MODEL PROCESSING PHASE =====');
            let responseStartTime = performance.now();

            const { aiOutput, modelUsed } = await this.sendWithFallback({
                chat, messageWithContext, safeMessage, cacheResult,
                aiPrompt, chatTools,
                userId, userInfo, allchatsSummary, session, channel: 'kommunicate',
            });

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
            setImmediate(() => this.runPostProcessing({ userId, conversationId, message, aiOutput, allchatsSummary }));

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

    /**
     * Streaming chat endpoint for the self-hosted web widget. One HTTP request per
     * turn, held open just long enough to stream one AI response (fetch + ReadableStream
     * on the client, not a persistent WebSocket) — see the Phase 1 architecture plan for
     * why this avoids Cloud Run session-affinity/timeout complications. Falls back to a
     * single blocking response (written as one chunk) if the primary streaming call fails.
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async handleStreamChatRequest(req, res) {
        const requestId = Math.random().toString(36).substr(2, 9);
        console.log('🚀 ===== NEW STREAM REQUEST START =====', requestId);

        try {
            let { message, from, userId: bodyUserId, groupId, conversationId: bodyConvId, eventName, experienceContext } = req.body;
            let userId = from || bodyUserId || (experienceContext && (experienceContext.wpUserId || experienceContext.userId)) || 'guest';
            let conversationId = groupId || bodyConvId || (experienceContext && experienceContext.conversationId) || 'conv_default';
            const safeMessage = message || '';

            const acceptsNDJSON =
                (req.headers['accept'] && req.headers['accept'].includes('application/x-ndjson')) ||
                req.query?.format === 'ndjson' ||
                req.body?.format === 'ndjson';

            const contentType = acceptsNDJSON ? 'application/x-ndjson; charset=utf-8' : 'text/plain; charset=utf-8';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering so chunks flush immediately
            if (res.flushHeaders) res.flushHeaders();

            if (eventName === 'WELCOME') {
                const welcomeText = "Hey there! I'm Mya, your MYAVANA Hair AI guide. What can I help you with today?";
                if (acceptsNDJSON) {
                    res.write(encodeFrame(createDeltaFrame(welcomeText)));
                    res.write(encodeFrame(createDoneFrame({ eventName: 'WELCOME' })));
                } else {
                    res.write(welcomeText);
                }
                return res.end();
            }

            if (eventName === 'KOMMUNICATE_MEDIA_EVENT') {
                const mediaMsg = "I can't analyze images in this chat yet — that's coming soon! In the meantime, tell me about your hair and I'll do my best to help.";
                if (acceptsNDJSON) {
                    res.write(encodeFrame(createDeltaFrame(mediaMsg)));
                    res.write(encodeFrame(createDoneFrame({ eventName: 'KOMMUNICATE_MEDIA_EVENT' })));
                } else {
                    res.write(mediaMsg);
                }
                return res.end();
            }

            const [allchatsSummary, userInfo, session] = await Promise.all([
                core.getAllConversationsSummary(userId),
                core.getUserDetails(userId),
                core.ai.loadSession(userId, { store: new core.DatabaseSessionStore() }),
            ]);

            let chatHistory = await core.getConversationHistory(conversationId, userId);
            if (!Array.isArray(chatHistory)) chatHistory = [];

            const { chat, messageWithContext, aiPrompt, chatTools } = await this.prepareChatTurn({
                userId, allchatsSummary, userInfo, session, chatHistory, safeMessage, channel: 'widget', experienceContext,
            });

            let aiOutput = '';
            let modelUsed = 'gemini37Flash-stream';
            let streamedText = '';
            let anyChunkWritten = false;

            try {
                console.log('🚀 ===== STREAMING PRIMARY MODEL: GEMINI 3.7 FLASH =====');
                const { stream, response } = chat.sendStream(messageWithContext);
                for await (const chunk of stream) {
                    if (chunk.text) {
                        if (acceptsNDJSON) {
                            res.write(encodeFrame(createDeltaFrame(chunk.text)));
                        } else {
                            res.write(chunk.text);
                        }
                        streamedText += chunk.text;
                        anyChunkWritten = true;
                    }
                }
                const finalResponse = await response;
                aiOutput = finalResponse?.text ?? (typeof finalResponse?.output === 'string' ? finalResponse.output : '') ?? streamedText;
                if (!aiOutput) throw new Error('Empty streamed output from Gemini 3.7 Flash');
                console.log('✅✅✅ STREAM SUCCESS!');

                // If client requested NDJSON, parse and emit structured semantic blocks or quick-replies
                if (acceptsNDJSON) {
                    // Emit any blocks returned directly by tools
                    if (finalResponse?.toolBlocks && Array.isArray(finalResponse.toolBlocks)) {
                        for (const toolBlock of finalResponse.toolBlocks) {
                            res.write(encodeFrame(createBlockFrame(toolBlock)));
                        }
                    }

                    const parsed = parseModelOutput(aiOutput);
                    for (const block of parsed.blocks) {
                        if (block.type !== 'text') {
                            res.write(encodeFrame(createBlockFrame(block)));
                        }
                    }
                    if (parsed.quickReplies && parsed.quickReplies.length > 0) {
                        res.write(encodeFrame(createActionFrame(parsed.quickReplies)));
                    }
                    res.write(encodeFrame(createDoneFrame({ 
                        modelUsed, 
                        blocksCount: (parsed.blocks.length || 0) + (finalResponse?.toolBlocks?.length || 0) 
                    })));
                }
            } catch (streamError) {
                console.error('❌ Streaming primary model failed:', streamError.message);
                if (anyChunkWritten) {
                    console.warn('⚠️ Partial stream already sent to client — not falling back, ending with partial content.');
                    aiOutput = streamedText;
                    modelUsed = 'gemini37Flash-stream-partial';
                    if (acceptsNDJSON) {
                        res.write(encodeFrame(createDoneFrame({ modelUsed, error: streamError.message })));
                    }
                } else {
                    console.log('🔄 No content sent yet — falling back to Gemini 3.6 Flash.');
                    const fallback = await this.sendFallbackModel({
                        messageWithContext, aiPrompt, chatTools, userId, userInfo, allchatsSummary, channel: 'widget',
                    });
                    aiOutput = fallback.aiOutput;
                    modelUsed = fallback.modelUsed;
                    if (acceptsNDJSON) {
                        res.write(encodeFrame(createDeltaFrame(aiOutput)));
                        const parsed = parseModelOutput(aiOutput);
                        for (const block of parsed.blocks) {
                            if (block.type !== 'text') {
                                res.write(encodeFrame(createBlockFrame(block)));
                            }
                        }
                        if (parsed.quickReplies && parsed.quickReplies.length > 0) {
                            res.write(encodeFrame(createActionFrame(parsed.quickReplies)));
                        }
                        res.write(encodeFrame(createDoneFrame({ modelUsed, fallback: true })));
                    } else {
                        res.write(aiOutput);
                    }
                }
            }

            res.end();
            console.log('🏁 ===== STREAM REQUEST COMPLETE =====', requestId, modelUsed);

            setImmediate(() => this.runPostProcessing({ userId, conversationId, message, aiOutput, allchatsSummary }));
        } catch (error) {
            console.error('❌❌❌ STREAM REQUEST FAILURE!', error);
            if (!res.headersSent) {
                res.status(500).json({ error: true, message: 'Internal server error - chatbot temporarily unavailable' });
            } else {
                res.end();
            }
        }
    }

    /**
     * Logs a D2C funnel milestone reported by the widget (intake_completed,
     * paywall_shown, purchase_completed, hhcp_delivered, consult_triaged).
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async handleEventRequest(req, res) {
        try {
            const { userId, conversationId, eventType, metadata } = req.body;
            if (!userId || !eventType) {
                return res.status(400).json({ error: true, message: 'userId and eventType are required' });
            }
            await core.logFunnelEvent(userId, conversationId, eventType, metadata || {});
            res.status(204).end();
        } catch (error) {
            console.error('❌ Failed to log funnel event:', error);
            res.status(500).json({ error: true, message: 'Internal server error' });
        }
    }

    /**
     * Handles audio transcription requests using gemini-3.5-transcribe
     * with domain vocabulary speech biasing and automatic fallback.
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async handleAudioTranscribeRequest(req, res) {
        try {
            const { audio, audioData, mimeType = 'audio/webm', customVocabulary = [] } = req.body;
            const rawData = audio || audioData;
            if (!rawData) {
                return res.status(400).json({ error: true, message: 'Audio payload (base64 string) is required' });
            }

            const cleanBase64 = rawData.replace(/^data:audio\/[a-zA-Z0-9.\-_]+;base64,/, '');
            const result = await core.ai.transcribeAudio({
                audioData: cleanBase64,
                mimeType,
                customVocabulary,
            });

            return res.json({
                success: true,
                text: result.text,
                modelUsed: result.modelUsed,
            });
        } catch (error) {
            console.error('❌ Audio transcription endpoint error:', error);
            return res.status(500).json({
                error: true,
                message: error.message || 'Audio transcription temporarily unavailable',
            });
        }
    }

    /**
     * Commits completed turns from a Gemini Mobile App-Style Live Voice Chat session
     * into PostgreSQL conversation history, links to WordPress, and runs post-processing.
     *
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
    async handleLiveVoiceCommitRequest(req, res) {
        try {
            const { userId, conversationId } = req.body;
            const turns = req.body.turns || req.body.transcript || [];
            if (!userId || !conversationId) {
                return res.status(400).json({ error: true, message: 'userId and conversationId are required' });
            }

            console.log(`💾 Committing Live Voice session: ${turns.length} turns for user ${userId}`);
            let chatHistory = await core.getConversationHistory(conversationId, userId);
            if (!Array.isArray(chatHistory)) chatHistory = [];

            for (const turn of turns) {
                const userContent = turn.user || (turn.role === 'user' ? turn.content : null);
                const assistantContent = turn.assistant || (turn.role === 'assistant' ? turn.content : null);
                if (userContent) {
                    chatHistory.push({
                        role: 'user',
                        content: `${new Date().toISOString()} - User (Voice): ${userContent}`
                    });
                }
                if (assistantContent) {
                    chatHistory.push({
                        role: 'assistant',
                        content: assistantContent
                    });
                }
            }

            if (turns.length > 0) {
                await core.saveConversation(conversationId, userId, chatHistory, 'Live Voice Hair Consultation');
            }

            // Non-blocking background post-processing on the latest turn
            if (turns.length > 0) {
                const lastTurn = turns[turns.length - 1];
                const lastUserMsg = lastTurn.user || (lastTurn.role === 'user' ? lastTurn.content : 'Live Voice Session');
                const lastAssistantMsg = lastTurn.assistant || (lastTurn.role === 'assistant' ? lastTurn.content : '');
                setImmediate(async () => {
                    try {
                        const allchatsSummary = await core.getAllConversationsSummary(userId);
                        await this.runPostProcessing({
                            userId,
                            conversationId,
                            message: lastUserMsg,
                            aiOutput: lastAssistantMsg,
                            allchatsSummary,
                        });
                    } catch (err) {
                        console.error('❌ Live Voice post-processing error:', err.message);
                    }
                });
            }

            return res.json({
                success: true,
                committedTurns: turns.length,
                totalHistoryLength: chatHistory.length
            });
        } catch (error) {
            console.error('❌ Live Voice commit error:', error);
            return res.status(500).json({ error: true, message: error.message });
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
