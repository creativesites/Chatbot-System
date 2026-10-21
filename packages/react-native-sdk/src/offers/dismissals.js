/**
 * "Not now" is respected. The server enforces the 7-day pause for new offers;
 * this makes sure a card the member already dismissed is never re-shown from
 * the cached thread.
 */

const KEY = 'mya_offer_dismissed_v1';
const KEEP_DAYS = 30;

async function read(storage) {
  try {
    const raw = await storage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function prune(all, now) {
  const cutoff = now.getTime() - KEEP_DAYS * 86400000;
  const out = {};
  Object.keys(all).forEach((id) => {
    if (typeof all[id] === 'number' && all[id] >= cutoff) out[id] = all[id];
  });
  return out;
}

async function isDismissed(storage, offerId, now = new Date()) {
  if (!storage || !offerId) return false;
  return Object.prototype.hasOwnProperty.call(prune(await read(storage), now), offerId);
}

async function dismiss(storage, offerId, now = new Date()) {
  if (!storage || !offerId) return;
  const all = prune(await read(storage), now);
  all[offerId] = now.getTime();
  try {
    await storage.setItem(KEY, JSON.stringify(all));
  } catch (e) {
    // Persistence is best effort; the card still closes for this session.
  }
}

module.exports = { isDismissed, dismiss };
