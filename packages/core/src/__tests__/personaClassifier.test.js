const { pgClient, redisClient } = require('../database');

jest.mock('../database', () => ({
    pgClient: { query: jest.fn() },
    redisClient: { get: jest.fn(), set: jest.fn() },
}));

const {
    classifyFromSignals,
    buildContextBlock,
    saveUserPersona,
    getUserPersona,
    classifyAndSavePersona,
    PERSONA_TYPES,
    COMMUNICATION_STYLES,
} = require('../personaClassifier');

beforeEach(() => jest.clearAllMocks());

describe('classifyFromSignals', () => {
    test('overwhelmed: high desperation', () => {
        const result = classifyFromSignals({
            profileUpdates: { desperation_level_inferred: 'high' },
            chatHistory: [],
        });
        expect(result.personaType).toBe(PERSONA_TYPES.OVERWHELMED);
        expect(result.communicationStyle).toBe(COMMUNICATION_STYLES.NURTURING);
        expect(result.toneDirectives).toContain('lead with empathy before solutions');
    });

    test('overwhelmed: low confidence', () => {
        const result = classifyFromSignals({
            profileUpdates: { confidence_level_inferred: 'low' },
            chatHistory: [],
        });
        expect(result.personaType).toBe(PERSONA_TYPES.OVERWHELMED);
    });

    test('researcher: long messages', () => {
        const longMessage = 'a'.repeat(210);
        const result = classifyFromSignals({
            profileUpdates: {},
            chatHistory: [{ role: 'user', content: longMessage }],
        });
        expect(result.personaType).toBe(PERSONA_TYPES.RESEARCHER);
        expect(result.communicationStyle).toBe(COMMUNICATION_STYLES.PROFESSIONAL);
    });

    test('researcher: high confidence', () => {
        const result = classifyFromSignals({
            profileUpdates: { confidence_level_inferred: 'high' },
            chatHistory: [],
        });
        expect(result.personaType).toBe(PERSONA_TYPES.RESEARCHER);
    });

    test('explorer: experimenting interest', () => {
        const result = classifyFromSignals({
            profileUpdates: { experimenting_interest: true },
            chatHistory: [],
        });
        expect(result.personaType).toBe(PERSONA_TYPES.EXPLORER);
        expect(result.communicationStyle).toBe(COMMUNICATION_STYLES.CASUAL);
        expect(result.toneDirectives).toContain('encourage curiosity and experimentation');
    });

    test('action-oriented: short messages after 3+ turns', () => {
        const history = [
            { role: 'user', content: 'hi' },
            { role: 'user', content: 'ok' },
            { role: 'user', content: 'yes' },
        ];
        const result = classifyFromSignals({ profileUpdates: {}, chatHistory: history });
        expect(result.personaType).toBe(PERSONA_TYPES.ACTION_ORIENTED);
        expect(result.communicationStyle).toBe(COMMUNICATION_STYLES.CONCISE);
    });

    test('engaged: default when no signals match', () => {
        const result = classifyFromSignals({ profileUpdates: {}, chatHistory: [] });
        expect(result.personaType).toBe(PERSONA_TYPES.ENGAGED);
    });

    test('boredom adds tone directive regardless of persona', () => {
        const result = classifyFromSignals({
            profileUpdates: { boredom_expression: true },
            chatHistory: [],
        });
        expect(result.toneDirectives).toContain(
            'vary your approach — try an unexpected angle or a direct question'
        );
    });

    test('overwhelmed takes priority over researcher when both desperation and long messages', () => {
        const result = classifyFromSignals({
            profileUpdates: { desperation_level_inferred: 'high' },
            chatHistory: [{ role: 'user', content: 'a'.repeat(210) }],
        });
        expect(result.personaType).toBe(PERSONA_TYPES.OVERWHELMED);
    });
});

