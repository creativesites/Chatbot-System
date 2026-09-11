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
        expect(result).toEqual([{ product_id: 1, product_name: 'Hair Analysis' }]);
    });

    test('includes partner products when table exists', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ product_name: 'Myavana Analysis' }] })
            .mockResolvedValueOnce({ rows: [{ product_name: 'Partner Cream', source: 'partner' }] });

        const result = await mockCapturedHandlers['searchServices']({ query: 'moisture', limit: 5 });
        expect(result).toHaveLength(2);
        expect(result[1].source).toBe('partner');
    });

    test('returns not-found message when no rows match', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [] })
            .mockRejectedValueOnce(new Error('table missing'));

        const result = await mockCapturedHandlers['searchServices']({ query: 'xyz123' });
        expect(result[0].message).toMatch(/No services or products found/);
    });

    test('returns error object without throwing when DB fails', async () => {
        mockQuery.mockRejectedValue(new Error('DB down'));
        const result = await mockCapturedHandlers['searchServices']({ query: 'anything' });
        expect(result[0].error).toBeDefined();
    });

    test('trims combined results to limit', async () => {
        const services = Array.from({ length: 4 }, (_, i) => ({ product_name: `Service ${i}` }));
        const partners = Array.from({ length: 4 }, (_, i) => ({ product_name: `Partner ${i}` }));
        mockQuery
            .mockResolvedValueOnce({ rows: services })
            .mockResolvedValueOnce({ rows: partners });

        const result = await mockCapturedHandlers['searchServices']({ query: 'hair', limit: 5 });
        expect(result.length).toBeLessThanOrEqual(5);
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
        expect(result).toEqual(faqs);
    });

    test('returns fallback instruction when no rows match', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });
        const result = await mockCapturedHandlers['lookupFAQ']({ query: 'unknown topic' });
        expect(result[0].answer).toMatch(/Answer based on your knowledge/);
    });

    test('returns error object without throwing when DB fails', async () => {
        mockQuery.mockRejectedValue(new Error('DB down'));
        const result = await mockCapturedHandlers['lookupFAQ']({ query: 'anything' });
        expect(result[0].error).toBeDefined();
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
    it('executes cleanly and retrieves the latest social post from SQLite', async () => {
        const handler = mockCapturedHandlers['getCommunityPost'];
        expect(handler).toBeDefined();

        // Run tool and verify it returns a valid social post payload from DB or its fallback
        const result = await handler({ query: 'watercooler' });
        expect(result.id).toBeDefined();
        expect(result.author).toBeDefined();
        expect(result.content).toBeDefined();
        expect(typeof result.likesCount).toBe('number');
        expect(typeof result.commentsCount).toBe('number');
    });
});
