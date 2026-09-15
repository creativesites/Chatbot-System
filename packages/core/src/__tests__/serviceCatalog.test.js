/**
 * Product / service card grounding.
 *
 * Live output that motivated this: the fallback model sent the HairAI card as
 * { title: "HairAI(TM) Instant Analysis", brand, category, benefits } - padded
 * name, copy in a field the widget ignores, and no price, url or image. It
 * also invented "MYAVANA Moisture & Repair Regimen Set", which does not exist.
 */

const {
    STORE_URL,
    normalizeName,
    findCatalogEntry,
    cleanUrl,
    formatPrice,
    fetchStoreProducts,
    enrichProductBlock,
    productCardKey,
    collectShownProductKeys,
    shouldOfferStoreLink,
    buildStoreLinkBlock,
    repairStoreLinks,
    loadServiceCatalog,
    resetServiceCatalogCache,
} = require('../serviceCatalog');

const offline = () => jest.fn().mockRejectedValue(new Error('offline'));
const storeFeed = (products) =>
    jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ products }) });

const CATALOG = [
    {
        name: 'HairAI™', brand: 'MYAVANA', category: 'AI Hair Analysis',
        description: 'MYAVANA HairAI is the pioneer of AI Technology for healthy hair.',
        price: '$9.00', url: 'https://www.myavana.com/products/hair-assessment',
        imageUrl: 'https://cdn.example/hairai.jpg', source: 'store',
    },
    {
        name: 'HairSI™ Strand Analysis', brand: 'MYAVANA', category: 'Hair Analysis',
        description: 'Examines microscopic hair images.', price: '$99 USD plus shipping and handling',
        url: null, imageUrl: 'https://cdn.example/hairsi.jpg', source: 'myavana',
    },
    { name: 'MYAVANA App', brand: 'MYAVANA', category: 'Mobile App', price: 'Free', url: 'https://apps.apple.com/us/app/myavana/id1450541441', source: 'myavana' },
    { name: 'Virtual Consultations', brand: 'MYAVANA', category: 'Consultations', url: 'https://www.myavana.com/pages/consultations', source: 'myavana' },
    { name: 'MYAVANA CARE Package', brand: 'MYAVANA', price: '$99.00', url: 'https://www.myavana.com/products/myavana-care-package', source: 'store' },
    { name: 'MYAVANA HairScope™', brand: 'MYAVANA', price: '$399.00', url: 'https://www.myavana.com/products/myavana-hairscope', source: 'store' },
];

describe('normalizeName', () => {
    test('drops trademark marks, punctuation and case', () => {
        expect(normalizeName('HairAI™')).toBe('hairai');
        expect(normalizeName('  HairSI® Strand-Analysis! ')).toBe('hairsi strand analysis');
        expect(normalizeName(null)).toBe('');
    });
});

describe('findCatalogEntry', () => {
    test('matches the padded names the model actually produced', () => {
        expect(findCatalogEntry('HairAI™ Instant Analysis', CATALOG).name).toBe('HairAI™');
        expect(findCatalogEntry('HairSI™ Strand Analysis Kit', CATALOG).name).toBe('HairSI™ Strand Analysis');
    });

    test('does not match a row whose name the label only partly contains', () => {
        expect(findCatalogEntry('Strand Analysis', CATALOG)).toBeNull();
        expect(findCatalogEntry('Virtual Hair Tips', CATALOG)).toBeNull();
    });

    test('returns null for the invented regimen set', () => {
        expect(findCatalogEntry('MYAVANA Moisture & Repair Regimen Set', CATALOG)).toBeNull();
        expect(findCatalogEntry('SilkMoist Deep Conditioner', CATALOG)).toBeNull();
    });

    test('the brand word is optional when the rest of the name is distinctive', () => {
        expect(findCatalogEntry('Care Package', CATALOG).name).toBe('MYAVANA CARE Package');
        expect(findCatalogEntry('HairScope', CATALOG).name).toBe('MYAVANA HairScope™');
    });

    test('but "MYAVANA App" is not reduced to the everyday word "app"', () => {
        expect(findCatalogEntry('app ideas for wash day', CATALOG)).toBeNull();
        expect(findCatalogEntry('the MYAVANA app', CATALOG).name).toBe('MYAVANA App');
    });

    test('matches on aliases', () => {
        const rows = [{ name: 'MYAVANA HairAI™ Instant Analysis + Recommendations', aliases: ['HairAI™'] }];
        expect(findCatalogEntry('HairAI™ Instant Analysis', rows)).toBe(rows[0]);
    });

    test('prefers the longest matching name', () => {
        const rows = [{ name: 'Strand Analysis' }, { name: 'HairSI Strand Analysis' }];
        expect(findCatalogEntry('HairSI Strand Analysis Kit', rows).name).toBe('HairSI Strand Analysis');
    });

    test('handles empty labels and bad rows without throwing', () => {
        expect(findCatalogEntry('', CATALOG)).toBeNull();
        expect(findCatalogEntry('HairAI', null)).toBeNull();
        expect(findCatalogEntry('HairAI', [null, {}, { name: '' }])).toBeNull();
    });
});

