// messageContextBuilder.js
// Single injection point for all per-message dynamic context.
// Order of blocks injected before each chat.send():
//   1. Persona   — tone, style, trend framing instruction
//   2. Trends    — what's currently popular in hair care (48h TTL)
//   3. Driver    — what the AI should DO this turn (trend-aware)
//   4. Memory    — durable facts/preferences relevant to the current message (Local Agent Memory)

const { getUserPersona, buildContextBlock } = require('./personaClassifier');
const { getConversationDirective, inferStage, extractTrendSummary } = require('./conversationDriver');
const { getRelevantTrends } = require('./trendManager');
const { retrieveRelevantMemories } = require('./agentMemory');
const { ExperienceContextService } = require('./experience/experienceContextService');
const { HairJourneyService } = require('./hairJourney/hairJourneyService');

const hairJourneyService = new HairJourneyService();

function safeExtractContent(val) {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
        return val.map(p => (typeof p === 'string' ? p : p?.message || p?.text || p?.content || '')).filter(Boolean).join(' ');
    }
    if (typeof val === 'object') {
        return val.message || val.text || val.content || JSON.stringify(val);
    }
    return String(val);
}

function withContextTimeout(promise, ms = 2500, fallbackValue = null) {
    let timer;
    const timeoutPromise = new Promise((resolve) => {
        timer = setTimeout(() => resolve(fallbackValue), ms);
        if (timer && typeof timer.unref === 'function') timer.unref();
    });
    return Promise.race([
        Promise.resolve(promise),
        timeoutPromise,
    ]).finally(() => clearTimeout(timer));
}

/**
 * Assembles the dynamic context block to prepend to each user message before chat.send().
 * Returns an empty string when there is nothing to inject (first-time users, errors).
 *
 * @param {string} userId
 * @param {Array<{role:string, content:string}>} [chatHistory=[]]
 * @param {string} [currentMessage] - the message about to be sent; falls back to the last user turn in chatHistory
 * @param {object} [experienceContext] - surface/page/entity context from widget/app
 * @returns {Promise<string>}
 */
