const core = require('myavana-bot-test-core');
const { gemini15Flash, googleAI, gemini20FlashExp } = require('@genkit-ai/googleai');
const { performance } = require('perf_hooks');
const { constructPrompt } = require('./constructPrompt'); // Local to myavana
const { handleWelcomeEvent, handleImageMessage } = require('./eventHandlers'); // Local to myavana
const OpenAI = require('openai');
require('dotenv').config();

// Initialize databases (from core)
core.connectDatabases().then(() => {
    console.log('✅ Successfully connected to databases');
    console.log('✅ PostgreSQL and Redis connections established');
}).catch((error) => {
    console.error('❌ CRITICAL: Failed to connect to databases:', error);
    console.error('❌ Database connection error details:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
});

// Initialize smart systems with fallbacks
console.log('🔧 Initializing smart systems...');
console.log('🔍 Checking core module exports...');
console.log('📊 Available core exports:', Object.keys(core));

let smartPromptManager, responseCache, analytics, errorRecovery, personalization;

// Check if required classes are available
const requiredClasses = {
    SmartPromptManager: core.SmartPromptManager,
    ResponseCache: core.ResponseCache,
    ConversationAnalytics: core.ConversationAnalytics,
    ErrorRecoveryManager: core.ErrorRecoveryManager,
    PersonalizationEngine: core.PersonalizationEngine
};

console.log('🔍 Checking required classes availability:');
for (const [name, classRef] of Object.entries(requiredClasses)) {
    console.log(`🔍 ${name}:`, {
        exists: !!classRef,
        type: typeof classRef,
        isConstructor: typeof classRef === 'function' && classRef.prototype && classRef.prototype.constructor === classRef
    });
}

try {
    // Initialize SmartPromptManager with safety check
    if (typeof core.SmartPromptManager === 'function') {
        smartPromptManager = new core.SmartPromptManager();
        console.log('✅ SmartPromptManager initialized successfully');
    } else {
        console.error('❌ SmartPromptManager is not a constructor:', typeof core.SmartPromptManager);
        // Create a basic fallback
        smartPromptManager = {
            buildSmartPrompt: async (...args) => {
                console.log('⚠️ Using fallback prompt builder');
                const { constructPrompt } = require('./constructPrompt');
                return await constructPrompt(args[0], args[3], args[2], args[4], false);
            },
            analyzeQueryContext: async (message, history) => {
                return { queryType: 'general', topicsDetected: [], confidence: 0.5 };
            }
        };
        console.log('⚠️ Using SmartPromptManager fallback');
    }
    
    // Initialize ResponseCache with safety check
    if (typeof core.ResponseCache === 'function') {
        responseCache = new core.ResponseCache();
        console.log('✅ ResponseCache initialized successfully');
    } else {
        responseCache = {
            getCachedResponse: async () => null,
            cacheResponse: async () => {},
        };
        console.log('⚠️ Using ResponseCache fallback');
    }
    
    // Initialize ConversationAnalytics with safety check
    if (typeof core.ConversationAnalytics === 'function') {
        analytics = new core.ConversationAnalytics();
        console.log('✅ ConversationAnalytics initialized successfully');
    } else {
        analytics = {
            trackUserMessage: async () => {},
            trackAIResponse: async () => {},
            trackWelcomeEvent: async () => {},
            trackModelFailure: async () => {},
            trackPromptFallback: async () => {},
            trackPromptFailure: async () => {},
            trackPersonalizationSuccess: async () => {},
            trackPersonalizationFailure: async () => {},
            trackRequestComplete: async () => {},
            trackModelPerformance: async () => {},
            trackCacheWrite: async () => {},
            trackPostProcessingSuccess: async () => {},
            trackPostProcessingFailure: async () => {},
            trackEmergencyFallback: async () => {},
            trackXAISkipped: async () => {},
            trackCompleteSystemFailure: async () => {}
        };
        console.log('⚠️ Using ConversationAnalytics fallback');
    }
    
    // Initialize ErrorRecoveryManager with safety check
    if (typeof core.ErrorRecoveryManager === 'function') {
        errorRecovery = new core.ErrorRecoveryManager();
        console.log('✅ ErrorRecoveryManager initialized successfully');
    } else {
        errorRecovery = {
            canMakeRequest: () => true,
            recordSuccess: () => {},
            recordFailure: () => {},
            logError: async () => {},
            classifyError: () => 'UNKNOWN',
            getCircuitBreakerStatus: () => ({ status: 'unknown' })
        };
        console.log('⚠️ Using ErrorRecoveryManager fallback');
    }
    
    // Initialize PersonalizationEngine with safety check
    if (typeof core.PersonalizationEngine === 'function') {
        personalization = new core.PersonalizationEngine();
        console.log('✅ PersonalizationEngine initialized successfully');
    } else {
        personalization = {
            getPersonalizedResponse: async (userId, message, response) => response
        };
        console.log('⚠️ Using PersonalizationEngine fallback');
    }
    
    console.log('✅ All smart systems initialized (with fallbacks if needed)');
    
} catch (initError) {
    console.error('❌ CRITICAL: Failed to initialize smart systems:', initError);
    console.error('❌ Smart systems initialization error:', {
        message: initError.message,
        stack: initError.stack,
        coreKeys: Object.keys(core),
        timestamp: new Date().toISOString()
    });
    
    // Initialize all with fallbacks as last resort
    console.log('🚨 Initializing all systems with emergency fallbacks...');
    smartPromptManager = {
        buildSmartPrompt: async (...args) => {
            const { constructPrompt } = require('./constructPrompt');
            return await constructPrompt(args[0], args[3], args[2], args[4], false);
        },
        analyzeQueryContext: async () => ({ queryType: 'general', topicsDetected: [], confidence: 0.5 })
    };
    responseCache = {
        getCachedResponse: async () => null,
        cacheResponse: async () => {}
    };
    analytics = {
        trackUserMessage: async () => {},
        trackAIResponse: async () => {},
        trackWelcomeEvent: async () => {},
        trackModelFailure: async () => {},
        trackPromptFallback: async () => {},
        trackPromptFailure: async () => {},
        trackPersonalizationSuccess: async () => {},
        trackPersonalizationFailure: async () => {},
        trackRequestComplete: async () => {},
        trackModelPerformance: async () => {},
        trackCacheWrite: async () => {},
        trackPostProcessingSuccess: async () => {},
        trackPostProcessingFailure: async () => {},
        trackEmergencyFallback: async () => {},
        trackXAISkipped: async () => {},
        trackCompleteSystemFailure: async () => {}
    };
    errorRecovery = {
        canMakeRequest: () => true,
        recordSuccess: () => {},
        recordFailure: () => {},
        logError: async () => {},
        classifyError: () => 'UNKNOWN',
        getCircuitBreakerStatus: () => ({ status: 'unknown' })
    };
    personalization = {
        getPersonalizedResponse: async (userId, message, response) => response
    };
    
    console.log('✅ Emergency fallback systems initialized');
}

// Initialize xAI client as fallback
console.log('🔧 Initializing xAI client...');
let xai;

try {
    xai = new OpenAI({
        apiKey: process.env.XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
        timeout: 360000, // 6 minutes for reasoning models
    });
    
    if (!process.env.XAI_API_KEY) {
        console.warn('⚠️ WARNING: XAI_API_KEY not found in environment variables');
        console.warn('⚠️ xAI fallback may not work properly');
    } else {
        console.log('✅ xAI client initialized successfully');
        console.log('✅ xAI API key found and configured');
    }
} catch (xaiError) {
    console.error('❌ ERROR: Failed to initialize xAI client:', xaiError);
    console.error('❌ xAI initialization error details:', {
        message: xaiError.message,
        hasApiKey: !!process.env.XAI_API_KEY,
        timestamp: new Date().toISOString()
    });
}

function cleanKommunicateResponse(jsonObj) {
    try {
      // If the input is not an array, wrap it in an array
      if (!Array.isArray(jsonObj)) {
        jsonObj = [jsonObj];
      }
  
      // Flatten nested arrays and clean each object
      const cleanedList = jsonObj.flatMap((item) => {
        // If the item is an array, recursively clean it
        if (Array.isArray(item)) {
          return cleanKommunicateResponse(item);
        }
  
        // Remove the `platform` property if it exists
        if (item.platform === "kommunicate") {
          delete item.platform;
        }
  
        // Return the cleaned item
        return item;
      });
  
      return cleanedList;
    } catch (error) {
      console.error("Error parsing AI response JSON:", error);
      return jsonObj; // Return the original object if an error occurs
    }
  }

// Helper function to call xAI as fallback
async function callXAIFallback(aiPrompt, message, chatHistory) {
    console.log('🔄 Using xAI Grok as final fallback...');
    console.log('📊 xAI Fallback Details:', {
        messageLength: message.length,
        chatHistoryLength: chatHistory.length,
        promptLength: aiPrompt.length,
        timestamp: new Date().toISOString()
    });
    
    try {
        // Prepare messages for xAI
        const messages = [
            { role: 'system', content: aiPrompt },
            ...chatHistory.slice(-10), // Include last 10 messages for context
            { role: 'user', content: message }
        ];
        
        console.log('📤 Sending request to xAI Grok with', messages.length, 'messages');
        const requestStart = performance.now();

        const response = await xai.chat.completions.create({
            model: 'grok-3-mini-fast', // Fast model for better availability
            messages: messages,
            temperature: 1.1,
            response_format: { type: 'json_object' },
        });
        
        const requestTime = performance.now() - requestStart;
        console.log('✅ xAI Grok response received in', requestTime.toFixed(2), 'ms');
        
        const output = response.choices[0].message.content;
        console.log('📝 xAI Response length:', output.length, 'characters');
        console.log('✅ Successfully used xAI Grok fallback');
        
        return JSON.parse(output);
    } catch (xaiError) {
        console.error('❌ xAI Grok fallback failed:', xaiError);
        console.error('❌ xAI Error details:', {
            message: xaiError.message,
            status: xaiError.status,
            code: xaiError.code,
            timestamp: new Date().toISOString()
        });
        throw xaiError;
    }
}

 const myavanaHandler = async (req, res) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    console.log('🚀 ===== NEW REQUEST START =====');
    console.log('🆔 Request ID:', requestId);
    console.log('📅 Timestamp:', new Date().toISOString());
    
    try {
        const start = performance.now();
        console.log('📥 Incoming request body:', JSON.stringify(req.body, null, 2));
        
        const { message, from: userId, groupId: conversationId, eventName, metadata, contentType, source, chatKey } = req.body;
        
        console.log('📊 Request Details:', {
            requestId,
            userId: userId || 'undefined',
            conversationId: conversationId || 'undefined',
            eventName: eventName || 'undefined',
            messageLength: message ? message.length : 0,
            hasMetadata: !!metadata,
            contentType: contentType || 'undefined',
            source: source || 'undefined'
        });

        if (eventName === "WELCOME") {
            console.log('👋 Processing WELCOME event for user:', userId);
            try {
                await handleWelcomeEvent(res, userId);
                console.log('✅ Welcome event handled successfully');
                
                // Track welcome event
                await analytics.trackWelcomeEvent(userId);
                console.log('✅ Welcome event tracked in analytics');
                
                console.log('🏁 ===== WELCOME REQUEST COMPLETED =====');
                return;
            } catch (welcomeError) {
                console.error('❌ Welcome event failed:', welcomeError);
                console.error('❌ Welcome error details:', {
                    requestId,
                    userId,
                    error: welcomeError.message,
                    stack: welcomeError.stack
                });
                throw welcomeError;
            }
        }

        // Load session using core's DatabaseSessionStore
        console.log('📂 Loading session for user:', userId);
        try {
            const sessionStart = performance.now();
            const session = await core.ai.loadSession(userId, {
                store: new core.DatabaseSessionStore(),
            });
            const sessionTime = performance.now() - sessionStart;
            console.log('✅ Session loaded successfully in', sessionTime.toFixed(2), 'ms');
        } catch (sessionError) {
            console.error('❌ Session loading failed:', sessionError);
            console.error('❌ Session error details:', {
                requestId,
                userId,
                error: sessionError.message,
                stack: sessionError.stack
            });
            throw sessionError;
        }

        // Fetch user details and conversation history using core functions
        console.log('📊 Fetching user data and conversation history...');
        try {
            const dataStart = performance.now();
            const [allchatsSummary, userInfo] = await Promise.all([
                core.getAllConversationsSummary(userId),
                core.getUserDetails(userId),
            ]);
            const dataTime = performance.now() - dataStart;
            
            console.log('✅ User data fetched successfully in', dataTime.toFixed(2), 'ms');
            console.log('📊 User Info:', {
                hasUserInfo: !!userInfo,
                userId: userInfo?.user_id || 'undefined',
                userName: userInfo?.name || 'undefined',
                hasSummary: !!allchatsSummary,
                summaryLength: allchatsSummary ? allchatsSummary.length : 0
            });
        } catch (dataError) {
            console.error('❌ User data fetching failed:', dataError);
            console.error('❌ Data error details:', {
                requestId,
                userId,
                error: dataError.message,
                stack: dataError.stack
            });
            throw dataError;
        }

        console.log('📜 Loading conversation history...');
        try {
            const historyStart = performance.now();
            let chatHistory = await core.getConversationHistory(conversationId, userId);
            const historyTime = performance.now() - historyStart;
            
            if (!Array.isArray(chatHistory)) {
                console.log('⚠️ Chat history is not an array, initializing empty array');
                chatHistory = []; // Initialize to empty array if it's a new chat
            }
            
            console.log('✅ Conversation history loaded in', historyTime.toFixed(2), 'ms');
            console.log('📊 History Details:', {
                historyLength: chatHistory.length,
                isNewConversation: chatHistory.length === 0,
                conversationId: conversationId || 'undefined'
            });
        } catch (historyError) {
            console.error('❌ Conversation history loading failed:', historyError);
            console.error('❌ History error details:', {
                requestId,
                userId,
                conversationId,
                error: historyError.message,
                stack: historyError.stack
            });
            throw historyError;
        }

        if (eventName === "KOMMUNICATE_MEDIA_EVENT") {
            console.log('🖼️ Processing KOMMUNICATE_MEDIA_EVENT (image message)...');
            console.log('🖼️ Image metadata:', JSON.stringify(metadata, null, 2));
            try {
                const imageStart = performance.now();
                const handled = await handleImageMessage(eventName, metadata, userId, conversationId, chatHistory, res, message, userInfo, session);
                const imageTime = performance.now() - imageStart;
                
                if (handled) {
                    console.log('✅ Image message handled successfully in', imageTime.toFixed(2), 'ms');
                    console.log('🏁 ===== IMAGE REQUEST COMPLETED =====');
                    return;
                } else {
                    console.log('⚠️ Image message not handled, continuing with text processing...');
                }
            } catch (imageError) {
                console.error('❌ Image message handling failed:', imageError);
                console.error('❌ Image error details:', {
                    requestId,
                    userId,
                    conversationId,
                    hasMetadata: !!metadata,
                    error: imageError.message,
                    stack: imageError.stack
                });
                throw imageError;
            }
        }

        // Timestamp user message
        console.log('📝 Processing user message:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
        const timestampedUserSaid = `${new Date().toISOString()} - User Said: ${message}`;
        chatHistory.push({ role: 'user', content: timestampedUserSaid });
        console.log('✅ User message added to chat history');

        const endGetChaHistory = performance.now();
        console.log(`⏱️ Time taken to get chat history is ${(endGetChaHistory - start) / 1000}s.`);

        // Track user message with analytics
        console.log('📊 Analyzing query context and tracking user message...');
        try {
            const analysisStart = performance.now();
            const contextAnalysis = await smartPromptManager.analyzeQueryContext(message, chatHistory);
            const analysisTime = performance.now() - analysisStart;
            
            console.log('✅ Context analysis completed in', analysisTime.toFixed(2), 'ms');
            console.log('📊 Context Analysis Results:', {
                queryType: contextAnalysis.queryType || 'undefined',
                topicsDetected: contextAnalysis.topicsDetected || [],
                confidence: contextAnalysis.confidence || 'undefined'
            });
            
            await analytics.trackUserMessage(userId, conversationId, message, contextAnalysis);
            console.log('✅ User message tracked in analytics');
        } catch (analyticsError) {
            console.error('❌ Analytics tracking failed:', analyticsError);
            console.error('❌ Analytics error details:', {
                requestId,
                userId,
                conversationId,
                error: analyticsError.message
            });
            // Don't throw - continue processing even if analytics fail
        }

        // Check cache first
        console.log('💾 Checking response cache...');
        try {
            const cacheStart = performance.now();
            const cachedResponse = await responseCache.getCachedResponse(message, { userId, userProfile: userInfo }, contextAnalysis);
            const cacheTime = performance.now() - cacheStart;
            
            if (cachedResponse) {
                console.log('✅💾 CACHE HIT! Returning cached response in', cacheTime.toFixed(2), 'ms');
                console.log('📊 Cached Response Details:', {
                    responseLength: JSON.stringify(cachedResponse.response).length,
                    cacheAge: cachedResponse.metadata?.age || 'unknown',
                    cacheKey: cachedResponse.metadata?.key || 'unknown'
                });
                
                res.json(cachedResponse.response);
                
                // Track cache hit
                try {
                    await analytics.trackAIResponse(userId, conversationId, cachedResponse.response, 'cached', 0, true);
                    console.log('✅ Cache hit tracked in analytics');
                } catch (cacheAnalyticsError) {
                    console.error('❌ Cache analytics tracking failed:', cacheAnalyticsError);
                }
                
                // Still do post-processing for analytics
                try {
                    console.log('🔄 Running post-processing for cached response...');
                    const postProcessData = await core.postProcessConversation(chatHistory, message);
                    await core.postResponseProcessing(postProcessData, userId, cachedResponse.response, allchatsSummary, conversationId, chatHistory, JSON.stringify(cachedResponse.response));
                    console.log('✅ Post-processing completed for cached response');
                } catch (postProcessError) {
                    console.error('❌ Post-processing failed for cached response:', postProcessError);
                }
                
                console.log('🏁 ===== CACHED REQUEST COMPLETED =====');
                return;
            } else {
                console.log('❌💾 CACHE MISS - Need to generate new response (checked in', cacheTime.toFixed(2), 'ms)');
            }
        } catch (cacheError) {
            console.error('❌ Cache check failed:', cacheError);
            console.log('⚠️ Continuing without cache...');
        }

        // Build smart prompt using the new system
        console.log('🧠 Building smart prompt...');
        console.log('📊 Smart Prompt Manager Input Data:', {
            userId: userId || 'undefined',
            messageLength: message ? message.length : 0,
            messagePreview: message ? message.substring(0, 200) + (message.length > 200 ? '...' : '') : 'no message',
            chatHistoryLength: chatHistory ? chatHistory.length : 0,
            hasUserInfo: !!userInfo,
            userInfoKeys: userInfo ? Object.keys(userInfo) : [],
            hasSummary: !!allchatsSummary,
            summaryLength: allchatsSummary ? allchatsSummary.length : 0,
            summaryPreview: allchatsSummary ? allchatsSummary.substring(0, 100) + (allchatsSummary.length > 100 ? '...' : '') : 'no summary'
        });
        
        let aiPrompt;
        try {
            const promptStart = performance.now();
            aiPrompt = await smartPromptManager.buildSmartPrompt(userId, message, chatHistory, userInfo, allchatsSummary);
            const promptTime = performance.now() - promptStart;
            
            console.log('✅ Smart prompt generated successfully in', promptTime.toFixed(2), 'ms');
            console.log('📊 Smart Prompt Stats:', {
                promptLength: aiPrompt.length,
                estimatedTokens: Math.ceil(aiPrompt.length / 4),
                wordCount: aiPrompt.split(' ').length,
                hasUserInfo: !!userInfo,
                hasSummary: !!allchatsSummary,
                chatHistoryLength: chatHistory.length,
                promptLines: aiPrompt.split('\n').length
            });
            
            // Log the actual prompt content (truncated for security)
            console.log('📝 SMART PROMPT CONTENT (first 500 chars):');
            console.log('📝 ' + aiPrompt.substring(0, 500) + (aiPrompt.length > 500 ? '...[TRUNCATED]' : ''));
            console.log('📝 SMART PROMPT CONTENT (last 300 chars):');
            console.log('📝 ' + (aiPrompt.length > 300 ? '...' + aiPrompt.substring(aiPrompt.length - 300) : aiPrompt));
            
            // Analyze prompt quality
            const promptAnalysis = {
                hasSystemInstructions: aiPrompt.includes('You are') || aiPrompt.includes('Your role'),
                hasUserContext: aiPrompt.includes(userInfo?.name || 'USER_NAME_PLACEHOLDER'),
                hasConversationHistory: aiPrompt.includes('conversation') || aiPrompt.includes('history'),
                hasProductData: aiPrompt.includes('product') || aiPrompt.includes('Products'),
                hasFAQData: aiPrompt.includes('FAQ') || aiPrompt.includes('frequently'),
                hasHairSpecificData: aiPrompt.includes('hair') || aiPrompt.includes('Hair'),
                hasJSONFormat: aiPrompt.includes('JSON') || aiPrompt.includes('json'),
                hasResponseStructure: aiPrompt.includes('response') && aiPrompt.includes('format')
            };
            
            console.log('🔍 PROMPT QUALITY ANALYSIS:', promptAnalysis);
            
            // Check for potential issues
            const promptIssues = [];
            if (aiPrompt.length < 1000) promptIssues.push('Prompt might be too short');
            if (aiPrompt.length > 15000) promptIssues.push('Prompt might be too long');
            if (!promptAnalysis.hasSystemInstructions) promptIssues.push('Missing system instructions');
            if (!promptAnalysis.hasJSONFormat) promptIssues.push('Missing JSON format instructions');
            if (!promptAnalysis.hasHairSpecificData) promptIssues.push('Missing hair-specific context');
            
            if (promptIssues.length > 0) {
                console.warn('⚠️ PROMPT QUALITY ISSUES DETECTED:', promptIssues);
            } else {
                console.log('✅ Prompt quality looks good!');
            }
        } catch (promptError) {
            console.error('❌ SMART PROMPT GENERATION FAILED!');
            console.error('❌ Smart Prompt Error Details:', {
                requestId,
                userId,
                error: promptError.message,
                errorType: promptError.name,
                stack: promptError.stack,
                inputData: {
                    hasUserInfo: !!userInfo,
                    hasSummary: !!allchatsSummary,
                    messageLength: message ? message.length : 0,
                    historyLength: chatHistory ? chatHistory.length : 0
                }
            });
            
            try {
                console.log('🔄 FALLING BACK TO LEGACY PROMPT CONSTRUCTION...');
                const fallbackStart = performance.now();
                aiPrompt = await constructPrompt(userId, userInfo, chatHistory, allchatsSummary, false);
                const fallbackTime = performance.now() - fallbackStart;
                
                console.log('✅ Fallback prompt generated in', fallbackTime.toFixed(2), 'ms');
                console.log('📊 Fallback Prompt Stats:', {
                    promptLength: aiPrompt.length,
                    estimatedTokens: Math.ceil(aiPrompt.length / 4),
                    wordCount: aiPrompt.split(' ').length
                });
                
                // Log fallback prompt content (truncated)
                console.log('📝 FALLBACK PROMPT CONTENT (first 500 chars):');
                console.log('📝 ' + aiPrompt.substring(0, 500) + (aiPrompt.length > 500 ? '...[TRUNCATED]' : ''));
                
                // Track fallback usage
                try {
                    await analytics.trackPromptFallback(userId, conversationId, promptError, 'constructPrompt');
                    console.log('✅ Prompt fallback tracked in analytics');
                } catch (trackingError) {
                    console.error('❌ Failed to track prompt fallback:', trackingError);
                }
                
            } catch (fallbackError) {
                console.error('❌ FALLBACK PROMPT GENERATION ALSO FAILED!');
                console.error('❌ Fallback Error Details:', {
                    requestId,
                    userId,
                    fallbackError: fallbackError.message,
                    originalError: promptError.message,
                    timestamp: new Date().toISOString()
                });
                
                // Track complete prompt failure
                try {
                    await analytics.trackPromptFailure(userId, conversationId, {
                        smartError: promptError.message,
                        fallbackError: fallbackError.message
                    });
                } catch (trackingError) {
                    console.error('❌ Failed to track prompt failure:', trackingError);
                }
                
                throw new Error(`COMPLETE PROMPT GENERATION FAILURE - Smart: ${promptError.message}, Fallback: ${fallbackError.message}`);
            }
        }

        // Try primary model first
        console.log('🤖 Starting AI model processing...');
        let aiOutput = null;
        let modelUsed = '';
        let responseStartTime = performance.now();
        
        try {
            // Check if Gemini 2.0 is available via circuit breaker
            console.log('🔍 Checking Gemini 2.0 Flash Experimental availability...');
            if (errorRecovery.canMakeRequest('gemini20FlashExp')) {
                console.log('✅ Gemini 2.0 circuit breaker is CLOSED - attempting to use model...');
                console.log('📤 Sending request to Gemini 2.0 Flash Experimental...');
                
                try {
                    const modelStart = performance.now();
                    const chat = session.chat({
                        model: gemini20FlashExp,
                        system: aiPrompt,
                        config: {
                            temperature: 1.1,
                        },
                    });
                    
                    console.log('💬 Sending message to Gemini 2.0:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
                    const { output } = await chat.send(message);
                    const modelTime = performance.now() - modelStart;
                    
                    aiOutput = output;
                    modelUsed = 'gemini20FlashExp';
                    errorRecovery.recordSuccess('gemini20FlashExp');
                    
                    console.log('✅ Gemini 2.0 Flash Experimental SUCCESS!');
                    console.log('📊 Gemini 2.0 Response Stats:', {
                        responseTime: modelTime.toFixed(2) + 'ms',
                        outputLength: typeof output === 'string' ? output.length : JSON.stringify(output).length,
                        outputType: typeof output,
                        model: 'gemini20FlashExp'
                    });
                } catch (gemini20Error) {
                    console.error('❌ Gemini 2.0 Flash Experimental request failed:', gemini20Error);
                    throw gemini20Error;
                }
            } else {
                console.log('❌ Gemini 2.0 Flash Experimental circuit breaker is OPEN');
                console.log('📊 Circuit breaker stats:', errorRecovery.getCircuitBreakerStatus('gemini20FlashExp'));
                throw new Error('Gemini 2.0 Flash Experimental circuit breaker is open');
            }
            
        } catch (primaryError) {
            const primaryFailTime = performance.now() - responseStartTime;
            console.error('❌ PRIMARY MODEL FAILED: Gemini 2.0 Flash Experimental');
            console.error('❌ Primary Error Details:', {
                requestId,
                userId,
                conversationId,
                error: primaryError.message,
                errorType: primaryError.name,
                status: primaryError.status,
                code: primaryError.code,
                failureTime: primaryFailTime.toFixed(2) + 'ms',
                timestamp: new Date().toISOString()
            });
            
            try {
                await analytics.trackModelFailure('gemini20FlashExp', primaryError, primaryFailTime);
                await errorRecovery.logError(userId, conversationId, primaryError, 'gemini20FlashExp');
                errorRecovery.recordFailure('gemini20FlashExp');
                console.log('✅ Primary error logged and tracked');
            } catch (errorLoggingError) {
                console.error('❌ Failed to log primary error:', errorLoggingError);
            }
            
            // Check if we should try recovery
            const errorType = errorRecovery.classifyError(primaryError);
            console.log('🔍 Error classified as:', errorType);
            console.log('🔄 Attempting fallback to Gemini 1.5 Flash...');
            
            try {
                console.log('🔍 Checking Gemini 1.5 Flash availability...');
                if (errorRecovery.canMakeRequest('gemini15Flash')) {
                    console.log('✅ Gemini 1.5 circuit breaker is CLOSED - attempting fallback...');
                    console.log('📤 Sending request to Gemini 1.5 Flash...');
                    
                    const fallbackStart = performance.now();
                    const chat = core.ai.chat({
                        model: gemini15Flash,
                        system: aiPrompt,
                        config: {
                            temperature: 1.1,
                        },
                    });

                    console.log('💬 Sending message to Gemini 1.5:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
                    const { output } = await chat.send(message);
                    const fallbackTime = performance.now() - fallbackStart;
                    
                    aiOutput = output;
                    modelUsed = 'gemini15Flash';
                    errorRecovery.recordSuccess('gemini15Flash');
                    
                    console.log('✅ Gemini 1.5 Flash FALLBACK SUCCESS!');
                    console.log('📊 Gemini 1.5 Response Stats:', {
                        responseTime: fallbackTime.toFixed(2) + 'ms',
                        outputLength: typeof output === 'string' ? output.length : JSON.stringify(output).length,
                        outputType: typeof output,
                        model: 'gemini15Flash'
                    });
                } else {
                    console.log('❌ Gemini 1.5 Flash circuit breaker is also OPEN');
                    console.log('📊 Gemini 1.5 circuit breaker stats:', errorRecovery.getCircuitBreakerStatus('gemini15Flash'));
                    throw new Error('Gemini 1.5 Flash circuit breaker is open');
                }
                
            } catch (fallbackError) {
                const fallbackFailTime = performance.now() - responseStartTime;
                console.error('❌ FALLBACK MODEL FAILED: Gemini 1.5 Flash');
                console.error('❌ Fallback Error Details:', {
                    requestId,
                    userId,
                    conversationId,
                    error: fallbackError.message,
                    errorType: fallbackError.name,
                    status: fallbackError.status,
                    code: fallbackError.code,
                    failureTime: fallbackFailTime.toFixed(2) + 'ms',
                    timestamp: new Date().toISOString()
                });
                
                try {
                    await analytics.trackModelFailure('gemini15Flash', fallbackError, fallbackFailTime);
                    console.log('✅ Fallback error logged and tracked');
                } catch (fallbackLoggingError) {
                    console.error('❌ Failed to log fallback error:', fallbackLoggingError);
                }
                
                // Check if we should try xAI as EMERGENCY fallback
                const shouldUseXAIEmergency = (
                    // Only use if both Gemini models are completely down
                    !errorRecovery.canMakeRequest('gemini20FlashExp') && 
                    !errorRecovery.canMakeRequest('gemini15Flash') &&
                    // And it's a critical service error (not rate limit or temporary)
                    (errorType === 'SERVICE_UNAVAILABLE' || errorType === 'AUTHENTICATION_ERROR' || errorType === 'NETWORK_ERROR')
                );
                
                if (shouldUseXAIEmergency) {
                    console.log('⚠️⚠️⚠️ EMERGENCY: ALL GEMINI MODELS DOWN - Using xAI as emergency fallback...');
                    console.log('🚨 Emergency Conditions Met:', {
                        gemini20Available: errorRecovery.canMakeRequest('gemini20FlashExp'),
                        gemini15Available: errorRecovery.canMakeRequest('gemini15Flash'),
                        errorType: errorType,
                        isEmergencyWorthy: shouldUseXAIEmergency
                    });
                    
                    try {
                        const xaiStart = performance.now();
                        console.log('🚨 EMERGENCY xAI Fallback - Using simplified prompt...');
                        
                        // Use a simplified prompt for xAI to avoid quality issues
                        const emergencyPrompt = `You are Mya, a Myavana hair care assistant. User: ${message}. Respond with helpful hair advice in JSON format with a messages array containing your response.`;
                        console.log('📝 EMERGENCY PROMPT:', emergencyPrompt);
                        
                        aiOutput = await callXAIFallback(emergencyPrompt, message, []);
                        const xaiTime = performance.now() - xaiStart;
                        modelUsed = 'xai-grok-3-mini-fast-EMERGENCY';
                        
                        console.log('✅ xAI EMERGENCY fallback SUCCESS!');
                        console.log('📊 xAI Emergency Response Stats:', {
                            responseTime: xaiTime.toFixed(2) + 'ms',
                            outputLength: typeof aiOutput === 'string' ? aiOutput.length : JSON.stringify(aiOutput).length,
                            outputType: typeof aiOutput,
                            model: 'xai-grok-3-mini-fast-EMERGENCY',
                            promptSimplified: true
                        });
                        
                        // Track emergency usage
                        try {
                            await analytics.trackEmergencyFallback(userId, conversationId, 'xai-emergency', {
                                primaryError: primaryError.message,
                                fallbackError: fallbackError.message,
                                errorType,
                                gemini20Status: errorRecovery.getCircuitBreakerStatus('gemini20FlashExp'),
                                gemini15Status: errorRecovery.getCircuitBreakerStatus('gemini15Flash')
                            });
                            console.log('✅ Emergency fallback tracked in analytics');
                        } catch (emergencyTrackingError) {
                            console.error('❌ Failed to track emergency fallback:', emergencyTrackingError);
                        }
                    
                    } catch (xaiError) {
                        const xaiFailTime = performance.now() - responseStartTime;
                        console.error('❌❌❌ COMPLETE SYSTEM FAILURE: Even xAI emergency fallback failed!');
                        console.error('❌ xAI Emergency Error Details:', {
                            requestId,
                            userId,
                            conversationId,
                            error: xaiError.message,
                            errorType: xaiError.name,
                            status: xaiError.status,
                            code: xaiError.code,
                            failureTime: xaiFailTime.toFixed(2) + 'ms',
                            timestamp: new Date().toISOString()
                        });
                        
                        try {
                            await analytics.trackModelFailure('xai-grok-3-mini-fast-EMERGENCY', xaiError, xaiFailTime);
                            await analytics.trackCompleteSystemFailure(userId, conversationId, {
                                primaryError: primaryError.message,
                                fallbackError: fallbackError.message,
                                emergencyError: xaiError.message,
                                totalTime: (performance.now() - responseStartTime).toFixed(2) + 'ms'
                            });
                        } catch (systemFailureLoggingError) {
                            console.error('❌ Failed to log complete system failure:', systemFailureLoggingError);
                        }
                        
                        const totalFailureTime = performance.now() - responseStartTime;
                        console.error('❌❌❌ COMPLETE SYSTEM FAILURE - All models exhausted in', totalFailureTime.toFixed(2), 'ms');
                        throw new Error(`COMPLETE SYSTEM FAILURE (${totalFailureTime.toFixed(2)}ms). Gemini 2.0: ${primaryError.message}, Gemini 1.5: ${fallbackError.message}, xAI Emergency: ${xaiError.message}`);
                    }
                } else {
                    // Don't use xAI - fail gracefully instead
                    console.log('❌❌❌ GEMINI MODELS FAILED - Conditions not met for xAI emergency fallback');
                    console.log('📊 Emergency Decision Analysis:', {
                        errorType: errorType,
                        gemini20Available: errorRecovery.canMakeRequest('gemini20FlashExp'),
                        gemini15Available: errorRecovery.canMakeRequest('gemini15Flash'),
                        shouldUseXAI: shouldUseXAIEmergency,
                        reason: 'xAI quality too poor for regular use - failing instead'
                    });
                    
                                // Track that we chose not to use xAI
                    try {
                        await analytics.trackXAISkipped(userId, conversationId, {
                            primaryError: primaryError.message,
                            fallbackError: fallbackError.message,
                            errorType,
                            reason: 'Emergency conditions not met - xAI quality too poor',
                            requestId,
                            timestamp: new Date().toISOString()
                        });
                        console.log('✅ xAI skip decision tracked in analytics');
                    } catch (skipTrackingError) {
                        console.error('❌ Failed to track xAI skip:', skipTrackingError);
                    }
                    
                    const totalFailureTime = performance.now() - responseStartTime;
                    console.error('❌❌❌ FAILING GRACEFULLY - xAI not used due to quality concerns');
                    throw new Error(`GEMINI MODELS FAILED (${totalFailureTime.toFixed(2)}ms) - xAI emergency conditions not met. Gemini 2.0: ${primaryError.message}, Gemini 1.5: ${fallbackError.message}`);
                }
            }
        }
        
        if (!aiOutput) {
            console.error('❌❌❌ CRITICAL: No AI output received from any model!');
            console.error('❌ Output validation failed:', {
                requestId,
                userId,
                conversationId,
                modelUsed,
                aiOutput: aiOutput,
                outputType: typeof aiOutput,
                timestamp: new Date().toISOString()
            });
            throw new Error('No AI output received from any model');
        }
        
        console.log('✅✅✅ AI MODEL SUCCESS!');
        console.log('🎆 Final AI Output received from:', modelUsed);

        const endGetResponse = performance.now();
        const responseTime = endGetResponse - responseStartTime;
        const totalTime = endGetResponse - start;
        
        console.log('⏱️ PERFORMANCE METRICS:');
        console.log('⏱️ AI Response Time:', (responseTime / 1000).toFixed(3) + 's');
        console.log('⏱️ Total Processing Time:', (totalTime / 1000).toFixed(3) + 's');
        console.log('⏱️ Chat History Load Time:', ((endGetChaHistory - start) / 1000).toFixed(3) + 's');
        console.log('🤖 Final Model Used:', modelUsed);
        console.log('📊 Request Performance Summary:', {
            requestId,
            userId,
            conversationId,
            modelUsed,
            aiResponseTime: (responseTime / 1000).toFixed(3) + 's',
            totalTime: (totalTime / 1000).toFixed(3) + 's',
            historyLoadTime: ((endGetChaHistory - start) / 1000).toFixed(3) + 's',
            messageLength: message.length,
            timestamp: new Date().toISOString()
        });
        
        // Handle different response formats depending on model used
        console.log('🧹 Processing AI response for client...');
        let cleanedResponse;
        if (modelUsed.includes('xai-grok')) {
            console.log('🔄 Processing xAI response format...');
            // xAI returns structured JSON, extract the messages array
            cleanedResponse = aiOutput.messages ? aiOutput.messages : aiOutput;
            console.log('✅ xAI response processed');
        } else {
            console.log('🔄 Processing Gemini response format...');
            // Gemini models return raw response that needs cleaning
            cleanedResponse = cleanKommunicateResponse(aiOutput);
            console.log('✅ Gemini response cleaned');
        }
        
        console.log('📊 Cleaned Response Stats:', {
            responseLength: JSON.stringify(cleanedResponse).length,
            responseType: typeof cleanedResponse,
            isArray: Array.isArray(cleanedResponse),
            hasMessages: cleanedResponse?.messages ? true : false
        });
        
        // Apply personalization to the response
        console.log('🎨 Applying personalization...');
        let personalizedResponse;
        try {
            const personalizationStart = performance.now();
            personalizedResponse = await personalization.getPersonalizedResponse(
                userId, 
                message, 
                cleanedResponse, 
                { 
                    contextAnalysis, 
                    modelUsed, 
                    responseTime,
                    userInfo 
                }
            );
            const personalizationTime = performance.now() - personalizationStart;
            
            console.log('✅ Personalization applied successfully in', personalizationTime.toFixed(2), 'ms');
            console.log('📊 Personalization Stats:', {
                applied: true,
                processingTime: personalizationTime.toFixed(2) + 'ms',
                originalLength: JSON.stringify(cleanedResponse).length,
                personalizedLength: JSON.stringify(personalizedResponse).length,
                hasUserContext: !!userInfo
            });
            
            // Track personalization metrics
            try {
                await analytics.trackPersonalizationSuccess(userId, conversationId, {
                    processingTime: personalizationTime,
                    modelUsed,
                    hasUserInfo: !!userInfo,
                    responseChanged: JSON.stringify(cleanedResponse) !== JSON.stringify(personalizedResponse)
                });
                console.log('✅ Personalization metrics tracked');
            } catch (personalizationTrackingError) {
                console.error('❌ Failed to track personalization metrics:', personalizationTrackingError);
            }
            
        } catch (personalizationError) {
            console.error('❌ Personalization failed, using base response:', personalizationError);
            console.error('❌ Personalization Error Details:', {
                requestId,
                userId,
                error: personalizationError.message,
                stack: personalizationError.stack
            });
            
            personalizedResponse = cleanedResponse;
            
            // Track personalization failure
            try {
                await analytics.trackPersonalizationFailure(userId, conversationId, {
                    error: personalizationError.message,
                    modelUsed,
                    hasUserInfo: !!userInfo
                });
                console.log('✅ Personalization failure tracked');
            } catch (failureTrackingError) {
                console.error('❌ Failed to track personalization failure:', failureTrackingError);
            }
        }
        
        // Track comprehensive AI response metrics
        console.log('📊 Tracking comprehensive AI response metrics...');
        try {
            const metricsStart = performance.now();
            
            // Track AI response with all metrics
            await analytics.trackAIResponse(userId, conversationId, personalizedResponse, modelUsed, responseTime, false);
            
            // Track detailed request metrics
            await analytics.trackRequestComplete(userId, conversationId, {
                requestId,
                totalTime: (performance.now() - start),
                aiResponseTime: responseTime,
                modelUsed,
                promptLength: aiPrompt ? aiPrompt.length : 0,
                messageLength: message.length,
                responseLength: JSON.stringify(personalizedResponse).length,
                chatHistoryLength: chatHistory.length,
                cacheHit: false,
                personalized: personalizedResponse !== cleanedResponse,
                hasUserInfo: !!userInfo,
                hasSummary: !!allchatsSummary
            });
            
            // Track model performance specifically
            await analytics.trackModelPerformance(modelUsed, {
                responseTime,
                success: true,
                promptTokens: Math.ceil((aiPrompt?.length || 0) / 4),
                responseTokens: Math.ceil(JSON.stringify(personalizedResponse).length / 4),
                requestId,
                userId
            });
            
            const metricsTime = performance.now() - metricsStart;
            console.log('✅ All AI response metrics tracked successfully in', metricsTime.toFixed(2), 'ms');
            
        } catch (analyticsError) {
            console.error('❌ Failed to track AI response analytics:', analyticsError);
            console.error('❌ Analytics Error Details:', {
                requestId,
                userId,
                conversationId,
                error: analyticsError.message,
                stack: analyticsError.stack
            });
            // Don't throw - continue with response even if analytics fail
        }
        
        // Cache the personalized response for future similar queries
        console.log('💾 Caching response for future use...');
        try {
            const cacheStart = performance.now();
            await responseCache.cacheResponse(
                message, 
                personalizedResponse, 
                { userId, userProfile: userInfo }, 
                contextAnalysis,
                { 
                    modelUsed, 
                    responseTime, 
                    personalized: personalizedResponse !== cleanedResponse,
                    requestId,
                    timestamp: new Date().toISOString()
                }
            );
            const cacheTime = performance.now() - cacheStart;
            
            console.log('✅ Response cached successfully in', cacheTime.toFixed(2), 'ms');
            
            // Track cache performance
            try {
                await analytics.trackCacheWrite(userId, conversationId, {
                    cacheTime,
                    responseSize: JSON.stringify(personalizedResponse).length,
                    modelUsed,
                    requestId
                });
                console.log('✅ Cache write metrics tracked');
            } catch (cacheTrackingError) {
                console.error('❌ Failed to track cache metrics:', cacheTrackingError);
            }
            
        } catch (cacheError) {
            console.error('❌ Failed to cache response:', cacheError);
            console.error('❌ Cache Error Details:', {
                requestId,
                userId,
                error: cacheError.message
            });
            // Don't throw - continue even if caching fails
        }
        
        // Send response to client
        console.log('📤 Sending final response to client...');
        res.json(personalizedResponse);
        
        const finalResponseTime = performance.now() - start;
        console.log('✅✅✅ RESPONSE SENT SUCCESSFULLY!');
        console.log('🎆 Final Success Metrics:', {
            requestId,
            userId,
            conversationId,
            totalTime: finalResponseTime.toFixed(2) + 'ms',
            modelUsed,
            responseLength: JSON.stringify(personalizedResponse).length,
            success: true
        });
        
        // Log clean response for debugging (truncated)
        const responsePreview = JSON.stringify(cleanedResponse).substring(0, 200);
        console.log('📝 AI Response Preview:', responsePreview + (responsePreview.length >= 200 ? '...[TRUNCATED]' : ''));

        // Add AI response to chat history
        chatHistory.push({ role: 'assistant', content: aiOutput });
        console.log('✅ AI response added to chat history');

        // Post-processing after getting AI response
        console.log('🔄 Starting post-processing...');
        try {
            const postProcessStart = performance.now();
            const postProcessData = await core.postProcessConversation(chatHistory, message);
            const postProcessTime = performance.now() - postProcessStart;
            
            console.log('✅ Post-process analysis completed in', postProcessTime.toFixed(2), 'ms');
            console.log('📊 Post-process Data:', {
                hasUserDetails: !!postProcessData.user_details,
                hasHairIssues: !!postProcessData.hair_issue_extractions,
                hasProductRecommendations: !!postProcessData.product_recommendations
            });
            
            // Final post-processing and data saving
            const finalProcessStart = performance.now();
            await core.postResponseProcessing(postProcessData, userId, aiOutput, allchatsSummary, conversationId, chatHistory, JSON.stringify(aiOutput));
            const finalProcessTime = performance.now() - finalProcessStart;
            
            console.log('✅ Final post-processing completed in', finalProcessTime.toFixed(2), 'ms');
            
            // Track post-processing success
            try {
                await analytics.trackPostProcessingSuccess(userId, conversationId, {
                    processingTime: postProcessTime + finalProcessTime,
                    dataExtracted: {
                        userDetails: !!postProcessData.user_details,
                        hairIssues: !!postProcessData.hair_issue_extractions,
                        recommendations: !!postProcessData.product_recommendations
                    },
                    requestId
                });
                console.log('✅ Post-processing success tracked');
            } catch (postTrackingError) {
                console.error('❌ Failed to track post-processing:', postTrackingError);
            }
            
            console.log('🏁 ===== REQUEST COMPLETED SUCCESSFULLY =====');
            console.log('🏆 Total Request Time:', (performance.now() - start).toFixed(2), 'ms');
            return;
            
        } catch (postProcessError) {
            console.error('❌ Post-processing failed:', postProcessError);
            console.error('❌ Post-processing Error Details:', {
                requestId,
                userId,
                conversationId,
                error: postProcessError.message,
                stack: postProcessError.stack
            });
            
            // Track post-processing failure
            try {
                await analytics.trackPostProcessingFailure(userId, conversationId, {
                    error: postProcessError.message,
                    requestId
                });
                console.log('✅ Post-processing failure tracked');
            } catch (failureTrackingError) {
                console.error('❌ Failed to track post-processing failure:', failureTrackingError);
            }
            
            console.log('⚠️ Response sent successfully despite post-processing failure');
            console.log('🏁 ===== REQUEST COMPLETED (WITH POST-PROCESS ERROR) =====');
            // Still return successful response to user even if post-processing fails
            return;
        }
    } catch (error) {
        const totalErrorTime = performance.now() - (arguments[0] ? performance.now() : Date.now());
        console.error('❌❌❌ CRITICAL REQUEST FAILURE!');
        console.error('❌❌❌ Global Error Handler Caught:', error);
        console.error('❌❌❌ Complete Error Details:', {
            requestId: requestId || 'undefined',
            userId: req.body?.from || 'undefined',
            conversationId: req.body?.groupId || 'undefined',
            message: req.body?.message?.substring(0, 100) || 'undefined',
            eventName: req.body?.eventName || 'undefined',
            errorMessage: error.message,
            errorName: error.name,
            errorStack: error.stack,
            errorCode: error.code,
            errorStatus: error.status,
            processingTime: totalErrorTime ? totalErrorTime.toFixed(2) + 'ms' : 'unknown',
            timestamp: new Date().toISOString(),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'unknown'
        });
        
        // Send error response
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
};

// Add startup logging
console.log('🚀 Myavana Handler Module Loaded Successfully');
console.log('📊 Module Load Time:', new Date().toISOString());
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('📊 Node Version:', process.version);

module.exports = myavanaHandler;

