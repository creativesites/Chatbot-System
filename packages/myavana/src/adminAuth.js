// Guards the /admin/* routes (cache invalidation, ecosystem sync/status).
//
// The Dashboard sends ADMIN_API_KEY as `X-Admin-Key` (or `Authorization: Bearer`).
// In production a missing ADMIN_API_KEY rejects every admin request (fail closed)
// instead of leaving the routes open; outside production a missing key allows
// them so local development needs no setup.

const crypto = require('crypto');

function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

function isAuthorizedAdmin(req, env = process.env) {
    const expected = env.ADMIN_API_KEY;
    if (!expected) {
        return env.NODE_ENV !== 'production';
    }
    const headers = (req && req.headers) || {};
    const headerKey = headers['x-admin-key'];
    const authHeader = String(headers['authorization'] || '');
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    return Boolean(
        (headerKey && safeEqual(headerKey, expected)) ||
        (bearer && safeEqual(bearer, expected))
    );
}

module.exports = { isAuthorizedAdmin };
