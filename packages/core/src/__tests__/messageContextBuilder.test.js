jest.mock('../personaClassifier', () => ({
    getUserPersona:   jest.fn(),
    buildContextBlock: jest.fn(),
}));

jest.mock('../conversationDriver', () => ({
    getConversationDirective: jest.fn().mockReturnValue(''),
    inferStage:               jest.fn().mockReturnValue(null),
    extractTrendSummary:      jest.fn().mockReturnValue(null),
}));

jest.mock('../trendManager', () => ({
    getRelevantTrends: jest.fn().mockResolvedValue([]),
}));

jest.mock('../agentMemory', () => ({
    retrieveRelevantMemories: jest.fn().mockResolvedValue([]),
}));

// Real WordPress profile grounding (Thread 024) - must never hit a live DB/HTTP
// call in a unit test the way every other external dependency here is mocked.
const mockGetProfileWithBlocks = jest.fn();
jest.mock('../hairJourney/hairJourneyService', () => ({
    HairJourneyService: jest.fn().mockImplementation(() => ({
        getProfileWithBlocks: (...args) => mockGetProfileWithBlocks(...args),
    })),
}));

// bot_instructions master/quick-fix directives (section 0b) - also unmocked
// previously, which meant it silently hit a real DB whenever one was reachable.
jest.mock('../utils', () => ({
    getAdditionalInstructions: jest.fn().mockResolvedValue([]),
}));

const { getUserPersona, buildContextBlock } = require('../personaClassifier');
const { getConversationDirective, inferStage, extractTrendSummary } = require('../conversationDriver');
const { getRelevantTrends } = require('../trendManager');
const { retrieveRelevantMemories } = require('../agentMemory');
const { getAdditionalInstructions } = require('../utils');
const { buildMessageContext } = require('../messageContextBuilder');

function trend(name) {
    return { trend_name: name };
}

beforeEach(() => {
    jest.clearAllMocks();
    // resetMocks (jest.config.js) wipes the jest.mock() factory default before each test,
    // so give every test a harmless empty-memory default; tests exercising memory override it.
    retrieveRelevantMemories.mockResolvedValue([]);
    mockGetProfileWithBlocks.mockResolvedValue({ result: { available: false } });
    getAdditionalInstructions.mockResolvedValue([]);
    getRelevantTrends.mockResolvedValue([]);
});

