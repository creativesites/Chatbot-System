// Cloud Run compatible MyavanaChatbotServer
const core = require('myavana-bot-test-core');
const express = require('express');
const { gemini15Flash, googleAI, gemini20FlashExp } = require('@genkit-ai/googleai');
const { performance } = require('perf_hooks');
const { constructPrompt } = require('./constructPrompt');
const { handleWelcomeEvent, handleImageMessage } = require('./eventHandlers');
const OpenAI = require('openai');
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
            
            console.log('📊 xAI Message Structure:', {
                totalMessages: messages.length,
                systemMessageLength: aiPrompt.length,
                historyMessages: chatHistory.slice(-10).length,
                userMessageLength: message.length,
                estimatedTotalTokens: Math.ceil(JSON.stringify(messages).length / 4)
            });
            
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
            console.log('📊 xAI API Response Info:', {
                hasResponse: !!response,
                hasChoices: !!(response && response.choices),
                choicesCount: response?.choices?.length || 0,
                hasMessage: !!(response?.choices?.[0]?.message),
                messageRole: response?.choices?.[0]?.message?.role,
                apiResponseTime: xaiApiTime.toFixed(2) + 'ms'
            });
            
            const output = response.choices[0].message.content;
            console.log('📝 xAI Raw Output Analysis:', {
                outputLength: output.length,
                outputType: typeof output,
                estimatedTokens: Math.ceil(output.length / 4),
                isJsonString: output.trim().startsWith('{') && output.trim().endsWith('}'),
                preview: output.substring(0, 200) + (output.length > 200 ? '...' : '')
            });
            
            console.log('🔄 Parsing xAI JSON response...');
            const parseStartTime = performance.now();
            const parsedOutput = JSON.parse(output);
            const parseTime = performance.now() - parseStartTime;
            
            console.log('✅ JSON parsing successful in', parseTime.toFixed(2), 'ms');
            console.log('📊 Parsed Output Analysis:', {
                outputType: typeof parsedOutput,
                isObject: typeof parsedOutput === 'object',
                hasMessages: !!(parsedOutput && parsedOutput.messages),
                keys: parsedOutput && typeof parsedOutput === 'object' ? Object.keys(parsedOutput) : [],
                stringifiedLength: JSON.stringify(parsedOutput).length
            });
            
            console.log('✅✅✅ xAI Grok fallback completed successfully!');
            console.log('🔄 ===== xAI GROK FALLBACK COMPLETE =====');
            
            return parsedOutput;
        } catch (xaiError) {
            const errorTime = performance.now();
            console.error('❌❌❌ xAI GROK FALLBACK FAILED!');
            console.error('❌ xAI Error Details:', {
                message: xaiError.message,
                name: xaiError.name,
                status: xaiError.status,
                code: xaiError.code,
                stack: xaiError.stack,
                timestamp: new Date(errorTime).toISOString(),
                promptLength: aiPrompt.length,
                messageLength: message.length,
                historyLength: chatHistory.length
            });
            console.log('🔄 ===== xAI GROK FALLBACK FAILED =====');
            throw xaiError;
        }
    }

    // Main chat request handler (based on working implementation)
    async handleChatRequest(req, res) {
        const requestId = Math.random().toString(36).substr(2, 9);
        console.log('🚀 ===== NEW REQUEST START =====');
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
                console.log('🏁 ===== WELCOME REQUEST COMPLETED =====');
                return;
            }

            // Load session using core's DatabaseSessionStore
            console.log('📂 Loading session for user:', userId);
            const session = await core.ai.loadSession(userId, {
                store: new core.DatabaseSessionStore(),
            });
            console.log('✅ Session loaded successfully');

            // Fetch user details and conversation history using core functions
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
                    console.log('🏁 ===== IMAGE REQUEST COMPLETED =====');
                    return;
                }
            }

            // Add user message to chat history
            const timestampedUserSaid = `${new Date().toISOString()} - User Said: ${message}`;
            chatHistory.push({ role: 'user', content: timestampedUserSaid });
            console.log('✅ User message added to chat history');

            // Build prompt using constructPrompt function
            console.log('🧠 ===== PROMPT GENERATION PHASE =====');
            console.log('🧠 Starting prompt construction with enhanced logging...');
            const promptStartTime = performance.now();
            const aiPrompt = await constructPrompt(userId, userInfo, chatHistory, allchatsSummary, false);
            const promptEndTime = performance.now();
            console.log('✅ Prompt generation completed in', (promptEndTime - promptStartTime).toFixed(2), 'ms');
            console.log('🧠 ===== PROMPT GENERATION COMPLETE =====');

            // Try primary model first (Gemini 2.0)
            console.log('🤖 ===== AI MODEL PROCESSING PHASE =====');
            console.log('🤖 Starting AI model processing with extensive logging...');
            console.log('📊 AI Processing Parameters:', {
                promptLength: aiPrompt.length,
                estimatedPromptTokens: Math.ceil(aiPrompt.length / 4),
                messageLength: message.length,
                userMessage: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
                temperature: 1.1,
                userId: userId,
                conversationId: conversationId
            });
            
            let aiOutput = null;
            let modelUsed = '';
            let responseStartTime = performance.now();
            
            try {
                console.log('🚀 ===== TRYING PRIMARY MODEL: GEMINI 2.0 FLASH EXPERIMENTAL =====');
                console.log('📤 Initializing Gemini 2.0 Flash Experimental...');
                console.log('📊 Model Configuration:', {
                    model: 'gemini20FlashExp',
                    temperature: 1.1,
                    systemPromptLength: aiPrompt.length,
                    userMessageLength: message.length
                });
                
                const modelInitStartTime = performance.now();
                const chat = session.chat({
                    model: gemini20FlashExp,
                    system: aiPrompt,
                    config: {
                        temperature: 1.1,
                    },
                });
                console.log('✅ Chat session initialized in', (performance.now() - modelInitStartTime).toFixed(2), 'ms');
                
                console.log('💬 Sending message to Gemini 2.0:', {
                    messagePreview: message.substring(0, 200) + (message.length > 200 ? '...' : ''),
                    fullMessageLength: message.length,
                    timestamp: new Date().toISOString()
                });
                
                const apiCallStartTime = performance.now();
                const { output } = await chat.send(message);
                const apiCallTime = performance.now() - apiCallStartTime;
                
                aiOutput = output;
                modelUsed = 'gemini20FlashExp';
                
                console.log('✅✅✅ GEMINI 2.0 FLASH EXPERIMENTAL SUCCESS!');
                console.log('📊 Response Stats:', {
                    responseTime: apiCallTime.toFixed(2) + 'ms',
                    outputLength: typeof output === 'string' ? output.length : JSON.stringify(output).length,
                    outputType: typeof output,
                    estimatedResponseTokens: typeof output === 'string' ? Math.ceil(output.length / 4) : Math.ceil(JSON.stringify(output).length / 4),
                    model: 'gemini20FlashExp'
                });
                
                // Log output preview
                const outputPreview = typeof output === 'string' ? output : JSON.stringify(output);
                console.log('📝 Response Preview (first 300 chars):', outputPreview.substring(0, 300) + (outputPreview.length > 300 ? '...' : ''));
                console.log('🚀 ===== GEMINI 2.0 SUCCESS - SKIPPING FALLBACKS =====');
                
            } catch (primaryError) {
                const primaryFailTime = performance.now() - responseStartTime;
                console.error('❌❌❌ PRIMARY MODEL FAILED: GEMINI 2.0 FLASH EXPERIMENTAL');
                console.error('❌ Primary Error Details:', {
                    message: primaryError.message,
                    name: primaryError.name,
                    status: primaryError.status,
                    code: primaryError.code,
                    failureTime: primaryFailTime.toFixed(2) + 'ms',
                    requestId: requestId,
                    userId: userId,
                    timestamp: new Date().toISOString()
                });
                
                try {
                    console.log('🔄 ===== TRYING FALLBACK MODEL: GEMINI 1.5 FLASH =====');
                    console.log('📤 Initializing Gemini 1.5 Flash fallback...');
                    console.log('📊 Fallback Model Configuration:', {
                        model: 'gemini15Flash',
                        temperature: 1.1,
                        systemPromptLength: aiPrompt.length,
                        userMessageLength: message.length,
                        reason: 'Primary model (Gemini 2.0) failed'
                    });
                    
                    const fallbackInitStartTime = performance.now();
                    const chat = core.ai.chat({
                        model: gemini15Flash,
                        system: aiPrompt,
                        config: {
                            temperature: 1.1,
                        },
                    });
                    console.log('✅ Fallback chat session initialized in', (performance.now() - fallbackInitStartTime).toFixed(2), 'ms');

                    console.log('💬 Sending message to Gemini 1.5:', {
                        messagePreview: message.substring(0, 200) + (message.length > 200 ? '...' : ''),
                        fullMessageLength: message.length,
                        timestamp: new Date().toISOString()
                    });
                    
                    const fallbackApiCallStartTime = performance.now();
                    const { output } = await chat.send(message);
                    const fallbackApiCallTime = performance.now() - fallbackApiCallStartTime;
                    
                    aiOutput = output;
                    modelUsed = 'gemini15Flash';
                    
                    console.log('✅✅✅ GEMINI 1.5 FLASH FALLBACK SUCCESS!');
                    console.log('📊 Fallback Response Stats:', {
                        responseTime: fallbackApiCallTime.toFixed(2) + 'ms',
                        outputLength: typeof output === 'string' ? output.length : JSON.stringify(output).length,
                        outputType: typeof output,
                        estimatedResponseTokens: typeof output === 'string' ? Math.ceil(output.length / 4) : Math.ceil(JSON.stringify(output).length / 4),
                        model: 'gemini15Flash'
                    });
                    
                    const outputPreview = typeof output === 'string' ? output : JSON.stringify(output);
                    console.log('📝 Fallback Response Preview (first 300 chars):', outputPreview.substring(0, 300) + (outputPreview.length > 300 ? '...' : ''));
                    console.log('🔄 ===== GEMINI 1.5 FALLBACK SUCCESS =====');
                    
                } catch (fallbackError) {
                    const fallbackFailTime = performance.now() - responseStartTime;
                    console.error('❌❌❌ FALLBACK MODEL FAILED: GEMINI 1.5 FLASH');
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
                    
                    // Use xAI as final fallback only if we have the API key
                    if (this.xai && process.env.XAI_API_KEY) {
                        console.log('🚨 ===== TRYING FINAL FALLBACK: xAI GROK =====');
                        console.log('🚨 EMERGENCY FALLBACK - Both Gemini models failed!');
                        console.log('📊 xAI Fallback Configuration:', {
                            model: 'grok-3-mini-fast',
                            hasXaiClient: !!this.xai,
                            hasApiKey: !!process.env.XAI_API_KEY,
                            reason: 'All Gemini models failed',
                            primaryError: primaryError.message,
                            fallbackError: fallbackError.message
                        });
                        
                        const xaiStartTime = performance.now();
                        aiOutput = await this.callXAIFallback(aiPrompt, message, chatHistory);
                        const xaiTime = performance.now() - xaiStartTime;
                        modelUsed = 'xai-grok-3-mini-fast';
                        
                        console.log('✅✅✅ xAI GROK FINAL FALLBACK SUCCESS!');
                        console.log('📊 xAI Response Stats:', {
                            responseTime: xaiTime.toFixed(2) + 'ms',
                            outputLength: typeof aiOutput === 'string' ? aiOutput.length : JSON.stringify(aiOutput).length,
                            outputType: typeof aiOutput,
                            model: 'xai-grok-3-mini-fast',
                            isEmergencyFallback: true
                        });
                        console.log('🚨 ===== xAI EMERGENCY FALLBACK SUCCESS =====');
                    } else {
                        console.error('❌❌❌ COMPLETE AI FAILURE - NO FALLBACK AVAILABLE');
                        console.error('❌ System Status:', {
                            hasXaiClient: !!this.xai,
                            hasXaiApiKey: !!process.env.XAI_API_KEY,
                            primaryError: primaryError.message,
                            fallbackError: fallbackError.message,
                            totalFailureTime: (performance.now() - responseStartTime).toFixed(2) + 'ms',
                            requestId: requestId
                        });
                        throw new Error('All AI models failed and no xAI fallback available');
                    }
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
                aiResponseTime: (responseTime / 1000).toFixed(3) + 's',
                totalProcessingTime: (totalTime / 1000).toFixed(3) + 's',
                success: true,
                outputReceived: !!aiOutput,
                outputType: typeof aiOutput,
                requestId: requestId
            });

            console.log('🔄 ===== RESPONSE PROCESSING PHASE =====');
            console.log('🧹 Processing and cleaning AI response...');
            console.log('📊 Pre-processing Analysis:', {
                modelUsed: modelUsed,
                isXaiResponse: modelUsed.includes('xai-grok'),
                rawOutputType: typeof aiOutput,
                rawOutputLength: typeof aiOutput === 'string' ? aiOutput.length : JSON.stringify(aiOutput).length
            });

            // Handle different response formats depending on model used
            let cleanedResponse;
            if (modelUsed.includes('xai-grok')) {
                console.log('🔄 Processing xAI response format...');
                cleanedResponse = aiOutput.messages ? aiOutput.messages : aiOutput;
                console.log('✅ xAI response processed:', {
                    hasMessages: !!(aiOutput.messages),
                    processedType: typeof cleanedResponse,
                    processedLength: JSON.stringify(cleanedResponse).length
                });
            } else {
                console.log('🔄 Processing Gemini response format...');
                cleanedResponse = cleanKommunicateResponse(aiOutput);
                console.log('✅ Gemini response cleaned via cleanKommunicateResponse:', {
                    processedType: typeof cleanedResponse,
                    isArray: Array.isArray(cleanedResponse),
                    processedLength: JSON.stringify(cleanedResponse).length
                });
            }
            
            console.log('📊 Final Cleaned Response Analysis:', {
                finalType: typeof cleanedResponse,
                finalLength: JSON.stringify(cleanedResponse).length,
                isArray: Array.isArray(cleanedResponse),
                estimatedTokens: Math.ceil(JSON.stringify(cleanedResponse).length / 4)
            });
            
            const responsePreview = JSON.stringify(cleanedResponse).substring(0, 300);
            console.log('📝 Cleaned Response Preview:', responsePreview + (responsePreview.length >= 300 ? '...' : ''));
            console.log('✅ Response processing and cleaning completed!');

            // Send response to client
            console.log('📤 ===== SENDING RESPONSE TO CLIENT =====');
            console.log('📤 Final response ready for transmission:', {
                responseType: typeof cleanedResponse,
                responseSize: JSON.stringify(cleanedResponse).length,
                isArray: Array.isArray(cleanedResponse),
                estimatedTokens: Math.ceil(JSON.stringify(cleanedResponse).length / 4),
                timestamp: new Date().toISOString()
            });
            
            const responseTransmissionStart = performance.now();
            res.json(cleanedResponse);
            const responseTransmissionTime = performance.now() - responseTransmissionStart;
            
            console.log('✅✅✅ RESPONSE TRANSMITTED SUCCESSFULLY!');
            console.log('📊 Response transmission completed in', responseTransmissionTime.toFixed(2), 'ms');

            // Add AI response to chat history
            console.log('💾 Adding AI response to chat history...');
            chatHistory.push({ role: 'assistant', content: aiOutput });
            console.log('✅ AI response added to chat history');

            // Post-processing (non-blocking)
            setImmediate(async () => {
                console.log('🔄 ===== STARTING POST-PROCESSING =====');
                console.log('🔄 Post-processing running in background...');
                const postProcessStart = performance.now();
                try {
                    const postProcessData = await core.postProcessConversation(chatHistory, message);
                    const postResponseStart = performance.now();
                    await core.postResponseProcessing(postProcessData, userId, aiOutput, allchatsSummary, conversationId, chatHistory, JSON.stringify(aiOutput));
                    const postResponseTime = performance.now() - postResponseStart;
                    const totalPostProcessTime = performance.now() - postProcessStart;
                    
                    console.log('✅ Post-processing completed successfully!');
                    console.log('📊 Post-processing timing:', {
                        conversationAnalysisTime: (postResponseStart - postProcessStart).toFixed(2) + 'ms',
                        responseProcessingTime: postResponseTime.toFixed(2) + 'ms',
                        totalPostProcessTime: totalPostProcessTime.toFixed(2) + 'ms'
                    });
                    console.log('🔄 ===== POST-PROCESSING COMPLETE =====');
                } catch (postProcessError) {
                    console.error('❌ Post-processing failed:', {
                        error: postProcessError.message,
                        stack: postProcessError.stack,
                        processingTime: (performance.now() - postProcessStart).toFixed(2) + 'ms'
                    });
                    console.log('🔄 ===== POST-PROCESSING FAILED =====');
                }
            });
            
            const finalTotalTime = performance.now() - start;
            console.log('🎉 ===== COMPLETE REQUEST SUMMARY =====');
            console.log('🎉 REQUEST COMPLETED SUCCESSFULLY!');
            console.log('📊 Complete Performance Metrics:', {
                requestId: requestId,
                userId: userId,
                conversationId: conversationId,
                totalRequestTime: finalTotalTime.toFixed(2) + 'ms',
                promptGenerationTime: (promptEndTime - promptStartTime).toFixed(2) + 'ms',
                aiProcessingTime: responseTime.toFixed(2) + 'ms',
                responseProcessingTime: (performance.now() - (start + (promptEndTime - promptStartTime) + responseTime)).toFixed(2) + 'ms',
                modelUsed: modelUsed,
                messageLength: message.length,
                responseLength: JSON.stringify(cleanedResponse).length,
                success: true,
                timestamp: new Date().toISOString()
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
            
            console.log('📤 Sending error response to client:', errorResponse);
            console.log('🏁 ===== REQUEST FAILED =====');
            
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