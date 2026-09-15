// conversation.js
const { pgClient, redisClient } = require('./database');
const ai = require('./ai');
const {
    isPlaceholderSummary,
    cleanTurnContent,
    buildTitleFromHistory,
    buildSummaryFromHistory,
} = require('./conversationMeta');

const saveConversationSummary = async (conversationId, userId, summary) => {
    const query = `
        INSERT INTO conversations (conversation_id, user_id, summary)
        VALUES ($1, $2, $3)
        ON CONFLICT (conversation_id)
        DO UPDATE SET summary = EXCLUDED.summary
        RETURNING *;
    `;
    if (isPlaceholderSummary(summary)) {
        // Never persist a fallback placeholder as if it were a real summary.
        return null;
    }
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
    try {
        const summaryPrompt = `Summarize the following conversation, getting all important information, especially the user's hair details, name, and location: ${JSON.stringify(chatHistory)}`;
        const { text } = await ai.generate({
            model: 'gemini-2.5-flash',
            prompt: summaryPrompt,
        });
        return text || "Conversation active.";
    } catch (err) {
        console.warn('⚠️ generateConversationSummary non-fatal fallback:', err.message);
        return "Conversation active.";
    }
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
    // Callers historically passed getAllConversationsSummary()'s value here,
    // which is a *cross-conversation* prompt-context string and is the literal
    // placeholder "conversation summary not available." when the member has no
    // summary yet. Persisting that gave every row the same useless summary and,
    // because titles were derived from it, the same useless title. Always store
    // a real per-conversation title/summary built from this conversation's own
    // history; a caller-supplied summary is only used when it is genuinely one.
    const effectiveSummary = buildSummaryFromHistory(chatHistory, summary);
    const title = buildTitleFromHistory(chatHistory, summary);

    const query = `
        INSERT INTO conversations (conversation_id, user_id, chat_history, summary, title)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (conversation_id)
        DO UPDATE SET chat_history = EXCLUDED.chat_history,
                      summary = EXCLUDED.summary,
                      title = EXCLUDED.title
        RETURNING *;
    `;
    const res = await pgClient.query(query, [
        conversationId, userId, JSON.stringify(chatHistory), effectiveSummary, title
    ]);
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

const deriveTitle = (summary, firstMsg) => {
    if (!isPlaceholderSummary(summary)) {
        const words = String(summary).split(/\s+/).slice(0, 6).join(' ');
        return words.replace(/[.:,;]+$/, '');
    }
    if (firstMsg) {
        const clean = cleanTurnContent(firstMsg);
        const words = clean.split(/\s+/).slice(0, 6).join(' ');
        return words.replace(/[.:,;]+$/, '') || 'Hair Journey Consultation';
    }
    return 'Hair Care Consultation';
};

const getUserConversationsList = async (userId) => {
    try {
        // chat_history comes back in full so a title/summary can always be built
        // from the real exchange, even for rows written before titles existed or
        // whose stored summary is one of the placeholder strings.
        const query = `
            SELECT conversation_id, title, summary, chat_history, created_at, updated_at,
                   jsonb_array_length(CASE WHEN jsonb_typeof(chat_history) = 'array' THEN chat_history ELSE '[]'::jsonb END) AS message_count
            FROM conversations
            WHERE user_id = $1
            ORDER BY COALESCE(updated_at, created_at) DESC
            LIMIT 30;
        `;
        const res = await pgClient.query(query, [userId]);
        return res.rows.map(r => {
            const history = Array.isArray(r.chat_history) ? r.chat_history : [];
            const title = (r.title && r.title.trim())
                ? r.title.trim()
                : buildTitleFromHistory(history, r.summary);
            return {
                id: r.conversation_id,
                title,
                summary: buildSummaryFromHistory(history, r.summary),
                messageCount: parseInt(r.message_count, 10) || 0,
                createdAt: r.created_at,
                updatedAt: r.updated_at || r.created_at
            };
        });
    } catch (err) {
        console.error('Error fetching user conversations list:', err);
        return [];
    }
};

/**
 * Writes a real title + summary for one conversation, derived from its own
 * history. Deterministic, so it costs no model call and works for the whole
 * historical backlog.
 */
const backfillConversationMeta = async (conversationId, chatHistory, existingSummary) => {
    const title = buildTitleFromHistory(chatHistory, existingSummary);
    const summary = buildSummaryFromHistory(chatHistory, existingSummary);
    await pgClient.query(
        `UPDATE conversations SET title = $1, summary = $2 WHERE conversation_id = $3`,
        [title, summary, conversationId]
    );
    return { title, summary };
};

module.exports = {
    saveConversationSummary,
    generateConversationSummary,
    getAllConversationsSummary,
    getConversationHistory,
    saveConversation,
    getAllChatsAsSingleArray,
    generateAndSaveSummary,
    getUserConversationsList,
    backfillConversationMeta,
    buildTitleFromHistory,
    buildSummaryFromHistory,
    isPlaceholderSummary,
    cleanTurnContent
};