describe('cleanUrl', () => {
    test('strips the literal quotes stored around a URL', () => {
        expect(cleanUrl('"https://www.myavana.com/products/hair-beauty-network-business-membership"'))
            .toBe('https://www.myavana.com/products/hair-beauty-network-business-membership');
    });

    test('extracts a link from the JSON object stored for the app', () => {
        expect(cleanUrl('{"iphone": "https://apps.apple.com/us/app/myavana/id1450541441", "android": "https://play.google.com/x"}'))
            .toBe('https://apps.apple.com/us/app/myavana/id1450541441');
    });

    test('returns null for anything that is not a URL', () => {
        expect(cleanUrl('not a url')).toBeNull();
        expect(cleanUrl('{broken json')).toBeNull();
        expect(cleanUrl('')).toBeNull();
        expect(cleanUrl(null)).toBeNull();
    });
});

describe('formatPrice', () => {
    test('formats a single price, a free item, and a range', () => {
        expect(formatPrice([{ price: '9.00' }])).toBe('$9.00');
        expect(formatPrice([{ price: '0.00' }])).toBe('Free');
        expect(formatPrice([{ price: '100.00' }, { price: '25.00' }])).toBe('From $25.00');
        expect(formatPrice([])).toBeNull();
    });
});

describe('enrichProductBlock', () => {
    const liveHairAiCard = {
        id: 'b1',
        type: 'product',
        data: {
            title: 'HairAI™ Instant Analysis',
            brand: 'MYAVANA',
            category: 'AI Assessment',
            benefits: 'Instant hair type diagnosis and personalized product recommendations based on a selfie.',
        },
    };

    test('restores the price, link and image the model dropped', () => {
        const out = enrichProductBlock(liveHairAiCard, CATALOG);
        expect(out.data.price).toBe('$9.00');
        expect(out.data.url).toBe('https://www.myavana.com/products/hair-assessment');
        expect(out.data.imageUrl).toBe('https://cdn.example/hairai.jpg');
    });

    test('uses the canonical catalog name, not the padded one', () => {
        const out = enrichProductBlock(liveHairAiCard, CATALOG);
        expect(out.data.name).toBe('HairAI™');
        expect(out.data.title).toBe('HairAI™');
        expect(out.data.category).toBe('AI Hair Analysis');
    });

    test('joins a benefits list with separators instead of bare commas', () => {
        const out = enrichProductBlock(
            { type: 'product', data: { title: 'HairAI', benefits: ['Saves time & money', ' Instant results', '', 'Personalized product matches'] } },
            CATALOG
        );
        expect(out.data.reason).toBe('Saves time & money \u00b7 Instant results \u00b7 Personalized product matches');
    });

    test('moves the model\'s "benefits" copy into "reason", which the widget renders', () => {
        expect(enrichProductBlock(liveHairAiCard, CATALOG).data.reason).toMatch(/Instant hair type diagnosis/);
    });

    test('never keeps a model-supplied price, link or image', () => {
        const forged = {
            type: 'product',
            data: {
                title: 'HairAI', price: '$0.99', url: 'https://evil.example/buy',
                link: 'https://evil.example/link', image: 'https://evil.example/a.jpg', imageUrl: 'https://evil.example/b.jpg',
            },
        };
        const out = enrichProductBlock(forged, CATALOG);
        expect(out.data.price).toBe('$9.00');
        expect(out.data.url).toBe('https://www.myavana.com/products/hair-assessment');
        expect(out.data.imageUrl).toBe('https://cdn.example/hairai.jpg');
        expect(out.data.link).toBeUndefined();
        expect(out.data.image).toBeUndefined();
    });

    test('a product with no working link of its own sends people to the store', () => {
        const out = enrichProductBlock({ type: 'product', data: { title: 'HairSI Strand Analysis Kit' } }, CATALOG);
        expect(out.data.url).toBe(STORE_URL);
    });

    test('leaves price and image absent rather than forging them', () => {
        const out = enrichProductBlock(
            { type: 'service_card', data: { title: 'Virtual Consultations', price: '$49' } },
            CATALOG
        );
        expect(out.data.url).toBe('https://www.myavana.com/pages/consultations');
        expect(out.data.price).toBeUndefined();
        expect(out.data.imageUrl).toBeUndefined();
    });

    test('drops an invented product when the catalog is loaded', () => {
        expect(
            enrichProductBlock({ type: 'product', data: { title: 'MYAVANA Moisture & Repair Regimen Set' } }, CATALOG)
        ).toBeNull();
    });

    test('passes cards through untouched when the catalog failed to load', () => {
        const card = { type: 'product', data: { title: 'SilkMoist Deep Conditioner' } };
        expect(enrichProductBlock(card, [])).toBe(card);
        expect(enrichProductBlock(card, null)).toBe(card);
    });

    test('ignores non-product blocks and preserves id/type', () => {
        const card = { type: 'hairstyle_card', data: { title: 'Box Braids' } };
        expect(enrichProductBlock(card, CATALOG)).toBe(card);
        expect(enrichProductBlock(null, CATALOG)).toBeNull();
        const out = enrichProductBlock(liveHairAiCard, CATALOG);
        expect(out.id).toBe('b1');
        expect(out.type).toBe('product');
    });
});

