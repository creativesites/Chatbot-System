// Cloud Run compatible MyavanaChatbotServer
const core = require('myavana-bot-test-core');
const express = require('express');
const { performance } = require('perf_hooks');
const { constructPrompt } = require('./constructPrompt');
const { handleWelcomeEvent, handleImageMessage } = require('./eventHandlers');
const { buildMessageContext } = require('myavana-bot-test-core/src/messageContextBuilder');
const { globalTools, createUserTools } = require('myavana-bot-test-core/src/agentTools');
const { HairJourneyService } = require('myavana-bot-test-core/src/hairJourney/hairJourneyService');
const { HairMediaService } = require('myavana-bot-test-core/src/hairMedia/hairMediaService');
const { extractImageAttachments } = require('myavana-bot-test-core/src/imageAttachments');
const {
    loadServiceCatalog, enrichProductBlock, productCardKey, collectShownProductKeys,
    shouldOfferStoreLink, buildStoreLinkBlock, repairStoreLinks, PRODUCT_BLOCK_TYPES, STORE_URL,
} = require('myavana-bot-test-core/src/serviceCatalog');
const {
    encodeFrame,
    createDeltaFrame,
    createBlockFrame,
    createActionFrame,
    createDoneFrame,
    createErrorFrame,
    parseModelOutput,
} = require('./chatProtocol');
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

/**
 * Removes a trailing ```mya-blocks ... ``` fence (and any stray fence markers)
 * from model prose so the structured JSON never reaches the member as visible
 * chat text. The blocks themselves are emitted separately as NDJSON frames.
 *
 * @param {string} text
 * @returns {string}
 */
