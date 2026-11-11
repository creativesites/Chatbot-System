// agentTools.test.js
// Tests tool handler logic by capturing handlers at definition time via mock.
// jest.mock factory variables must be prefixed with `mock` to be hoisting-safe.

const mockQuery = jest.fn();
const mockCapturedHandlers = {};

jest.mock('../database', () => ({
    pgClient: { query: mockQuery },
    redisClient: { get: jest.fn(), set: jest.fn() },
}));

jest.mock('../ai', () => ({
    defineTool: (config, fn) => {
        mockCapturedHandlers[config.name] = fn;
        return { __toolName: config.name };
    },
    dynamicTool: (config, fn) => {
        mockCapturedHandlers[config.name] = fn;
        return { __toolName: config.name };
    },
}));

// Load module after mocks — defineTool/dynamicTool calls populate mockCapturedHandlers
const { createUserTools } = require('../agentTools');
// Trigger dynamic tool registration for user 'u1'
createUserTools('u1');

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// searchServices
// ---------------------------------------------------------------------------

describe('searchServices', () => {
    test('returns matching rows from products table', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ product_id: 1, product_name: 'Hair Analysis' }] })
            .mockRejectedValueOnce(new Error('relation "partner_products" does not exist'));

        const result = await mockCapturedHandlers['searchServices']({ query: 'analysis', limit: 5 });
        expect(result.results).toEqual([{ product_id: 1, product_name: 'Hair Analysis' }]);
    });

    test('includes partner products when table exists', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ product_name: 'Myavana Analysis' }] })
            .mockResolvedValueOnce({ rows: [{ product_name: 'Partner Cream', source: 'partner' }] });

        const result = await mockCapturedHandlers['searchServices']({ query: 'moisture', limit: 5 });
        expect(result.results).toHaveLength(2);
        expect(result.results[1].source).toBe('partner');
    });

    test('returns not-found message when no rows match', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockRejectedValueOnce(new Error('table missing'));

        const result = await mockCapturedHandlers['searchServices']({ query: 'xyz123' });
        expect(result.results).toEqual([]);
        expect(result.message).toMatch(/No services or products found/);
    });

    test('returns error object without throwing when DB fails', async () => {
        mockQuery.mockRejectedValue(new Error('DB down'));
        const result = await mockCapturedHandlers['searchServices']({ query: 'anything' });
        expect(result.message).toBeDefined();
    });

    test('trims combined results to limit', async () => {
        const services = Array.from({ length: 4 }, (_, i) => ({ product_name: `Service ${i}` }));
        const partners = Array.from({ length: 4 }, (_, i) => ({ product_name: `Partner ${i}` }));
        mockQuery
            .mockResolvedValueOnce({ rows: services })
            .mockResolvedValueOnce({ rows: partners });

        const result = await mockCapturedHandlers['searchServices']({ query: 'hair', limit: 5 });
        expect(result.results.length).toBeLessThanOrEqual(5);
    });
});

// ---------------------------------------------------------------------------
// lookupFAQ
// ---------------------------------------------------------------------------

describe('lookupFAQ', () => {
    test('returns matching FAQ rows', async () => {
        const faqs = [{ question: 'How do I cancel?', answer: 'Email support@myavana.com' }];
        mockQuery.mockResolvedValueOnce({ rows: faqs });

        const result = await mockCapturedHandlers['lookupFAQ']({ query: 'cancel', limit: 3 });
        expect(result.faqs).toEqual(faqs);
    });

    test('returns fallback instruction when no rows match', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        const result = await mockCapturedHandlers['lookupFAQ']({ query: 'unknown topic' });
        expect(result.faqs).toEqual([]);
        expect(result.message).toMatch(/Answer based on your knowledge/);
    });

    test('returns error object without throwing when DB fails', async () => {
        mockQuery.mockRejectedValue(new Error('DB down'));
        const result = await mockCapturedHandlers['lookupFAQ']({ query: 'anything' });
        expect(result.message).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// saveHairGoal (dynamic — registered via createUserTools('u1'))
// ---------------------------------------------------------------------------

describe('saveHairGoal', () => {
    test('upserts goal and returns saved:true', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        const result = await mockCapturedHandlers['saveHairGoal']({ goal: 'grow 4 inches by December' });
        expect(result).toEqual({ saved: true, goal: 'grow 4 inches by December' });
        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO user_preferences'),
            expect.arrayContaining(['u1'])
        );
    });

    test('returns saved:false without throwing when DB fails', async () => {
        mockQuery.mockRejectedValue(new Error('DB error'));
        const result = await mockCapturedHandlers['saveHairGoal']({ goal: 'retain moisture' });
        expect(result).toEqual({ saved: false, goal: 'retain moisture' });
    });
});

// ---------------------------------------------------------------------------
// getUserHairProfile (dynamic — registered via createUserTools('u1'))
// ---------------------------------------------------------------------------

describe('getUserHairProfile', () => {
    test('returns profile with null fields stripped', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ hair_type: '4c', hair_concerns: ['dryness'], porosity: null, elasticity: null }],
        });

        const result = await mockCapturedHandlers['getUserHairProfile']({});
        expect(result).toEqual({ hair_type: '4c', hair_concerns: ['dryness'] });
        expect(result.porosity).toBeUndefined();
    });

    test('returns not-found message when user has no profile row', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        const result = await mockCapturedHandlers['getUserHairProfile']({});
        expect(result.message).toMatch(/No hair profile/);
    });

    test('returns message when profile row has all-null fields', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [{ hair_type: null, hair_concerns: null, porosity: null }],
        });
        const result = await mockCapturedHandlers['getUserHairProfile']({});
        expect(result.message).toMatch(/no attributes recorded/);
    });

    test('returns error object without throwing when DB fails', async () => {
        mockQuery.mockRejectedValue(new Error('DB down'));
        const result = await mockCapturedHandlers['getUserHairProfile']({});
        expect(result.error).toBeDefined();
    });
});