describe('fetchStoreProducts', () => {
    const listing = (overrides = {}) => ({
        title: 'MYAVANA CARE Package', handle: 'myavana-care-package', vendor: 'MYAVANA', product_type: '',
        body_html: '<p>A <b>care</b> kit.</p>', images: [{ src: 'https://cdn.shopify.com/care.jpg' }],
        variants: [{ price: '99.00', available: true }], ...overrides,
    });

    test('normalizes a Shopify listing', async () => {
        const [row] = await fetchStoreProducts(storeFeed([listing()]));
        expect(row).toEqual({
            name: 'MYAVANA CARE Package', brand: 'MYAVANA', description: 'A care kit.', category: null,
            price: '$99.00', url: 'https://www.myavana.com/products/myavana-care-package',
            imageUrl: 'https://cdn.shopify.com/care.jpg', handle: 'myavana-care-package', source: 'store',
        });
    });

    test('excludes the published test listing and sold-out products', async () => {
        const rows = await fetchStoreProducts(storeFeed([
            listing(),
            listing({ title: 'Extra Features Tested', handle: 'extra-features-tested' }),
            listing({ title: 'Sold Out Thing', handle: 'sold-out', variants: [{ price: '5.00', available: false }] }),
        ]));
        expect(rows.map((r) => r.handle)).toEqual(['myavana-care-package']);
    });

    test('throws on a failed response so callers can tell down from empty', async () => {
        await expect(fetchStoreProducts(jest.fn().mockResolvedValue({ ok: false, status: 503 }))).rejects.toThrow(/503/);
        await expect(fetchStoreProducts(null)).rejects.toThrow();
    });
});

