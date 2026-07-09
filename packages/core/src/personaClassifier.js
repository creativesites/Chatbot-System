// personaClassifier.js
const { pgClient, redisClient } = require('./database');

const PERSONA_TYPES = {
    OVERWHELMED:     'overwhelmed',     // stressed, multiple issues, needs reassurance
    RESEARCHER:      'researcher',      // detail-oriented, wants science and data
    EXPLORER:        'explorer',        // curious, open to experimenting, asks broad questions
    ACTION_ORIENTED: 'action-oriented', // short messages, wants quick steps and no fluff
    ENGAGED:         'engaged',         // high session depth, follows through on suggestions
};

const COMMUNICATION_STYLES = {
    NURTURING:    'nurturing',    // warm, validating, patient
    PROFESSIONAL: 'professional', // clear, structured, minimal filler
    CASUAL:       'casual',       // friendly, relatable, light
    CONCISE:      'concise',      // brief, direct, bullet points preferred
};

const REDIS_TTL = 60 * 60 * 24; // 24h

/**
 * Classifies user persona from post-processing signals and conversation patterns.
 * Pure function — no I/O. Safe to call any time without side effects.
 *
 * @param {object} opts
 * @param {object} opts.profileUpdates - Fields extracted by postProcessConversation
 * @param {Array}  opts.chatHistory    - Full conversation history array
 * @returns {{ personaType, communicationStyle, toneDirectives: string[] }}
 */
function classifyFromSignals({ profileUpdates = {}, chatHistory = [] }) {
    const {
        confidence_level_inferred,
        desperation_level_inferred,
        experimenting_interest,
        boredom_expression,
    } = profileUpdates;

    const userMessages = chatHistory.filter(m => m.role === 'user');
    const messageCount = userMessages.length;
    const avgLength = messageCount > 0
        ? userMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / messageCount
        : 0;

    let personaType = PERSONA_TYPES.ENGAGED;
    let communicationStyle = COMMUNICATION_STYLES.CASUAL;
    const toneDirectives = [];

    // Overwhelmed: high desperation or expressed low confidence
    if (desperation_level_inferred === 'high' || confidence_level_inferred === 'low') {
        personaType = PERSONA_TYPES.OVERWHELMED;
        communicationStyle = COMMUNICATION_STYLES.NURTURING;
        toneDirectives.push('lead with empathy before solutions');
        toneDirectives.push('break advice into small, clear steps');
        toneDirectives.push('avoid information overload — one thing at a time');
    }
    // Researcher: long detailed messages or self-reported high confidence
    else if (avgLength > 200 || confidence_level_inferred === 'high') {
        personaType = PERSONA_TYPES.RESEARCHER;
        communicationStyle = COMMUNICATION_STYLES.PROFESSIONAL;
        toneDirectives.push('skip basic explanations — treat them as a peer');
        toneDirectives.push('include specific reasoning and science where relevant');
        toneDirectives.push('precise language over reassuring language');
    }
    // Explorer: interested in experimenting, open to discovery
    else if (experimenting_interest === true) {
        personaType = PERSONA_TYPES.EXPLORER;
        communicationStyle = COMMUNICATION_STYLES.CASUAL;
        toneDirectives.push('encourage curiosity and experimentation');
        toneDirectives.push('offer options rather than one prescriptive answer');
        toneDirectives.push('frame suggestions as things worth trying');
    }
    // Action-oriented: short messages after multiple turns — wants speed
    else if (avgLength < 60 && messageCount > 2) {
        personaType = PERSONA_TYPES.ACTION_ORIENTED;
        communicationStyle = COMMUNICATION_STYLES.CONCISE;
        toneDirectives.push('lead with the answer — skip the preamble');
        toneDirectives.push('use bullet points for multi-step advice');
        toneDirectives.push('keep responses short and direct');
    }

    // Boredom modifier — user seems disengaged, regardless of persona
    if (boredom_expression === true) {
        toneDirectives.push('vary your approach — try an unexpected angle or a direct question');
    }

    return { personaType, communicationStyle, toneDirectives };
}

