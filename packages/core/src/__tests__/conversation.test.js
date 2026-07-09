const mockQuery = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.mock('../database', () => ({
    pgClient: { query: mockQuery },
    redisClient: { get: mockRedisGet, set: mockRedisSet },
}));

jest.mock('../ai', () => ({
    chat: jest.fn(),
}));

jest.mock('@genkit-ai/google-genai', () => ({
    googleAI: { model: jest.fn(() => 'mocked-model') },
}));

const {
    saveConversationSummary,
    getAllConversationsSummary,
    getConversationHistory,
    saveConversation,
} = require('../conversation');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('saveConversationSummary', () => {
    test('inserts/updates DB and caches in Redis', async () => {
        mockQuery.mockResolvedValue({ rows: [{ conversation_id: 'c1', summary: 'sum' }] });
        mockRedisSet.mockResolvedValue('OK');

        const result = await saveConversationSummary('c1', 'u1', 'sum');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO conversations'),
            ['c1', 'u1', 'sum']
        );
        expect(mockRedisSet).toHaveBeenCalledWith('summary:u1', 'sum', { EX: 3600 });
        expect(result).toEqual({ conversation_id: 'c1', summary: 'sum' });
    });

    test('throws on DB error', async () => {
        mockQuery.mockRejectedValue(new Error('DB error'));
        await expect(saveConversationSummary('c1', 'u1', 'sum')).rejects.toThrow('DB error');
    });
});

describe('getAllConversationsSummary', () => {
    test('returns cached summary from Redis', async () => {
        mockRedisGet.mockResolvedValue('cached summary');

        const result = await getAllConversationsSummary('u1');

        expect(result).toBe('cached summary');
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('fetches from DB on Redis miss and caches result', async () => {
        mockRedisGet.mockResolvedValue(null);
        mockQuery.mockResolvedValue({ rows: [{ summary: 'db summary' }] });
        mockRedisSet.mockResolvedValue('OK');

        const result = await getAllConversationsSummary('u1');

        expect(result).toBe('db summary');
        expect(mockRedisSet).toHaveBeenCalledWith('summary:u1', 'db summary', { EX: 3600 });
    });

    test('returns fallback string when no summary exists', async () => {
        mockRedisGet.mockResolvedValue(null);
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getAllConversationsSummary('u1');

        expect(result).toBe('conversation summary not available.');
    });

    test('returns fallback string on error', async () => {
        mockRedisGet.mockRejectedValue(new Error('Redis down'));

        const result = await getAllConversationsSummary('u1');

        expect(result).toBe('conversation summary not available.');
    });
});

describe('getConversationHistory', () => {
    test('returns parsed history from Redis cache', async () => {
        const history = [{ role: 'user', content: 'hi' }];
        mockRedisGet.mockResolvedValue(JSON.stringify({ chatHistory: history }));

        const result = await getConversationHistory('conv1', 'u1');

        expect(result).toEqual(history);
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('fetches from DB on Redis miss and caches result', async () => {
        const history = [{ role: 'user', content: 'hi' }];
        mockRedisGet.mockResolvedValue(null);
        mockQuery.mockResolvedValue({ rows: [{ chat_history: history }] });
        mockRedisSet.mockResolvedValue('OK');

        const result = await getConversationHistory('conv1', 'u1');

        expect(result).toEqual(history);
        expect(mockRedisSet).toHaveBeenCalledWith(
            'conversation:conv1',
            JSON.stringify({ chatHistory: history })
        );
    });

    test('returns empty array for new conversation', async () => {
        mockRedisGet.mockResolvedValue(null);
        mockQuery.mockResolvedValue({ rows: [] });

        const result = await getConversationHistory('conv1', 'u1');

        expect(result).toEqual([]);
    });

    test('returns empty array on error', async () => {
        mockRedisGet.mockRejectedValue(new Error('Redis down'));

        const result = await getConversationHistory('conv1', 'u1');

        expect(result).toEqual([]);
    });
});

describe('saveConversation', () => {
    test('saves to DB and updates Redis cache', async () => {
        const history = [{ role: 'user', content: 'hi' }];
        mockQuery.mockResolvedValue({ rows: [{ conversation_id: 'c1' }] });
        mockRedisSet.mockResolvedValue('OK');

        const result = await saveConversation('c1', 'u1', history, 'summary');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO conversations'),
            ['c1', 'u1', JSON.stringify(history), 'summary']
        );
        expect(mockRedisSet).toHaveBeenCalledWith(
            'conversation:c1',
            JSON.stringify({ chatHistory: history })
        );
        expect(result).toEqual({ conversation_id: 'c1' });
    });
});