async function buildMessageContext(userId, chatHistory = [], currentMessage, experienceContext) {
    const parts = [];

    // Explicit profile check-in / "What do you know about my hair profile?"
    const isProfileInquiry = /(what.*know.*about.*hair.*profile|what.*know.*hair|what.*have.*on.*file|do you know my hair|tell.*about my hair|my hair profile|what.*profile)/i.test(currentMessage || '');
    const lastUserTurn = [...chatHistory].reverse().find(m => m && m.role === 'user');
    const queryText = currentMessage || safeExtractContent(lastUserTurn?.content ?? lastUserTurn?.text);

    // Launch all independent I/O sources in parallel with bounded timeouts so
    // per-message context assembly takes max(step) instead of sum(steps).
    const wpProfilePromise = userId
        ? withContextTimeout(hairJourneyService.getProfileWithBlocks(userId), 2500, null).catch((err) => {
            console.error('buildMessageContext: WordPress profile fetch failed:', err.message);
            return null;
        })
        : Promise.resolve(null);

    const instructionsPromise = (async () => {
        try {
            const { getAdditionalInstructions } = require('./utils');
            if (typeof getAdditionalInstructions === 'function') {
                return await withContextTimeout(getAdditionalInstructions(), 2000, []);
            }
        } catch (instErr) {
            console.error('buildMessageContext: master directives fetch error:', instErr?.message);
        }
        return [];
    })();

    const personaPromise = withContextTimeout(getUserPersona(userId), 2000, null).catch((err) => {
        console.error('buildMessageContext: persona fetch failed:', err.message);
        return null;
    });

    const trendsPromise = !isProfileInquiry
        ? (async () => {
            try {
                const stage = inferStage(chatHistory);
                return await withContextTimeout(getRelevantTrends(stage, 6), 2000, []);
            } catch (err) {
                console.error('buildMessageContext: trend fetch failed:', err.message);
                return [];
            }
        })()
        : Promise.resolve([]);

    const memoriesPromise = withContextTimeout(retrieveRelevantMemories(userId, queryText), 2500, []).catch((err) => {
        console.error('buildMessageContext: memory retrieval failed:', err.message);
        return [];
    });

    const [wpProfileRes, instructions, persona, trendCandidates, memories] = await Promise.all([
        wpProfilePromise,
        instructionsPromise,
        personaPromise,
        trendsPromise,
        memoriesPromise,
    ]);

    // 0. Experience context (surface, page, entity, recent actions)
    if (experienceContext && typeof experienceContext === 'object') {
        try {
            const expSnippet = ExperienceContextService.buildPromptSnippet(experienceContext);
            if (expSnippet) parts.push(`${expSnippet}\n\n`);
        } catch (err) {
            console.error('buildMessageContext: experience context failed:', err.message);
        }
    }

    // 0a. HairAI Profile Grounding (Anti-Repetition & Single Source of Record)
    let hasKnownProfile = false;
    const traits = [];
    const wpProfile = wpProfileRes?.result;
    if (wpProfile && wpProfile.available !== false) {
        if (wpProfile.hairType) traits.push(`Hair Type: ${wpProfile.hairType}`);
        if (wpProfile.porosity) traits.push(`Porosity: ${wpProfile.porosity}`);
        if (wpProfile.density) traits.push(`Density: ${wpProfile.density}`);
        if (wpProfile.strandDiameter) traits.push(`Strand Diameter: ${wpProfile.strandDiameter}`);
        if (wpProfile.elasticity) traits.push(`Elasticity: ${wpProfile.elasticity}`);
        if (Array.isArray(wpProfile.hairConcerns) && wpProfile.hairConcerns.length > 0) {
            traits.push(`Concerns: ${wpProfile.hairConcerns.join(', ')}`);
        }
        if (Array.isArray(wpProfile.hairGoals) && wpProfile.hairGoals.length > 0) {
            traits.push(`Goals: ${wpProfile.hairGoals.join(', ')}`);
        }
        if (wpProfile.currentRegimen) traits.push(`Current Regimen: ${wpProfile.currentRegimen}`);
    }

    // Client-sent profile as a supplement/fallback only - fill gaps, don't overwrite.
    const rawProfile = experienceContext?.userProfile || experienceContext?.hairProfile || null;
    if (rawProfile && typeof rawProfile === 'object') {
        const have = (label) => traits.some((t) => t.startsWith(label));
        if (rawProfile.hairType && !have('Hair Type')) traits.push(`Hair Type: ${rawProfile.hairType}`);
        if (rawProfile.texture && !have('Hair Type') && !have('Texture')) traits.push(`Texture: ${rawProfile.texture}`);
        if (rawProfile.porosity && !have('Porosity')) traits.push(`Porosity: ${rawProfile.porosity}`);
        if (rawProfile.density && !have('Density')) traits.push(`Density: ${rawProfile.density}`);
        if (rawProfile.elasticity && !have('Elasticity')) traits.push(`Elasticity: ${rawProfile.elasticity}`);
        if (rawProfile.scalpType && !have('Scalp')) traits.push(`Scalp Type: ${rawProfile.scalpType}`);
        const clientRegimen = rawProfile.routines || rawProfile.regimen;
        if (clientRegimen && !have('Current Regimen')) {
            const r = Array.isArray(clientRegimen)
                ? clientRegimen.map(x => x.name || x.title || x).join(', ')
                : clientRegimen;
            traits.push(`Current Regimen: ${r}`);
        }
    }

    if (traits.length > 0) {
        hasKnownProfile = true;
        parts.push(`[MEMBER HAIRAI PROFILE (Single Source of Record):\n${traits.map(t => `- ${t}`).join('\n')}\nCRITICAL INSTRUCTION: You ALREADY know this member's hair profile traits and goals. NEVER ask for their hair type, texture, or porosity again. Ground all answers and recommendations directly in these known traits.]\n\n`);
    }

    // Explicit user assertion check in conversation history or current message
    const allRecentUserTurns = [
        ...chatHistory.filter(m => m && m.role === 'user').slice(-3).map(m => safeExtractContent(m.content ?? m.text)),
        currentMessage || ''
    ].join(' ').toLowerCase();

    const userAssertedAssessment = /(done|completed|already|finished|taken).*(assessment|hairai)/i.test(allRecentUserTurns) ||
                                  /(assessment|hairai).*(done|completed|already)/i.test(allRecentUserTurns);

    if (userAssertedAssessment && !hasKnownProfile) {
        hasKnownProfile = true;
        parts.push(`[MEMBER ASSERTION: The user has explicitly stated they ALREADY completed their HairAI assessment. CRITICAL OVERRIDE: NEVER ask them to take or connect the HairAI assessment again. Treat their profile as established, skip all assessment discovery prompts, and address their hairstyle and product questions directly.]\n\n`);
    }

    if (isProfileInquiry && hasKnownProfile) {
        parts.push(`[EXPLICIT PROFILE INQUIRY DIRECTIVE:
The member is asking what you know about their hair profile.
MANDATORY BEHAVIOR:
1. Immediately acknowledge that their HairAI profile is connected and active.
2. Warmly summarize their known traits (Hair Type, Porosity, Density, active Goals, and Regimen).
3. You MUST append a canonical "hair_profile_card" block in your \`\`\`mya-blocks with their exact traits, goals, and CTA action "open_hair_journey".
4. DO NOT say their profile is blank or that you don't have their texture, porosity, or curl pattern yet.
5. DO NOT ask them to take the HairAI assessment or ask what their hair type is.
6. DO NOT ask discovery questions or ask what hairstyle they want.
7. DO NOT introduce unrelated trends or unrequested product marketing.]\\n\\n`);
    }

    // 0b. Active Executive Master Directives (Configured via Dashboard)
    if (Array.isArray(instructions) && instructions.length > 0) {
        const active = instructions.filter(i => i.is_active === undefined || i.is_active === true);
        if (active.length > 0) {
            const lines = active.map(i => i.instruction_text || i.instruction || i.content || i.title).filter(Boolean);
            if (lines.length > 0) {
                parts.push(`[EXECUTIVE MASTER DIRECTIVES FROM CANDACE & LEADERSHIP:\n${lines.map(l => `- ${l}`).join('\n')}\nStrictly adhere to these operational directives above all general defaults.]\n\n`);
            }
        }
    }

    // Shared state — built up across steps so later steps can use earlier results
    let personaType  = persona ? (persona.personaType || null) : null;
    let trendContext = '';

    // Deduplicate against previous assistant turns in chatHistory or profile inquiry.
    const recentAssistantTurns = chatHistory
        .filter(m => m && (m.role === 'assistant' || m.role === 'model'))
        .slice(-3)
        .map(m => safeExtractContent(m.content ?? m.text).toLowerCase())
        .join(' ');

    if (!isProfileInquiry && Array.isArray(trendCandidates) && trendCandidates.length > 0) {
        const fresh = trendCandidates.filter(
            (t) => t.trend_name && !recentAssistantTurns.includes(t.trend_name.toLowerCase())
        );
        const chosen = fresh.slice(0, 2);
        if (chosen.length > 0) {
            trendContext = `[Trending in hair care: ${chosen.map((t) => t.trend_name.toLowerCase()).join('; ')}]\n`;
        }
    }

    // Persona block
    if (persona) {
        try {
            const block = buildContextBlock(persona, trendContext.length > 0);
            if (block) parts.push(block);
        } catch (err) {
            console.error('buildMessageContext: buildContextBlock failed:', err.message);
        }
    }

    // Add trend block only if activated
    if (trendContext) parts.push(trendContext);

    // 3. Conversation-driving directive (trend-aware, persona-aware, profile-aware)
    try {
        const trendSummary = trendContext ? extractTrendSummary(trendContext) : '';
        const directive = getConversationDirective(chatHistory, personaType, trendSummary, hasKnownProfile);
        if (directive) parts.push(directive);
    } catch (err) {
        console.error('buildMessageContext: conversation driver failed:', err.message);
    }

    // 4. Relevant long-term memory (Local Agent Memory — durable facts/preferences)
    if (Array.isArray(memories) && memories.length > 0) {
        parts.push(`\nRelevant memory:\n${memories.map(m => `- ${m}`).join('\n')}\n`);
    }

    return parts.join('');
}

module.exports = { buildMessageContext };