function stripBlocksFence(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/```(?:json|mya-blocks|mya|blocks)?\s*[\s\S]*?```/gi, '')
        .replace(/```(?:json|mya-blocks|mya|blocks)?\s*[\s\S]*$/i, '')
        .trim();
}

/**
 * True for upstream errors that are worth retrying as-is.
 *
 * gemini-3.7-flash returns a 503 UNAVAILABLE ("This model is currently
 * experiencing high demand... Please try again later") on a meaningful share
 * of requests. Falling straight through to the fallback chain on one of those
 * is a real quality loss - the fallback models skip tools and fabricate image
 * URLs - so a transient capacity error earns one more attempt at the primary.
 *
 * Deliberately narrow: quota exhaustion, auth failures and bad requests are
 * NOT retryable and must fall through immediately.
 */
function isRetryableModelError(error) {
    const text = `${error?.message || ''} ${error?.status || ''} ${error?.code || ''}`;
    if (/RESOURCE_EXHAUSTED|PERMISSION_DENIED|quota|INVALID_ARGUMENT|NOT_FOUND|401|403|404|429/i.test(text)) {
        return false;
    }
    return /\b503\b|UNAVAILABLE|Service Unavailable|high demand|\b500\b|\b502\b|\b504\b|ETIMEDOUT|ECONNRESET/i.test(text);
}

/**
 * Block types whose whole point is the picture. A wrong image on one of these
 * is a trust failure, not a cosmetic one.
 */
const VISUAL_BLOCK_TYPES = new Set(['hairstyle_card', 'media_card']);

/**
 * Replace or remove fabricated imagery on a visual block.
 *
 * The model is told to call searchHairMedia and use the URLs it returns, but
 * the weaker fallback models routinely skip the tool and invent a plausible
 * looking URL instead - a MYAVANA marketing banner showed up captioned as
 * "Box Braids". Rather than trusting the model, every visual block's image is
 * checked against the verified catalog here:
 *
 *   1. URL is in the catalog  -> pass through untouched.
 *   2. URL is not in the catalog but the title matches a catalog asset
 *      -> swap in the real asset's image and attribution.
 *   3. Neither -> drop the image so the card renders text-only.
 *
 * Never show a picture we cannot vouch for.
 *
 * @param {object} block a parsed block, possibly with a fabricated image
 * @returns {object|null} the sanitized block, or null if it should not be sent
 */
function sanitizeVisualBlock(block) {
    if (!block || !VISUAL_BLOCK_TYPES.has(block.type)) return block;

    const data = block.data || {};
    const imageUrl = data.imageUrl || data.image || data.mediaUrl || data.thumbnailUrl;
    if (!imageUrl) return block;

    try {
        if (HairMediaService.isVerifiedImageUrl(imageUrl)) return block;

        const label = data.title || data.caption || data.name || '';
        const match = HairMediaService.findAssetForText(label);
        if (match) {
            console.warn(
                `🖼️  Unverified image on ${block.type} ("${label}") replaced with catalog asset ${match.id}`
            );
            const repaired = HairMediaService.formatMediaBlock(match, block.type);
            // Keep the model's own copy - it is written for this conversation -
            // but take every image and attribution field from the catalog.
            return {
                ...repaired,
                id: block.id || repaired.id,
                data: { ...repaired.data, title: data.title || repaired.data.title, caption: data.caption || repaired.data.caption },
            };
        }

        console.warn(`🖼️  Unverified image on ${block.type} ("${label}") dropped - no catalog match`);
        const stripped = { ...block, data: { ...data } };
        delete stripped.data.imageUrl;
        delete stripped.data.image;
        delete stripped.data.mediaUrl;
        delete stripped.data.thumbnailUrl;
        return stripped;
    } catch (err) {
        // A guard that throws must not take the response down with it.
        console.error('sanitizeVisualBlock error:', err.message);
        return block;
    }
}

/**
 * Links a navigation card may open. The model writes these URLs itself, and it
 * has already shown it will invent plausible-looking ones.
 */
const ALLOWED_NAVIGATION_LINKS = [
    /^https:\/\/(?:www\.)?myavana\.com(?:[/?#]|$)/i,
    /^https:\/\/myavana\.refersion\.com(?:[/?#]|$)/i,
    /^https:\/\/apps\.apple\.com\/[^?#]*myavana/i,
    /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.myavana\b/i,
];

/**
 * A "Shop" / "Store" navigation card always opens the real store front, no
 * matter what URL the model wrote. Any other off-site link is removed, so the
 * card falls back to its in-widget screen rather than sending the member to
 * a page we cannot vouch for.
 *
 * @param {object} block a navigation block
 * @returns {object}
 */
function sanitizeNavigationBlock(block) {
    const data = block.data || {};
    const label = `${data.title || ''} ${data.label || ''}`;
    if (/\b(shop|store)\b/i.test(label)) {
        return { ...block, data: { ...data, url: STORE_URL } };
    }
    if (!data.url || ALLOWED_NAVIGATION_LINKS.some((re) => re.test(String(data.url)))) return block;

    console.warn(`🧭 Removed off-site navigation link "${data.url}" from "${label.trim()}"`);
    const stripped = { ...block, data: { ...data } };
    delete stripped.data.url;
    return stripped;
}

/** Text fields on a block that are shown to the member. */
const BLOCK_TEXT_FIELDS = ['title', 'name', 'caption', 'description', 'reason', 'label'];

function decodeHtmlEntities(value) {
    // &amp; last, so "&amp;lt;" becomes the literal text "&lt;", not "<".
    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
}

/**
 * Undo HTML escaping the model copies into card text. The widget used to send
 * escaped titles back as messages ("Moisture &amp; Repair"), they landed in
 * chat history, and the model reproduced them - a card rendered as
 * "4C Coils &amp; Texture". The widget escapes on render, so plain text is
 * both correct and safe here.
 */
function decodeBlockText(block) {
    if (!block || !block.data || typeof block.data !== 'object') return block;
    let changed = false;
    const data = { ...block.data };
    for (const field of BLOCK_TEXT_FIELDS) {
        if (typeof data[field] === 'string' && /&(?:amp|lt|gt|quot|#39);/.test(data[field])) {
            data[field] = decodeHtmlEntities(data[field]);
            changed = true;
        }
    }
    return changed ? { ...block, data } : block;
}

/**
 * Every guard a block passes through before it reaches the member: visual
 * blocks get their imagery verified, product/service cards get rebuilt from
 * the catalog. Returns null when a block must not be sent at all.
 *
 * @param {object} block
 * @param {object[]} serviceCatalog rows from loadServiceCatalog()
 * @param {Set<string>} [shownProductKeys] products already shown in this
 *   conversation; a repeat is skipped, and each card sent is added so the
 *   same response cannot carry it twice either
 * @returns {object|null}
 */
function sanitizeBlock(block, serviceCatalog, shownProductKeys) {
    const visual = sanitizeVisualBlock(block);
    if (!visual) return null;
    if (visual.type === 'navigation') return sanitizeNavigationBlock(visual);
    try {
        const grounded = enrichProductBlock(visual, serviceCatalog);
        if (!grounded) {
            const label = visual.data?.name || visual.data?.title || '';
            console.warn(`🛍️  Dropped ${visual.type} "${label}" - not in the product/service catalog`);
            return null;
        }
        const key = shownProductKeys ? productCardKey(grounded, serviceCatalog) : null;
        if (key) {
            if (shownProductKeys.has(key)) {
                console.warn(`🔁 Skipped repeat ${grounded.type} "${grounded.data?.name || key}" - already shown in this conversation`);
                return null;
            }
            shownProductKeys.add(key);
        }
        return grounded;
    } catch (err) {
        console.error('enrichProductBlock error:', err.message);
        return visual;
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

        // Prompt Cache Invalidation & Hot-Reload (invoked by Dashboard when Candace saves directives)
        this.app.post('/admin/cache/invalidate', async (req, res) => {
            console.log('🔄 Received prompt cache invalidation request from Dashboard');
            try {
                if (core.cacheManager && typeof core.cacheManager.invalidateAllCaches === 'function') {
                    await core.cacheManager.invalidateAllCaches();
                }
                return res.json({
                    success: true,
                    message: 'Prompt cache purged successfully. Active master directives are now live.',
                    timestamp: new Date().toISOString(),
                });
            } catch (err) {
                console.error('Error clearing prompt cache:', err);
                return res.status(500).json({ error: true, message: err.message });
            }
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

        // Direct, non-conversational access to real Hair Journey journal data.
        // The chat/stream path routes entry creation through model tool-calling,
        // which was found to unreliably execute (confident false "logged it"
        // claims with no actual write - see TASK_HJ_025 task_notes, reproduced
        // twice against staging). These bypass the model entirely for the
        // mobile app's dedicated timeline UI, calling the same
        // HairJourneyService the tools use, so reads/writes are guaranteed to
        // actually happen rather than depending on the model choosing to call
        // the right tool.
        const hairJourneyService = new HairJourneyService();

        this.app.get('/journal/entries', async (req, res) => {
            const userId = req.query.userId || req.headers['x-user-id'];
            if (!userId) {
                return res.status(400).json({ error: true, message: 'userId is required' });
            }
            try {
                const perPage = req.query.perPage ? parseInt(req.query.perPage, 10) : undefined;
                const { result, blocks } = await hairJourneyService.getJournalEntriesWithBlocks(
                    String(userId),
                    { perPage }
                );
                return res.json({ success: true, result, blocks });
            } catch (err) {
                console.error('Error fetching journal entries:', err);
                return res.status(500).json({ error: true, message: err.message });
            }
        });

        this.app.post('/journal/entries', async (req, res) => {
            const userId = req.body.userId || req.headers['x-user-id'];
            if (!userId) {
                return res.status(400).json({ error: true, message: 'userId is required' });
            }
            try {
                const { userId: _omit, ...entryData } = req.body;
                const { result, blocks } = await hairJourneyService.createJournalEntryWithBlock(
                    String(userId),
                    entryData
                );
                return res.json({ success: true, result, blocks });
            } catch (err) {
                console.error('Error creating journal entry:', err);
                return res.status(500).json({ error: true, message: err.message });
            }
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
    async prepareChatTurn({ userId, allchatsSummary, userInfo, session, chatHistory, safeMessage, channel = 'kommunicate', experienceContext, imageObj, images }) {
        // widget-channel prompts use a different output-format instruction (plain text vs
        // Kommunicate JSON), so they must not share a cache slot with the kommunicate channel
        const cacheKey = channel === 'widget' ? `${userId}_widget` : userId;

        // Tools for this request: global (searchServices, lookupFAQ,
        // findStylistOrSalon) + per-user dynamic (saveHairGoal, getUserHairProfile).
        const chatTools = [...globalTools, ...createUserTools(userId)];

        // Gemini rejects a request that supplies CachedContent *and* tools/
        // system_instruction ("CachedContent can not be used with GenerateContent
        // request setting system_instruction, tools or tool_config"). Mya always
        // sends tools, so the context cache can never legally be used on this
        // path - every request that got a cache hit was failing on the primary
        // model with a 400 and silently degrading to the weaker fallback model.
        // Skipping the cache entirely keeps the primary model working; the real
        // optimization is to move the tools into CachedContent at creation time,
        // which is a larger change than belongs in a pre-test fix.
        const canUseContextCache = chatTools.length === 0;

        let aiPrompt = null;
        let cacheResult = { cacheName: null, isNewCache: false };
        const cacheStatus = canUseContextCache
            ? await core.cacheManager.checkCacheValidity(cacheKey)
            : { hasValidCache: false, cacheName: null, needsRefresh: false, reason: 'tools_present' };

        if (!canUseContextCache) {
            aiPrompt = await constructPrompt(userId, userInfo, allchatsSummary, false, channel);
        } else if (!cacheStatus.hasValidCache) {
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

        const chatConfig = {
            model: 'gemini-3.7-flash',
            tools: chatTools,
            config: { temperature: 1.1 },
            ...(Array.isArray(images) && images.length ? { images } : imageObj ? { image: imageObj } : {}),
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
    async sendFallbackModel({ messageWithContext, aiPrompt, chatTools, userId, userInfo, allchatsSummary, channel = 'kommunicate', images }) {
        if (!aiPrompt) {
            aiPrompt = await constructPrompt(userId, userInfo, allchatsSummary, false, channel);
        }

        // gemini-2.5-flash and gemini-2.5-flash-lite now 404 with "no longer
        // available to new users" - they were dead weight at the end of the
        // chain, adding two guaranteed-failed round trips to every fallback.
        // Google's own error points at the 3.x equivalents.
        const candidateModels = ['gemini-flash-lite-latest', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
        for (const candidate of candidateModels) {
            console.log(`🔄 ===== TRYING FALLBACK MODEL: ${candidate.toUpperCase()} =====`);
            try {
                const fallbackChat = core.ai.chat({
                    model: candidate,
                    system: aiPrompt,
                    tools: chatTools,
                    config: { temperature: 1.0 },
                    // Without this, every fallback answer to a photo was given
                    // blind - and while the primary is quota-limited, that is
                    // every photo.
                    ...(Array.isArray(images) && images.length ? { images } : {}),
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

            // Extract attachments for multimodal vision pipeline (TASK_MSDK_011 / HJ_024)
            const attachments = req.body.attachments || metadata?.KM_CHAT_CONTEXT?.attachments || [];
            let imageObj = null;
            if (Array.isArray(attachments) && attachments.length > 0) {
                const firstAttachment = attachments[0];
                const mimeType = firstAttachment.mimeType || firstAttachment.type || 'image/jpeg';
                const fileUrl = firstAttachment.url || firstAttachment.uri || firstAttachment.payload?.url || '';
                if (fileUrl) {
                    imageObj = { url: fileUrl, mimeType };
                }
            }

            // ===== SHARED CHAT-TURN SETUP (cache, prompt, context, tools) =====
            const { chat, messageWithContext, cacheResult, aiPrompt, chatTools } = await this.prepareChatTurn({
                userId, allchatsSummary, userInfo, session, chatHistory, safeMessage, channel: 'kommunicate', imageObj,
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

            // Photos: the widget sends them inline as data: URLs, the mobile SDK
            // as https links. Up to four go to the model with the message - see
            // imageAttachments.js for what is accepted.
            const images = extractImageAttachments(req.body.attachments);
            const imageObj = images[0] || null;
            if (images.length) console.log(`📸 ${images.length} image attachment(s) on this turn`);

            const turnArgs = {
                userId, allchatsSummary, userInfo, session, chatHistory, safeMessage, channel: 'widget', experienceContext, imageObj, images,
            };
            let { chat, messageWithContext, aiPrompt, chatTools } = await this.prepareChatTurn(turnArgs);
            // Cached for five minutes inside loadServiceCatalog, so this is
            // not a DB round trip per message.
            const serviceCatalog = await loadServiceCatalog();
            const shownProductKeys = collectShownProductKeys(chatHistory, serviceCatalog);

            // Every block the member sees goes out through emitBlock, so the
            // guards cannot be bypassed by a new emission site. Quick replies
            // are held back and sent last by finishBlocks, so a server-added
            // store card lands above the reply pills rather than below them.
            const turnBlocks = { productCards: 0, storeLink: false, heldQuickReplies: null };
            const emitBlock = (block) => {
                const safe = sanitizeBlock(decodeBlockText(block), serviceCatalog, shownProductKeys);
                if (!safe) return;
                if (safe.type === 'quick_replies') {
                    turnBlocks.heldQuickReplies = safe;
                    return;
                }
                if (PRODUCT_BLOCK_TYPES.has(safe.type)) turnBlocks.productCards += 1;
                if (safe.type === 'navigation' && safe.data?.url === STORE_URL) turnBlocks.storeLink = true;
                res.write(encodeFrame(createBlockFrame(safe)));
            };
            const finishBlocks = () => {
                if (!turnBlocks.storeLink && shouldOfferStoreLink(safeMessage, turnBlocks.productCards)) {
                    res.write(encodeFrame(createBlockFrame(buildStoreLinkBlock())));
                    turnBlocks.storeLink = true;
                    console.log('🛒 Added MYAVANA store link to this turn');
                }
                if (turnBlocks.heldQuickReplies) {
                    res.write(encodeFrame(createBlockFrame(turnBlocks.heldQuickReplies)));
                    turnBlocks.heldQuickReplies = null;
                }
            };

            let aiOutput = '';
            let modelUsed = 'gemini37Flash-stream';
            let streamedText = '';
            let anyChunkWritten = false;

            // One retry on a transient upstream 503 before degrading to the
            // fallback chain - see isRetryableModelError.
            const MAX_PRIMARY_ATTEMPTS = 2;
            for (let attempt = 1; attempt <= MAX_PRIMARY_ATTEMPTS; attempt++) {
            try {
                console.log(`🚀 ===== STREAMING PRIMARY MODEL: GEMINI 3.7 FLASH (attempt ${attempt}/${MAX_PRIMARY_ATTEMPTS}) =====`);
                const { stream, response } = chat.sendStream(messageWithContext);
                let inCodeBlock = false;
                let pendingProse = '';

                for await (const chunk of stream) {
                    if (chunk.text) {
                        streamedText += chunk.text;

                        if (!inCodeBlock) {
                            const fenceIndex = streamedText.indexOf('```');
                            if (fenceIndex !== -1) {
                                inCodeBlock = true;
                                const proseBeforeFence = streamedText.slice(0, fenceIndex);
                                const newProseChunk = proseBeforeFence.slice(pendingProse.length);
                                if (newProseChunk) {
                                    if (acceptsNDJSON) {
                                        res.write(encodeFrame(createDeltaFrame(repairStoreLinks(newProseChunk))));
                                    } else {
                                        res.write(repairStoreLinks(newProseChunk));
                                    }
                                    pendingProse = proseBeforeFence;
                                    anyChunkWritten = true;
                                }
                            } else {
                                // Buffer potential partial fence marker
                                const safeLength = streamedText.endsWith('``')
                                    ? streamedText.length - 2
                                    : (streamedText.endsWith('`') ? streamedText.length - 1 : streamedText.length);

                                const safeProse = streamedText.slice(0, safeLength);
                                const newProseChunk = safeProse.slice(pendingProse.length);
                                if (newProseChunk) {
                                    if (acceptsNDJSON) {
                                        res.write(encodeFrame(createDeltaFrame(repairStoreLinks(newProseChunk))));
                                    } else {
                                        res.write(repairStoreLinks(newProseChunk));
                                    }
                                    pendingProse = safeProse;
                                    anyChunkWritten = true;
                                }
                            }
                        }
                    }
                }

                // Flush any remaining un-fenced prose
                if (!inCodeBlock && pendingProse.length < streamedText.length) {
                    const remaining = streamedText.slice(pendingProse.length);
                    if (remaining) {
                        if (acceptsNDJSON) {
                            res.write(encodeFrame(createDeltaFrame(repairStoreLinks(remaining))));
                        } else {
                            res.write(repairStoreLinks(remaining));
                        }
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
                            emitBlock(toolBlock);
                        }
                    }

                    const parsed = parseModelOutput(aiOutput);
                    // If no chunks were written as prose yet (e.g. model output pure JSON), emit parsed prose text
                    if (!anyChunkWritten && parsed.text) {
                        res.write(encodeFrame(createDeltaFrame(repairStoreLinks(parsed.text))));
                        anyChunkWritten = true;
                    }

                    let emittedQuickReplyBlock = false;
                    for (const block of parsed.blocks) {
                        if (block.type !== 'text') {
                            if (block.type === 'quick_replies') emittedQuickReplyBlock = true;
                            emitBlock(block);
                        }
                    }
                    finishBlocks();
                    // Only send the action frame when the replies did NOT already
                    // go out as a quick_replies block - clients render both, so
                    // sending both showed every reply pill twice.
                    if (!emittedQuickReplyBlock && parsed.quickReplies && parsed.quickReplies.length > 0) {
                        res.write(encodeFrame(createActionFrame(parsed.quickReplies)));
                    }
                    res.write(encodeFrame(createDoneFrame({
                        modelUsed,
                        blocksCount: (parsed.blocks.length || 0) + (finalResponse?.toolBlocks?.length || 0) 
                    })));
                }
                break;
            } catch (streamError) {
                console.error('❌ Streaming primary model failed:', streamError.message);

                // Nothing has reached the member yet and the upstream said it
                // was momentarily overloaded - rebuild the turn and try the
                // primary once more rather than handing this to a weaker model.
                if (!anyChunkWritten && attempt < MAX_PRIMARY_ATTEMPTS && isRetryableModelError(streamError)) {
                    console.warn(`⏳ Transient upstream error — retrying the primary model (attempt ${attempt + 1}/${MAX_PRIMARY_ATTEMPTS})`);
                    await new Promise((resolve) => setTimeout(resolve, 750));
                    streamedText = '';
                    ({ chat, messageWithContext, aiPrompt, chatTools } = await this.prepareChatTurn(turnArgs));
                    continue;
                }

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
                        messageWithContext, aiPrompt, chatTools, userId, userInfo, allchatsSummary, channel: 'widget', images,
                    });
                    aiOutput = fallback.aiOutput;
                    modelUsed = fallback.modelUsed;
                    if (acceptsNDJSON) {
                        const parsed = parseModelOutput(aiOutput);
                        console.log('🧩 Fallback blocks:', parsed.blocks.map(b => b.type).join(', ') || 'none');
                        // parsed.text is the prose before the ```mya-blocks fence.
                        // Falling back to the raw aiOutput when it is empty dumped
                        // the entire fenced JSON into the chat as visible text, so
                        // strip the fence explicitly instead of showing raw blocks.
                        const proseText = parsed.text || stripBlocksFence(aiOutput);
                        res.write(encodeFrame(createDeltaFrame(repairStoreLinks(proseText))));
                        let emittedQuickReplyBlock = false;
                        for (const block of parsed.blocks) {
                            if (block.type !== 'text') {
                                if (block.type === 'quick_replies') emittedQuickReplyBlock = true;
                                emitBlock(block);
                            }
                        }
                        finishBlocks();
                        if (!emittedQuickReplyBlock && parsed.quickReplies && parsed.quickReplies.length > 0) {
                            res.write(encodeFrame(createActionFrame(parsed.quickReplies)));
                        }
                        res.write(encodeFrame(createDoneFrame({
                            modelUsed,
                            fallback: true,
                            blocksCount: parsed.blocks.filter(b => b.type !== 'text').length,
                        })));
                    } else {
                        // Plain-text clients get prose only. Writing aiOutput
                        // straight through dumped the whole ```mya-blocks
                        // fence into the chat as visible JSON.
                        res.write(repairStoreLinks(stripBlocksFence(aiOutput) || aiOutput));
                    }
                }
                break;
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
