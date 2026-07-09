const mockQuery = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.mock('../database', () => ({
    pgClient: { query: mockQuery },
    redisClient: { get: mockRedisGet, set: mockRedisSet },
}));

const mockChatSend = jest.fn();
const mockChat = jest.fn(() => ({ send: mockChatSend }));
const mockUpdateState = jest.fn().mockResolvedValue({});
const mockLoadSession = jest.fn().mockResolvedValue({ updateState: mockUpdateState });
jest.mock('../ai', () => ({ chat: mockChat, loadSession: mockLoadSession }));
jest.mock('@genkit-ai/google-genai', () => ({
    googleAI: { model: jest.fn(() => 'mocked-model') },
}));

const mockSaveHairIssue = jest.fn();
jest.mock('../hairIssues', () => ({ saveHairIssue: mockSaveHairIssue }));

const mockGetProductByName = jest.fn();
const mockAddProductRecommendation = jest.fn();
jest.mock('../utils', () => ({
    getProductByName: mockGetProductByName,
    addProductRecommendation: mockAddProductRecommendation,
}));

const mockSaveConversation = jest.fn();
const mockSaveConversationSummary = jest.fn();
const mockGenerateAndSaveSummary = jest.fn();
jest.mock('../conversation', () => ({
    saveConversation: mockSaveConversation,
    saveConversationSummary: mockSaveConversationSummary,
    generateAndSaveSummary: mockGenerateAndSaveSummary,
}));

jest.mock('../session', () => jest.fn().mockImplementation(() => ({})));

const {
    updateUserProfile,
    postResponseProductCheck,
    postResponseProcessing,
    postProcessConversation,
} = require('../postResponseProcessing');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('updateUserProfile', () => {
    test('does nothing when updates is empty', async () => {
        const result = await updateUserProfile('u1', {});
        expect(result).toBeNull();
        expect(mockQuery).not.toHaveBeenCalled();
    });

    test('filters null values and updates DB + Redis', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'u1', hair_type: '4c' }] });
        mockRedisSet.mockResolvedValue('OK');

        const updates = { hair_type: '4c', porosity: null, name: 'Alex' };
        const result = await updateUserProfile('u1', updates);

        const dbCall = mockQuery.mock.calls.find(c => c[0].text && c[0].text.includes('UPDATE users'));
        expect(dbCall).toBeDefined();
        // null values should be filtered — only hair_type and name
        expect(dbCall[0].values).not.toContain(null);
        expect(mockRedisSet).toHaveBeenCalledWith('user:u1', expect.any(String));
    });

    test('returns null when user not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await updateUserProfile('u1', { hair_type: '4c' });
        expect(result).toBeNull();
    });
});

describe('postResponseProductCheck', () => {
    test('returns parsed product array on success', async () => {
        const products = [{ productName: 'HairSI Kit', reason: 'For damage repair' }];
        mockChatSend.mockResolvedValue({ output: JSON.stringify(products) });

        const result = await postResponseProductCheck([], 'bot response');

        expect(result).toEqual(products);
    });

    test('strips markdown code blocks before parsing', async () => {
        const products = [{ productName: 'HairAI', reason: 'Quick analysis' }];
        mockChatSend.mockResolvedValue({ output: '```json\n' + JSON.stringify(products) + '\n```' });

        const result = await postResponseProductCheck([], 'bot response');

        expect(result).toEqual(products);
    });

    test('returns empty array when output is empty', async () => {
        mockChatSend.mockResolvedValue({ output: '' });

        const result = await postResponseProductCheck([], 'bot response');

        expect(result).toEqual([]);
    });

    test('returns empty array when output is []', async () => {
        mockChatSend.mockResolvedValue({ output: '[]' });

        const result = await postResponseProductCheck([], 'bot response');

        expect(result).toEqual([]);
    });

    test('returns empty array when output is not a JSON array', async () => {
        mockChatSend.mockResolvedValue({ output: '{"product": "x"}' });

        const result = await postResponseProductCheck([], 'bot response');

        expect(result).toEqual([]);
    });

    test('returns empty array on AI failure', async () => {
        mockChat.mockImplementationOnce(() => { throw new Error('AI error'); });

        const result = await postResponseProductCheck([], 'bot response');

        expect(result).toEqual([]);
    });
});

describe('postResponseProcessing', () => {
    const history = [{ role: 'user', content: 'hi' }];

    test('updates user profile when profile updates present', async () => {
        mockQuery.mockResolvedValue({ rows: [{ user_id: 'u1' }] });
        mockRedisSet.mockResolvedValue('OK');
        mockChatSend.mockResolvedValue({ output: '[]' }); // product check
        mockSaveConversation.mockResolvedValue({});
        mockSaveConversationSummary.mockResolvedValue({});

        const postProcessData = {
            user_profile_updates: { hair_type: '4c' },
            hair_issue_extractions: null,
        };

        await postResponseProcessing(postProcessData, 'u1', 'output', 'summary', 'c1', history, '{}');

        const dbCall = mockQuery.mock.calls.find(c => c[0]?.text?.includes('UPDATE users'));
        expect(dbCall).toBeDefined();
    });

    test('saves hair issues when present', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        mockChatSend.mockResolvedValue({ output: '[]' });
        mockSaveConversation.mockResolvedValue({});
        mockSaveConversationSummary.mockResolvedValue({});

        const postProcessData = {
            user_profile_updates: null,
            hair_issue_extractions: { hair_issues_reported: ['dryness', 'breakage'] },
        };

        await postResponseProcessing(postProcessData, 'u1', 'output', 'summary', 'c1', history, '{}');

        expect(mockSaveHairIssue).toHaveBeenCalledTimes(2);
        expect(mockSaveHairIssue).toHaveBeenCalledWith('u1', 'dryness', expect.any(String));
        expect(mockSaveHairIssue).toHaveBeenCalledWith('u1', 'breakage', expect.any(String));
    });

    test('saves product recommendations when products found', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        const products = [{ productName: 'HairSI Kit', reason: 'Damage repair' }];
        mockChatSend.mockResolvedValue({ output: JSON.stringify(products) });
        mockGetProductByName.mockResolvedValue({ product_id: 'p1' });
        mockAddProductRecommendation.mockResolvedValue({});
        mockSaveConversation.mockResolvedValue({});
        mockSaveConversationSummary.mockResolvedValue({});

        const postProcessData = { user_profile_updates: null, hair_issue_extractions: null };

        await postResponseProcessing(postProcessData, 'u1', 'output', 'summary', 'c1', history, '{}');

        expect(mockAddProductRecommendation).toHaveBeenCalledWith('u1', 'c1', 'p1', 'Damage repair');
    });

    test('saves conversation at end', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        mockChatSend.mockResolvedValue({ output: '[]' });
        mockSaveConversation.mockResolvedValue({ conversation_id: 'c1' });
        mockSaveConversationSummary.mockResolvedValue({});

        const postProcessData = { user_profile_updates: null, hair_issue_extractions: null };

        await postResponseProcessing(postProcessData, 'u1', 'output', 'summary', 'c1', history, '{}');

        expect(mockSaveConversation).toHaveBeenCalledWith('c1', 'u1', history, 'summary');
    });
});