// How each persona should frame any trending topic that surfaces in the conversation.
// Appended to persona directives when trends are present in context.
const TREND_FRAMING = {
    [COMMUNICATION_STYLES.NURTURING]:    'if a trend is relevant, offer it as one gentle option — do not overwhelm with choices',
    [COMMUNICATION_STYLES.PROFESSIONAL]: 'when referencing trends, include the reason it works — evidence or mechanism, not just hype',
    [COMMUNICATION_STYLES.CASUAL]:       'weave trending topics in naturally; frame them as exciting things worth trying',
    [COMMUNICATION_STYLES.CONCISE]:      'state any relevant trend as a single quick tip — no backstory',
};

/**
 * Builds the short context string to prepend to each user message.
 * When hasTrends is true, appends a per-persona trend framing instruction.
 *
 * @param {{ personaType, communicationStyle, toneDirectives }} persona
 * @param {boolean} [hasTrends=false] - Whether trend context is also being injected
 * @returns {string}
 */
function buildContextBlock({ personaType, communicationStyle, toneDirectives = [] } = {}, hasTrends = false) {
    if (!personaType) return '';

    const allDirectives = [...toneDirectives];
    if (hasTrends && communicationStyle && TREND_FRAMING[communicationStyle]) {
        allDirectives.push(TREND_FRAMING[communicationStyle]);
    }

    const directives = allDirectives.length > 0 ? ` — ${allDirectives.join('; ')}` : '';
    return `[User persona: ${personaType}, style: ${communicationStyle}${directives}]\n`;
}

/**
 * Persists classified persona to user_preferences (upsert) and Redis.
 * Non-throwing — persona save is best-effort, never blocks the response.
 *
 * @param {string} userId
 * @param {{ personaType, communicationStyle, toneDirectives }} persona
 */
async function saveUserPersona(userId, { personaType, communicationStyle, toneDirectives }) {
    try {
        await pgClient.query(
            `INSERT INTO user_preferences (user_id, persona_type, communication_style, engagement_preferences)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET
               persona_type          = EXCLUDED.persona_type,
               communication_style   = EXCLUDED.communication_style,
               engagement_preferences = EXCLUDED.engagement_preferences`,
            [userId, personaType, communicationStyle, JSON.stringify({ toneDirectives })]
        );
    } catch (err) {
        console.error('PersonaClassifier: PostgreSQL save failed:', err.message);
    }

    try {
        if (redisClient) {
            await redisClient.set(
                `persona:${userId}`,
                JSON.stringify({ personaType, communicationStyle, toneDirectives }),
                { EX: REDIS_TTL }
            );
        }
    } catch (err) {
        console.error('PersonaClassifier: Redis save failed:', err.message);
    }
}

/**
 * Reads the saved persona for a user (Redis → PostgreSQL).
 * Returns null if none has been saved yet.
 *
 * @param {string} userId
 * @returns {Promise<{ personaType, communicationStyle, toneDirectives }|null>}
 */
async function getUserPersona(userId) {
    try {
        if (redisClient) {
            const cached = await redisClient.get(`persona:${userId}`);
            if (cached) return JSON.parse(cached);
        }
    } catch (err) {
        console.error('PersonaClassifier: Redis read failed:', err.message);
    }

    try {
        const result = await pgClient.query(
            `SELECT persona_type, communication_style, engagement_preferences
             FROM user_preferences WHERE user_id = $1`,
            [userId]
        );
        if (result.rows.length > 0) {
            const row = result.rows[0];
            return {
                personaType: row.persona_type,
                communicationStyle: row.communication_style,
                toneDirectives: row.engagement_preferences?.toneDirectives || [],
            };
        }
    } catch (err) {
        console.error('PersonaClassifier: PostgreSQL read failed:', err.message);
    }

    return null;
}

/**
 * Full classification pipeline: classify from current signals, save to DB/Redis.
 * Call this from postResponseProcessing after extracting profile signals.
 *
 * @param {string} userId
 * @param {{ profileUpdates: object, chatHistory: Array }} opts
 * @returns {Promise<{ personaType, communicationStyle, toneDirectives }>}
 */
async function classifyAndSavePersona(userId, { profileUpdates, chatHistory }) {
    const persona = classifyFromSignals({ profileUpdates, chatHistory });
    await saveUserPersona(userId, persona);
    console.log(`🎭 Persona classified for ${userId}: ${persona.personaType} / ${persona.communicationStyle}`);
    return persona;
}

module.exports = {
    classifyFromSignals,
    buildContextBlock,
    saveUserPersona,
    getUserPersona,
    classifyAndSavePersona,
    PERSONA_TYPES,
    COMMUNICATION_STYLES,
};
