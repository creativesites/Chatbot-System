/**
 * TASK-008 M3: service_offer contract, tagged links, funnel events,
 * entitlements, dismissals. Headless; built against fixtures.
 */
const fx = require('./fixtures/serviceOffers');
const { MemoryStorageAdapter } = require('../src/storage/StorageAdapter');
const { MyaMobileClient } = require('../src/client/MyaMobileClient');
const offers = require('../src/offers/serviceOffer');
const { createFunnelTracker } = require('../src/offers/funnel');
const dismissals = require('../src/offers/dismissals');

describe('normalizeServiceOffer', () => {
  test('a complete offer is accepted and shaped for display', () => {
    const r = offers.normalizeServiceOffer(fx.hairAI);
    expect(r.ok).toBe(true);
    expect(r.offer).toMatchObject({
      id: 'off_hairai_1', service: 'hairai', priceDisplay: '$9.00', variant: 'A',
      cta: { label: 'Get HairAI™', route: 'native_iap', sku: 'com.myavana.productid.hairai' },
    });
    expect(r.offer.includes).toHaveLength(3);
  });

  test('the SDK shows only the price the server formatted, never one built from an amount', () => {
    expect(offers.normalizeServiceOffer(fx.noPrice).offer.priceDisplay).toBeNull();
    expect(offers.normalizeServiceOffer(fx.consultation).offer.priceDisplay).toBe('Free');
  });

  test('includes are capped at three lines', () => {
    const b = fx.block({ ...fx.hairAI.data, includes: ['1', '2', '3', '4', '5'] });
    expect(offers.normalizeServiceOffer(b).offer.includes).toEqual(['1', '2', '3']);
  });

  test.each([
    ['no name', { ...fx.hairAI.data, name: '' }, 'missing_name'],
    ['no service handle', { ...fx.hairAI.data, service: '' }, 'missing_service'],
    ['unknown route', { ...fx.hairAI.data, cta: { label: 'x', route: 'teleport' } }, 'bad_route'],
    ['web with no url', { ...fx.fullScan.data, cta: { label: 'x', route: 'web' } }, 'bad_url'],
    ['http url', { ...fx.fullScan.data, cta: { label: 'x', route: 'web', url: 'http://www.myavana.com/x' } }, 'bad_url'],
    ['foreign host', { ...fx.fullScan.data, cta: { label: 'x', route: 'web', url: 'https://evil.example.com/x' } }, 'bad_url'],
    ['lookalike host', { ...fx.fullScan.data, cta: { label: 'x', route: 'web', url: 'https://myavana.com.evil.example.com/x' } }, 'bad_url'],
    ['javascript url', { ...fx.fullScan.data, cta: { label: 'x', route: 'web', url: 'javascript:alert(1)' } }, 'bad_url'],
  ])('rejects %s', (_n, data, reason) => {
    const r = offers.normalizeServiceOffer(fx.block(data));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reason);
  });

  test('non-offer input is rejected without throwing', () => {
    expect(offers.normalizeServiceOffer(null).ok).toBe(false);
    expect(offers.normalizeServiceOffer({ type: 'goal_card' }).ok).toBe(false);
  });
});

describe('tagged links', () => {
  test('adds the four utm params with the service handle', () => {
    const u = new URL(offers.buildTaggedUrl('https://www.myavana.com/products/full-hair-scan', 'full_hair_scan'));
    expect(u.searchParams.get('utm_source')).toBe('mya');
    expect(u.searchParams.get('utm_medium')).toBe('chat');
    expect(u.searchParams.get('utm_campaign')).toBe('app');
    expect(u.searchParams.get('utm_content')).toBe('full_hair_scan');
  });

  test('keeps existing query params and the hash, and does not duplicate utm params', () => {
    const once = offers.buildTaggedUrl('https://calendly.com/myavana/hair-consultation?month=2026-11#x', 'consultation');
    const twice = offers.buildTaggedUrl(once, 'consultation');
    const u = new URL(twice);
    expect(u.searchParams.get('month')).toBe('2026-11');
    expect(u.hash).toBe('#x');
    expect(u.searchParams.getAll('utm_source')).toHaveLength(1);
  });
});

describe('entitlements: an owned service is never offered', () => {
  test('owned by entitlement key or by service handle', () => {
    const hairAI = offers.normalizeServiceOffer(fx.hairAI).offer;
    expect(offers.isOwned(hairAI, ['hairai'])).toBe(true);
    expect(offers.isOwned(hairAI, [])).toBe(false);
    const member = offers.normalizeServiceOffer(fx.membership).offer;
    expect(offers.isOwned(member, ['hair_nirvana_monthly'])).toBe(true);
    expect(offers.isOwned(member, ['hairai'])).toBe(false);
  });

  test('the client sends entitlements on every turn, even when empty', async () => {
    const bodies = [];
    const orig = global.fetch;
    global.fetch = jest.fn(async (url, init) => {
      bodies.push(JSON.parse(init.body));
      return { ok: true, status: 200, body: null, text: async () => '{"t":"done"}\n' };
    });
    const client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'u', storage: new MemoryStorageAdapter() });
    await client.sendMessage({ message: 'one' });
    client.setEntitlements(['hair_nirvana_monthly']);
    await client.sendMessage({ message: 'two' });
    global.fetch = orig;
    expect(bodies[0].experienceContext.entitlements).toEqual([]);
    expect(bodies[1].experienceContext.entitlements).toEqual(['hair_nirvana_monthly']);
  });
});

