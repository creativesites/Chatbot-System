/**
 * The AI core fetches every attachment URL it is handed, so this list is the
 * server's allowlist for fetching on a client's behalf, as well as the cap on
 * how many photos go to the model.
 */

const { MAX_IMAGE_ATTACHMENTS, extractImageAttachments } = require('../imageAttachments');

const jpeg = (n = 1) => `data:image/jpeg;base64,${'A'.repeat(8)}${n}`;

describe('extractImageAttachments', () => {
    test('accepts inline images from the widget and takes the type from the data URL', () => {
        expect(extractImageAttachments([{ url: jpeg(), mimeType: 'image/png' }]))
            .toEqual([{ url: jpeg(), mimeType: 'image/jpeg' }]);
        expect(extractImageAttachments([{ url: 'data:image/webp;base64,AAAA' }])[0].mimeType).toBe('image/webp');
    });

    test('accepts https links, as the mobile SDK sends', () => {
        expect(extractImageAttachments([{ uri: 'https://cdn.example.com/a.jpg', type: 'image/png' }]))
            .toEqual([{ url: 'https://cdn.example.com/a.jpg', mimeType: 'image/png' }]);
        expect(extractImageAttachments([{ payload: { url: 'https://cdn.example.com/b.jpg' } }])[0].mimeType).toBe('image/jpeg');
    });

    test('refuses URLs the server must never fetch for a client', () => {
        const refused = [
            'http://169.254.169.254/latest/meta-data/',
            'http://localhost:8080/admin',
            'file:///etc/passwd',
            'javascript:alert(1)',
            'data:text/html;base64,PHNjcmlwdD4=',
            'data:image/svg+xml;base64,PHN2Zz4=',
            'ftp://example.com/a.jpg',
            '',
        ];
        expect(extractImageAttachments(refused.map((url) => ({ url })))).toEqual([]);
    });

    test(`sends at most ${MAX_IMAGE_ATTACHMENTS} photos with a message`, () => {
        const many = Array.from({ length: 7 }, (_, i) => ({ url: jpeg(i) }));
        const out = extractImageAttachments(many);
        expect(out).toHaveLength(MAX_IMAGE_ATTACHMENTS);
        expect(out[0].url).toBe(jpeg(0));
    });

    test('skips junk entries without throwing', () => {
        expect(extractImageAttachments(null)).toEqual([]);
        expect(extractImageAttachments('nope')).toEqual([]);
        expect(extractImageAttachments([null, 42, 'x', {}, { url: jpeg() }])).toHaveLength(1);
    });
});