describe('buildMessageContext', () => {
    test('returns persona block when persona exists and no trend or driver', async () => {
        const persona = { personaType: 'overwhelmed', communicationStyle: 'nurturing', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('[User persona: overwhelmed, style: nurturing]\n');
        getConversationDirective.mockReturnValue('');

        const result = await buildMessageContext('u1', []);
        expect(result).toBe('[User persona: overwhelmed, style: nurturing]\n');
        // hasTrends=false because trendContext is empty
        expect(buildContextBlock).toHaveBeenCalledWith(persona, false);
    });

    test('passes hasTrends=true to buildContextBlock when trend context exists', async () => {
        const persona = { personaType: 'researcher', communicationStyle: 'professional', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('[User persona: researcher, style: professional]\n');
        getRelevantTrends.mockResolvedValue([trend('scalp detox')]);
        getConversationDirective.mockReturnValue('');

        await buildMessageContext('u1', []);
        expect(buildContextBlock).toHaveBeenCalledWith(persona, true);
    });

    test('combines all three blocks when all present', async () => {
        const persona = { personaType: 'explorer', communicationStyle: 'casual', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('[User persona: explorer, style: casual]\n');
        getRelevantTrends.mockResolvedValue([trend('rice water')]);
        getConversationDirective.mockReturnValue('[Conversation driver: ask a follow-up]\n');

        const result = await buildMessageContext('u1', [{ role: 'user', content: 'hi' }]);
        expect(result).toBe(
            '[User persona: explorer, style: casual]\n' +
            '[Trending in hair care: rice water]\n' +
            '[Conversation driver: ask a follow-up]\n'
        );
    });

    test('returns driver directive alone when no persona saved', async () => {
        getUserPersona.mockResolvedValue(null);
        getConversationDirective.mockReturnValue('[Conversation driver: first message directive]\n');

        const result = await buildMessageContext('u1');
        expect(result).toBe('[Conversation driver: first message directive]\n');
        expect(buildContextBlock).not.toHaveBeenCalled();
    });

    test('returns empty string when all sources return nothing', async () => {
        getUserPersona.mockResolvedValue(null);
        getConversationDirective.mockReturnValue('');

        expect(await buildMessageContext('u1')).toBe('');
    });

    test('passes inferred stage to getRelevantTrends', async () => {
        const persona = { personaType: 'overwhelmed', communicationStyle: 'nurturing', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('');
        inferStage.mockReturnValue(5);
        getConversationDirective.mockReturnValue('');

        await buildMessageContext('u1', [{ role: 'user', content: 'help' }]);
        expect(getRelevantTrends).toHaveBeenCalledWith(5, 6);
    });

    test('passes trendSummary and personaType to getConversationDirective', async () => {
        getUserPersona.mockResolvedValue(null);
        getRelevantTrends.mockResolvedValue([trend('scalp detox')]);
        extractTrendSummary.mockReturnValue('scalp detox');
        getConversationDirective.mockReturnValue('');

        const history = [{ role: 'user', content: 'help me' }];
        await buildMessageContext('u1', history);
        expect(getConversationDirective).toHaveBeenCalledWith(history, null, 'scalp detox', false);
    });

    test('does not throw when getUserPersona fails — still runs trend and driver', async () => {
        getUserPersona.mockRejectedValue(new Error('Redis down'));
        getConversationDirective.mockReturnValue('[Conversation driver: directive]\n');

        const result = await buildMessageContext('u1');
        expect(result).toBe('[Conversation driver: directive]\n');
    });

    test('does not throw when trendManager fails — still returns persona and driver', async () => {
        const persona = { personaType: 'engaged', communicationStyle: 'casual', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('[User persona: engaged, style: casual]\n');
        getRelevantTrends.mockRejectedValue(new Error('trend error'));
        getConversationDirective.mockReturnValue('');

        const result = await buildMessageContext('u1');
        expect(result).toBe('[User persona: engaged, style: casual]\n');
    });

    test('does not throw when conversationDriver fails — still returns persona and trend', async () => {
        const persona = { personaType: 'engaged', communicationStyle: 'casual', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('[User persona: engaged, style: casual]\n');
        getRelevantTrends.mockResolvedValue([trend('rice water')]);
        getConversationDirective.mockImplementation(() => { throw new Error('driver error'); });

        const result = await buildMessageContext('u1');
        expect(result).toBe('[User persona: engaged, style: casual]\n[Trending in hair care: rice water]\n');
    });

    test('appends a memory block when relevant memories are found', async () => {
        getUserPersona.mockResolvedValue(null);
        getConversationDirective.mockReturnValue('');
        retrieveRelevantMemories.mockResolvedValue(['prefers sulfate-free products', 'goal: length retention']);

        const result = await buildMessageContext('u1', [{ role: 'user', content: 'what should I use?' }]);
        expect(result).toContain('Relevant memory:');
        expect(result).toContain('- prefers sulfate-free products');
        expect(result).toContain('- goal: length retention');
    });

    test('passes currentMessage to retrieveRelevantMemories when provided', async () => {
        getUserPersona.mockResolvedValue(null);
        getConversationDirective.mockReturnValue('');
        retrieveRelevantMemories.mockResolvedValue([]);

        await buildMessageContext('u1', [], 'what oils should I use?');
        expect(retrieveRelevantMemories).toHaveBeenCalledWith('u1', 'what oils should I use?');
    });

    test('falls back to the last user turn when currentMessage is omitted', async () => {
        getUserPersona.mockResolvedValue(null);
        getConversationDirective.mockReturnValue('');
        retrieveRelevantMemories.mockResolvedValue([]);

        const history = [
            { role: 'assistant', content: 'hi there' },
            { role: 'user', content: 'my hair is dry' },
        ];
        await buildMessageContext('u1', history);
        expect(retrieveRelevantMemories).toHaveBeenCalledWith('u1', 'my hair is dry');
    });

    test('does not throw when memory retrieval fails — still returns other blocks', async () => {
        const persona = { personaType: 'engaged', communicationStyle: 'casual', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('[User persona: engaged, style: casual]\n');
        getConversationDirective.mockReturnValue('');
        retrieveRelevantMemories.mockRejectedValue(new Error('pgvector error'));

        const result = await buildMessageContext('u1');
        expect(result).toBe('[User persona: engaged, style: casual]\n');
    });

    describe('trend repetition (Thread 024 — Candace video)', () => {
        beforeEach(() => {
            getUserPersona.mockResolvedValue(null);
            getConversationDirective.mockReturnValue('');
        });

        test('drops a trend already mentioned in a recent assistant turn, regardless of which one', async () => {
            getRelevantTrends.mockResolvedValue([trend('peptide-infused leave-ins'), trend('scalp massage tools')]);
            const history = [
                { role: 'user', content: 'What products do you recommend?' },
                { role: 'assistant', content: 'Have you considered peptide-infused leave-ins?' },
            ];
            const result = await buildMessageContext('u1', history, 'What about two-strand twists?');
            expect(result).toContain('scalp massage tools');
            expect(result).not.toContain('peptide-infused leave-ins');
        });

        test('injects nothing rather than repeating when every candidate was already mentioned', async () => {
            getRelevantTrends.mockResolvedValue([trend('peptide-infused leave-ins'), trend('bond-repair treatments')]);
            const history = [
                { role: 'assistant', content: 'Peptide-infused leave-ins and bond-repair treatments have been huge lately!' },
            ];
            const result = await buildMessageContext('u1', history, 'What about two-strand twists?');
            expect(result).not.toContain('Trending in hair care');
        });

        test('a fresh conversation with no assistant turns yet still gets trends', async () => {
            getRelevantTrends.mockResolvedValue([trend('rice water rinses')]);
            const result = await buildMessageContext('u1', [], 'What products do you recommend?');
            expect(result).toContain('rice water rinses');
        });
    });

    describe('HairAI profile grounding', () => {
        beforeEach(() => {
            getUserPersona.mockResolvedValue(null);
            getConversationDirective.mockReturnValue('');
        });

        test('grounds from the real WordPress profile, not just client-sent context', async () => {
            mockGetProfileWithBlocks.mockResolvedValue({
                result: {
                    available: true,
                    hairType: '4B',
                    porosity: 'High',
                    hairGoals: ['Length retention'],
                    currentRegimen: 'Wash and go',
                },
            });

            const result = await buildMessageContext('u1', [], 'hi', { user: { userId: 'u1' } });
            expect(mockGetProfileWithBlocks).toHaveBeenCalledWith('u1');
            expect(result).toContain('MEMBER HAIRAI PROFILE');
            expect(result).toContain('Hair Type: 4B');
            expect(result).toContain('Porosity: High');
            expect(result).toContain('Goals: Length retention');
            expect(result).toContain('Current Regimen: Wash and go');
            expect(result).toContain('NEVER ask for their hair type');
        });

        test('falls back to client-sent profile when WordPress has nothing', async () => {
            mockGetProfileWithBlocks.mockResolvedValue({ result: { available: false } });

            const result = await buildMessageContext('u1', [], 'hi', {
                user: { userId: 'u1' },
                hairProfile: { texture: '3C', porosity: 'Medium', regimen: 'Co-wash weekly' },
            });
            expect(result).toContain('Texture: 3C');
            expect(result).toContain('Porosity: Medium');
            expect(result).toContain('Current Regimen: Co-wash weekly');
        });

        test('client-sent traits fill gaps but never override WordPress data', async () => {
            mockGetProfileWithBlocks.mockResolvedValue({
                result: { available: true, hairType: '4A', porosity: 'Low' },
            });

            const result = await buildMessageContext('u1', [], 'hi', {
                user: { userId: 'u1' },
                hairProfile: { texture: 'should not appear', porosity: 'should not override', scalpType: 'Dry' },
            });
            expect(result).toContain('Hair Type: 4A');
            expect(result).toContain('Porosity: Low');
            expect(result).not.toContain('should not appear');
            expect(result).not.toContain('should not override');
            expect(result).toContain('Scalp Type: Dry');
        });

        test('does not throw and adds no profile block when the WordPress fetch fails', async () => {
            mockGetProfileWithBlocks.mockRejectedValue(new Error('WP unreachable'));

            const result = await buildMessageContext('u1', [], 'hi', { user: { userId: 'u1' } });
            expect(result).not.toContain('MEMBER HAIRAI PROFILE');
        });

        test('skips the WordPress fetch entirely when no userId is resolvable', async () => {
            const result = await buildMessageContext(undefined, [], 'hi', {});
            expect(mockGetProfileWithBlocks).not.toHaveBeenCalled();
            expect(result).not.toContain('MEMBER HAIRAI PROFILE');
        });

        test('injects member assertion override when user states they completed assessment', async () => {
            mockGetProfileWithBlocks.mockResolvedValue({ result: { available: false } });
            const history = [
                { role: 'user', content: 'Yes I have done the HairAI assessment already' }
            ];
            const result = await buildMessageContext('u1', history, 'What products do you suggest?');
            expect(result).toContain('MEMBER ASSERTION: The user has explicitly stated they ALREADY completed their HairAI assessment');
            expect(result).toContain('NEVER ask them to take or connect the HairAI assessment again');
        });
    });
});
