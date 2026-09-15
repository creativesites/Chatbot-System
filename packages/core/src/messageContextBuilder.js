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
    //
    // This previously relied entirely on experienceContext.userProfile/hairProfile,
    // whatever the calling client happened to send. On mobile that came from the
    // app's own Redux hairData (the legacy native questionnaire) via
    // MyAvanaMobileHostBridge.getAppContext() - a different, often-empty or stale
    // profile than the real WordPress HairAI profile the member actually completed
    // (see Thread 024). A member could tell Mya their hair type and porosity, WP
    // could have it on file, and Mya would still ask again, because the client
    // never had it to send in the first place.
    //
    // Fetching the real WordPress profile server-side, on every turn, makes this
    // authoritative regardless of what any given client sends - the mobile app,
    // the web widget, and any future client all ground against the same record.
    // Client-sent traits (rawProfile below) are kept only as a supplement for
    // fields WordPress doesn't have, and as the fallback if WordPress is
    // unreachable - consistent with this service's existing "fail honest, never
    // fabricate" design (wordPressHairJourneyProvider.js).
    let hasKnownProfile = false;
    let fetchedWpProfile = null;
    const traits = [];
    try {
        if (userId) {
            const { result: wpProfile } = await hairJourneyService.getProfileWithBlocks(userId);
            fetchedWpProfile = wpProfile;
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
        }
    } catch (err) {
        console.error('buildMessageContext: WordPress profile fetch failed:', err.message);
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
        ...chatHistory.filter(m => m.role === 'user').slice(-3).map(m => m.content || ''),
        currentMessage || ''
    ].join(' ').toLowerCase();

    const userAssertedAssessment = /(done|completed|already|finished|taken).*(assessment|hairai)/i.test(allRecentUserTurns) ||
                                  /(assessment|hairai).*(done|completed|already)/i.test(allRecentUserTurns);

    if (userAssertedAssessment && !hasKnownProfile) {
        hasKnownProfile = true;
        parts.push(`[MEMBER ASSERTION: The user has explicitly stated they ALREADY completed their HairAI assessment. CRITICAL OVERRIDE: NEVER ask them to take or connect the HairAI assessment again. Treat their profile as established, skip all assessment discovery prompts, and address their hairstyle and product questions directly.]\n\n`);
    }

    // Explicit profile check-in / "What do you know about my hair profile?"
    const isProfileInquiry = /(what.*know.*about.*hair.*profile|what.*know.*hair|what.*have.*on.*file|do you know my hair|tell.*about my hair|my hair profile|what.*profile)/i.test(currentMessage || '');
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
    try {
        const { getAdditionalInstructions } = require('./utils');
        if (typeof getAdditionalInstructions === 'function') {
            const instructions = await getAdditionalInstructions();
            if (Array.isArray(instructions) && instructions.length > 0) {
                const active = instructions.filter(i => i.is_active === undefined || i.is_active === true);
                if (active.length > 0) {
                    const lines = active.map(i => i.instruction_text || i.instruction || i.content || i.title).filter(Boolean);
                    if (lines.length > 0) {
                        parts.push(`[EXECUTIVE MASTER DIRECTIVES FROM CANDACE & LEADERSHIP:\n${lines.map(l => `- ${l}`).join('\n')}\nStrictly adhere to these operational directives above all general defaults.]\n\n`);
                    }
                }
            }
        }
    } catch (instErr) {
        console.error('buildMessageContext: master directives fetch error:', instErr?.message);
    }

    // Shared state — built up across steps so later steps can use earlier results
    let personaType  = null;
    let trendContext = '';

    // 1. Persona context (tone + communication style)
    let persona = null;
    try {
        persona = await getUserPersona(userId);
        if (persona) personaType = persona.personaType || null;
    } catch (err) {
        console.error('buildMessageContext: persona fetch failed:', err.message);
    }

    // Deduplicate against previous assistant turns in chatHistory or profile inquiry.
    //
    // This used to check the recent transcript for two hardcoded strings
    // ("peptide", "bond-repair") - it would dedup exactly the trend that
    // triggered that check and nothing else. Any other trend name from
    // trendManager's rotating pool would repeat turn after turn the same way.
    // Pull a wider candidate set and drop whichever ones actually already
    // appear in the last few assistant turns, instead of guessing keywords.
    const recentAssistantTurns = chatHistory
        .filter(m => m.role === 'assistant' || m.role === 'model')
        .slice(-3)
        .map(m => (m.content || m.text || '').toLowerCase())
        .join(' ');

    if (!isProfileInquiry) {
        try {
            const stage = inferStage(chatHistory);
            const candidates = await getRelevantTrends(stage, 6);
            const fresh = candidates.filter(
                (t) => t.trend_name && !recentAssistantTurns.includes(t.trend_name.toLowerCase())
            );
            const chosen = fresh.slice(0, 2);
            if (chosen.length > 0) {
                trendContext = `[Trending in hair care: ${chosen.map((t) => t.trend_name.toLowerCase()).join('; ')}]\n`;
            }
            // If every candidate has already been mentioned recently, trendContext
            // stays empty for this turn rather than repeating one anyway.
        } catch (err) {
            console.error('buildMessageContext: trend fetch failed:', err.message);
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
    try {
        const queryText = currentMessage || [...chatHistory].reverse().find(m => m.role === 'user')?.content;
        const memories = await retrieveRelevantMemories(userId, queryText);
        if (memories.length > 0) {
            parts.push(`\nRelevant memory:\n${memories.map(m => `- ${m}`).join('\n')}\n`);
        }
    } catch (err) {
        console.error('buildMessageContext: memory retrieval failed:', err.message);
    }

    return parts.join('');
}

module.exports = { buildMessageContext };
