/**
 * M3 UI: the service_offer card and the purchase moment, against fixtures.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const fx = require('../fixtures/serviceOffers');
const { MemoryStorageAdapter } = require('../../src/storage/StorageAdapter');
const { createFunnelTracker } = require('../../src/offers/funnel');
const { MyaOffersProvider } = require('../../src/ui/offers/OffersContext');
const ServiceOfferCard = require('../../src/ui/offers/ServiceOfferCard').default;
const MyaChat = require('../../src/ui/MyaChat').default;

const flush = () => new Promise((r) => setTimeout(r, 0));

// Funnel events post to /events; keep tests off the network.
beforeAll(() => { global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' })); });

function setup(overrides = {}) {
  const events = [];
  const ctx = {
    storage: new MemoryStorageAdapter(),
    entitlements: [],
    tracker: createFunnelTracker({ send: async (type, meta) => { events.push({ type, meta }); } }),
    canHandle: () => true,
    openPaywall: jest.fn(async () => ({ status: 'purchase_completed' })),
    openLink: jest.fn(async () => {}),
    onPurchaseCompleted: jest.fn(),
    ...overrides,
  };
  return { ctx, events };
}

async function mount(block, ctx) {
  let tree;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      React.createElement(MyaOffersProvider, { value: ctx }, React.createElement(ServiceOfferCard, { block }))
    );
    await flush();
  });
  return tree;
}
const json = (t) => JSON.stringify(t.toJSON() || '');
const byLabel = (tree, label) => tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
const press = async (node) => { await TestRenderer.act(async () => { await node.props.onPress(); await flush(); }); };
const types = (events) => events.map((e) => e.type);

describe('ServiceOfferCard presents what the server sent', () => {
  test('store name, server price, inclusions, reason, one primary action and Not now', async () => {
    const { ctx } = setup();
    const out = json(await mount(fx.hairAI, ctx));
    expect(out).toContain('MYAVANA HairAI™ Instant Analysis + Recommendations');
    expect(out).toContain('$9.00');
    expect(out).toContain('Hair type and texture analysis');
    expect(out).toContain('Your profile has no measured porosity yet');
    expect(out).toContain('Get HairAI™');
    expect(out).toContain('Not now');
  });

  test('no price is shown when the server sent none (an amount is never formatted)', async () => {
    const { ctx } = setup();
    const out = json(await mount(fx.noPrice, ctx));
    expect(out).not.toMatch(/\$\s?9/);
    expect(out).toContain('Get HairAI™');
  });

  test('offer_shown is tracked once, with surface app and the price shown', async () => {
    const { ctx, events } = setup();
    const tree = await mount(fx.hairAI, ctx);
    await TestRenderer.act(async () => {
      tree.update(React.createElement(MyaOffersProvider, { value: ctx }, React.createElement(ServiceOfferCard, { block: fx.hairAI })));
      await flush();
    });
    const shown = events.filter((e) => e.type === 'offer_shown');
    expect(shown).toHaveLength(1);
    expect(shown[0].meta).toMatchObject({ surface: 'app', service: 'hairai', price_shown: '$9.00', framing_variant: 'A' });
  });
});

describe('ServiceOfferCard shows nothing it should not', () => {
  test('an owned service is never offered', async () => {
    const { ctx, events } = setup({ entitlements: ['hairai'] });
    expect((await mount(fx.hairAI, ctx)).toJSON()).toBeNull();
    expect(events).toHaveLength(0);
  });

  test('the membership is hidden by its entitlement key', async () => {
    const { ctx } = setup({ entitlements: ['hair_nirvana_monthly'] });
    expect((await mount(fx.membership, ctx)).toJSON()).toBeNull();
  });

  test('a dismissed card is not re-shown from a cached thread', async () => {
    const { ctx } = setup();
    await require('../../src/offers/dismissals').dismiss(ctx.storage, 'off_hairai_1');
    expect((await mount(fx.hairAI, ctx)).toJSON()).toBeNull();
  });

  test('a malformed offer renders nothing rather than a broken sell', async () => {
    const { ctx } = setup();
    expect((await mount(fx.block({ ...fx.hairAI.data, name: '' }), ctx)).toJSON()).toBeNull();
  });

  test('a native offer the host cannot fulfil is hidden', async () => {
    const { ctx } = setup({ canHandle: () => false });
    expect((await mount(fx.hairAI, ctx)).toJSON()).toBeNull();
  });

  test('without an offers context nothing renders', async () => {
    let tree;
    await TestRenderer.act(async () => { tree = TestRenderer.create(React.createElement(ServiceOfferCard, { block: fx.hairAI })); await flush(); });
    expect(tree.toJSON()).toBeNull();
  });
});

describe('ServiceOfferCard routing and events', () => {
  test('native purchase: tapped, paywall, completed, host told', async () => {
    const { ctx, events } = setup();
    const tree = await mount(fx.hairAI, ctx);
    await press(byLabel(tree, 'Get HairAI™'));
    expect(ctx.openPaywall).toHaveBeenCalledTimes(1);
    expect(ctx.openPaywall.mock.calls[0][0]).toMatchObject({ service: 'hairai', cta: { route: 'native_iap', sku: 'com.myavana.productid.hairai' } });
    expect(types(events)).toEqual(['offer_shown', 'offer_tapped', 'paywall_opened', 'purchase_completed']);
    expect(ctx.onPurchaseCompleted).toHaveBeenCalledTimes(1);
  });

  test('cancelled purchase is tracked and does not celebrate', async () => {
    const { ctx, events } = setup({ openPaywall: jest.fn(async () => ({ status: 'purchase_cancelled' })) });
    const tree = await mount(fx.membership, ctx);
    await press(byLabel(tree, 'See membership'));
    expect(types(events)).toContain('purchase_cancelled');
    expect(types(events)).not.toContain('purchase_completed');
    expect(ctx.onPurchaseCompleted).not.toHaveBeenCalled();
  });

  test('web service opens a tagged myavana.com link in the in-app browser', async () => {
    const { ctx, events } = setup();
    const tree = await mount(fx.fullScan, ctx);
    await press(byLabel(tree, 'View on myavana.com'));
    const url = new URL(ctx.openLink.mock.calls[0][0]);
    expect(url.hostname).toBe('www.myavana.com');
    expect(url.searchParams.get('utm_source')).toBe('mya');
    expect(url.searchParams.get('utm_content')).toBe('full_hair_scan');
    expect(ctx.openPaywall).not.toHaveBeenCalled();
    expect(types(events)).toEqual(['offer_shown', 'offer_tapped', 'link_opened']);
  });

  test('consultation opens a tagged Calendly link and logs consult_booking_opened', async () => {
    const { ctx, events } = setup();
    const tree = await mount(fx.consultation, ctx);
    await press(byLabel(tree, 'Book your free consultation'));
    const url = new URL(ctx.openLink.mock.calls[0][0]);
    expect(url.hostname).toBe('calendly.com');
    expect(url.searchParams.get('month')).toBe('2026-11');
    expect(url.searchParams.get('utm_content')).toBe('consultation');
    expect(types(events)).toContain('consult_booking_opened');
  });

  test('Not now logs the dismissal, hides the card and remembers it', async () => {
    const { ctx, events } = setup();
    const tree = await mount(fx.hairAI, ctx);
    await press(byLabel(tree, 'Not now'));
    expect(types(events)).toContain('offer_dismissed');
    expect(tree.toJSON()).toBeNull();
    expect(await require('../../src/offers/dismissals').isDismissed(ctx.storage, 'off_hairai_1')).toBe(true);
  });

  test('a second tap while the first is in flight does nothing', async () => {
    let release;
    const gate = new Promise((r) => { release = r; });
    const { ctx } = setup({ openPaywall: jest.fn(async () => { await gate; return { status: 'purchase_cancelled' }; }) });
    const tree = await mount(fx.hairAI, ctx);
    const btn = byLabel(tree, 'Get HairAI™');
    await TestRenderer.act(async () => { btn.props.onPress(); btn.props.onPress(); await flush(); });
    release();
    await TestRenderer.act(async () => { await flush(); });
    expect(ctx.openPaywall).toHaveBeenCalledTimes(1);
  });

  test('a failing store call never crashes the card', async () => {
    const { ctx } = setup({ openPaywall: jest.fn(async () => { throw new Error('store down'); }) });
    const tree = await mount(fx.hairAI, ctx);
    await press(byLabel(tree, 'Get HairAI™'));
    expect(tree.toJSON()).not.toBeNull();
  });
});

describe('MyaChat: the purchase moment and entitlements', () => {
  function seeded(extra = {}) {
    const storage = new MemoryStorageAdapter();
    storage.setItem('mya_chat_mobile_user_A', JSON.stringify([
      { id: 'u1', role: 'user', content: 'Can you tell me my porosity?', timestamp: new Date().toISOString() },
      { id: 'a1', role: 'assistant', content: 'I can only guess from here.', timestamp: new Date().toISOString(), blocks: [fx.hairAI], actions: [] },
    ]));
    return {
      storage,
      props: { apiBase: 'https://x.test', storage, userId: 'user_A', userName: 'Candace', persistPrefix: 'mya', ...extra },
    };
  }
  async function mountChat(props) {
    let tree;
    await TestRenderer.act(async () => {
      tree = TestRenderer.create(React.createElement(MyaChat, props));
      await flush(); await flush();
    });
    return tree;
  }

  test('an offer in the thread renders, taps through, then Mya celebrates the real purchase', async () => {
    const analytics = jest.fn();
    const { props } = seeded({ persistPrefix: 'mya' });
    props.userId = 'user_A';
    // key is `${persistPrefix}_chat_mobile_${userId || 'guest'}`
    const storage = props.storage; storage.setItem('mya_chat_mobile_user_A', storage.getItem('mya_chat_mobile_user_A'));
    const onOpenPaywall = jest.fn(async () => ({ status: 'purchase_completed' }));
    const tree = await mountChat({ ...props, onOpenPaywall, analytics, getEntitlements: async () => [] });
    expect(json(tree)).toContain('Get HairAI™');
    await press(byLabel(tree, 'Get HairAI™'));
    await TestRenderer.act(async () => { await flush(); await flush(); });
    expect(onOpenPaywall).toHaveBeenCalledTimes(1);
    expect(json(tree)).toContain("You're in");
    expect(json(tree)).toContain('Walk me through it');
    expect(analytics.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['mya_offer_shown', 'mya_offer_tapped', 'mya_paywall_opened', 'mya_purchase_completed']));
  });

  test('an owned service in the thread is not shown', async () => {
    const { props } = seeded();
    const tree = await mountChat({ ...props, onOpenPaywall: jest.fn(), getEntitlements: async () => ['hairai'] });
    expect(json(tree)).not.toContain('Get HairAI™');
  });
});
