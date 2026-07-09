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
    getTrendContext: jest.fn().mockResolvedValue(''),
}));

const { getUserPersona, buildContextBlock } = require('../personaClassifier');
const { getConversationDirective, inferStage, extractTrendSummary } = require('../conversationDriver');
const { getTrendContext } = require('../trendManager');
const { buildMessageContext } = require('../messageContextBuilder');

beforeEach(() => jest.clearAllMocks());

describe('buildMessageContext', () => {
    test('returns persona block when persona exists and no trend or driver', async () => {
        const persona = { personaType: 'overwhelmed', communicationStyle: 'nurturing', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('[User persona: overwhelmed, style: nurturing]\n');
        getTrendContext.mockResolvedValue('');
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
        getTrendContext.mockResolvedValue('[Trending in hair care: scalp detox]\n');
        getConversationDirective.mockReturnValue('');

        await buildMessageContext('u1', []);
        expect(buildContextBlock).toHaveBeenCalledWith(persona, true);
    });

    test('combines all three blocks when all present', async () => {
        const persona = { personaType: 'explorer', communicationStyle: 'casual', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('[User persona: explorer, style: casual]\n');
        getTrendContext.mockResolvedValue('[Trending in hair care: rice water]\n');
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
        getTrendContext.mockResolvedValue('');
        getConversationDirective.mockReturnValue('[Conversation driver: first message directive]\n');

        const result = await buildMessageContext('u1');
        expect(result).toBe('[Conversation driver: first message directive]\n');
        expect(buildContextBlock).not.toHaveBeenCalled();
    });

    test('returns empty string when all sources return nothing', async () => {
        getUserPersona.mockResolvedValue(null);
        getTrendContext.mockResolvedValue('');
        getConversationDirective.mockReturnValue('');

        expect(await buildMessageContext('u1')).toBe('');
    });

    test('passes inferred stage and personaType to getTrendContext', async () => {
        const persona = { personaType: 'overwhelmed', communicationStyle: 'nurturing', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('');
        inferStage.mockReturnValue(5);
        getTrendContext.mockResolvedValue('');
        getConversationDirective.mockReturnValue('');

        await buildMessageContext('u1', [{ role: 'user', content: 'help' }]);
        expect(getTrendContext).toHaveBeenCalledWith(5, 'overwhelmed');
    });

    test('passes trendSummary and personaType to getConversationDirective', async () => {
        getUserPersona.mockResolvedValue(null);
        getTrendContext.mockResolvedValue('[Trending in hair care: scalp detox]\n');
        extractTrendSummary.mockReturnValue('scalp detox');
        getConversationDirective.mockReturnValue('');

        const history = [{ role: 'user', content: 'help me' }];
        await buildMessageContext('u1', history);
        expect(getConversationDirective).toHaveBeenCalledWith(history, null, 'scalp detox');
    });

    test('does not throw when getUserPersona fails — still runs trend and driver', async () => {
        getUserPersona.mockRejectedValue(new Error('Redis down'));
        getTrendContext.mockResolvedValue('');
        getConversationDirective.mockReturnValue('[Conversation driver: directive]\n');

        const result = await buildMessageContext('u1');
        expect(result).toBe('[Conversation driver: directive]\n');
    });

    test('does not throw when trendManager fails — still returns persona and driver', async () => {
        const persona = { personaType: 'engaged', communicationStyle: 'casual', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('[User persona: engaged, style: casual]\n');
        getTrendContext.mockRejectedValue(new Error('trend error'));
        getConversationDirective.mockReturnValue('');

        const result = await buildMessageContext('u1');
        expect(result).toBe('[User persona: engaged, style: casual]\n');
    });

    test('does not throw when conversationDriver fails — still returns persona and trend', async () => {
        const persona = { personaType: 'engaged', communicationStyle: 'casual', toneDirectives: [] };
        getUserPersona.mockResolvedValue(persona);
        buildContextBlock.mockReturnValue('[User persona: engaged, style: casual]\n');
        getTrendContext.mockResolvedValue('[Trending in hair care: rice water]\n');
        getConversationDirective.mockImplementation(() => { throw new Error('driver error'); });

        const result = await buildMessageContext('u1');
        expect(result).toBe('[User persona: engaged, style: casual]\n[Trending in hair care: rice water]\n');
    });
});
