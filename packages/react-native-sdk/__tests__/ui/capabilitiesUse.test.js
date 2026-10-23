/**
 * M4: the host-injected capabilities (gradient, blur, SVG) are used when given
 * and degrade to plain fallbacks when not. The fakes stand in for
 * react-native-linear-gradient, @react-native-community/blur and react-native-svg.
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const fx = require('../fixtures/serviceOffers');
const { MemoryStorageAdapter } = require('../../src/storage/StorageAdapter');
const { createFunnelTracker } = require('../../src/offers/funnel');
const { MyaCapabilitiesProvider } = require('../../src/ui/capabilities');
const { MyaOffersProvider } = require('../../src/ui/offers/OffersContext');
const MyaAvatar = require('../../src/ui/MyaAvatar').default;
const ServiceOfferCard = require('../../src/ui/offers/ServiceOfferCard').default;
const MyaAnimatedCheck = require('../../src/ui/MyaAnimatedCheck').default;
const MyaChat = require('../../src/ui/MyaChat').default;

const flush = () => new Promise((r) => setTimeout(r, 0));
const fake = (name) => { const C = ({ children, ...p }) => React.createElement(name, p, children); C.displayName = name; return C; };
const LinearGradient = fake('FakeLinearGradient');
const BlurView = fake('FakeBlurView');
const Svg = fake('FakeSvg');
const Path = fake('FakePath');

const withCaps = (caps, el) => React.createElement(MyaCapabilitiesProvider, { value: caps }, el);
const render = async (el) => { let t; await TestRenderer.act(async () => { t = TestRenderer.create(el); await flush(); }); return t; };
const find = (t, type) => t.root.findAll((n) => n.type === type);

beforeAll(() => { global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}), text: async () => '' })); });

describe('gradient avatar', () => {
  test('with a gradient the mark sits in a berry-to-coral ring', async () => {
    const t = await render(withCaps({ LinearGradient }, React.createElement(MyaAvatar, { size: 28 })));
    const g = find(t, 'FakeLinearGradient')[0];
    expect(g.props.colors).toEqual(['#4A4D68', '#E7A690']);
  });
  test('without one it is the plain mark', async () => {
    const t = await render(React.createElement(MyaAvatar, { size: 28 }));
    expect(find(t, 'FakeLinearGradient')).toHaveLength(0);
    expect(JSON.stringify(t.toJSON())).toContain('Image');
  });
});

describe('offer card hairline', () => {
  const ctx = () => ({
    storage: new MemoryStorageAdapter(), entitlements: [], canHandle: () => true,
    tracker: createFunnelTracker({ send: async () => {} }), openPaywall: jest.fn(), openLink: jest.fn(), onPurchaseCompleted: jest.fn(),
  });
  const card = (caps) => withCaps(caps, React.createElement(MyaOffersProvider, { value: ctx() }, React.createElement(ServiceOfferCard, { block: fx.hairAI })));

  test('with a gradient the frame runs blush to coral', async () => {
    const t = await render(card({ LinearGradient }));
    const g = find(t, 'FakeLinearGradient')[0];
    expect(g.props.colors.slice(0, 2)).toEqual(['#FCE5D7', '#E7A690']);
    expect(JSON.stringify(t.toJSON())).toContain('Get HairAI');
  });
  test('without one it is a plain coral hairline with the same content', async () => {
    const t = await render(card(undefined));
    expect(find(t, 'FakeLinearGradient')).toHaveLength(0);
    const out = JSON.stringify(t.toJSON());
    expect(out).toContain('Get HairAI');
    expect(out).toContain('Not now');
  });
});

describe('stroke-drawn checkmark', () => {
  test('with SVG the check is drawn as a path', async () => {
    const t = await render(withCaps({ Svg: { Svg, Path } }, React.createElement(MyaAnimatedCheck, { size: 12 })));
    expect(find(t, 'FakeSvg')).toHaveLength(1);
    const p = find(t, 'FakePath')[0];
    expect(p.props.d).toMatch(/^M/);
    expect(p.props.strokeLinecap).toBe('round');
  });
  test('without SVG it falls back to the springing icon', async () => {
    const t = await render(React.createElement(MyaAnimatedCheck, { size: 12 }));
    expect(find(t, 'FakeSvg')).toHaveLength(0);
    expect(find(t, 'Icon')).toHaveLength(1);
  });
  test('the light haptic fires once when a check appears', async () => {
    const light = jest.fn();
    await render(withCaps({ haptics: { light } }, React.createElement(MyaAnimatedCheck, { size: 12 })));
    expect(light).toHaveBeenCalledTimes(1);
  });
});

describe('blurred header', () => {
  const chat = (capabilities) => React.createElement(MyaChat, {
    apiBase: 'https://x.test', storage: new MemoryStorageAdapter(), userId: 'u', userName: 'Candace', capabilities,
  });
  test('with a blur the header floats over the thread on a BlurView', async () => {
    const t = await render(chat({ BlurView }));
    const b = find(t, 'FakeBlurView')[0];
    expect(b.props.blurType).toBe('light');
    expect(b.props.blurAmount).toBe(18);
    expect(b.props.reducedTransparencyFallbackColor).toBeTruthy();
  });
  test('without one the header is the plain in-flow header', async () => {
    const t = await render(chat(undefined));
    expect(find(t, 'FakeBlurView')).toHaveLength(0);
    expect(JSON.stringify(t.toJSON())).toContain('Candace');
  });
});
