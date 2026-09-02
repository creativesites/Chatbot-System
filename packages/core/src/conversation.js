// conversation.js
const { pgClient, redisClient } = require('./database');
const ai = require('./ai');
const { googleAI } = require('@genkit-ai/google-genai');

const saveConversationSummary = async (conversationId, userId, summary) => {
    const query = `
        INSERT INTO conversations (conversation_id, user_id, summary)
        VALUES ($1, $2, $3)
        ON CONFLICT (conversation_id)
        DO UPDATE SET summary = EXCLUDED.summary
        RETURNING *;
    `;
    const values = [conversationId, userId, summary];
    try {
        const res = await pgClient.query(query, values);
        await redisClient.set(`summary:${userId}`, summary, { EX: 3600 });
        return res.rows[0];
    } catch (err) {
        console.error('Error saving conversation summary:', err);
        throw err;
    }
};

const generateConversationSummary = async (chatHistory) => {
    if (!chatHistory || chatHistory.length === 0) {
        return "No conversation history available.";
    }
    const summaryPrompt = `Summarize the following conversation, getting all important information, especially the user's hair details, name, and location: ${JSON.stringify(chatHistory)}`;
    const { text } = await ai.chat({
        model: googleAI.model('gemini-3.6-flash'),
        system: summaryPrompt,
    });
    return text;
};

const getAllConversationsSummary = async (userId) => {
    try {
        // Check Redis cache first
        const cachedSummary = await redisClient.get(`summary:${userId}`);
        if (cachedSummary) return cachedSummary;

        // If not in Redis, query PostgreSQL
        const query = `SELECT summary FROM conversations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1;`;
        const values = [userId];
        const res = await pgClient.query(query, values);

        if (Array.isArray(res.rows) && res.rows.length > 0 && res.rows[0]?.summary) {
            // Cache the summary in Redis
            await redisClient.set(`summary:${userId}`, res.rows[0].summary, { EX: 3600 }); // Cache for 1 hour
            return res.rows[0].summary;
        }

        return 'conversation summary not available.'; // No summary available
    } catch (err) {
        console.error('Error retrieving all conversations summary:', err);
        return 'conversation summary not available.';
    }
};

const getConversationHistory = async (conversationId, userId) => {
    try {
        // Check Redis cache first
        const cachedConversation = await redisClient.get(`conversation:${conversationId}`);
        if (cachedConversation) return JSON.parse(cachedConversation).chatHistory;

        // If not in Redis, query PostgreSQL
        const query = `SELECT chat_history FROM conversations WHERE conversation_id = $1 AND user_id = $2;`;
        const values = [conversationId, userId];
        const res = await pgClient.query(query, values);

        if (res.rows[0]) {
            // Cache the conversation history in Redis
            await redisClient.set(`conversation:${conversationId}`, JSON.stringify({ chatHistory: res.rows[0].chat_history }));
            return res.rows[0].chat_history;
        }

        return []; // New conversation
    } catch (err) {
        console.error('Error retrieving conversation history:', err);
        return []; // New conversation
    }
};

const saveConversation = async (conversationId, userId, chatHistory, summary) => {
    const query = `
        INSERT INTO conversations (conversation_id, user_id, chat_history, summary)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (conversation_id)
        DO UPDATE SET chat_history = EXCLUDED.chat_history, summary = EXCLUDED.summary
        RETURNING *;
    `;
    const res = await pgClient.query(query, [conversationId, userId, JSON.stringify(chatHistory), summary]);
    await redisClient.set(`conversation:${conversationId}`, JSON.stringify({ chatHistory: chatHistory }));
    return res.rows[0];
};

const getAllChatsAsSingleArray = async (userId) => {
    try {
        const query = `
            SELECT chat_history
            FROM conversations
            WHERE user_id = $1
            ORDER BY created_at ASC;
        `;
        const values = [userId];

        const res = await pgClient.query(query, values);

        if (!res.rows || res.rows.length === 0) {
            return [];
        }

        let allChats = [];

        for (const row of res.rows) {
            if (row.chat_history && Array.isArray(row.chat_history)) {
                allChats = allChats.concat(row.chat_history);
            } else if (row.chat_history) {
                try {
                    const parsedHistory = JSON.parse(row.chat_history);
                    if (Array.isArray(parsedHistory)) {
                        allChats = allChats.concat(parsedHistory);
                    } else {
                        console.warn(`Unexpected chat_history format for user ${userId}:`, row.chat_history);
                    }
                } catch (parseError) {
                    console.error(`Error parsing chat_history for user ${userId}:`, parseError, row.chat_history);
                }
            }
        }

        return allChats;

    } catch (err) {
        console.error('Error retrieving all chats:', err);
        return [];
    }
};

const generateAndSaveSummary = async (userId, conversationId, chatHistory) => {
    const allChatz = await getAllChatsAsSingleArray(userId);
    const newSummary = await generateConversationSummary(allChatz.length ? allChatz : chatHistory);
    await saveConversationSummary(conversationId, userId, newSummary);
    return newSummary;
};

module.exports = {
    saveConversationSummary,
    generateConversationSummary,
    getAllConversationsSummary,
    getConversationHistory,
    saveConversation,
    getAllChatsAsSingleArray,
    generateAndSaveSummary
};