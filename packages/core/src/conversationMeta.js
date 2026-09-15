// conversationMeta.js
//
// Pure helpers for deriving a conversation's title and summary from its own
// chat history. Deliberately dependency-free (no pg, no redis, no ai) so the
// backfill script and any test can use them without opening connections.

/**
 * Placeholder strings various fallbacks return when they have nothing real to
 * say. These were being persisted into conversations.summary and then used to
 * derive titles, so every conversation ended up titled "conversation summary
 * not available".
 */
const PLACEHOLDER_SUMMARIES = [
    'conversation summary not available.',
    'no conversation history available.',
    'conversation active.',
    'hair journey discussion',
    'personalized hair care consultation',
];

function isPlaceholderSummary(summary) {
    if (!summary || typeof summary !== 'string') return true;
    return PLACEHOLDER_SUMMARIES.includes(summary.trim().toLowerCase());
}

/**
 * Stored user turns carry a wire prefix:
 *   "2026-09-14T23:18:04.975Z - User Said: <text>"
 * Titles and summaries must be built from what the member actually typed, not
 * the transport envelope around it.
 */
function cleanTurnContent(content) {
    return String(content || '')
        .replace(/^\s*\d{4}-\d{2}-\d{2}T[\d:.]+Z?\s*-\s*(?:User Said|Assistant Said|Mya Said)\s*:\s*/i, '')
        .replace(/\[Photo Attached:[^\]]*\]/gi, '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#*_`]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function firstTurnByRole(chatHistory, roles) {
    if (!Array.isArray(chatHistory)) return '';
    const turn = chatHistory.find(
        (t) => t && roles.includes(t.role) && cleanTurnContent(t.content)
    );
    return turn ? cleanTurnContent(turn.content) : '';
}

function truncate(text, max) {
    const clean = String(text || '').trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max - 1).replace(/[\s,;:.\-]+$/, '') + '…';
}

/**
 * A short, human title taken from what the member opened with. Deterministic
 * and free - no model call - so every conversation can have one, including the
 * historical backlog.
 */
function buildTitleFromHistory(chatHistory, summary) {
    const opener = firstTurnByRole(chatHistory, ['user']);
    if (opener) {
        const sentence = opener.split(/[?.!\n]/)[0].trim() || opener;
        return truncate(sentence, 52) || 'Hair Care Consultation';
    }
    if (!isPlaceholderSummary(summary)) {
        return truncate(String(summary).split(/[.\n]/)[0], 52);
    }
    return 'Hair Care Consultation';
}

/**
 * A one-line preview of the exchange. Prefers a real stored summary; otherwise
 * builds one from the opening question and Mya's reply.
 */
function buildSummaryFromHistory(chatHistory, summary) {
    if (!isPlaceholderSummary(summary)) {
        return truncate(summary, 220);
    }
    const opener = firstTurnByRole(chatHistory, ['user']);
    const reply = firstTurnByRole(chatHistory, ['assistant', 'model']);
    if (opener && reply) return truncate(`${opener} — ${reply}`, 220);
    if (opener) return truncate(opener, 220);
    if (reply) return truncate(reply, 220);
    return 'Hair care conversation with Mya.';
}

module.exports = {
    PLACEHOLDER_SUMMARIES,
    isPlaceholderSummary,
    cleanTurnContent,
    buildTitleFromHistory,
    buildSummaryFromHistory,
};
