// conversationDriver.js
// Analyzes conversation state and generates per-message behavioral directives
// that guide how the AI should engage — not just what to say, but what to DO.
//
// Injected as a small context block via buildMessageContext(), alongside
// the persona block from personaClassifier.
//
// The goal: make the AI a conversation driver, not just a responder.

// ---------------------------------------------------------------------------
// Stage definitions — mirrors the 8-stage framework in system.js
// ---------------------------------------------------------------------------

const STAGES = {
    1: { name: 'something-new',     label: 'Something New' },
    2: { name: 'rocking-this',      label: 'Rocking This' },
    3: { name: 'experimenting',     label: 'Experimenting' },
    4: { name: 'boredom',           label: 'Boredom' },
    5: { name: 'desperation',       label: 'Desperation' },
    6: { name: 'damage-protection', label: 'Damage/Protection' },
    7: { name: 'repair-decision',   label: 'Repair/Decision' },
    8: { name: 'hair-nirvana',      label: 'Hair Nirvana' },
};

// Keywords used to infer stage from recent messages (subset of system.js table)
const STAGE_KEYWORDS = [
    { stage: 8, words: ['nirvana', 'love my routine', 'healthy and happy', 'low maintenance', 'carefree', 'content', 'maintaining my hair'] },
    { stage: 7, words: ['repairing', 'restoring', 'healing', 'new direction', 'making progress', 'growing out'] },
    { stage: 6, words: ['damage', 'heat damage', 'protective style', 'split ends', 'overprocessed', 'breakage', 'weak hair'] },
    { stage: 5, words: ['desperate', 'overwhelmed', 'hate my hair', "don't know what to do", 'frustrated', 'give up', 'stressed', 'hopeless'] },
    { stage: 4, words: ['bored', 'need a change', 'stale', 'want something different', 'tired of my hair', 'ready for something new'] },
    { stage: 3, words: ['experimenting', 'trying new things', 'curious about', 'exploring', 'want to try', 'different styles'] },
    { stage: 2, words: ['love my hair', 'happy with it', 'feeling good', "i'm rocking", 'in my element', 'confident'] },
    { stage: 1, words: ['big chop', 'new color', 'first time', 'starting over', 'fresh start', 'just cut my hair', 'new style'] },
];

// ---------------------------------------------------------------------------
// Analysis helpers
// ---------------------------------------------------------------------------

/**
 * Infer the most likely stage from recent user messages.
 * Scans last 4 user messages — recent context is more reliable than old.
 * Returns the highest-priority (lowest number wins ties) matched stage, or null.
 *
 * @param {Array<{role:string, content:string}>} chatHistory
 * @returns {number|null}
 */
function inferStage(chatHistory) {
    const recentUserMessages = chatHistory
        .filter(m => m.role === 'user')
        .slice(-4)
        .map(m => (m.content || '').toLowerCase());

    const combined = recentUserMessages.join(' ');
    if (!combined) return null;

    for (const { stage, words } of STAGE_KEYWORDS) {
        if (words.some(w => combined.includes(w))) return stage;
    }
    return null;
}

/**
 * Count how many of the last N AI turns ended with a question.
 * Rough but effective: any turn containing '?' is considered a question turn.
 *
 * @param {Array<{role:string, content:string}>} chatHistory
 * @param {number} lookback  How many recent AI turns to check (default 3)
 * @returns {{ total: number, withQuestion: number, lastTurnHadQuestion: boolean }}
 */
function analyzeAIQuestions(chatHistory, lookback = 3) {
    const aiTurns = chatHistory
        .filter(m => m.role === 'model' || m.role === 'assistant')
        .slice(-lookback);

    const withQuestion = aiTurns.filter(m => (m.content || '').includes('?')).length;
    const lastTurnHadQuestion = aiTurns.length > 0
        ? (aiTurns[aiTurns.length - 1].content || '').includes('?')
        : false;

    return { total: aiTurns.length, withQuestion, lastTurnHadQuestion };
}

/**
 * Returns rough conversation depth category.
 *
 * @param {Array} chatHistory
 * @returns {'opening'|'exploring'|'deepening'|'action-ready'}
 */
function getDepthCategory(chatHistory) {
    const userTurns = chatHistory.filter(m => m.role === 'user').length;
    if (userTurns <= 1)  return 'opening';
    if (userTurns <= 3)  return 'exploring';
    if (userTurns <= 7)  return 'deepening';
    return 'action-ready';
}

// ---------------------------------------------------------------------------
// Directive builder
// ---------------------------------------------------------------------------

/**
 * Generates a short behavioral directive string based on conversation state.
 * Returns empty string when the conversation needs no additional steering.
 *
 * @param {object}      opts
 * @param {number|null} opts.stage          - Inferred stage number (1–8) or null
 * @param {string}      opts.depth          - 'opening'|'exploring'|'deepening'|'action-ready'
 * @param {object}      opts.questionStats  - From analyzeAIQuestions()
 * @param {string|null} opts.personaType    - From personaClassifier (optional)
 * @param {string|null} opts.trendSummary   - Short trend names string from trendManager (optional)
 * @returns {string}
 */
