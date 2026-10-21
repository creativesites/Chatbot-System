/**
 * service_offer: the card Mya uses to offer a MYAVANA service.
 *
 * The server decides which service, what it costs and where it goes. The SDK
 * validates what it was sent and presents it. It never picks a service, never
 * builds a price from an amount, and never follows a link it does not trust.
 *
 * The contract is PROPOSED (see community/inboxes/atlas/20261021_1500_...) and
 * not yet agreed with the backend. Field names below track that proposal.
 */

const SERVICE_OFFER = 'service_offer';
const ROUTES = ['native_iap', 'native_subscription', 'web', 'calendly'];
const MAX_INCLUDES = 3;

// Links Mya may open. A model-written or tampered URL must not send a member
// anywhere else. Subdomains of these are allowed.
const ALLOWED_HOSTS = ['myavana.com', 'calendly.com'];

function hostAllowed(host) {
  const h = String(host || '').toLowerCase();
  return ALLOWED_HOSTS.some((a) => h === a || h.endsWith(`.${a}`));
}

function safeUrl(raw) {
  try {
    const u = new URL(String(raw));
    if (u.protocol !== 'https:') return null;
    if (!hostAllowed(u.hostname)) return null;
    return u;
  } catch (e) {
    return null;
  }
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * @returns {{ok: true, offer: object} | {ok: false, reason: string}}
 */
function normalizeServiceOffer(block) {
  if (!block || typeof block !== 'object' || block.type !== SERVICE_OFFER) {
    return { ok: false, reason: 'not_an_offer' };
  }
  const d = block.data && typeof block.data === 'object' ? block.data : {};

  const name = str(d.name);
  if (!name) return { ok: false, reason: 'missing_name' };
  const service = str(d.service);
  if (!service) return { ok: false, reason: 'missing_service' };

  const cta = d.cta && typeof d.cta === 'object' ? d.cta : {};
  const route = str(cta.route);
  if (ROUTES.indexOf(route) === -1) return { ok: false, reason: 'bad_route' };

  let url = null;
  if (route === 'web' || route === 'calendly') {
    const u = safeUrl(cta.url);
    if (!u) return { ok: false, reason: 'bad_url' };
    url = u.toString();
  }

  // Only a price the server already formatted is ever shown.
  const priceDisplay = d.price && typeof d.price === 'object' ? str(d.price.display) || null : null;

  const includes = (Array.isArray(d.includes) ? d.includes : [])
    .map(str)
    .filter(Boolean)
    .slice(0, MAX_INCLUDES);

  return {
    ok: true,
    offer: {
      id: str(d.offer_id) || str(block.id) || `${service}`,
      service,
      name,
      priceDisplay,
      includes,
      reason: str(d.reason) || null,
      variant: str(d.framing_variant) || null,
      entitlementKey: str(d.entitlement_key) || null,
      cta: {
        label: str(cta.label) || 'Learn more',
        route,
        url,
        sku: str(cta.sku) || null,
      },
    },
  };
}

/** utm_source=mya&utm_medium=chat&utm_campaign=app&utm_content=<service>. Keeps other params and the hash. */
function buildTaggedUrl(url, service) {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'mya');
  u.searchParams.set('utm_medium', 'chat');
  u.searchParams.set('utm_campaign', 'app');
  u.searchParams.set('utm_content', service);
  return u.toString();
}

/** Defence in depth: the server stops offering owned services, and so does the client. */
function isOwned(offer, entitlements) {
  const owned = Array.isArray(entitlements) ? entitlements : [];
  if (!offer) return false;
  return owned.indexOf(offer.service) !== -1 || (!!offer.entitlementKey && owned.indexOf(offer.entitlementKey) !== -1);
}

/**
 * The highest-intent moment in the funnel. Fixed brand copy for a purchase the
 * host has confirmed; it asserts nothing about results or what was bought
 * beyond the service name. Marked `local` (never sent to the server) and
 * `celebrate` (the UI plays the M4 moment).
 */
function buildPostPurchaseMessage(offer) {
  const label = offer.name.replace(/^MYAVANA\s+/i, '').replace(/\s+(Instant Analysis \+ Recommendations|Membership Club)$/i, '') || offer.name;
  return {
    id: `msg_local_purchase_${offer.id}`,
    role: 'assistant',
    local: true,
    celebrate: true,
    content: `You're in. ${label} is ready.\n\nWhenever you'd like, I can walk you through what happens next, one step at a time.`,
    timestamp: new Date().toISOString(),
    actions: [{ type: 'quick_reply', label: 'Walk me through it', payload: `Walk me through ${label}` }],
    blocks: [],
  };
}

module.exports = {
  SERVICE_OFFER,
  ROUTES,
  ALLOWED_HOSTS,
  normalizeServiceOffer,
  buildTaggedUrl,
  isOwned,
  buildPostPurchaseMessage,
};