describe('loadServiceCatalog', () => {
    beforeEach(() => resetServiceCatalogCache());

    const ownRows = (rows) => ({
        rows: rows || [{
            product_name: 'HairAI™', general_description: 'desc', product_category: 'AI Hair Analysis',
            cost: '$9.99', url: 'https://x/hairai', main_image: 'https://x/hairai.jpg',
        }],
    });

    test('normalizes products and active partner products into one shape', async () => {
        const client = {
            query: jest.fn()
                .mockResolvedValueOnce(ownRows())
                .mockResolvedValueOnce({
                    rows: [{
                        brand_name: 'Acme', product_name: 'Deep Mask', description: 'd', category: 'Conditioner',
                        price_usd: '24.50', url: 'https://acme/mask', image_url: 'https://acme/mask.jpg',
                    }],
                }),
        };
        const rows = await loadServiceCatalog(client, { fetchImpl: offline() });
        expect(rows).toHaveLength(2);
        expect(rows[0]).toMatchObject({ name: 'HairAI™', brand: 'MYAVANA', price: '$9.99', imageUrl: 'https://x/hairai.jpg' });
        expect(rows[1]).toMatchObject({ name: 'Deep Mask', brand: 'Acme', price: '$24.50', source: 'partner' });
    });

    test('queries the real column names', async () => {
        const client = { query: jest.fn().mockResolvedValueOnce(ownRows()).mockResolvedValueOnce({ rows: [] }) };
        await loadServiceCatalog(client, { fetchImpl: offline() });
        const sql = client.query.mock.calls[0][0];
        const selectList = sql.slice(sql.indexOf('SELECT') + 6, sql.indexOf('FROM')).split(',').map((c) => c.trim());
        expect(selectList).toContain('general_description');
        expect(selectList).toContain('product_category');
        expect(selectList).not.toContain('description');
        expect(selectList).not.toContain('category');
    });

    test('links a table row to its live store listing by handle', async () => {
        const client = {
            query: jest.fn()
                .mockResolvedValueOnce(ownRows([{
                    product_name: 'HairAI™', general_description: 'curated desc', product_category: 'AI Hair Analysis',
                    cost: '$9.99 for one-time use', url: 'https://www.myavana.com/products/hair-assessment', main_image: null,
                }]))
                .mockResolvedValueOnce({ rows: [] }),
        };
        const fetchImpl = storeFeed([{
            title: 'MYAVANA HairAI™ Instant Analysis + Recommendations', handle: 'hair-assessment', vendor: 'MYAVANA',
            body_html: '<p>marketing</p>', images: [{ src: 'https://cdn.shopify.com/hairai.jpg' }],
            variants: [{ price: '9.00', available: true }],
        }]);
        const rows = await loadServiceCatalog(client, { fetchImpl });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            name: 'MYAVANA HairAI™ Instant Analysis + Recommendations',
            aliases: ['HairAI™'],
            price: '$9.00',
            url: 'https://www.myavana.com/products/hair-assessment',
            imageUrl: 'https://cdn.shopify.com/hairai.jpg',
            description: 'curated desc',
            source: 'store',
        });

        const card = enrichProductBlock({ type: 'product', data: { title: 'HairAI™ Instant Analysis' } }, rows);
        expect(card.data.price).toBe('$9.00');
        expect(card.data.url).toBe('https://www.myavana.com/products/hair-assessment');
    });

    test('drops a table link to a listing the store no longer has', async () => {
        const client = {
            query: jest.fn()
                .mockResolvedValueOnce(ownRows([{
                    product_name: 'HairSI™ Strand Analysis', general_description: 'd', product_category: 'Hair Analysis',
                    cost: '$99', url: 'https://www.myavana.com/products/myavana-hair-analysis-kit', main_image: null,
                }]))
                .mockResolvedValueOnce({ rows: [] }),
        };
        const rows = await loadServiceCatalog(client, { fetchImpl: storeFeed([]) });
        expect(rows[0].url).toBeNull();
        expect(enrichProductBlock({ type: 'product', data: { title: 'HairSI Strand Analysis' } }, rows).data.url).toBe(STORE_URL);
    });

    test('keeps table links as-is when the store feed is down', async () => {
        const client = {
            query: jest.fn()
                .mockResolvedValueOnce(ownRows([{
                    product_name: 'HairSI™ Strand Analysis', general_description: 'd', product_category: 'Hair Analysis',
                    cost: '$99', url: 'https://www.myavana.com/products/myavana-hair-analysis-kit', main_image: null,
                }]))
                .mockResolvedValueOnce({ rows: [] }),
        };
        const rows = await loadServiceCatalog(client, { fetchImpl: offline() });
        expect(rows[0].url).toBe('https://www.myavana.com/products/myavana-hair-analysis-kit');
    });

    test('adds store products the table does not know about', async () => {
        const client = { query: jest.fn().mockResolvedValueOnce(ownRows()).mockResolvedValueOnce({ rows: [] }) };
        const fetchImpl = storeFeed([{
            title: 'MYAVANA CARE Package', handle: 'myavana-care-package', vendor: 'MYAVANA',
            images: [], variants: [{ price: '99.00', available: true }],
        }]);
        const rows = await loadServiceCatalog(client, { fetchImpl });
        expect(rows.map((r) => r.name)).toEqual(['HairAI™', 'MYAVANA CARE Package']);
    });

    test('still returns own products when partner_products is missing', async () => {
        const client = {
            query: jest.fn()
                .mockResolvedValueOnce(ownRows())
                .mockRejectedValueOnce(new Error('relation "partner_products" does not exist')),
        };
        expect(await loadServiceCatalog(client, { fetchImpl: offline() })).toHaveLength(1);
    });

    test('caches a successful load', async () => {
        const client = { query: jest.fn().mockResolvedValueOnce(ownRows()).mockResolvedValueOnce({ rows: [] }) };
        const fetchImpl = offline();
        await loadServiceCatalog(client, { fetchImpl });
        await loadServiceCatalog(client, { fetchImpl });
        expect(client.query).toHaveBeenCalledTimes(2);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    test('serves store-only results without caching when the table is down', async () => {
        const client = {
            query: jest.fn()
                .mockRejectedValueOnce(new Error('DB down'))
                .mockResolvedValueOnce(ownRows())
                .mockResolvedValueOnce({ rows: [] }),
        };
        const fetchImpl = storeFeed([{
            title: 'MYAVANA CARE Package', handle: 'myavana-care-package', images: [], variants: [{ price: '99.00' }],
        }]);
        expect((await loadServiceCatalog(client, { fetchImpl })).map((r) => r.name)).toEqual(['MYAVANA CARE Package']);
        expect(await loadServiceCatalog(client, { fetchImpl })).toHaveLength(2);
    });

    test('returns [] when nothing loads, and retries next time', async () => {
        const client = {
            query: jest.fn()
                .mockRejectedValueOnce(new Error('DB down'))
                .mockResolvedValueOnce(ownRows())
                .mockResolvedValueOnce({ rows: [] }),
        };
        expect(await loadServiceCatalog(client, { fetchImpl: offline() })).toEqual([]);
        expect(await loadServiceCatalog(client, { fetchImpl: offline() })).toHaveLength(1);
    });
});

