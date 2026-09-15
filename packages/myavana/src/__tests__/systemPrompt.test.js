const fs = require('fs');
const path = require('path');

const SYSTEM_PATH = path.join(__dirname, '..', 'system.js');

/**
 * system.js holds the entire prompt inside a single template literal. Any
 * backtick written into the prose (e.g. markdown-style `searchHairMedia`)
 * terminates that literal early and breaks the file at require time, which
 * takes the whole service down on boot. This has happened twice - once with the
 * stylist ecosystem section, once with the visual media section - so it is
 * guarded here rather than left to be rediscovered in a crash loop.
 */
describe('system prompt integrity', () => {
    const source = fs.readFileSync(SYSTEM_PATH, 'utf8');

    test('module loads without throwing', () => {
        expect(() => require('../system')).not.toThrow();
    });

    test('exports a non-empty prompt string', () => {
        const systemPrompt = require('../system');
        const text = systemPrompt.systemInstruction.parts[0].text;
        expect(typeof text).toBe('string');
        expect(text.length).toBeGreaterThan(1000);
    });

    test('contains exactly two backticks - the template literal delimiters', () => {
        const backticks = (source.match(/`/g) || []).length;
        if (backticks !== 2) {
            const offending = source
                .split('\n')
                .map((line, i) => ({ line, n: i + 1 }))
                .filter(({ line, n }) => line.includes('`') && n !== 1)
                .map(({ line, n }) => `  line ${n}: ${line.trim().slice(0, 110)}`);
            throw new Error(
                'system.js prose contains backticks, which close the prompt template literal early ' +
                'and break the file at require time. Use single quotes for inline code instead.\n' +
                offending.join('\n')
            );
        }
        expect(backticks).toBe(2);
    });

    test('prompt text carries no unresolved template placeholders', () => {
        const systemPrompt = require('../system');
        const text = systemPrompt.systemInstruction.parts[0].text;
        expect(text).not.toMatch(/\$\{/);
        expect(text.toLowerCase()).not.toContain('undefined');
    });
});