describe('funnel tracker', () => {
  const offer = offers.normalizeServiceOffer(fx.hairAI).offer;
  const mk = (extra = {}) => {
    const sent = [];
    const mirrored = [];
    const t = createFunnelTracker({
      send: async (eventType, metadata) => { sent.push({ eventType, metadata }); },
      mirror: (name, params) => mirrored.push({ name, params }),
      ...extra,
    });
    return { t, sent, mirrored };
  };

  test('every event carries surface:app, service, price_shown, offer id and variant', async () => {
    const { t, sent } = mk();
    await t.track('offer_tapped', offer);
    expect(sent[0]).toEqual({
      eventType: 'offer_tapped',
      metadata: expect.objectContaining({ surface: 'app', service: 'hairai', price_shown: '$9.00', offer_id: 'off_hairai_1', framing_variant: 'A', route: 'native_iap' }),
    });
  });

  test('price_shown is null when no price was displayed', async () => {
    const { t, sent } = mk();
    await t.track('offer_shown', offers.normalizeServiceOffer(fx.noPrice).offer);
    expect(sent[0].metadata.price_shown).toBeNull();
  });

  test('offer_shown is sent once per offer', async () => {
    const { t, sent } = mk();
    await t.offerShown(offer);
    await t.offerShown(offer);
    expect(sent.filter((e) => e.eventType === 'offer_shown')).toHaveLength(1);
  });

  test('events are mirrored to analytics with the same name', async () => {
    const { t, mirrored } = mk();
    await t.track('paywall_opened', offer);
    expect(mirrored[0].name).toBe('mya_paywall_opened');
    expect(mirrored[0].params).toMatchObject({ service: 'hairai', surface: 'app' });
  });

  test('a failing send never throws into the UI and is reported to onError', async () => {
    const onError = jest.fn();
    const { t } = mk({ send: async () => { throw new Error('offline'); }, onError });
    await expect(t.track('offer_tapped', offer)).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalled();
  });

  test('unknown event names are refused so the funnel stays clean', async () => {
    const { t, sent } = mk();
    await t.track('made_up_event', offer);
    expect(sent).toHaveLength(0);
  });

  test('client.trackEvent posts {userId, conversationId, eventType, metadata} to /events', async () => {
    const calls = [];
    const orig = global.fetch;
    global.fetch = jest.fn(async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => ({}) }; });
    const client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'usr_1', conversationId: 'conv_1', storage: new MemoryStorageAdapter() });
    await client.trackEvent('offer_shown', { service: 'hairai' });
    global.fetch = orig;
    expect(calls[0].url).toBe('https://x.test/events');
    expect(calls[0].body).toEqual({ userId: 'usr_1', conversationId: 'conv_1', eventType: 'offer_shown', metadata: { service: 'hairai' } });
  });
});

describe('dismissals: "Not now" is respected, even from cached messages', () => {
  const now = new Date(2026, 9, 21);
  test('a dismissed offer stays dismissed across loads', async () => {
    const storage = new MemoryStorageAdapter();
    expect(await dismissals.isDismissed(storage, 'off_1', now)).toBe(false);
    await dismissals.dismiss(storage, 'off_1', now);
    expect(await dismissals.isDismissed(storage, 'off_1', now)).toBe(true);
  });
  test('old dismissals are pruned', async () => {
    const storage = new MemoryStorageAdapter();
    await dismissals.dismiss(storage, 'old', new Date(2026, 8, 1));
    await dismissals.dismiss(storage, 'new', now);
    expect(await dismissals.isDismissed(storage, 'old', now)).toBe(false);
    expect(await dismissals.isDismissed(storage, 'new', now)).toBe(true);
  });
});

describe('post-purchase moment', () => {
  test('celebrates the real purchase and offers to walk through it; claims nothing else', () => {
    const offer = offers.normalizeServiceOffer(fx.hairAI).offer;
    const m = offers.buildPostPurchaseMessage(offer);
    expect(m.role).toBe('assistant');
    expect(m.local).toBe(true);
    expect(m.celebrate).toBe(true);
    expect(m.content).toContain('HairAI');
    expect(m.actions[0].label).toMatch(/walk me through/i);
    expect(m.content).not.toMatch(/\$\d/);
  });
});
