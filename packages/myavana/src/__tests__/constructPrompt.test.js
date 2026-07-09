// Mock all core imports before requiring constructPrompt
const mockGetHairIssues = jest.fn().mockResolvedValue([]);
const mockGetAllProducts = jest.fn().mockResolvedValue([{ product_name: 'HairSI Kit' }]);
const mockGetAllFaqs = jest.fn().mockResolvedValue([{ question: 'Q1', answer: 'A1' }]);
const mockGetAllYoutubeVideos = jest.fn().mockResolvedValue([]);
const mockGetAllTestimonials = jest.fn().mockResolvedValue([]);
const mockGetAdditionalInstructions = jest.fn().mockResolvedValue([]);
const mockGetTrainingData = jest.fn().mockResolvedValue([]);

jest.mock('myavana-bot-test-core', () => ({
    getHairIssuesForUser: mockGetHairIssues,
    getAllProducts: mockGetAllProducts,
    getAllFaqs: mockGetAllFaqs,
    getAllYoutubeVideos: mockGetAllYoutubeVideos,
    getAllTestimonials: mockGetAllTestimonials,
    getAdditionalInstructions: mockGetAdditionalInstructions,
    getTrainingData: mockGetTrainingData,
}));

const { constructPrompt, imageAnalysisPrompt } = require('../constructPrompt');

beforeEach(() => {
    jest.clearAllMocks();
    mockGetHairIssues.mockResolvedValue([]);
    mockGetAllProducts.mockResolvedValue([{ product_name: 'HairSI Kit' }]);
    mockGetAllFaqs.mockResolvedValue([{ question: 'Q1', answer: 'A1' }]);
    mockGetAllYoutubeVideos.mockResolvedValue([]);
    mockGetAllTestimonials.mockResolvedValue([]);
    mockGetAdditionalInstructions.mockResolvedValue([]);
    mockGetTrainingData.mockResolvedValue([]);
});

describe('constructPrompt', () => {
    test('returns a string containing the system instruction', async () => {
        const prompt = await constructPrompt('u1', { name: 'Alex' }, 'previous summary', false);

        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(100);
        // System prompt contains Mya persona text
        expect(prompt).toContain('Mya');
    });

    test('includes user info in the prompt', async () => {
        const userDetails = { name: 'Alex', hair_type: '4c' };
        const prompt = await constructPrompt('u1', userDetails, 'Test summary', false);

        expect(prompt).toContain('Alex');
        expect(prompt).toContain('Test summary');
    });

    test('includes product data when products exist', async () => {
        const prompt = await constructPrompt('u1', {}, null, false);

        expect(prompt).toContain('HairSI Kit');
    });

    test('handles null userDetails gracefully', async () => {
        const prompt = await constructPrompt('u1', null, null, false);

        expect(typeof prompt).toBe('string');
        expect(prompt).toContain('New User');
    });

    test('returns fallback prompt on error', async () => {
        mockGetAllProducts.mockRejectedValue(new Error('DB error'));

        const prompt = await constructPrompt('u1', { name: 'Alex' }, null, false);

        expect(prompt).toContain('Mya');
        expect(prompt).toContain('hair care assistant');
    });

    test('fetches hair issues for the given userId', async () => {
        mockGetHairIssues.mockResolvedValue([{ issue_description: 'dryness' }]);

        const prompt = await constructPrompt('u1', {}, null, false);

        expect(mockGetHairIssues).toHaveBeenCalledWith('u1');
        expect(prompt).toContain('dryness');
    });

    test('calls getTrainingData with limit of 20', async () => {
        await constructPrompt('u1', {}, null, false);

        expect(mockGetTrainingData).toHaveBeenCalledWith(20);
    });
});

describe('imageAnalysisPrompt', () => {
    test('returns a string containing user info', () => {
        const result = imageAnalysisPrompt('{"name":"Alex"}', 'dryness issue');

        expect(typeof result).toBe('string');
        expect(result).toContain('Alex');
        expect(result).toContain('dryness issue');
    });

    test('includes Myavana branding', () => {
        const result = imageAnalysisPrompt('{}', '');

        expect(result).toContain('Myavana');
    });
});