describe('getWeatherForecast tool (TASK_MSDK_005)', () => {
    it('executes cleanly and calculates frizz index correctly based on relative humidity', async () => {
        const handler = mockCapturedHandlers['getWeatherForecast'];
        expect(handler).toBeDefined();

        const originalFetch = global.fetch;

        try {
            // Mock Open-Meteo success payload with HIGH humidity
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    current: {
                        temperature_2m: 28,
                        relative_humidity_2m: 85,
                        weather_code: 3
                    }
                })
            });

            const resultHigh = await handler({ location: 'Atlanta' });
            expect(resultHigh.location).toContain('Atlanta, GA');
            expect(resultHigh.temperature).toBe('28°C');
            expect(resultHigh.humidity).toBe('85%');
            expect(resultHigh.frizzIndex).toBe('HIGH');
            expect(resultHigh.advisory).toContain('Curls are highly prone to swelling');

            // Mock Open-Meteo success payload with LOW humidity
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    current: {
                        temperature_2m: 15,
                        relative_humidity_2m: 20,
                        weather_code: 1
                    }
                })
            });

            const resultLow = await handler({ location: 'Chicago' });
            expect(resultLow.location).toContain('Chicago, IL');
            expect(resultLow.temperature).toBe('15°C');
            expect(resultLow.humidity).toBe('20%');
            expect(resultLow.frizzIndex).toBe('LOW (DRY AIR)');
            expect(resultLow.advisory).toContain('Moisture will evaporate rapidly');

        } finally {
            global.fetch = originalFetch;
        }
    });
});

describe('getCommunityPost tool (TASK_MSDK_008)', () => {
    // getCommunityPost used to query CreativeSites-Ai-Team/data/myaos.db - the
    // internal agent team's own coordination database, not a member-facing
    // feature - and returned a hardcoded "14 likes, 3 comments" on every real
    // post regardless of its actual engagement. It now reads the same real
    // WordPress community feed the mobile app's own Community tab uses.
    const realFetch = global.fetch;
    afterEach(() => { global.fetch = realFetch; });

    const mockFeed = (items) => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true, status: 200, json: async () => ({ data: { items } }),
        });
    };

    it('returns a real post with its real engagement counts', async () => {
        mockFeed([{
            id: 42, authorName: 'Jasmine R.', content: 'My wash day routine finally clicked!',
            createdAt: '2026-09-10T12:00:00Z', likeCount: 37, commentCount: 9,
        }]);
        const handler = mockCapturedHandlers['getCommunityPost'];
        const result = await handler({ query: '' });
        expect(result).toMatchObject({
            id: 42, author: 'Jasmine R.', content: 'My wash day routine finally clicked!',
            likesCount: 37, commentsCount: 9,
        });
    });

    it('filters by query against real post content', async () => {
        mockFeed([
            { id: 1, authorName: 'A', content: 'Talking about protective styles', likeCount: 2, commentCount: 0 },
            { id: 2, authorName: 'B', content: 'Wash day routine tips', likeCount: 5, commentCount: 1 },
        ]);
        const handler = mockCapturedHandlers['getCommunityPost'];
        const result = await handler({ query: 'wash day' });
        expect(result.id).toBe(2);
    });

    it('never fabricates a post or engagement numbers when the real feed is empty or unreachable', async () => {
        const handler = mockCapturedHandlers['getCommunityPost'];

        mockFeed([]);
        let result = await handler({ query: '' });
        expect(result.likesCount).toBe(0);
        expect(result.commentsCount).toBe(0);
        expect(result.author).toBe('');
        expect(result.message).toBeTruthy();

        global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
        result = await handler({ query: '' });
        expect(result.likesCount).toBe(0);
        expect(result.author).toBe('');
        expect(result.message).toBeTruthy();
    });

    it('does not read from the internal agent-team database', () => {
        const src = require('fs').readFileSync(require.resolve('../agentTools'), 'utf8');
        expect(src).not.toMatch(/execFileSync/);
        expect(src).not.toMatch(/sqlite3/);
    });
});

