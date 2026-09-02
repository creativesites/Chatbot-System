// agentMemory.js
// Local Agent Memory (LAM) — a self-hosted, TAM-inspired long-term memory layer
// built entirely on this Postgres instance (pgvector), so retrieval never leaves
// the existing AWS/GCP infra. Extraction follows the same LLM-structured-extraction
// pattern already used by postProcessConversation/classifyAndSavePersona.
const ai = require('./ai');
const { googleAI } = require('@genkit-ai/google-genai');
const { pgClient } = require('./database');

const EMBEDDER = googleAI.embedder('gemini-embedding-001'); // 768-dim output, matches agent_memories.embedding
const DUPLICATE_DISTANCE_THRESHOLD = 0.15; // cosine distance below this = treat as the same memory

async function embedText(text) {
    const [{ embedding }] = await ai.embed({ embedder: EMBEDDER, content: text });
    return `[${embedding.join(',')}]`;
}

const extractionPrompt = (chatHistory, latestMessage) => `
You are extracting durable, long-term memory facts about a hair-care customer from a conversation, for future personalization.

Only extract facts likely still true weeks or months from now (hair type/texture, product preferences or dislikes, allergies/sensitivities, long-term goals, established routines). Do NOT extract one-off statements, small talk, or anything already obviously covered by a generic hair-care questionnaire answer.

Conversation history:
${JSON.stringify(chatHistory)}

User's latest message:
"${latestMessage}"

Return a JSON array (0 to 3 items) of objects: { "content": string, "memory_type": "fact" | "preference" | "episodic", "importance_score": number between 0 and 1 }. Return an empty array if nothing durable was mentioned.
`;

/**
 * Extracts durable facts/preferences from the latest turn and stores them,
 * deduping against the user's existing memories by embedding similarity.
 * Non-blocking, best-effort — call from the async post-processing step.
 *
 * @param {string} userId
 * @param {string} conversationId
 * @param {Array<{role:string, content:string}>} chatHistory
 */
const extractAndStoreMemories = async (userId, conversationId, chatHistory) => {
    try {
        const latestUserTurn = [...chatHistory].reverse().find(m => m.role === 'user');
        if (!latestUserTurn?.content) return;

        const chat = ai.chat({
            model: googleAI.model('gemini-3.6-flash'),
            config: { temperature: 0.3 },
        });
        const { output } = await chat.send(extractionPrompt(chatHistory, latestUserTurn.content));

        const candidates = Array.isArray(output) ? output : [];
        for (const candidate of candidates) {
            if (!candidate?.content) continue;
            await upsertMemory(userId, conversationId, candidate);
        }
    } catch (err) {
        console.error('Error extracting agent memories:', err);
    }
};

async function upsertMemory(userId, conversationId, candidate) {
    const vectorLiteral = await embedText(candidate.content);

    const existing = await pgClient.query(
        `SELECT id, embedding <=> $2::vector AS distance
         FROM agent_memories
         WHERE user_id = $1
         ORDER BY embedding <=> $2::vector
         LIMIT 1`,
        [userId, vectorLiteral]
    );

    if (existing.rows.length > 0 && existing.rows[0].distance < DUPLICATE_DISTANCE_THRESHOLD) {
        await pgClient.query(
            `UPDATE agent_memories SET last_accessed_at = NOW(), access_count = access_count + 1 WHERE id = $1`,
            [existing.rows[0].id]
        );
        return;
    }

    await pgClient.query(
        `INSERT INTO agent_memories (user_id, memory_type, content, embedding, importance_score, source_conversation_id)
         VALUES ($1, $2, $3, $4::vector, $5, $6)`,
        [
            userId,
            candidate.memory_type || 'fact',
            candidate.content,
            vectorLiteral,
            typeof candidate.importance_score === 'number' ? candidate.importance_score : 0.5,
            conversationId,
        ]
    );
}

/**
 * Retrieves the k memories most semantically relevant to queryText for this user.
 *
 * @param {string} userId
 * @param {string} queryText - typically the current user message
 * @param {number} [k=5]
 * @returns {Promise<string[]>}
 */
const retrieveRelevantMemories = async (userId, queryText, k = 5) => {
    if (!queryText) return [];
    try {
        const vectorLiteral = await embedText(queryText);
        const res = await pgClient.query(
            `SELECT content FROM agent_memories WHERE user_id = $1 ORDER BY embedding <=> $2::vector LIMIT $3`,
            [userId, vectorLiteral, k]
        );
        return res.rows.map(row => row.content);
    } catch (err) {
        console.error('Error retrieving agent memories:', err);
        return [];
    }
};

module.exports = {
    extractAndStoreMemories,
    retrieveRelevantMemories,
};
