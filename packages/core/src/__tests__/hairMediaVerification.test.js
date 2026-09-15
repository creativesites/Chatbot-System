/**
 * Anti-fabrication guard for visual blocks.
 *
 * Weaker fallback models skip searchHairMedia and invent a plausible-looking
 * image URL — a MYAVANA marketing banner was served captioned "Box Braids".
 * The server checks every hairstyle_card / media_card image against the
 * verified catalog before sending it, and these tests pin that check.
 */

const { HairMediaService } = require('../hairMedia/hairMediaService');

describe('HairMediaService.isVerifiedImageUrl', () => {
    test('accepts a URL that is actually in the catalog', () => {
        const assets = HairMediaService.getAllAssets();
        expect(assets.length).toBeGreaterThan(0);
        expect(HairMediaService.isVerifiedImageUrl(assets[0].source_url)).toBe(true);
    });

    test('accepts a catalog URL regardless of case and surrounding whitespace', () => {
        const url = HairMediaService.getAllAssets()[0].source_url;
        expect(HairMediaService.isVerifiedImageUrl(`  ${url.toUpperCase()}  `)).toBe(true);
    });

    test('rejects the fabricated marketing banner the fallback model produced', () => {
        expect(
            HairMediaService.isVerifiedImageUrl(
                'https://www.myavana.com/cdn/shop/files/myavana-hairri-are-you-ready.jpg'
            )
        ).toBe(false);
    });

    test('rejects an invented URL that merely looks like a catalog entry', () => {
        expect(
            HairMediaService.isVerifiedImageUrl(
                'https://upload.wikimedia.org/wikipedia/commons/0/00/Totally_Made_Up_Box_Braids.jpg'
            )
        ).toBe(false);
    });

    test('rejects empty, null, and non-string input without throwing', () => {
        expect(HairMediaService.isVerifiedImageUrl('')).toBe(false);
        expect(HairMediaService.isVerifiedImageUrl('   ')).toBe(false);
        expect(HairMediaService.isVerifiedImageUrl(null)).toBe(false);
        expect(HairMediaService.isVerifiedImageUrl(undefined)).toBe(false);
        expect(HairMediaService.isVerifiedImageUrl({ url: 'x' })).toBe(false);
        expect(HairMediaService.isVerifiedImageUrl(42)).toBe(false);
    });
});

describe('HairMediaService.findAssetForText', () => {
    test('repairs a fabricated card by finding the real asset from its title', () => {
        const asset = HairMediaService.findAssetForText('Box Braids');
        expect(asset).not.toBeNull();
        expect(HairMediaService.isVerifiedImageUrl(asset.source_url)).toBe(true);
    });

    test('returns null for a label with no catalog match rather than a wrong asset', () => {
        expect(HairMediaService.findAssetForText('zzzz not a hairstyle zzzz')).toBeNull();
    });

    test('returns null for empty or non-string labels', () => {
        expect(HairMediaService.findAssetForText('')).toBeNull();
        expect(HairMediaService.findAssetForText(null)).toBeNull();
        expect(HairMediaService.findAssetForText(undefined)).toBeNull();
    });

    test('a repaired block carries a verified image through formatMediaBlock', () => {
        const asset = HairMediaService.findAssetForText('Box Braids');
        const block = HairMediaService.formatMediaBlock(asset, 'hairstyle_card');
        expect(block.type).toBe('hairstyle_card');
        expect(HairMediaService.isVerifiedImageUrl(block.data.imageUrl)).toBe(true);
    });
});
