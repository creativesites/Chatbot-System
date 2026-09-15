/**
 * Service / product catalog grounding for product and service cards.
 *
 * The model is told to build product cards from searchServices rows, but in
 * practice (especially on the fallback models) it paraphrases instead: it
 * pads names ("HairAI(TM) Instant Analysis"), puts copy in fields the widget
 * never reads, drops price, url and image - and sometimes invents a product
 * outright ("MYAVANA Moisture & Repair Regimen Set" does not exist).
 *
 * Rather than trust the model's card, the server matches each product /
 * service card back to a real catalog row and rebuilds the factual fields
 * from that row. The model keeps its own conversational "reason" copy; the
 * name, price, link, image and category always come from real data.
 *
 * Two sources are merged:
 *   - the `products` table: MYAVANA's curated service descriptions, but its
 *     prices and links have drifted (a stale $9.99 HairAI price, a HairSI link
 *     that 404s, a URL wrapped in literal quotes, an app "URL" that is JSON)
 *   - the live Shopify store feed: the source of truth for what is actually
 *     for sale, at what price, and where to buy it
 * A table row whose /products/<handle> link exists in the store takes the
 * store's price, link and image. A row linking to a listing the store no
 * longer has loses the dead link and falls back to the store front.
 */

const PRODUCT_BLOCK_TYPES = new Set(['product', 'product_card', 'service_card']);
const CACHE_TTL_MS = 5 * 60 * 1000;
const STORE_FEED_TIMEOUT_MS = 4000;

const STORE_ORIGIN = 'https://www.myavana.com';
const STORE_URL = `${STORE_ORIGIN}/collections/all`;
const STORE_PRODUCTS_FEED = `${STORE_ORIGIN}/products.json?limit=250`;

// Live store listings that are not real products and must never be
// recommended. "Extra Features Tested" is a $100 test listing with a stock
// photo that is published on the storefront.
const STORE_EXCLUDED_HANDLES = new Set(['extra-features-tested']);

const BRAND_TOKENS = new Set(['myavana']);

let cache = { rows: null, loadedAt: 0 };

/** Lowercase, drop trademark marks and punctuation, collapse whitespace. */
function normalizeName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[™®©]/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function tokens(value) {
    const n = normalizeName(value);
    return n ? n.split(' ') : [];
}

/**
 * Tokens a catalog name must be matched on. The brand word is optional in a
 * label ("Care Package" should find "MYAVANA CARE Package"), but only when
 * what is left is still distinctive - "MYAVANA App" must not be reduced to
 * the bare word "app", which appears in ordinary sentences.
 */
function matchTokens(value) {
    const all = tokens(value);
    const rest = all.filter((t) => !BRAND_TOKENS.has(t));
    if (rest.length === all.length || rest.length === 0) return all;
    if (rest.length >= 2 || rest[0].length >= 6) return rest;
    return all;
}

/**
 * Find the catalog row a card refers to.
 *
 * A row matches when every word of its name (or of one of its aliases)
 * appears in the card's label, so the model's padding is tolerated but a
 * label cannot match a row whose name it only partly contains. When several
 * rows match, the longest matching name wins.
 *
 * @param {string} label the card's name/title as the model wrote it
 * @param {object[]} rows normalized catalog rows ({ name, aliases?, ... })
 * @returns {object|null}
 */
function findCatalogEntry(label, rows) {
    const labelTokens = new Set(tokens(label));
    if (labelTokens.size === 0 || !Array.isArray(rows)) return null;

    let best = null;
    let bestLength = 0;
    for (const row of rows) {
        if (!row) continue;
        const names = [row.name, ...(Array.isArray(row.aliases) ? row.aliases : [])];
        for (const name of names) {
            const nameTokens = matchTokens(name);
            if (nameTokens.length === 0) continue;
            if (nameTokens.every((t) => labelTokens.has(t)) && nameTokens.length > bestLength) {
                best = row;
                bestLength = nameTokens.length;
            }
        }
    }
    return best;
}

/**
 * Turn a stored link into a usable one, or null. Handles the real defects in
 * the products table: surrounding quotes, and a JSON object of app-store links
 * stored where a URL should be.
 */
