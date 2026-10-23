/**
 * Remote kill switch (TASK-008 M5). The server can turn off service offers and
 * the newer motion features per app version without a release.
 *
 * Contract (PROPOSED, to be built server-side; see the Atlas inbox note):
 *   GET {apiBase}/mobile/config?platform=<react-native-ios|android>&appVersion=<x>&sdkVersion=<y>
 *   -> { "flags": { "serviceOffers": true, "motion": true } }
 *
 * Failure policy: never block the chat on it. A failed fetch uses the last
 * cached answer; with no cache the defaults apply (everything on). A malformed
 * answer is ignored, field by field.
 */

const CACHE_KEY = 'mya_flags_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3000;

const DEFAULT_FLAGS = Object.freeze({ serviceOffers: true, motion: true });

function sanitize(raw) {
  const src = raw && typeof raw === 'object' && raw.flags && typeof raw.flags === 'object' ? raw.flags : {};
  const out = { ...DEFAULT_FLAGS };
  Object.keys(DEFAULT_FLAGS).forEach((k) => {
    if (typeof src[k] === 'boolean') out[k] = src[k];
  });
  return out;
}

async function readCache(storage, now) {
  try {
    const raw = await storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { flags, at } = JSON.parse(raw);
    return { flags: sanitize({ flags }), fresh: now - at < CACHE_TTL_MS };
  } catch (e) {
    return null;
  }
}

/**
 * @param {{apiBase:string, storage:object, platform?:string, appVersion?:string, sdkVersion?:string, headers?:object, fetchFn?:Function, now?:number, onError?:Function}} o
 * @returns {Promise<{flags:object, source:'network'|'cache'|'default'}>}
 */
async function loadFlags(o) {
  const now = typeof o.now === "number" ? o.now : Date.now();
  const cached = o.storage ? await readCache(o.storage, now) : null;
  if (cached && cached.fresh) return { flags: cached.flags, source: 'cache' };

  const doFetch = o.fetchFn || globalThis.fetch;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;
  try {
    const q = new URLSearchParams({ platform: o.platform || '', appVersion: o.appVersion || '', sdkVersion: o.sdkVersion || '' });
    const res = await doFetch(`${o.apiBase}/mobile/config?${q.toString()}`, {
      headers: o.headers || {},
      signal: controller ? controller.signal : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const flags = sanitize(await res.json());
    if (o.storage) {
      try {
        await o.storage.setItem(CACHE_KEY, JSON.stringify({ flags, at: now }));
      } catch (e) {
        o.onError && o.onError(e);
      }
    }
    return { flags, source: 'network' };
  } catch (e) {
    o.onError && o.onError(e);
    return cached ? { flags: cached.flags, source: 'cache' } : { flags: { ...DEFAULT_FLAGS }, source: 'default' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

module.exports = { DEFAULT_FLAGS, CACHE_KEY, CACHE_TTL_MS, sanitize, loadFlags };
