const mockQuery = jest.fn();
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

jest.mock('../database', () => ({
    pgClient: { query: mockQuery },
    redisClient: { get: mockRedisGet, set: mockRedisSet, del: mockRedisDel },
}));

// Prevent real AI calls
jest.mock('../ai', () => ({ generate: jest.fn() }));
jest.mock('@genkit-ai/google-genai', () => ({
    googleAI: { model: jest.fn(name => `mock:${name}`) },
}));

const { getTrendContext, getRelevantTrends, isTrendsStale, selectTrends } = require('../trendManager');

const SAMPLE_TRENDS = [
    { trend_name: 'Scalp Detox Routine',    description: 'Remove buildup for healthier growth', category: 'technique',   relevance_stages: [1, 3, 7], trend_score: 0.9 },
    { trend_name: 'Rice Water Protein',     description: 'Fermented rice water strengthens strands', category: 'ingredient', relevance_stages: [6, 7],    trend_score: 0.85 },
    { trend_name: 'Silk Bonnet Sleeping',   description: 'Reduce friction and retain moisture overnight', category: 'wellness',   relevance_stages: [2, 8],    trend_score: 0.75 },
    { trend_name: 'Low Manipulation Braid', description: 'Protective styles for length retention', category: 'style',      relevance_stages: [4, 5, 6], trend_score: 0.7 },
];

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// selectTrends
// ---------------------------------------------------------------------------

describe('selectTrends', () => {
    test('returns empty array for empty input', () => {
        expect(selectTrends([], 5, 3)).toEqual([]);
    });

    test('filters by stage and puts matches first', () => {
        const result = selectTrends(SAMPLE_TRENDS, 6, 3);
        expect(result[0].trend_name).toBe('Rice Water Protein');
        expect(result).toHaveLength(3);
    });

    test('fills remaining slots with non-matching trends', () => {
        const result = selectTrends(SAMPLE_TRENDS, 6, 4);
        const names = result.map(t => t.trend_name);
        expect(names).toContain('Rice Water Protein');
        expect(names).toContain('Scalp Detox Routine'); // not stage 6 but fills slot
    });

    test('respects limit', () => {
        expect(selectTrends(SAMPLE_TRENDS, null, 2)).toHaveLength(2);
    });

    test('returns top by score when stage is null', () => {
        const result = selectTrends(SAMPLE_TRENDS, null, 2);
        expect(result[0].trend_score).toBeGreaterThanOrEqual(result[1].trend_score);
    });
});

// ---------------------------------------------------------------------------
// isTrendsStale
// ---------------------------------------------------------------------------

describe('isTrendsStale', () => {
    test('returns true when no trends in DB', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ latest: null }] });
        expect(await isTrendsStale()).toBe(true);
    });

    test('returns true when latest trend is older than 48h', async () => {
        const old = new Date(Date.now() - 49 * 60 * 60 * 1000);
        mockQuery.mockResolvedValueOnce({ rows: [{ latest: old }] });
        expect(await isTrendsStale()).toBe(true);
    });

    test('returns false when trends are fresh', async () => {
        const fresh = new Date(Date.now() - 1 * 60 * 60 * 1000);
        mockQuery.mockResolvedValueOnce({ rows: [{ latest: fresh }] });
        expect(await isTrendsStale()).toBe(false);
    });

    test('returns false without throwing when DB fails', async () => {
        mockQuery.mockRejectedValueOnce(new Error('DB down'));
        expect(await isTrendsStale()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// getRelevantTrends
// ---------------------------------------------------------------------------

describe('getRelevantTrends', () => {
    test('returns from Redis cache when available', async () => {
        mockRedisGet.mockResolvedValueOnce(JSON.stringify(SAMPLE_TRENDS));

        const result = await getRelevantTrends(6, 2);
        expect(mockQuery).not.toHaveBeenCalled();
        expect(result).toHaveLength(2);
        expect(result[0].trend_name).toBe('Rice Water Protein'); // stage 6 match first
    });

    test('falls back to DB when Redis misses', async () => {
        mockRedisGet.mockResolvedValueOnce(null);
        mockQuery.mockResolvedValueOnce({ rows: SAMPLE_TRENDS });
        mockRedisSet.mockResolvedValueOnce('OK');

        const result = await getRelevantTrends(null, 3);
        expect(mockQuery).toHaveBeenCalled();
        expect(result).toHaveLength(3);
    });

    test('populates Redis after DB fetch', async () => {
        mockRedisGet.mockResolvedValueOnce(null);
        mockQuery.mockResolvedValueOnce({ rows: SAMPLE_TRENDS });
        mockRedisSet.mockResolvedValueOnce('OK');

        await getRelevantTrends(null, 2);
        expect(mockRedisSet).toHaveBeenCalledWith(
            'hair_trends:current',
            expect.any(String),
            { EX: expect.any(Number) }
        );
    });

    test('returns empty array without throwing when DB fails', async () => {
        mockRedisGet.mockResolvedValueOnce(null);
        mockQuery.mockRejectedValueOnce(new Error('DB down'));
        expect(await getRelevantTrends(5, 2)).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// getTrendContext
// ---------------------------------------------------------------------------

describe('getTrendContext', () => {
    test('returns formatted trend block', async () => {
        mockRedisGet.mockResolvedValueOnce(JSON.stringify(SAMPLE_TRENDS));
        // isTrendsStale call (background) → DB check
        mockQuery.mockResolvedValue({ rows: [{ latest: new Date() }] });

        const result = await getTrendContext(3, 'explorer');
        expect(result).toMatch(/^\[Trending in hair care:/);
        expect(result).toMatch(/\]\n$/);
    });

    test('returns empty string when no trends exist', async () => {
        mockRedisGet.mockResolvedValueOnce(null);
        mockQuery
            .mockResolvedValueOnce({ rows: [] })             // getRelevantTrends DB query
            .mockResolvedValueOnce({ rows: [{ latest: null }] }); // isTrendsStale

        const result = await getTrendContext(null, null);
        expect(result).toBe('');
    });

    test('trend names are lowercased in output', async () => {
        mockRedisGet.mockResolvedValueOnce(JSON.stringify([
            { trend_name: 'Scalp Detox Routine', relevance_stages: [], trend_score: 0.9 },
        ]));
        mockQuery.mockResolvedValue({ rows: [{ latest: new Date() }] });

        const result = await getTrendContext(null, null);
        expect(result).toContain('scalp detox routine');
    });
});
