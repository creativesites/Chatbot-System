/**
 * Guard against SQL/schema drift in agentTools.
 *
 * searchServices shipped querying `products.description` and
 * `products.category`. Neither column exists — the real names are
 * `general_description` and `product_category` — so every call threw, was
 * swallowed by the catch, and the tool answered "Service search temporarily
 * unavailable" for every query. Nothing surfaced the failure because the
 * handler degrades silently by design.
 *
 * These tests read the source and assert that every column named in the
 * products / partner_products queries actually exists in that table. They are
 * static (no DB needed) so they run in CI, and they fail loudly the moment a
 * column is renamed on one side only.
 */

const fs = require('fs');
const path = require('path');

// Strip line comments before scanning: prose like "Selecting named columns"
// would otherwise be picked up as the start of a SELECT statement.
const SOURCE = fs
    .readFileSync(path.join(__dirname, '..', 'agentTools.js'), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '');

// Live schema as of migration 009 — verified against the production database.
const PRODUCTS_COLUMNS = [
    'product_id', 'details', 'images', 'created_at', 'cost',
    'product_name', 'main_image', 'url', 'name', 'general_description',
    'product_category',
];

const PARTNER_PRODUCTS_COLUMNS = [
    'id', 'brand_name', 'product_name', 'description', 'category',
    'hair_types', 'hair_concerns', 'price_usd', 'url', 'image_url',
    'in_stock', 'active', 'created_at', 'updated_at',
];

/**
 * Pull the text of the query that reads from `table` out of the source:
 * locate `FROM <table>`, walk back to the SELECT that opened it, and run to
 * the row limit. The table name itself is dropped so it is not mistaken for
 * a column.
 */
function extractQuery(table) {
    const fromIdx = SOURCE.search(new RegExp('FROM\\s+' + table + '\\b'));
    expect(fromIdx).toBeGreaterThan(-1);
    const selectIdx = SOURCE.lastIndexOf('SELECT', fromIdx);
    expect(selectIdx).toBeGreaterThan(-1);
    const limitIdx = SOURCE.indexOf('LIMIT $2', fromIdx);
    expect(limitIdx).toBeGreaterThan(-1);
    return SOURCE.slice(selectIdx, limitIdx)
        .replace(new RegExp('FROM\\s+' + table + '\\b'), 'FROM ');
}

/**
 * Identifiers referenced as columns: bare snake_case words, minus SQL
 * keywords, string literals, aliases introduced by AS, and parameters.
 */
function referencedColumns(sql) {
    const KEYWORDS = new Set([
        'select', 'from', 'where', 'limit', 'or', 'and', 'as', 'ilike', 'is',
        'not', 'false', 'true', 'null', 'order', 'by', 'asc', 'desc',
    ]);

    // Drop single-quoted literals so the 'myavana'/'partner' source tags and
    // the aliases that follow AS are not mistaken for columns.
    const withoutLiterals = sql.replace(/'[^']*'\s*AS\s+\w+/gi, '').replace(/'[^']*'/g, '');
    // Drop `<col> AS <alias>` aliases - keep the real column, drop the alias.
    const withoutAliases = withoutLiterals.replace(/\bAS\s+\w+/gi, '');

    return [...new Set(
        (withoutAliases.match(/\b[a-z][a-z0-9_]*\b/g) || [])
            .filter((w) => !KEYWORDS.has(w))
    )];
}

describe('searchServices SQL matches the real database schema', () => {
    test('every products column referenced actually exists', () => {
        const cols = referencedColumns(extractQuery('products'));
        expect(cols.length).toBeGreaterThan(0);
        for (const col of cols) {
            expect(PRODUCTS_COLUMNS).toContain(col);
        }
    });

    test('every partner_products column referenced actually exists', () => {
        const cols = referencedColumns(extractQuery('partner_products'));
        expect(cols.length).toBeGreaterThan(0);
        for (const col of cols) {
            expect(PARTNER_PRODUCTS_COLUMNS).toContain(col);
        }
    });

    test('the products query does not use the non-existent description/category names', () => {
        const sql = extractQuery('products');
        expect(sql).not.toMatch(/\bOR\s+description\s+ILIKE/i);
        expect(sql).not.toMatch(/\bOR\s+category\s+ILIKE/i);
        expect(sql).toMatch(/general_description/);
        expect(sql).toMatch(/product_category/);
    });

    test('the products query selects named columns, not * (keeps JSON blobs out of the tool payload)', () => {
        expect(extractQuery('products')).not.toMatch(/SELECT\s+\*/i);
    });
});