describe('buildContextBlock', () => {
    test('returns formatted context string', () => {
        const block = buildContextBlock({
            personaType: 'overwhelmed',
            communicationStyle: 'nurturing',
            toneDirectives: ['lead with empathy'],
        });
        expect(block).toBe('[User persona: overwhelmed, style: nurturing — lead with empathy]\n');
    });

    test('returns empty string when personaType is missing', () => {
        expect(buildContextBlock({})).toBe('');
        expect(buildContextBlock()).toBe('');
    });

    test('omits directive separator when no directives and no trends', () => {
        const block = buildContextBlock({
            personaType: 'engaged',
            communicationStyle: 'casual',
            toneDirectives: [],
        });
        expect(block).toBe('[User persona: engaged, style: casual]\n');
    });

    test('joins multiple directives with semicolons', () => {
        const block = buildContextBlock({
            personaType: 'overwhelmed',
            communicationStyle: 'nurturing',
            toneDirectives: ['empathy first', 'small steps'],
        });
        expect(block).toContain('empathy first; small steps');
    });

    test('appends trend framing instruction when hasTrends=true', () => {
        const block = buildContextBlock({
            personaType: 'researcher',
            communicationStyle: 'professional',
            toneDirectives: [],
        }, true);
        expect(block).toContain('evidence or mechanism');
    });

    test('no trend framing when hasTrends=false', () => {
        const block = buildContextBlock({
            personaType: 'researcher',
            communicationStyle: 'professional',
            toneDirectives: [],
        }, false);
        expect(block).toBe('[User persona: researcher, style: professional]\n');
    });

    test('explorer gets casual trend framing when hasTrends=true', () => {
        const block = buildContextBlock({
            personaType: 'explorer',
            communicationStyle: 'casual',
            toneDirectives: [],
        }, true);
        expect(block).toContain('exciting things worth trying');
    });
});

describe('saveUserPersona', () => {
    test('upserts to PostgreSQL and sets Redis', async () => {
        pgClient.query.mockResolvedValue({ rows: [] });
        redisClient.set.mockResolvedValue('OK');

        await saveUserPersona('u1', {
            personaType: 'researcher',
            communicationStyle: 'professional',
            toneDirectives: ['skip basics'],
        });

        expect(pgClient.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO user_preferences'),
            ['u1', 'researcher', 'professional', JSON.stringify({ toneDirectives: ['skip basics'] })]
        );
        expect(redisClient.set).toHaveBeenCalledWith(
            'persona:u1',
            JSON.stringify({ personaType: 'researcher', communicationStyle: 'professional', toneDirectives: ['skip basics'] }),
            { EX: 86400 }
        );
    });

    test('does not throw when PostgreSQL fails', async () => {
        pgClient.query.mockRejectedValue(new Error('DB down'));
        redisClient.set.mockResolvedValue('OK');
        await expect(saveUserPersona('u1', { personaType: 'engaged', communicationStyle: 'casual', toneDirectives: [] })).resolves.not.toThrow();
    });

    test('does not throw when Redis fails', async () => {
        pgClient.query.mockResolvedValue({ rows: [] });
        redisClient.set.mockRejectedValue(new Error('Redis down'));
        await expect(saveUserPersona('u1', { personaType: 'engaged', communicationStyle: 'casual', toneDirectives: [] })).resolves.not.toThrow();
    });
});

describe('getUserPersona', () => {
    test('returns from Redis cache when present', async () => {
        const cached = { personaType: 'explorer', communicationStyle: 'casual', toneDirectives: [] };
        redisClient.get.mockResolvedValue(JSON.stringify(cached));

        const result = await getUserPersona('u1');
        expect(result).toEqual(cached);
        expect(pgClient.query).not.toHaveBeenCalled();
    });

    test('falls back to PostgreSQL when Redis miss', async () => {
        redisClient.get.mockResolvedValue(null);
        pgClient.query.mockResolvedValue({
            rows: [{
                persona_type: 'researcher',
                communication_style: 'professional',
                engagement_preferences: { toneDirectives: ['skip basics'] },
            }],
        });

        const result = await getUserPersona('u1');
        expect(result).toEqual({
            personaType: 'researcher',
            communicationStyle: 'professional',
            toneDirectives: ['skip basics'],
        });
    });

    test('returns null when not found anywhere', async () => {
        redisClient.get.mockResolvedValue(null);
        pgClient.query.mockResolvedValue({ rows: [] });
        expect(await getUserPersona('u1')).toBeNull();
    });

    test('returns null and does not throw when Redis errors', async () => {
        redisClient.get.mockRejectedValue(new Error('Redis error'));
        pgClient.query.mockResolvedValue({ rows: [] });
        expect(await getUserPersona('u1')).toBeNull();
    });
});

describe('classifyAndSavePersona', () => {
    test('classifies and saves, returns persona', async () => {
        pgClient.query.mockResolvedValue({ rows: [] });
        redisClient.set.mockResolvedValue('OK');

        const result = await classifyAndSavePersona('u1', {
            profileUpdates: { desperation_level_inferred: 'high' },
            chatHistory: [],
        });

        expect(result.personaType).toBe(PERSONA_TYPES.OVERWHELMED);
        expect(pgClient.query).toHaveBeenCalled();
        expect(redisClient.set).toHaveBeenCalled();
    });
});