describe('repeat product cards', () => {
    const fence = (blocks) => 'Some prose.\n\n```mya-blocks\n' + JSON.stringify({ blocks }) + '\n```';
    const hairAi = (title) => ({ id: 'p1', type: 'product_card', data: { title } });

    test('productCardKey resolves name variations to the same catalog product', () => {
        const a = productCardKey({ type: 'product', data: { title: 'HairAI\u2122 Instant Analysis' } }, CATALOG);
        const b = productCardKey({ type: 'product', data: { name: 'HairAI' } }, CATALOG);
        expect(a).toBe('hairai');
        expect(b).toBe(a);
    });

    test('productCardKey falls back to the label, and ignores non-product blocks', () => {
        expect(productCardKey({ type: 'product', data: { title: 'Moisture & Repair Regimen Set' } }, CATALOG))
            .toBe('moisture repair regimen set');
        expect(productCardKey({ type: 'product', data: { title: 'HairAI' } }, [])).toBe('hairai');
        expect(productCardKey({ type: 'hairstyle_card', data: { title: 'Box Braids' } }, CATALOG)).toBeNull();
        expect(productCardKey({ type: 'product', data: {} }, CATALOG)).toBeNull();
    });

    test('collects cards shown in recent assistant turns, however they were named', () => {
        const history = [
            { role: 'user', content: 'what should I use?' },
            { role: 'assistant', content: fence([hairAi('HairAI\u2122 Instant Analysis')]) },
            { role: 'user', content: 'tell me more' },
            { role: 'assistant', content: fence([{ type: 'quick_replies', data: { replies: [] } }]) },
        ];
        const keys = collectShownProductKeys(history, CATALOG);
        expect([...keys]).toEqual(['hairai']);
        // A later card for the same product, phrased differently, is a repeat.
        expect(keys.has(productCardKey({ type: 'product', data: { title: 'HairAI' } }, CATALOG))).toBe(true);
    });

    test('only looks back a few assistant turns', () => {
        const history = [
            { role: 'assistant', content: fence([hairAi('HairAI')]) },
            { role: 'assistant', content: 'plain' },
            { role: 'assistant', content: 'plain' },
            { role: 'assistant', content: 'plain' },
        ];
        expect(collectShownProductKeys(history, CATALOG).size).toBe(0);
        expect(collectShownProductKeys(history, CATALOG, { lookback: 4 }).has('hairai')).toBe(true);
    });

    test('ignores user turns, non-string content, and unparseable output', () => {
        const history = [
            { role: 'user', content: fence([hairAi('HairAI')]) },
            { role: 'assistant', content: { not: 'a string' } },
            { role: 'assistant', content: '```mya-blocks broken' },
            null,
        ];
        const throwingParse = () => { throw new Error('bad'); };
        expect(collectShownProductKeys(history, CATALOG).size).toBe(0);
        expect(collectShownProductKeys(history, CATALOG, { parse: throwingParse }).size).toBe(0);
        expect(collectShownProductKeys(null, CATALOG).size).toBe(0);
    });
});

