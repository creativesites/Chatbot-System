const { isAuthorizedAdmin } = require('../adminAuth');

const req = (headers = {}) => ({ headers });

describe('isAuthorizedAdmin', () => {
    test('rejects every request in production when ADMIN_API_KEY is unset', () => {
        const env = { NODE_ENV: 'production' };
        expect(isAuthorizedAdmin(req(), env)).toBe(false);
        expect(isAuthorizedAdmin(req({ 'x-admin-key': 'anything' }), env)).toBe(false);
    });

    test('allows requests outside production when ADMIN_API_KEY is unset', () => {
        expect(isAuthorizedAdmin(req(), { NODE_ENV: 'development' })).toBe(true);
    });

    test('accepts the key via X-Admin-Key or Bearer token', () => {
        const env = { NODE_ENV: 'production', ADMIN_API_KEY: 'k3y' };
        expect(isAuthorizedAdmin(req({ 'x-admin-key': 'k3y' }), env)).toBe(true);
        expect(isAuthorizedAdmin(req({ authorization: 'Bearer k3y' }), env)).toBe(true);
    });

    test('rejects missing or wrong keys when ADMIN_API_KEY is set', () => {
        const env = { NODE_ENV: 'development', ADMIN_API_KEY: 'k3y' };
        expect(isAuthorizedAdmin(req(), env)).toBe(false);
        expect(isAuthorizedAdmin(req({ 'x-admin-key': 'k3' }), env)).toBe(false);
        expect(isAuthorizedAdmin(req({ authorization: 'Bearer wrong' }), env)).toBe(false);
        expect(isAuthorizedAdmin(req({ authorization: 'k3y' }), env)).toBe(false);
    });
});
