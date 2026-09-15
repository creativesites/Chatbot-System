/**
 * Every catalog image URL must point at the file's real location.
 *
 * Wikimedia Commons stores a file under /<md5[0]>/<md5[0..1]>/<filename>,
 * where md5 is the hash of the underscore-form filename. 21 of the 61 catalog
 * entries had a wrong hash directory - Box_Braids.jpg was listed under /8/82/
 * when the file lives under /a/af/ - so they 404'd and the widget showed the
 * card title twice (the broken image's alt text under the heading).
 *
 * This is a pure offline check, so it runs in CI without touching the network.
 */

const crypto = require('crypto');
const catalog = require('../../data/hair_media_catalog.json');

const COMMONS_FILE = /^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)/;

function hashDirFor(fileName) {
    const md5 = crypto.createHash('md5').update(fileName.replace(/ /g, '_'), 'utf8').digest('hex');
    return `${md5[0]}/${md5.slice(0, 2)}`;
}

function commonsParts(url) {
    const m = COMMONS_FILE.exec(url || '');
    return m ? { dir: `${m[1]}/${m[2]}`, file: decodeURIComponent(m[3]) } : null;
}

describe('hair media catalog image URLs', () => {
    test('catalog is populated and ids are unique', () => {
        expect(catalog.length).toBeGreaterThan(0);
        const ids = catalog.map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    const commonsImages = [];
    for (const a of catalog) {
        if (/wikimedia\.org/.test(a.source_url)) commonsImages.push([a.id, 'source_url', a.source_url]);
        if (a.thumbnail_url && /wikimedia\.org/.test(a.thumbnail_url)) commonsImages.push([a.id, 'thumbnail_url', a.thumbnail_url]);
    }

    test.each(commonsImages)('%s %s uses the real Commons hash directory', (id, field, url) => {
        const parts = commonsParts(url);
        expect(parts).not.toBeNull();
        expect(parts.dir).toBe(hashDirFor(parts.file));
    });

    test.each(catalog.filter((a) => /wikimedia\.org/.test(a.source_url)).map((a) => [a.id, a]))(
        '%s page_url names the same file as source_url',
        (id, asset) => {
            const file = commonsParts(asset.source_url).file.replace(/ /g, '_');
            const pageFile = decodeURIComponent(asset.page_url.split('File:')[1] || '').replace(/ /g, '_');
            expect(pageFile).toBe(file);
        }
    );
});

module.exports = { hashDirFor, commonsParts };