describe('directing members to the MYAVANA store', () => {
    test('repairs the doubled-www store link the model produced live', () => {
        expect(repairStoreLinks('Shop at [myavana.com](https://www.www.myavana.com/collections/all).'))
            .toBe('Shop at [myavana.com](https://www.myavana.com/collections/all).');
    });

    test('normalizes scheme and host, bare or linked', () => {
        expect(repairStoreLinks('see http://myavana.com/pages/hairsi')).toBe('see https://www.myavana.com/pages/hairsi');
        expect(repairStoreLinks('visit www.www.myavana.com today')).toBe('visit www.myavana.com today');
    });

    test('leaves subdomains, other domains and correct links alone', () => {
        const ok = 'https://www.myavana.com/collections/all https://myavana.refersion.com/ https://example.com/www.www.x';
        expect(repairStoreLinks(ok)).toBe(ok);
        expect(repairStoreLinks('')).toBe('');
        expect(repairStoreLinks(null)).toBeNull();
    });

    test('offers the store when the member wants to buy', () => {
        expect(shouldOfferStoreLink('Where can I buy MYAVANA products?')).toBe(true);
        expect(shouldOfferStoreLink('Is there a MYAVANA store?')).toBe(true);
        expect(shouldOfferStoreLink('I want to purchase HairAI', 1)).toBe(true);
    });

    test('offers the store for a product ask only when no real product card went out', () => {
        const ask = 'I have 4C hair. What deep conditioner would you recommend?';
        expect(shouldOfferStoreLink(ask, 0)).toBe(true);
        expect(shouldOfferStoreLink(ask, 1)).toBe(false);
    });

    test('does not fire on ordinary sentences that merely contain shop words', () => {
        expect(shouldOfferStoreLink('I twist my hair in order to retain length')).toBe(false);
        expect(shouldOfferStoreLink('I store my products in the fridge')).toBe(false);
        expect(shouldOfferStoreLink('show me box braids')).toBe(false);
        expect(shouldOfferStoreLink('')).toBe(false);
        expect(shouldOfferStoreLink(undefined)).toBe(false);
    });

    test('the store card always carries the real store URL', () => {
        const block = buildStoreLinkBlock();
        expect(block.type).toBe('navigation');
        expect(block.data.url).toBe(STORE_URL);
        expect(block.data.title).toBe('Shop MYAVANA');
    });
});
