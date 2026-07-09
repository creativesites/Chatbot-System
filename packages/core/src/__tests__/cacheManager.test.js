const mockQuery = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.mock('../database', () => ({
    pgClient: { query: mockQuery },
    redisClient: { get: mockRedisGet, set: mockRedisSet },
}));

jest.mock('../ai', () => ({}));
jest.mock('@genkit-ai/google-genai', () => ({
    googleAI: { model: jest.fn(() => 'mocked-model') },
}));
jest.mock('../config', () => ({ genkitApiKey: 'test-key' }));

const mockCacheCreate = jest.fn();
jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
        caches: { create: mockCacheCreate },
    })),
}));

const CacheManager = require('../cacheManager');

beforeEach(() => {
    jest.clearAllMocks();
    // Clear in-memory cache — it's a plain Map, not a Jest mock, so clearAllMocks won't reset it
    CacheManager.memoryCache.clear();
});

const futureDate = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10 hours from now
const pastDate = new Date(Date.now() - 1000); // 1 second ago
const nearExpiryDate = new Date(Date.now() + 30 * 60 * 1000); // 30 min from now (< 1hr threshold)

describe('isCacheExpired', () => {
    test('returns false for future expiry', () => {
        expect(CacheManager.isCacheExpired({ expires_at: futureDate })).toBe(false);
    });

    test('returns true for past expiry', () => {
        expect(CacheManager.isCacheExpired({ expires_at: pastDate })).toBe(true);
    });
});

describe('checkCacheValidity', () => {
    test('returns hasValidCache=false when no cache in any layer', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        mockRedisGet.mockResolvedValue(null);

        const result = await CacheManager.checkCacheValidity('u1');

        expect(result.hasValidCache).toBe(false);
        expect(result.reason).toBe('no_cache');
    });

    test('returns hasValidCache=false when cache is expired', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ cache_name: 'cn1', created_at: new Date(), expires_at: pastDate }],
        });

        const result = await CacheManager.checkCacheValidity('u1');

        expect(result.hasValidCache).toBe(false);
        expect(result.reason).toBe('expired');
    });

    test('returns hasValidCache=true for valid cache', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ cache_name: 'cn1', created_at: new Date(), expires_at: futureDate }],
        });

        const result = await CacheManager.checkCacheValidity('u1');

        expect(result.hasValidCache).toBe(true);
        expect(result.cacheName).toBe('cn1');
        expect(result.needsRefresh).toBe(false);
    });

    test('sets needsRefresh=true when cache is near expiry', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ cache_name: 'cn1', created_at: new Date(), expires_at: nearExpiryDate }],
        });

        const result = await CacheManager.checkCacheValidity('u1');

        expect(result.hasValidCache).toBe(true);
        expect(result.needsRefresh).toBe(true);
    });

    test('returns hasValidCache=false when all layers empty after DB error', async () => {
        mockQuery.mockRejectedValue(new Error('DB down'));

        const result = await CacheManager.checkCacheValidity('u1');

        expect(result.hasValidCache).toBe(false);
        // getUserCache catches internally and returns null, so reason is 'no_cache' not 'error'
        expect(result.reason).toBe('no_cache');
    });
});

describe('saveUserCacheMultiLayer', () => {
    test('saves to all layers when all succeed', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        mockRedisSet.mockResolvedValue('OK');

        await CacheManager.saveUserCacheMultiLayer('u1', 'cache-name-123');

        expect(mockQuery).toHaveBeenCalled();
        expect(mockRedisSet).toHaveBeenCalledWith(
            'gemini_cache:u1',
            expect.any(String),
            { EX: CacheManager.CACHE_TTL_SECONDS }
        );
    });

    test('does NOT call setex (redis v3 API)', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        mockRedisSet.mockResolvedValue('OK');

        await CacheManager.saveUserCacheMultiLayer('u1', 'cache-name-123');

        // Ensure old redis v3 API is not used
        expect(mockRedisSet).toHaveBeenCalled();
        const call = mockRedisSet.mock.calls[0];
        // redis v4 set(key, value, options) — third arg is options object, not a number
        expect(typeof call[2]).toBe('object');
        expect(call[2]).toHaveProperty('EX');
    });

    test('continues when Postgres fails but Redis succeeds', async () => {
        mockQuery.mockRejectedValue(new Error('Postgres down'));
        mockRedisSet.mockResolvedValue('OK');

        // Should not throw — memory layer always succeeds
        await expect(
            CacheManager.saveUserCacheMultiLayer('u1', 'cache-name-123')
        ).resolves.not.toThrow();
    });

    test('throws when all layers fail', async () => {
        mockQuery.mockRejectedValue(new Error('Postgres down'));
        mockRedisSet.mockRejectedValue(new Error('Redis down'));
        // Memory always succeeds so this won't throw — the guard is for all 3 failing
        // Simulate memory failure by spying
        const spy = jest.spyOn(CacheManager, 'saveUserCacheToMemory').mockImplementation(() => {
            throw new Error('Memory down');
        });

        await expect(
            CacheManager.saveUserCacheMultiLayer('u1', 'cache-name-123')
        ).rejects.toThrow('All cache storage layers failed');

        spy.mockRestore();
    });
});

describe('getOrCreateCache', () => {
    test('returns existing cache when valid cache found', async () => {
        mockQuery.mockResolvedValue({
            rows: [{ cache_name: 'existing-cache', created_at: new Date(), expires_at: futureDate }],
        });

        const result = await CacheManager.getOrCreateCache('u1', 'system prompt text');

        expect(result.cacheName).toBe('existing-cache');
        expect(result.isNewCache).toBe(false);
        expect(mockCacheCreate).not.toHaveBeenCalled();
    });

    test('creates new cache when none exists', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        mockRedisGet.mockResolvedValue(null);
        mockCacheCreate.mockResolvedValue({ name: 'new-cache-name' });
        mockRedisSet.mockResolvedValue('OK');

        const result = await CacheManager.getOrCreateCache('u1', 'system prompt text');

        expect(mockCacheCreate).toHaveBeenCalledWith(expect.objectContaining({
            model: 'gemini-3-flash-preview',
            config: expect.objectContaining({ systemInstruction: 'system prompt text' }),
        }));
        expect(result.cacheName).toBe('new-cache-name');
        expect(result.isNewCache).toBe(true);
    });

    test('returns null cacheName on creation failure', async () => {
        mockQuery.mockResolvedValue({ rows: [] });
        mockRedisGet.mockResolvedValue(null);
        mockCacheCreate.mockRejectedValue(new Error('Gemini API error'));

        const result = await CacheManager.getOrCreateCache('u1', 'system prompt text');

        expect(result.cacheName).toBeNull();
        expect(result.error).toBeDefined();
    });
});