describe('findStylistOrSalon tool', () => {
    it('executes cleanly and returns matching salons or stylists', async () => {
        const handler = mockCapturedHandlers['findStylistOrSalon'];
        expect(handler).toBeDefined();

        const result = await handler({ query: 'Atlanta' });
        expect(result).toBeDefined();
        expect(Array.isArray(result.partners)).toBe(true);
        expect(result.partners.length).toBeGreaterThan(0);
        expect(result.partners[0]).toHaveProperty('name');
        expect(result.partners[0].address).toHaveProperty('city');
    });

    it('filters by category salon_or_stylist correctly', async () => {
        const handler = mockCapturedHandlers['findStylistOrSalon'];
        // A location is required (see the no-location test below), so this
        // exercises category filtering with one supplied.
        const result = await handler({ locationQuery: 'GA', category: 'salon_or_stylist', limit: 10 });
        expect(Array.isArray(result.partners)).toBe(true);
        expect(result.partners.length).toBeGreaterThan(0);
        result.partners.forEach(item => {
            expect(item.category).toBe('salon');
        });
    });

    it('asks for a location instead of returning an arbitrary partner when none is given', async () => {
        // MYAVANA's 26 partners span Atlanta, Dayton, Brooklyn, Kampala and
        // more - a "top salons" fallback with no location handed a member in
        // Seattle a result 2,000+ miles away with no indication of that.
        const handler = mockCapturedHandlers['findStylistOrSalon'];
        const result = await handler({});
        expect(result.partners).toEqual([]);
        expect(result.needsLocation).toBe(true);
        expect(result.message).toMatch(/ask the member/i);
    });

    it('tells the model where to send the member when a location has no nearby partners', async () => {
        const handler = mockCapturedHandlers['findStylistOrSalon'];
        const result = await handler({ locationQuery: 'a location with no partners nearby zzz' });
        expect(result.partners).toEqual([]);
        expect(result.message).toMatch(/myavana-ecosystem/);
    });

    it('handles proximity lookups with latitude and longitude', async () => {
        const handler = mockCapturedHandlers['findStylistOrSalon'];
        // Atlanta coordinates
        const result = await handler({ latitude: 33.7490, longitude: -84.3880, limit: 5 });
        expect(Array.isArray(result.partners)).toBe(true);
        expect(result.partners.length).toBeGreaterThan(0);
        expect(result.partners[0]).toHaveProperty('distance_miles');
        expect(result.partners[0].distance_miles).toBeLessThanOrEqual(50);
    });
});

describe('searchHairMedia tool', () => {
    it('executes cleanly and retrieves visual assets for hairstyles', async () => {
        const handler = mockCapturedHandlers['searchHairMedia'];
        expect(handler).toBeDefined();

        const result = await handler({ query: 'box braids' });
        expect(Array.isArray(result.assets)).toBe(true);
        expect(result.assets.length).toBeGreaterThan(0);
        expect(result.assets[0]).toHaveProperty('title');
        expect(result.assets[0]).toHaveProperty('source_url');
        expect(result.assets[0].title).toContain('Box Braids');
    });

    it('retrieves visual assets for newly added styles like crochet braids or silk press', async () => {
        const handler = mockCapturedHandlers['searchHairMedia'];

        const crochetResult = await handler({ query: 'crochet braids' });
        expect(Array.isArray(crochetResult.assets)).toBe(true);
        expect(crochetResult.assets[0].title).toContain('Crochet Braids');

        const silkPressResult = await handler({ query: 'silk press' });
        expect(Array.isArray(silkPressResult.assets)).toBe(true);
        expect(silkPressResult.assets[0].title).toContain('Silk Press');
    });

    it('filters by category accurately', async () => {
        const handler = mockCapturedHandlers['searchHairMedia'];

        const diagnosticResult = await handler({ query: 'cuticle', category: 'microscopic_anatomy' });
        expect(Array.isArray(diagnosticResult.assets)).toBe(true);
        expect(diagnosticResult.assets.length).toBeGreaterThan(0);
        expect(diagnosticResult.assets[0].category).toBe('microscopic_anatomy');
    });
});




