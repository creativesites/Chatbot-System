const core = require('myavana-bot-test-core');
const OpenAI = require('openai');
const { performance } = require('perf_hooks');
const { constructPrompt } = require('./constructPrompt');
const { handleWelcomeEvent, handleImageMessage } = require('./eventHandlers');
require('dotenv').config();

// Initialize xAI client using OpenAI SDK
const xai = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1', // xAI API endpoint
});

// Initialize databases
core.connectDatabases().then(() => console.log('Connected to databases'));

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

const myavanaHandler = async (req, res) => {
    try {
        const start = performance.now();
        console.log('req-body:', JSON.stringify(req.body));
        const { message, from: userId, groupId: conversationId, eventName, metadata, contentType, source, chatKey } = req.body;

        if (eventName === "WELCOME") {
            await handleWelcomeEvent(res, userId);
            return;
        }

        // Load session
        const session = await core.ai.loadSession(userId, {
            store: new core.DatabaseSessionStore(),
        });

        // Fetch user details and conversation history
        const [allchatsSummary, userInfo] = await Promise.all([
            core.getAllConversationsSummary(userId),
            core.getUserDetails(userId),
        ]);

        let chatHistory = await core.getConversationHistory(conversationId, userId);
        if (!Array.isArray(chatHistory)) {
            chatHistory = [];
        }
        

        if (eventName === "KOMMUNICATE_MEDIA_EVENT") {
            const handled = await handleImageMessage(eventName, metadata, userId, conversationId, chatHistory, res, message, userInfo, session, xai);
            if (handled) return;
        }

        // Timestamp user message
        const timestampedUserSaid = `${new Date().toISOString()} - User Said: ${message}`;
        chatHistory.push({ role: 'user', content: timestampedUserSaid });

        console.log('chatHistory:', JSON.stringify(chatHistory))

        const endGetChatHistory = performance.now();
        console.log(`Time taken to get chat history: ${(endGetChatHistory - start) / 1000}s`);

        try {
            const aiPrompt = await constructPrompt(userId, userInfo, chatHistory, allchatsSummary, false);
            
            // Use xAI Grok 3 via OpenAI SDK

            chatHistory.push({ "role": "user", "content": message });
            chatHistory.unshift({ "role": "system", "content": aiPrompt });
            
            const response = await xai.chat.completions.create({
                model: 'grok-3-mini-fast', // Use Grok 3 model
                messages: chatHistory,
                temperature: 1.1,
                response_format: { type: 'json_object' },
            });

            const output = response.choices[0].message.content;
            const endGetResponse = performance.now();
            console.log(`Time taken to get AI response: ${(endGetResponse - endGetChatHistory) / 1000}s`);
            console.log(`Total time taken: ${(endGetResponse - start) / 1000}s`);

            const cleanedResponse = cleanKommunicateResponse(JSON.parse(output));
            const responseData = cleanedResponse && cleanedResponse.length > 0 
                ? (cleanedResponse[0].messages || cleanedResponse[0]) 
                : cleanedResponse;
            res.json(responseData);
            console.log('AI response:', JSON.stringify(responseData));

            chatHistory.push({ role: 'assistant', content: output });

            // Post-processing
            const postProcessData = await core.postProcessConversation(chatHistory, message);
            await core.postResponseProcessing(postProcessData, userId, output, allchatsSummary, conversationId, chatHistory, output);

        } catch (e) {
            console.error('Primary model failed, falling back:', e);
            const aiPrompt = await constructPrompt(userId, userInfo, chatHistory, allchatsSummary, true);
            
            // Fallback to Grok 3 (same model, simpler config)
            const response = await xai.chat.completions.create({
                model: 'grok-3-mini-fast',
                messages: [
                    { role: 'system', content: aiPrompt },
                    { role: 'user', content: message },
                ],
                temperature: 1.1,
                response_format: { type: 'json_object' },
            });

            const output = response.choices[0].message.content;
            const endGetResponse = performance.now();
            console.log(`Total time taken: ${(endGetResponse - start) / 1000}s`);
            console.log('Fallback AI response:', output);

            const parsedOutput = JSON.parse(output);
            res.json(parsedOutput.messages || parsedOutput);
            chatHistory.push({ role: 'assistant', content: output });

            // Post-processing
            const postProcessData = await core.postProcessConversation(chatHistory, message);
            await core.postResponseProcessing(postProcessData, userId, output, allchatsSummary, conversationId, chatHistory, output);
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send(`Error, ${error.message || error}`);
    }
};

module.exports = myavanaHandler;