const {
    isPlaceholderSummary,
    cleanTurnContent,
    buildTitleFromHistory,
    buildSummaryFromHistory,
} = require('../conversationMeta');

// Real stored shape: user turns carry a wire prefix, assistant turns do not.
const history = [
    { role: 'user', content: '2026-09-14T23:18:04.975Z - User Said: Show me todays routine checklist' },
    { role: 'assistant', content: 'Here is your routine for today, focused on hydration and sealing.' },
];

describe('cleanTurnContent', () => {
    test('strips the "<ISO> - User Said:" wire prefix', () => {
        expect(cleanTurnContent(history[0].content)).toBe('Show me todays routine checklist');
    });

    test('strips photo attachment markers and markdown noise', () => {
        expect(cleanTurnContent('2026-01-02T03:04:05.000Z - User Said: [Photo Attached: a.jpg] **help**'))
            .toBe('help');
    });

    test('leaves an already-clean assistant turn alone', () => {
        expect(cleanTurnContent(history[1].content))
            .toBe('Here is your routine for today, focused on hydration and sealing.');
    });

    test('handles null/undefined', () => {
        expect(cleanTurnContent(null)).toBe('');
        expect(cleanTurnContent(undefined)).toBe('');
    });
});

describe('isPlaceholderSummary', () => {
    test('detects the placeholder that was being persisted to every row', () => {
        expect(isPlaceholderSummary('conversation summary not available.')).toBe(true);
        expect(isPlaceholderSummary('Conversation active.')).toBe(true);
        expect(isPlaceholderSummary('No conversation history available.')).toBe(true);
    });

    test('treats empty/missing as placeholder', () => {
        expect(isPlaceholderSummary('')).toBe(true);
        expect(isPlaceholderSummary(null)).toBe(true);
    });

    test('accepts a genuine summary', () => {
        expect(isPlaceholderSummary('Member asked about wash day for 4C hair.')).toBe(false);
    });
});

describe('buildTitleFromHistory', () => {
    test('uses what the member actually asked, without the wire prefix', () => {
        expect(buildTitleFromHistory(history, 'conversation summary not available.'))
            .toBe('Show me todays routine checklist');
    });

    test('never returns the placeholder as a title', () => {
        const title = buildTitleFromHistory([], 'conversation summary not available.');
        expect(title).toBe('Hair Care Consultation');
        expect(title.toLowerCase()).not.toContain('not available');
    });

    test('truncates a long opener rather than emitting a paragraph', () => {
        const long = [{ role: 'user', content: 'x'.repeat(300) }];
        const title = buildTitleFromHistory(long, null);
        expect(title.length).toBeLessThanOrEqual(52);
    });

    test('falls back to a real stored summary when there are no user turns', () => {
        const assistantOnly = [{ role: 'assistant', content: 'Welcome in.' }];
        expect(buildTitleFromHistory(assistantOnly, 'Wash day regimen for high porosity hair'))
            .toBe('Wash day regimen for high porosity hair');
    });
});

describe('buildSummaryFromHistory', () => {
    test('keeps a genuine stored summary', () => {
        expect(buildSummaryFromHistory(history, 'Member asked about wash day for 4C hair.'))
            .toBe('Member asked about wash day for 4C hair.');
    });

    test('builds one from the exchange when the stored value is a placeholder', () => {
        const summary = buildSummaryFromHistory(history, 'conversation summary not available.');
        expect(summary).toContain('Show me todays routine checklist');
        expect(summary).toContain('Here is your routine for today');
        expect(summary.toLowerCase()).not.toContain('not available');
    });

    test('works with only a user turn', () => {
        expect(buildSummaryFromHistory([history[0]], null)).toBe('Show me todays routine checklist');
    });

    test('degrades honestly when there is nothing at all', () => {
        expect(buildSummaryFromHistory([], null)).toBe('Hair care conversation with Mya.');
    });

    test('caps length so the history drawer stays readable', () => {
        const long = [
            { role: 'user', content: 'a'.repeat(400) },
            { role: 'assistant', content: 'b'.repeat(400) },
        ];
        expect(buildSummaryFromHistory(long, null).length).toBeLessThanOrEqual(220);
    });
});
