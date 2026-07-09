const core = require('myavana-bot-test-core');
const { googleAI } = require('@genkit-ai/google-genai');
const { performance } = require('perf_hooks');
const { constructPrompt } = require('./constructPrompt');
const { handleWelcomeEvent, handleImageMessage } = require('./eventHandlers');
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

// Initialize xAI client as fallback
let xai;
try {
    xai = new OpenAI({
        apiKey: process.env.XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
        timeout: 360000,
    });
    
    if (!process.env.XAI_API_KEY) {
        console.warn('⚠️ WARNING: XAI_API_KEY not found in environment variables');
    } else {
        console.log('✅ xAI client initialized successfully');
    }
} catch (xaiError) {
    console.error('❌ ERROR: Failed to initialize xAI client:', xaiError);
}

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

// Helper function to call xAI as fallback
async function callXAIFallback(aiPrompt, message, chatHistory) {
    console.log('🔄 Using xAI Grok as final fallback...');
    
    try {
        const messages = [
            { role: 'system', content: aiPrompt },
            ...chatHistory.slice(-10),
            { role: 'user', content: message }
        ];
        
        const response = await xai.chat.completions.create({
            model: 'grok-3-mini-fast',
            messages: messages,
            temperature: 1.1,
            response_format: { type: 'json_object' },
        });
        
        const output = response.choices[0].message.content;
        console.log('✅ Successfully used xAI Grok fallback');
        
        return JSON.parse(output);
    } catch (xaiError) {
        console.error('❌ xAI Grok fallback failed:', xaiError);
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
        console.log('🧠 Building prompt...');
        const aiPrompt = await constructPrompt(userId, userInfo, chatHistory, allchatsSummary, false);
        console.log('✅ Prompt generated successfully');

        // Try primary model first (Gemini 2.0)
        console.log('🤖 Starting AI model processing...');
        let aiOutput = null;
        let modelUsed = '';
        let responseStartTime = performance.now();
        
        try {
            console.log('📤 Trying Gemini 3.0 Flash Preview...');
            const chat = session.chat({
                model: googleAI.model('gemini-3-flash-preview'),
                system: aiPrompt,
                config: {
                    temperature: 1.1,
                },
            });
            
            const { output } = await chat.send(message);
            aiOutput = output;
            modelUsed = 'gemini20FlashExp';
            console.log('✅ Gemini 3.0 Flash Preview SUCCESS!');
            
        } catch (primaryError) {
            console.error('❌ PRIMARY MODEL FAILED: Gemini 3.0 Flash Preview');
            console.error('❌ Primary Error:', primaryError.message);
            
            try {
                console.log('🔄 Trying fallback to Gemini 2.5 Flash...');
                const chat = core.ai.chat({
                    model: googleAI.model('gemini-2.5-flash'),
                    system: aiPrompt,
                    config: {
                        temperature: 1.1,
                    },
                });

                const { output } = await chat.send(message);
                aiOutput = output;
                modelUsed = 'gemini15Flash';
                console.log('✅ Gemini 1.5 Flash FALLBACK SUCCESS!');
                
            } catch (fallbackError) {
                console.error('❌ FALLBACK MODEL FAILED: Gemini 1.5 Flash');
                console.error('❌ Fallback Error:', fallbackError.message);
                
                // Use xAI as final fallback
                console.log('🚨 Using xAI as final fallback...');
                aiOutput = await callXAIFallback(aiPrompt, message, chatHistory);
                modelUsed = 'xai-grok-3-mini-fast';
            }
        }
        
        if (!aiOutput) {
            throw new Error('No AI output received from any model');
        }
        
        console.log('✅✅✅ AI MODEL SUCCESS!');
        console.log('🎆 Final AI Output received from:', modelUsed);

        const responseTime = performance.now() - responseStartTime;
        console.log('⏱️ AI Response Time:', (responseTime / 1000).toFixed(3) + 's');

        // Handle different response formats depending on model used
        let cleanedResponse;
        if (modelUsed.includes('xai-grok')) {
            cleanedResponse = aiOutput.messages ? aiOutput.messages : aiOutput;
        } else {
            cleanedResponse = cleanKommunicateResponse(aiOutput);
        }
        
        console.log('✅ Response processed and cleaned');

        // Send response to client
        console.log('📤 Sending final response to client...');
        res.json(cleanedResponse);
        
        console.log('✅✅✅ RESPONSE SENT SUCCESSFULLY!');

        // Add AI response to chat history
        chatHistory.push({ role: 'assistant', content: aiOutput });

        // Post-processing
        console.log('🔄 Starting post-processing...');
        try {
            const postProcessData = await core.postProcessConversation(chatHistory, message);
            await core.postResponseProcessing(postProcessData, userId, aiOutput, allchatsSummary, conversationId, chatHistory, JSON.stringify(aiOutput));
            console.log('✅ Post-processing completed');
        } catch (postProcessError) {
            console.error('❌ Post-processing failed:', postProcessError);
        }
        
        console.log('🏁 ===== REQUEST COMPLETED SUCCESSFULLY =====');
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
};

console.log('🚀 Myavana Working Handler Module Loaded Successfully');
module.exports = myavanaHandler;