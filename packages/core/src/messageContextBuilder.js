// messageContextBuilder.js
// Single injection point for all per-message dynamic context.
// Order of blocks injected before each chat.send():
//   1. Persona   — tone, style, trend framing instruction
//   2. Trends    — what's currently popular in hair care (48h TTL)
//   3. Driver    — what the AI should DO this turn (trend-aware)

const { getUserPersona, buildContextBlock } = require('./personaClassifier');
const { getConversationDirective, inferStage, extractTrendSummary } = require('./conversationDriver');
const { getTrendContext } = require('./trendManager');

/**
 * Assembles the dynamic context block to prepend to each user message before chat.send().
 * Returns an empty string when there is nothing to inject (first-time users, errors).
 *
 * @param {string} userId
 * @param {Array<{role:string, content:string}>} [chatHistory=[]]
 * @returns {Promise<string>}
 */
async function buildMessageContext(userId, chatHistory = []) {
    const parts = [];

    // Shared state — built up across steps so later steps can use earlier results
    let personaType  = null;
    let trendContext = '';

    // 1. Persona context (tone + communication style)
    //    Built first so trendFraming can be attached to persona block below
    let persona = null;
    try {
        persona = await getUserPersona(userId);
        if (persona) personaType = persona.personaType || null;
    } catch (err) {
        console.error('buildMessageContext: persona fetch failed:', err.message);
    }

    // 2. Trend context (what's trending — 48h cache, background refresh)
    try {
        const stage = inferStage(chatHistory);
        trendContext = await getTrendContext(stage, personaType);
    } catch (err) {
        console.error('buildMessageContext: trend fetch failed:', err.message);
    }

    // Now build the persona block — hasTrends flag triggers trend framing instruction
    if (persona) {
        try {
            const block = buildContextBlock(persona, trendContext.length > 0);
            if (block) parts.push(block);
        } catch (err) {
            console.error('buildMessageContext: buildContextBlock failed:', err.message);
        }
    }

    // Add trend block after persona
    if (trendContext) parts.push(trendContext);

    // 3. Conversation-driving directive (trend-aware, persona-aware)
    try {
        const trendSummary = extractTrendSummary(trendContext);
        const directive = getConversationDirective(chatHistory, personaType, trendSummary);
        if (directive) parts.push(directive);
    } catch (err) {
        console.error('buildMessageContext: conversation driver failed:', err.message);
    }

    return parts.join('');
}

module.exports = { buildMessageContext };
