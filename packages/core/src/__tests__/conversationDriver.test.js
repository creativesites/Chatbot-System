const {
    inferStage,
    analyzeAIQuestions,
    getDepthCategory,
    buildDrivingDirective,
    getConversationDirective,
    STAGES,
} = require('../conversationDriver');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const user = (content) => ({ role: 'user', content });
const ai   = (content) => ({ role: 'model', content });

// ---------------------------------------------------------------------------
// inferStage
// ---------------------------------------------------------------------------

describe('inferStage', () => {
    test('detects stage 5 from desperation keywords', () => {
        expect(inferStage([user('I am so overwhelmed and frustrated with my hair')])).toBe(5);
    });

    test('detects stage 6 from damage keywords', () => {
        expect(inferStage([user('I have so much heat damage and breakage')])).toBe(6);
    });

    test('detects stage 1 from big chop keywords', () => {
        expect(inferStage([user('I just did my big chop yesterday!')])).toBe(1);
    });

    test('detects stage 8 from nirvana keywords', () => {
        expect(inferStage([user('I love my routine and my hair is healthy and happy')])).toBe(8);
    });

    test('returns null when no keywords match', () => {
        expect(inferStage([user('Hello there')])).toBeNull();
    });

    test('returns null for empty history', () => {
        expect(inferStage([])).toBeNull();
    });

    test('only looks at last 4 user messages (old keywords ignored)', () => {
        const old = user('I just did my big chop'); // stage 1
        const recent = user('I am overwhelmed');     // stage 5
        const history = [old, ai('response'), ai('r2'), ai('r3'), ai('r4'), recent];
        // Recent stage 5 wins over old stage 1
        expect(inferStage(history)).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// analyzeAIQuestions
// ---------------------------------------------------------------------------

describe('analyzeAIQuestions', () => {
    test('counts turns with questions correctly', () => {
        const history = [
            user('hi'),
            ai('Hello! What is your hair type?'),
            user('4c'),
            ai('Great! How long have you been natural?'),
            user('2 years'),
            ai('Wonderful. Here are some tips.'),
        ];
        const stats = analyzeAIQuestions(history, 3);
        expect(stats.total).toBe(3);
        expect(stats.withQuestion).toBe(2);
        expect(stats.lastTurnHadQuestion).toBe(false);
    });

    test('lastTurnHadQuestion is true when last AI turn has a question', () => {
        const history = [user('hi'), ai('What is your hair type?')];
        const stats = analyzeAIQuestions(history);
        expect(stats.lastTurnHadQuestion).toBe(true);
    });

    test('returns zeros for empty history', () => {
        const stats = analyzeAIQuestions([]);
        expect(stats.total).toBe(0);
        expect(stats.withQuestion).toBe(0);
        expect(stats.lastTurnHadQuestion).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// getDepthCategory
// ---------------------------------------------------------------------------

describe('getDepthCategory', () => {
    test('opening: 0 user turns', () => {
        expect(getDepthCategory([])).toBe('opening');
    });

    test('opening: 1 user turn', () => {
        expect(getDepthCategory([user('hi')])).toBe('opening');
    });

    test('exploring: 2-3 user turns', () => {
        expect(getDepthCategory([user('a'), user('b')])).toBe('exploring');
        expect(getDepthCategory([user('a'), user('b'), user('c')])).toBe('exploring');
    });

    test('deepening: 4-7 user turns', () => {
        const h = Array.from({ length: 5 }, () => user('msg'));
        expect(getDepthCategory(h)).toBe('deepening');
    });

    test('action-ready: 8+ user turns', () => {
        const h = Array.from({ length: 8 }, () => user('msg'));
        expect(getDepthCategory(h)).toBe('action-ready');
    });
});

// ---------------------------------------------------------------------------
// buildDrivingDirective
// ---------------------------------------------------------------------------

describe('buildDrivingDirective', () => {
    test('opening with no stage → ask about hair type', () => {
        const result = buildDrivingDirective({
            stage: null, depth: 'opening',
            questionStats: { total: 0, withQuestion: 0, lastTurnHadQuestion: false },
            personaType: null,
        });
        expect(result).toMatch(/ask one open question/);
    });

    test('exploring, AI did not ask last turn → prompt to ask follow-up', () => {
        const result = buildDrivingDirective({
            stage: null, depth: 'exploring',
            questionStats: { total: 1, withQuestion: 0, lastTurnHadQuestion: false },
            personaType: null,
        });
        expect(result).toMatch(/follow-up question/);
    });

    test('exploring, AI already asked → includes stage context when stage known', () => {
        const result = buildDrivingDirective({
            stage: 3, depth: 'exploring',
            questionStats: { total: 1, withQuestion: 1, lastTurnHadQuestion: true },
            personaType: null,
        });
        expect(result).toMatch(/Experimenting/);
    });

    test('deepening, AI never asked → surfaces momentum directive', () => {
        const result = buildDrivingDirective({
            stage: null, depth: 'deepening',
            questionStats: { total: 3, withQuestion: 0, lastTurnHadQuestion: false },
            personaType: null,
        });
        expect(result).toMatch(/forward momentum/);
    });

    test('deepening, high-need stage (5) → introduces Myavana service', () => {
        const result = buildDrivingDirective({
            stage: 5, depth: 'deepening',
            questionStats: { total: 3, withQuestion: 2, lastTurnHadQuestion: true },
            personaType: null,
        });
        expect(result).toMatch(/Myavana service/);
    });

    test('action-ready, stage 8 → celebrate and maintenance', () => {
        const result = buildDrivingDirective({
            stage: 8, depth: 'action-ready',
            questionStats: { total: 5, withQuestion: 3, lastTurnHadQuestion: true },
            personaType: null,
        });
        expect(result).toMatch(/celebrate/);
    });

    test('overwhelmed persona softens action directive', () => {
        const result = buildDrivingDirective({
            stage: 6, depth: 'deepening',
            questionStats: { total: 3, withQuestion: 2, lastTurnHadQuestion: true },
            personaType: 'overwhelmed',
        });
        expect(result).toMatch(/empathy first/);
        expect(result).not.toMatch(/introduce a relevant Myavana service/);
    });

    test('returns empty string when no directive applies', () => {
        // exploring + already asked → no stage context when stage is null
        const result = buildDrivingDirective({
            stage: null, depth: 'exploring',
            questionStats: { total: 1, withQuestion: 1, lastTurnHadQuestion: true },
            personaType: null,
        });
        expect(result).toBe('');
    });
});

// ---------------------------------------------------------------------------
// getConversationDirective (integration)
// ---------------------------------------------------------------------------

describe('getConversationDirective', () => {
    test('returns first-message directive for empty history', () => {
        const result = getConversationDirective([]);
        expect(result).toMatch(/first message/);
    });

    test('returns non-empty string for a real conversation', () => {
        const history = [
            user('My hair is so damaged from bleaching'),
            ai('I understand, bleach can really stress your strands. How long ago did you bleach?'),
            user('About 3 months ago. It keeps breaking off'),
            ai('Breakage after bleach is very common. Are you using any protein treatments?'),
            user('No, I had no idea I needed that'),
        ];
        const result = getConversationDirective(history, null);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    test('wraps directive in bracket format', () => {
        const result = getConversationDirective([user('hi')], null);
        if (result) {
            expect(result).toMatch(/^\[Conversation driver:/);
            expect(result).toMatch(/\]\n$/);
        }
    });

    test('does not throw when personaType is null or undefined', () => {
        expect(() => getConversationDirective([user('hello')], null)).not.toThrow();
        expect(() => getConversationDirective([user('hello')], undefined)).not.toThrow();
    });
});