function cleanUrl(value) {
    if (value == null) return null;
    let v = typeof value === 'string' ? value.trim() : value;
    if (v && typeof v === 'object') {
        v = v.web || v.url || v.iphone || v.ios || v.android || Object.values(v)[0] || '';
    } else if (typeof v === 'string' && v.startsWith('{')) {
        try {
            const o = JSON.parse(v);
            v = o.web || o.url || o.iphone || o.ios || o.android || Object.values(o)[0] || '';
        } catch {
            return null;
        }
    }
    v = String(v).trim().replace(/^["']+|["']+$/g, '').trim();
    return /^https?:\/\/\S+$/i.test(v) ? v : null;
}

/** Shopify variants -> display price: "$9.00", "Free", or "From $25.00". */
function formatPrice(variants) {
    const prices = (Array.isArray(variants) ? variants : [])
        .map((v) => Number(v && v.price))
        .filter((n) => Number.isFinite(n));
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return min === 0 ? 'Free' : `$${min.toFixed(2)}`;
    return `From $${min.toFixed(2)}`;
}

function stripHtml(value, max = 280) {
    const text = String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function handleFromUrl(url) {
    const m = /myavana\.com\/products\/([a-z0-9-]+)/i.exec(url || '');
    return m ? m[1].toLowerCase() : null;
}

/**
 * Fetch the live, purchasable products from the MYAVANA Shopify store.
 * Throws on failure so the caller can tell "store down" from "store empty".
 *
 * @param {Function} fetchImpl a fetch-compatible function
 * @returns {Promise<object[]>} normalized rows with source 'store'
 */
async function fetchStoreProducts(fetchImpl) {
    if (typeof fetchImpl !== 'function') throw new Error('no fetch implementation available');

    const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(STORE_FEED_TIMEOUT_MS)
        : undefined;
    const res = await fetchImpl(STORE_PRODUCTS_FEED, { headers: { Accept: 'application/json' }, signal });
    if (!res || !res.ok) throw new Error(`store feed HTTP ${res ? res.status : 'no response'}`);
    const body = await res.json();

    return (Array.isArray(body && body.products) ? body.products : [])
        .filter((p) => p && p.handle && p.title && !STORE_EXCLUDED_HANDLES.has(p.handle))
        .filter((p) => (p.variants || []).some((v) => v && v.available !== false))
        .map((p) => ({
            name: p.title,
            brand: p.vendor || 'MYAVANA',
            description: stripHtml(p.body_html),
            category: p.product_type || null,
            price: formatPrice(p.variants),
            url: `${STORE_ORIGIN}/products/${p.handle}`,
            imageUrl: (p.images && p.images[0] && p.images[0].src) || null,
            handle: p.handle,
            source: 'store',
        }));
}

/**
 * Card copy as display text. Models often send benefits as a list; rendering
 * an array directly gave "Saves time & money,Instant results,Personalized
 * product matches" - joined by bare commas with no spaces.
 */
function toReasonText(value) {
    if (Array.isArray(value)) {
        return value.map((v) => String(v == null ? '' : v).trim()).filter(Boolean).join(' \u00b7 ');
    }
    return typeof value === 'string' ? value.trim() : '';
}

/**
 * Ground a product / service card in the catalog.
 *
 *   - Not a product/service card            -> returned untouched
 *   - Catalog unavailable (empty rows)      -> returned untouched; an outage
 *                                              must not wipe every card
 *   - Matches a catalog row                 -> factual fields rebuilt from it
 *   - No match against a loaded catalog     -> null: never show a product we
 *                                              cannot vouch for
 *
 * @param {object} block
 * @param {object[]} rows normalized catalog rows from loadServiceCatalog()
 * @returns {object|null}
 */
function enrichProductBlock(block, rows) {
    if (!block || !PRODUCT_BLOCK_TYPES.has(block.type)) return block;
    if (!Array.isArray(rows) || rows.length === 0) return block;

    const data = block.data || {};
    const label = data.name || data.title || data.productName || '';
    const entry = findCatalogEntry(label, rows);
    if (!entry) return null;

    // The widget reads `reason || description`. Models write that copy under
    // several names, so carry whichever one they used.
    const reason = toReasonText(data.reason) || toReasonText(data.benefits) ||
        toReasonText(data.description) || entry.description || '';

    const enriched = {
        ...data,
        name: entry.name,
        title: entry.name,
        brand: entry.brand || data.brand,
        category: entry.category || data.category,
        reason,
    };
    // Only ever take these from the catalog - never keep a model-supplied
    // price, link or image, which is exactly what gets invented.
    delete enriched.price;
    delete enriched.url;
    delete enriched.link;
    delete enriched.image;
    delete enriched.imageUrl;
    if (entry.price) enriched.price = entry.price;
    // Every card leads somewhere real: its own listing, or the store front.
    enriched.url = entry.url || STORE_URL;
    if (entry.imageUrl) enriched.imageUrl = entry.imageUrl;

    return { ...block, data: enriched };
}

/**
 * Load the grounding catalog: MYAVANA's products table, active partner
 * products, and the live store feed, merged into one shape.
 *
 * Cached for five minutes, but only when the products table loaded - a
 * store-only result is served without caching so the table is retried on the
 * next request. If neither source loads, returns [] (uncached).
 *
 * @param {{ query: Function }} [client] pg client; defaults to core's pool
 * @param {{ fetchImpl?: Function }} [options]
 * @returns {Promise<object[]>}
 */
async function loadServiceCatalog(client, options = {}) {
    if (cache.rows && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.rows;

    const fetchImpl = options.fetchImpl !== undefined ? options.fetchImpl : globalThis.fetch;
    const pg = client || require('./database').pgClient;

    let dbRows = [];
    let dbOk = false;
    try {
        const own = await pg.query(
            `SELECT product_name, general_description, product_category, cost, url, main_image
               FROM products`
        );
        dbRows = own.rows.map((r) => ({
            name: r.product_name,
            brand: 'MYAVANA',
            description: r.general_description,
            category: r.product_category,
            price: r.cost,
            url: cleanUrl(r.url),
            imageUrl: cleanUrl(r.main_image),
            source: 'myavana',
        }));
        dbOk = true;

        try {
            const partners = await pg.query(
                `SELECT brand_name, product_name, description, category, price_usd, url, image_url
                   FROM partner_products WHERE active IS NOT FALSE`
            );
            for (const r of partners.rows) {
                dbRows.push({
                    name: r.product_name,
                    brand: r.brand_name,
                    description: r.description,
                    category: r.category,
                    price: r.price_usd != null ? `$${Number(r.price_usd).toFixed(2)}` : null,
                    url: cleanUrl(r.url),
                    imageUrl: cleanUrl(r.image_url),
                    source: 'partner',
                });
            }
        } catch (partnerErr) {
            console.warn('serviceCatalog: partner products unavailable:', partnerErr.message);
        }
    } catch (err) {
        console.error('serviceCatalog: products table load failed:', err.message);
    }

    let storeRows = [];
    let storeOk = false;
    try {
        storeRows = await fetchStoreProducts(fetchImpl);
        storeOk = true;
    } catch (storeErr) {
        console.warn('serviceCatalog: store feed unavailable, using products table only:', storeErr.message);
    }

    if (!dbOk && !storeOk) {
        console.error('serviceCatalog: no catalog source loaded, cards will pass through ungrounded');
        return [];
    }

    const storeByHandle = new Map(storeRows.map((r) => [r.handle, r]));
    const linkedHandles = new Set();
    const rows = [];

    for (const row of dbRows) {
        const handle = handleFromUrl(row.url);
        if (handle && storeOk) {
            const listing = storeByHandle.get(handle);
            if (listing) {
                linkedHandles.add(handle);
                rows.push({
                    ...row,
                    name: listing.name,
                    aliases: [row.name],
                    price: listing.price || row.price,
                    url: listing.url,
                    imageUrl: listing.imageUrl || row.imageUrl,
                    handle,
                    source: 'store',
                });
            } else {
                // The table links to a listing the store no longer has.
                rows.push({ ...row, url: null });
            }
            continue;
        }
        rows.push(row);
    }
    for (const listing of storeRows) {
        if (!linkedHandles.has(listing.handle)) rows.push(listing);
    }

    if (dbOk) cache = { rows, loadedAt: Date.now() };
    return rows;
}

/**
 * Stable identity for a product / service card, so the same product is
 * recognised however the model phrased its name on a given turn. Resolves to
 * the catalog name when the card matches a row, otherwise the card's own
 * normalized label.
 *
 * @param {object} block
 * @param {object[]} rows catalog rows
 * @returns {string|null}
 */
function productCardKey(block, rows) {
    if (!block || !PRODUCT_BLOCK_TYPES.has(block.type)) return null;
    const data = block.data || {};
    const label = data.name || data.title || data.productName || '';
    const entry = Array.isArray(rows) && rows.length > 0 ? findCatalogEntry(label, rows) : null;
    return normalizeName(entry ? entry.name : label) || null;
}

/**
 * Product cards already shown in the recent conversation.
 *
 * Chat history stores each assistant turn's raw output, fenced blocks
 * included, and the model re-reads that history. So once it had shown a
 * product card it kept re-sending it on every follow-up - one member saw the
 * same "Regimen Set" card three turns running. The server uses these keys to
 * skip a repeat card; the prose can still refer back to it.
 *
 * @param {Array<{role: string, content: *}>} chatHistory
 * @param {object[]} rows catalog rows
 * @param {{ lookback?: number, parse?: Function }} [options]
 * @returns {Set<string>}
 */
function collectShownProductKeys(chatHistory, rows, options = {}) {
    const keys = new Set();
    if (!Array.isArray(chatHistory)) return keys;

    const lookback = Number.isInteger(options.lookback) ? options.lookback : 3;
    const parse = options.parse || require('./chatProtocol').parseModelOutput;

    const recentAssistantTurns = chatHistory
        .filter((turn) => turn && turn.role !== 'user')
        .slice(-lookback);

    for (const turn of recentAssistantTurns) {
        const content = typeof turn.content === 'string' ? turn.content : '';
        if (!content.includes('mya-blocks')) continue;
        let parsed;
        try {
            parsed = parse(content);
        } catch {
            continue;
        }
        for (const block of (parsed && parsed.blocks) || []) {
            const key = productCardKey(block, rows);
            if (key) keys.add(key);
        }
    }
    return keys;
}

/**
 * Messages where the member wants to buy, or wants to know where to. Kept
 * deliberately narrow: "in order to retain length" or "I store my products in
 * the fridge" must not trigger a shop link.
 */
const BUY_INTENT = /\b(?:buy|purchase|checkout)\b|\bplace an order\b|\bwhere (?:can|do|should) i (?:get|find|buy|order)\b|\b(?:a|your|myavana(?:'s)?) (?:store|shop)\b|\bshop (?:for|myavana)\b/i;

/**
 * Asking for a product recommendation, either word order: "recommend a
 * conditioner" or "what conditioner would you recommend".
 */
const PRODUCT_WORD = '(?:products?|conditioners?|shampoos?|oils?|leave[- ]?ins?|masks?|treatments?|gels?|creams?|butters?|serums?|kits?)';
const RECOMMEND_WORD = '(?:recommend|suggest|what should i (?:use|buy|get|try)|which)';
const PRODUCT_ASK = new RegExp(
    `\\b${RECOMMEND_WORD}\\b[^.?!]*\\b${PRODUCT_WORD}\\b|\\b${PRODUCT_WORD}\\b[^.?!]*\\b${RECOMMEND_WORD}\\b`,
    'i'
);

/**
 * Whether this turn should end with a link to the MYAVANA store.
 *
 * The prompt asks the model to add a "Shop MYAVANA" card, and in live testing
 * it did not - so the server decides. A member who wants to buy always gets
 * the store. A member asking for a product gets it only when no real product
 * card went out, i.e. when the answer would otherwise leave them with nowhere
 * to go (the "recommend a deep conditioner" case - MYAVANA sells none).
 *
 * @param {string} message the member's message
 * @param {number} productCardsSent product/service cards sent this turn
 * @returns {boolean}
 */
function shouldOfferStoreLink(message, productCardsSent = 0) {
    const text = typeof message === 'string' ? message : '';
    if (!text.trim()) return false;
    if (BUY_INTENT.test(text)) return true;
    return PRODUCT_ASK.test(text) && !(productCardsSent > 0);
}

/** The store navigation card, built server-side so its link is always real. */
function buildStoreLinkBlock() {
    return {
        id: 'nav_myavana_store',
        type: 'navigation',
        data: {
            title: 'Shop MYAVANA',
            description: 'See prices and buy directly from the MYAVANA store.',
            url: STORE_URL,
        },
    };
}

/**
 * Repair MYAVANA links the model mangles in its prose. Seen live:
 * "https://www.www.myavana.com/collections/all" - a dead link the member would
 * click. Only the myavana.com host itself is rewritten; subdomains such as
 * myavana.refersion.com and every other domain are left alone.
 *
 * Streamed prose is repaired chunk by chunk, so a mangled host split exactly
 * across two chunks would slip through; the fallback path repairs the whole
 * response at once.
 *
 * @param {string} text
 * @returns {string}
 */
function repairStoreLinks(text) {
    if (typeof text !== 'string' || !text) return text;
    return text
        .replace(/\bhttps?:\/\/(?:www\.)*myavana\.com\b/gi, 'https://www.myavana.com')
        .replace(/(^|[^/\w.])(?:www\.){2,}myavana\.com\b/gi, '$1www.myavana.com');
}

/** Test hook - clear the in-memory catalog cache. */
function resetServiceCatalogCache() {
    cache = { rows: null, loadedAt: 0 };
}

module.exports = {
    PRODUCT_BLOCK_TYPES,
    STORE_URL,
    STORE_EXCLUDED_HANDLES,
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
};
