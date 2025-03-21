const core = require('myavana-bot-test-core');
const { gemini15Flash, googleAI, gemini20FlashExp } = require('@genkit-ai/googleai');
const { performance } = require('perf_hooks');
const { constructPrompt } = require('./constructPrompt'); // Local to sienna-naturals
const { handleWelcomeEvent, handleImageMessage } = require('./eventHandlers'); // Local to sienna-naturals

// Initialize databases (from core)
core.connectDatabases().then(() => console.log('Connected to databases'));

 const siennaNaturalsHandler = async (req, res) => {
    try {
        const start = performance.now();
        console.log('req-body:', JSON.stringify(req.body));
        const { message, from: userId, groupId: conversationId, eventName, metadata, contentType, source, chatKey } = req.body;

        if (eventName === "WELCOME") {
            await handleWelcomeEvent(res, userId);
            return;
        }

        // Load session using core's DatabaseSessionStore
        const session = await core.ai.loadSession(userId, {
            store: new core.DatabaseSessionStore(),
        });

        // Fetch user details and conversation history using core functions
        const [allchatsSummary, userInfo] = await Promise.all([
            core.getAllConversationsSummary(userId),
            core.getUserDetails(userId),
        ]);

        let chatHistory = await core.getConversationHistory(conversationId, userId);
        if (!Array.isArray(chatHistory)) {
            chatHistory = []; // Initialize to empty array if it's a new chat
        }

        if (eventName === "KOMMUNICATE_MEDIA_EVENT") {
            const handled = await handleImageMessage(eventName, metadata, userId, conversationId, chatHistory, res, message);
            if (handled) return;
        }

        // Timestamp user message
        const timestampedUserSaid = `${new Date().toISOString()} - User Said: ${message}`;
        chatHistory.push({ role: 'user', content: timestampedUserSaid });

        const endGetChaHistory = performance.now();
        console.log(`Time taken to get chat history is ${(endGetChaHistory - start) / 1000}s.`);

        const DEFAULT_IMAGES = {
            primary: "https://www.siennanaturals.com/cdn/shop/files/banner1.jpg",
            secondary: [
                "https://www.siennanaturals.com/cdn/shop/files/hannah_issa_duo_ed709ef3-f5f4-424d-9372-e24c03be8f7c_370x230@2x.png",
                "https://www.siennanaturals.com/cdn/shop/files/navigation_customertestimonials_370x230@2x.jpg",
                "https://www.siennanaturals.com/cdn/shop/files/Mobile_48_370x230@2x.png",
            ],
        };

        try {
            const aiPrompt = await constructPrompt(userId, userInfo, chatHistory, allchatsSummary, false); // Local to sienna-naturals
            console.log('generated prompt:', aiPrompt);

            const chat = session.chat({
                model: gemini20FlashExp,
                system: aiPrompt,
                config: {
                    temperature: 1.1,
                },
            });

            const { output } = await chat.send(message);
            const endGetResponse = performance.now();
            console.log(`Time taken to get AI response is ${(endGetResponse - endGetChaHistory) / 1000}s.`);
            console.log(`Total time taken to return response is ${(endGetResponse - start) / 1000}s.`);

            res.json(output);
            console.log('AI response 1:', JSON.stringify(output));

            chatHistory.push({ role: 'assistant', content: output });

            // Post-processing after getting AI response
            const postProcessData = await core.postProcessConversation(chatHistory, message);
            return await core.postResponseProcessing(postProcessData, userId, output, allchatsSummary, conversationId, chatHistory, JSON.stringify(output));

        } catch (e) {
            console.log(e);
            const aiPrompt = await constructPrompt(userId, userInfo, chatHistory, allchatsSummary, false); // Local to sienna-naturals
            console.log('generated prompt:', aiPrompt);

            const chat = core.ai.chat({
                model: gemini15Flash,
                system: aiPrompt,
                config: {
                    temperature: 1.1,
                },
            });

            const { output } = await chat.send(message);
            const endGetResponse = performance.now();
            console.log(`Total time taken to return response is ${(endGetResponse - start) / 1000}s.`);
            console.log('AI response 2:', JSON.stringify(output));

            res.json(output);
            chatHistory.push({ role: 'assistant', content: output });

            // Post-processing after getting AI response
            const postProcessData = await core.postProcessConversation(chatHistory, message);
            return await core.postResponseProcessing(postProcessData, userId, output, allchatsSummary, conversationId, chatHistory, JSON.stringify(output));
        }
    } catch (error) {
        console.error("Error yaitika ndeiyi:", error);
        return res.status(500).send(`Error, ${error.message || error}`);
    }
};

 module.exports = siennaNaturalsHandler;