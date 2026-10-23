/**
 * TASK-008 M5 (UI): kill switch, accessibility, contrast.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const fs = require('fs');
const path = require('path');
const fx = require('../fixtures/serviceOffers');
const { MemoryStorageAdapter } = require('../../src/storage/StorageAdapter');
const { createFunnelTracker } = require('../../src/offers/funnel');
const { MyaOffersProvider } = require('../../src/ui/offers/OffersContext');
const ServiceOfferCard = require('../../src/ui/offers/ServiceOfferCard').default;
const MyaChat = require('../../src/ui/MyaChat').default;
const { MyaFlagsProvider } = require('../../src/ui/flags');
const { useMotion } = require('../../src/ui/motion/useMotion');
const { MyaColors } = require('../../src/ui/myaTheme');

const flush = () => new Promise((r) => setTimeout(r, 0));
const json = (t) => JSON.stringify(t.toJSON() || '');
const okFetch = (flags) => jest.fn(async (url) => ({ ok: true, status: 200, text: async () => '', json: async () => (String(url).includes('/mobile/config') ? { flags } : {}) }));
afterEach(() => { globalThis.__REDUCE_MOTION__ = false; });

describe('kill switch', () => {
  const ctx = (extra = {}) => ({ storage: new MemoryStorageAdapter(), entitlements: [], canHandle: () => true, tracker: createFunnelTracker({ send: async () => {} }), openPaywall: jest.fn(), openLink: jest.fn(), onPurchaseCompleted: jest.fn(), ...extra });
  const mountCard = async (c) => { let t; await TestRenderer.act(async () => { t = TestRenderer.create(React.createElement(MyaOffersProvider, { value: c }, React.createElement(ServiceOfferCard, { block: fx.hairAI }))); await flush(); }); return t; };

  test('with offers switched off the card renders nothing and sends no event', async () => {
    const send = jest.fn(async () => {});
    const t = await mountCard(ctx({ enabled: false, tracker: createFunnelTracker({ send }) }));
    expect(t.toJSON()).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });
  test('enabled (or unspecified) shows the card', async () => {
    expect(json(await mountCard(ctx({ enabled: true })))).toContain('Get HairAI');
    expect(json(await mountCard(ctx()))).toContain('Get HairAI');
  });
  test('with motion switched off the app behaves as if reduce-motion were on', async () => {
    let seen;
    function P() { seen = useMotion().reduced; return null; }
    await TestRenderer.act(async () => { TestRenderer.create(React.createElement(MyaFlagsProvider, { value: { serviceOffers: true, motion: false } }, React.createElement(P))); });
    expect(seen).toBe(true);
    await TestRenderer.act(async () => { TestRenderer.create(React.createElement(MyaFlagsProvider, { value: { serviceOffers: true, motion: true } }, React.createElement(P))); });
    expect(seen).toBe(false);
  });
  test('MyaChat applies a server kill switch to an offer already in the thread', async () => {
    global.fetch = okFetch({ serviceOffers: false });
    const storage = new MemoryStorageAdapter();
    storage.setItem('mya_chat_mobile_user_A', JSON.stringify([
      { id: 'u1', role: 'user', content: 'porosity?', timestamp: new Date().toISOString() },
      { id: 'a1', role: 'assistant', content: 'A guess.', timestamp: new Date().toISOString(), blocks: [fx.hairAI], actions: [] },
    ]));
    let t;
    await TestRenderer.act(async () => {
      t = TestRenderer.create(React.createElement(MyaChat, { apiBase: 'https://x.test', storage, userId: 'user_A', onOpenPaywall: jest.fn() }));
      await flush(); await flush(); await flush();
    });
    expect(json(t)).toContain('A guess.');
    expect(json(t)).not.toContain('Get HairAI');
  });
});

describe('accessibility', () => {
  const interactive = (t) => t.root.findAll((n) => (n.type === 'TouchableOpacity' || n.type === 'Pressable') && (typeof n.props.onPress === 'function' || n.props.accessibilityRole === 'button'));
  const unlabeled = (nodes) => nodes.filter((n) => {
    if (n.props.accessible === false) return false;
    const label = n.props.accessibilityLabel;
    if (typeof label === 'string' && label.trim()) return false;
    // A visible text child is also an accessible name.
    const texts = n.findAll((c) => c.type === 'Text' && c.children && c.children.join('').trim());
    return texts.length === 0;
  });
  const mountChat = async (props = {}) => {
    global.fetch = okFetch({});
    let t;
    await TestRenderer.act(async () => {
      t = TestRenderer.create(React.createElement(MyaChat, {
        apiBase: 'https://x.test', storage: new MemoryStorageAdapter(), userId: 'user_A', userName: 'Candace',
        starters: [{ id: 's', label: 'Plan wash day', prompt: 'p' }],
        menuItems: [{ key: 'm', title: 'Hair Weather', onPress: () => {} }], ...props,
      }));
      await flush(); await flush();
    });
    return t;
  };

  test('every control on the empty chat has an accessible name', async () => {
    const t = await mountChat();
    expect(unlabeled(interactive(t)).map((n) => n.props.testID || JSON.stringify(n.props.style).slice(0, 60))).toEqual([]);
  });
  test('icon-only buttons are named', async () => {
    const labels = interactive(await mountChat()).map((n) => n.props.accessibilityLabel).filter(Boolean);
    ['Back', 'New conversation', 'Conversation history', 'Mya Menu', 'Add a photo'].forEach((l) => expect(labels).toContain(l));
  });
  test('the offer card is fully operable by a screen reader: named button with a hint, plus Not now', async () => {
    const c = { storage: new MemoryStorageAdapter(), entitlements: [], canHandle: () => true, tracker: createFunnelTracker({ send: async () => {} }), openPaywall: jest.fn(), openLink: jest.fn(), onPurchaseCompleted: jest.fn() };
    let t;
    await TestRenderer.act(async () => { t = TestRenderer.create(React.createElement(MyaOffersProvider, { value: c }, React.createElement(ServiceOfferCard, { block: fx.hairAI }))); await flush(); });
    const buttons = interactive(t);
    expect(unlabeled(buttons)).toEqual([]);
    const cta = buttons.find((n) => n.props.accessibilityLabel === 'Get HairAI™');
    expect(cta.props.accessibilityHint).toMatch(/purchase/i);
    expect(buttons.some((n) => n.props.accessibilityLabel === 'Not now')).toBe(true);
    const header = t.root.findAll((n) => n.props && n.props.accessibilityRole === 'header');
    expect(header.length).toBeGreaterThan(0);
  });
  test('a screen reader hears that Mya is working, then once that she has replied', async () => {
    jest.resetModules();
    const RN = require('react-native');
    RN.AccessibilityInfo.announceForAccessibility = jest.fn();
    let state = { messages: [], isStreaming: false, isThinking: false };
    // Stable references, as the real hook returns: a fresh client or callback on every render would loop.
    const stable = {
      error: null, sendMessage: jest.fn(), setMessages: jest.fn(), abortStream: jest.fn(), restartConversation: jest.fn(),
      loadConversation: jest.fn(), fetchConversations: jest.fn(), unsentDraft: null, clearUnsentDraft: jest.fn(),
      client: { getConversationId: () => 'c', getUserId: () => 'u', setEntitlements: () => {}, setAuthToken: () => {}, trackEvent: async () => {} },
    };
    jest.doMock('../../src/hooks/useMyaChat', () => ({ useMyaChat: () => ({ ...stable, ...state }) }));
    const R = require('react'); const TR = require('react-test-renderer');
    const Chat = require('../../src/ui/MyaChat').default;
    const { MemoryStorageAdapter: Mem } = require('../../src/storage/StorageAdapter');
    global.fetch = okFetch({});
    const el = () => R.createElement(Chat, { apiBase: 'https://x.test', storage: new Mem(), userId: 'u' });
    let t;
    await TR.act(async () => { t = TR.create(el()); await flush(); });
    state = { messages: [{ id: 'u1', role: 'user', content: 'hi' }, { id: 'a1', role: 'assistant', content: '', isStreaming: true }], isStreaming: true, isThinking: true };
    await TR.act(async () => { t.update(el()); await flush(); });
    state = { messages: [{ id: 'u1', role: 'user', content: 'hi' }, { id: 'a1', role: 'assistant', content: 'Your ends need moisture.' }], isStreaming: false, isThinking: false };
    await TR.act(async () => { t.update(el()); await flush(); });
    const said = RN.AccessibilityInfo.announceForAccessibility.mock.calls.map((c) => c[0]);
    expect(said).toEqual(['Mya is thinking', 'Mya replied. Your ends need moisture.']);
    jest.dontMock('../../src/hooks/useMyaChat');
  });
});

describe('contrast (WCAG AA, 4.5:1 for text)', () => {
  const parse = (c) => {
    if (c.startsWith('#')) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
    const m = c.match(/rgba?\(([^)]+)\)/)[1].split(',').map((x) => parseFloat(x));
    return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1];
  };
  const over = (fg, bg) => { const [r, g, b, a] = parse(fg); const [br, bg2, bb] = parse(bg); return [r * a + br * (1 - a), g * a + bg2 * (1 - a), b * a + bb * (1 - a)]; };
  const lum = ([r, g, b]) => { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (fg, bg) => { const a = lum(over(fg, bg)); const b = lum(parse(bg).slice(0, 3)); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };

  test.each([
    ['onyx on white', MyaColors.onyx, '#FFFFFF'],
    ['muted text (inkText) on white', MyaColors.inkText, '#FFFFFF'],
    ['muted text on stone', MyaColors.inkText, MyaColors.stone],
    ['muted text on coral tint card', MyaColors.inkText, '#FFFFFF'],
    ['secondary text (ink70) on white', MyaColors.ink70, '#FFFFFF'],
    ['blueberry on white', MyaColors.blueberry, '#FFFFFF'],
    ['onyx on coral (the way to put text on coral)', MyaColors.onyx, MyaColors.coral],
    ['onyx on blush', MyaColors.onyx, MyaColors.blush],
    ['white on onyx (primary button)', '#FFFFFF', MyaColors.onyx],
  ])('%s', (_n, fg, bg) => { expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5); });

  test('coral text on white fails, which is why it is never used for text', () => {
    expect(ratio(MyaColors.coral, '#FFFFFF')).toBeLessThan(4.5);
  });
  test('no style in the SDK colours text coral', () => {
    const SRC = path.join(__dirname, '../../src/ui');
    const all = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? all(p) : /\.js$/.test(p) ? [p] : []; });
    all(SRC).forEach((f) => {
      const code = fs.readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l));
      code.forEach((l) => expect(l).not.toMatch(/^\s+color:\s*(MyaColors\.coral\b|'#E7A690')/));
    });
  });
  test('text uses the accessible muted ink, never the lighter fill inks', () => {
    const SRC = path.join(__dirname, '../../src/ui');
    const all = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? all(p) : /\.js$/.test(p) ? [p] : []; });
    all(SRC).filter((f) => !/myaTheme\.js$/.test(f)).forEach((f) => {
      fs.readFileSync(f, 'utf8').split('\n').forEach((l) => expect(l).not.toMatch(/^\s+color:\s*MyaColors\.ink(26|32|40|42|45|50|55|56|58)\b/));
    });
  });
});
