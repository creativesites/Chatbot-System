/**
 * Tests for Claude (Anthropic) backup provider (Sonnet 5.5, Haiku 5.5, Opus 5.5).
 */

const {
    CLAUDE_MODELS,
    isClaudeModel,
    isComplexTask,
    getClaudeBackupModels,
    geminiSchemaToAnthropicSchema,
    sendClaudeMessage,
} = require('../ai/claudeBackup');

describe('claudeBackup', () => {
    const origEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...origEnv };
    });

    test('identifies Claude model names', () => {
        expect(isClaudeModel('claude-sonnet-5-5')).toBe(true);
        expect(isClaudeModel('claude-haiku-5-5')).toBe(true);
        expect(isClaudeModel('claude-opus-5-5')).toBe(true);
        expect(isClaudeModel('gemini-3.7-flash')).toBe(false);
        expect(isClaudeModel(null)).toBe(false);
    });

    test('routes standard turns to Sonnet 5.5 -> Haiku 5.5', () => {
        expect(isComplexTask({ message: 'How often should I wash 4C hair?' })).toBe(false);
        expect(getClaudeBackupModels({ message: 'How often should I wash 4C hair?' })).toEqual([
            CLAUDE_MODELS.sonnet,
            CLAUDE_MODELS.haiku,
        ]);
    });

    test('routes complex tasks to Opus 5.5 -> Sonnet 5.5 -> Haiku 5.5', () => {
        expect(isComplexTask({ message: 'I have a chemical burn and traction alopecia, can you build a complete regimen?' })).toBe(true);
        expect(isComplexTask({ message: 'Check these photos', images: [{ url: 'a' }, { url: 'b' }] })).toBe(true);
        expect(isComplexTask({ message: 'a'.repeat(400) })).toBe(true);
        expect(
            getClaudeBackupModels({ message: 'I have a chemical burn and severe breakage, build a complete regimen' })
        ).toEqual([CLAUDE_MODELS.opus, CLAUDE_MODELS.sonnet, CLAUDE_MODELS.haiku]);
    });

    test('honors CLAUDE_*_MODEL environment overrides', () => {
        process.env.CLAUDE_OPUS_MODEL = 'claude-opus-5-5-20261101';
        process.env.CLAUDE_SONNET_MODEL = 'claude-sonnet-5-5-20261101';
        process.env.CLAUDE_HAIKU_MODEL = 'claude-haiku-5-5-20261101';
        expect(getClaudeBackupModels({ message: 'Build a complete regimen for chemical burn recovery' })).toEqual([
            'claude-opus-5-5-20261101',
            'claude-sonnet-5-5-20261101',
            'claude-haiku-5-5-20261101',
        ]);
    });

    test('converts Gemini uppercase schemas to Anthropic JSON Schema', () => {
        const converted = geminiSchemaToAnthropicSchema({
            type: 'OBJECT',
            properties: {
                query: { type: 'STRING', description: 'City name' },
                limit: { type: 'NUMBER' },
            },
            required: ['query'],
        });
        expect(converted).toEqual({
            type: 'object',
            properties: {
                query: { type: 'string', description: 'City name' },
                limit: { type: 'number' },
            },
            required: ['query'],
        });
    });

    test('executes a full Anthropic Messages API call with tool-use loop', async () => {
        const toolExecute = jest.fn().mockResolvedValue({ partners: [{ name: 'Krush Beauty' }] });
        const fetchImpl = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    content: [
                        { type: 'tool_use', id: 'toolu_1', name: 'findStylistOrSalon', input: { locationQuery: 'Atlanta' } },
                    ],
                }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    content: [{ type: 'text', text: 'I found Krush Beauty in Atlanta!' }],
                }),
            });

        const res = await sendClaudeMessage({
            apiKey: 'sk-ant-test',
            model: 'claude-sonnet-5-5',
            system: 'You are Mya.',
            message: 'Find a stylist in Atlanta',
            tools: [
                {
                    name: 'findStylistOrSalon',
                    description: 'Find salons',
                    parameters: { type: 'OBJECT', properties: { locationQuery: { type: 'STRING' } } },
                    execute: toolExecute,
                },
            ],
            fetchImpl,
        });

        expect(toolExecute).toHaveBeenCalledWith({ locationQuery: 'Atlanta' });
        expect(fetchImpl).toHaveBeenCalledTimes(2);
        const firstBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
        expect(firstBody.temperature).toBeUndefined();
        expect(res.text).toBe('I found Krush Beauty in Atlanta!');
        expect(res.toolCalls).toEqual([{ name: 'findStylistOrSalon', args: { locationQuery: 'Atlanta' } }]);
        expect(res.modelUsed).toBe('claude-sonnet-5-5');
    });

    test('throws cleanly when ANTHROPIC_API_KEY is missing', async () => {
        delete process.env.ANTHROPIC_API_KEY;
        await expect(sendClaudeMessage({ message: 'hi', fetchImpl: jest.fn() })).rejects.toThrow(/ANTHROPIC_API_KEY/);
    });
});
