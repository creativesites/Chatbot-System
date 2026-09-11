const request = require('supertest');

// --- Mocks set up before any requires ---
const mockCacheCheckValidity = jest.fn();
const mockGetOrCreateCache = jest.fn();
const mockGetConversationHistory = jest.fn().mockResolvedValue([]);
const mockGetAllConversationsSummary = jest.fn().mockResolvedValue('summary');
const mockGetUserDetails = jest.fn().mockResolvedValue({ name: 'Alex' });
const mockPostProcessConversation = jest.fn().mockResolvedValue({});
const mockPostResponseProcessing = jest.fn().mockResolvedValue({});

const mockSessionChat = jest.fn();
const mockLoadSession = jest.fn().mockResolvedValue({ chat: mockSessionChat });

jest.mock('myavana-bot-test-core', () => ({
    connectDatabases: jest.fn().mockResolvedValue(true),
    pgClient: { end: jest.fn() },
    redisClient: { quit: jest.fn() },
    ai: { loadSession: mockLoadSession },
    DatabaseSessionStore: jest.fn().mockImplementation(() => ({})),
    cacheManager: {
        checkCacheValidity: mockCacheCheckValidity,
        getOrCreateCache: mockGetOrCreateCache,
    },
    getAllConversationsSummary: mockGetAllConversationsSummary,
    getUserDetails: mockGetUserDetails,
    getConversationHistory: mockGetConversationHistory,
    postProcessConversation: mockPostProcessConversation,
    postResponseProcessing: mockPostResponseProcessing,
}));

const mockHandleWelcomeEvent = jest.fn().mockResolvedValue(true);
const mockHandleImageMessage = jest.fn().mockResolvedValue(true);
jest.mock('../eventHandlers', () => ({
    handleWelcomeEvent: mockHandleWelcomeEvent,
    handleImageMessage: mockHandleImageMessage,
}));

const mockConstructPrompt = jest.fn().mockResolvedValue('mocked system prompt');
jest.mock('../constructPrompt', () => ({
    constructPrompt: mockConstructPrompt,
}));

jest.mock('@genkit-ai/google-genai', () => ({
    googleAI: { model: jest.fn(name => `mock-model:${name}`) },
}));

const mockChatSend = jest.fn();
mockSessionChat.mockReturnValue({ send: mockChatSend });

// Valid AI response
const validAiOutput = [{
    messageType: 'html',
    message: '<html><body>Hi!</body></html>',
    metadata: { contentType: '300', templateId: '12', payload: [] },
}];

const MyavanaChatbotServer = require('../index');

let app;

beforeAll(async () => {
    const server = new MyavanaChatbotServer();
    await server.initPromise;
    app = server.app;
});

beforeEach(() => {
    jest.resetAllMocks();
    mockLoadSession.mockResolvedValue({ chat: mockSessionChat });
    mockSessionChat.mockReturnValue({ send: mockChatSend });
    mockChatSend.mockResolvedValue({ output: validAiOutput });
    mockCacheCheckValidity.mockResolvedValue({ hasValidCache: true, cacheName: 'cache-123', needsRefresh: false });
    mockGetOrCreateCache.mockResolvedValue({ cacheName: 'cache-123', isNewCache: false });
    mockGetAllConversationsSummary.mockResolvedValue('summary');
    mockGetUserDetails.mockResolvedValue({ name: 'Alex' });
    mockGetConversationHistory.mockResolvedValue([]);
    mockPostProcessConversation.mockResolvedValue({});
    mockPostResponseProcessing.mockResolvedValue({});
    mockHandleWelcomeEvent.mockResolvedValue(true);
    mockHandleImageMessage.mockResolvedValue(true);
});

describe('GET /health', () => {
    test('returns 200 with status healthy', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('healthy');
        expect(res.body).toHaveProperty('uptime');
    });
});

describe('GET /healthz', () => {
    test('returns 200 with status ok', async () => {
        const res = await request(app).get('/healthz');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});

describe('GET /', () => {
    test('returns service info', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
        expect(res.body.service).toBe('Myavana Chatbot Server');
    });
});

describe('POST / — WELCOME event', () => {
    test('calls handleWelcomeEvent and returns early', async () => {
        mockHandleWelcomeEvent.mockImplementationOnce((res) => {
            res.json({ welcome: true });
        });

        const res = await request(app)
            .post('/')
            .send({ from: 'u1', groupId: 'c1', eventName: 'WELCOME' });

        expect(mockHandleWelcomeEvent).toHaveBeenCalledWith(expect.anything(), 'u1');
        expect(mockConstructPrompt).not.toHaveBeenCalled();
    });
});

describe('POST / — text message (cache hit)', () => {
    test('skips prompt construction when valid cache exists', async () => {
        mockCacheCheckValidity.mockResolvedValue({
            hasValidCache: true,
            cacheName: 'cache-123',
            needsRefresh: false,
        });

        const res = await request(app)
            .post('/')
            .send({ from: 'u1', groupId: 'c1', message: 'Hi there', eventName: 'MESSAGE' });

        expect(mockConstructPrompt).not.toHaveBeenCalled();
        expect(res.status).toBe(200);
    });
});

describe('POST / — text message (cache miss)', () => {
    test('constructs prompt and creates cache when no valid cache', async () => {
        mockCacheCheckValidity.mockResolvedValue({
            hasValidCache: false,
            cacheName: null,
            needsRefresh: false,
        });
        mockGetOrCreateCache.mockResolvedValue({ cacheName: 'new-cache', isNewCache: true });

        const res = await request(app)
            .post('/')
            .send({ from: 'u1', groupId: 'c1', message: 'Hi there', eventName: 'MESSAGE' });

        expect(mockConstructPrompt).toHaveBeenCalledWith('u1', expect.anything(), expect.anything(), false, expect.anything());
        expect(mockGetOrCreateCache).toHaveBeenCalled();
        expect(res.status).toBe(200);
    });
});

describe('POST / — model fallback', () => {
    test('returns 200 using fallback model when primary fails', async () => {
        mockChatSend.mockRejectedValueOnce(new Error('Primary model failed'));

        // Fallback uses core.ai.chat, mock it
        const core = require('myavana-bot-test-core');
        core.ai.chat = jest.fn(() => ({ send: jest.fn().mockResolvedValue({ output: validAiOutput }) }));

        const res = await request(app)
            .post('/')
            .send({ from: 'u1', groupId: 'c1', message: 'Hi', eventName: 'MESSAGE' });

        expect(res.status).toBe(200);
    });

    test('returns 500 when all models fail', async () => {
        mockChatSend.mockRejectedValue(new Error('Primary failed'));
        const core = require('myavana-bot-test-core');
        core.ai.chat = jest.fn(() => ({ send: jest.fn().mockRejectedValue(new Error('Fallback failed')) }));

        const res = await request(app)
            .post('/')
            .send({ from: 'u1', groupId: 'c1', message: 'Hi', eventName: 'MESSAGE' });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe(true);
    });
});

describe('Rate limiting', () => {
    test('returns 429 after exceeding 100 requests per 15 minutes', async () => {
        // Send 101 requests from same IP
        const requests = Array.from({ length: 101 }, () =>
            request(app).get('/healthz').set('X-Forwarded-For', '10.0.0.1')
        );
        const responses = await Promise.all(requests);
        const tooManyRequests = responses.filter(r => r.status === 429);
        expect(tooManyRequests.length).toBeGreaterThan(0);
    });
});