function buildDrivingDirective({ stage, depth, questionStats, personaType, trendSummary = null, hasKnownProfile = false }) {
    const parts = [];

    // Opening: always gather profile info if we don't have a stage read yet, UNLESS profile is already known
    if (depth === 'opening' && stage === null) {
        if (hasKnownProfile) {
            parts.push('tailor your direct advice based on their existing hair profile — do not ask for known profile traits');
        } else {
            parts.push('ask one open question to understand their hair type or primary concern — do not assume');
        }
    }

    // Exploring: AI should be asking questions to understand, not just informing
    else if (depth === 'exploring') {
        if (!questionStats.lastTurnHadQuestion && !hasKnownProfile) {
            parts.push('end your response with a specific follow-up question to learn more about their routine or goals');
        }
        if (stage !== null) {
            parts.push(`stage context: ${STAGES[stage]?.label} — tailor your depth and tone accordingly`);
        }
    }

    // Deepening: AI has enough info — guide toward insight or next step
    else if (depth === 'deepening') {
        if (questionStats.withQuestion === 0) {
            // Stagnating — use a trend as a new angle if available
            if (trendSummary) {
                parts.push(`conversation needs new momentum — introduce a trending topic (${trendSummary}) as a natural next angle`);
            } else {
                parts.push('the conversation needs forward momentum — ask something that surfaces a new dimension (routine, history, environment, goals)');
            }
        } else if (stage === 3 && trendSummary) {
            // Experimenting + trend: give them concrete options to try
            parts.push(`user is experimenting — reference a trending technique (${trendSummary}) as one option worth exploring`);
        } else if (stage === 4 && trendSummary) {
            // Boredom + trend: use trend as the inspiration for change
            parts.push(`user is bored — use a current trend (${trendSummary}) as inspiration to spark excitement about a change`);
        } else if (stage !== null && stage >= 5 && stage <= 7) {
            // High-need stages — gently surface Myavana solutions
            parts.push('user is in a high-need phase — after addressing their question, briefly introduce a relevant Myavana service as a natural next step (do not push)');
        }
    }

    // Action-ready: longer conversation — move toward a decision or commitment
    else if (depth === 'action-ready') {
        if (stage !== null && stage >= 5 && stage <= 7) {
            if (trendSummary) {
                parts.push(`well-developed conversation — guide toward a concrete action; a trending approach (${trendSummary}) could be the bridge to a Myavana service`);
            } else {
                parts.push('this is a well-developed conversation — guide the user toward a concrete action: a Myavana service, a specific routine step, or a commitment to try something');
            }
        } else if (stage === 8) {
            parts.push('user is thriving — celebrate their progress and offer maintenance tips; keep the energy positive and light');
        } else if (trendSummary) {
            parts.push(`offer a specific personalized recommendation; consider whether a trending technique (${trendSummary}) is relevant to their situation`);
        } else {
            parts.push('this conversation is deep enough to offer a specific personalized recommendation; do not stay generic');
        }
    }

    // Cross-cutting: overwhelmed users should not be pushed toward action too soon
    if (personaType === 'overwhelmed' && parts.some(p => p.includes('action') || p.includes('service') || p.includes('trending'))) {
        const idx = parts.findIndex(p => p.includes('action') || p.includes('service') || p.includes('trending'));
        if (idx !== -1) {
            parts[idx] = 'when the moment feels right, gently surface one option — but lead with empathy first';
        }
    }

    if (parts.length === 0) return '';
    return `[Conversation driver: ${parts.join('; ')}]\n`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyses chat history and returns a driving directive string to inject
 * into the message context. Returns empty string when nothing needed.
 *
 * @param {Array<{role:string, content:string}>} chatHistory
 * @param {string|null} personaType   - From personaClassifier (optional)
 * @param {string|null} trendSummary  - Trend names from trendManager (optional)
 * @returns {string}
 */
function getConversationDirective(chatHistory, personaType = null, trendSummary = null, hasKnownProfile = false) {
    if (!chatHistory || chatHistory.length === 0) {
        if (hasKnownProfile) {
            return '[Conversation driver: welcome the member warmly, acknowledge their hair profile is already connected, and directly invite their questions or hair goals]\n';
        }
        return '[Conversation driver: this is the very first message — warmly open with a question about their hair type or what brings them in today]\n';
    }

    const stage         = inferStage(chatHistory);
    const depth         = getDepthCategory(chatHistory);
    const questionStats = analyzeAIQuestions(chatHistory);

    return buildDrivingDirective({ stage, depth, questionStats, personaType, trendSummary, hasKnownProfile });
}

/**
 * Convenience — extracts just the trend summary string from a trend context block.
 * e.g. "[Trending in hair care: scalp detoxing; rice water]\n" → "scalp detoxing; rice water"
 *
 * @param {string} trendContext  - Full trend block from trendManager.getTrendContext()
 * @returns {string|null}
 */
function extractTrendSummary(trendContext) {
    if (!trendContext) return null;
    const match = trendContext.match(/\[Trending in hair care: (.+?)\]/);
    return match ? match[1] : null;
}

module.exports = {
    getConversationDirective,
    extractTrendSummary,
    // Exported for testing
    inferStage,
    analyzeAIQuestions,
    getDepthCategory,
    buildDrivingDirective,
    STAGES,
};
