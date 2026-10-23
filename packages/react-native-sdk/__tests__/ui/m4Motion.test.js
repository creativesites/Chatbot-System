/**
 * TASK-008 M4 (dependency-free part): motion tokens, reduce-motion, ink pacing,
 * presence, haptics seam, honest loading states. Animations resolve instantly in
 * the stub, so these pin behaviour and rules, not frame timing (needs a device).
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const fs = require('fs');
const path = require('path');

const tokens = require('../../src/ui/motion/tokens');
const pacing = require('../../src/ui/motion/inkPacing');
const caps = require('../../src/ui/capabilities');
const { MemoryStorageAdapter } = require('../../src/storage/StorageAdapter');

const flush = () => new Promise((r) => setTimeout(r, 0));
const json = (t) => JSON.stringify(t.toJSON() || '');
afterEach(() => { globalThis.__REDUCE_MOTION__ = false; jest.useRealTimers(); });

describe('motion tokens', () => {
  test('three springs with the specified damping and stiffness', () => {
    expect(tokens.MyaSprings.gentle).toMatchObject({ damping: 20, stiffness: 170 });
    expect(tokens.MyaSprings.snappy).toMatchObject({ damping: 18, stiffness: 260 });
    expect(tokens.MyaSprings.settle).toMatchObject({ damping: 26, stiffness: 140 });
    expect(Object.keys(tokens.MyaSprings)).toHaveLength(3);
  });
  test('three durations: 120 / 220 / 360', () => {
    expect(tokens.MyaDurations).toEqual({ fast: 120, base: 220, slow: 360 });
  });
  test('ink arrives over 120 ms rising 4 px; cards rise 8 px from scale .98; stagger 60 ms', () => {
    expect(tokens.INK).toEqual({ rise: 4, duration: 120 });
    expect(tokens.CARD_ENTER).toEqual({ scaleFrom: 0.98, rise: 8 });
    expect(tokens.STAGGER_MS).toBe(60);
    expect(tokens.PRESS_SCALE).toBe(0.97);
    expect(tokens.PRESENCE).toMatchObject({ breatheScale: 1.04, breatheMs: 1600 });
  });
  test('reduce-motion turns every animation into a crossfade of at most 120 ms with no movement', () => {
    [{ kind: 'spring', name: 'gentle' }, { kind: 'spring', name: 'snappy' }, { kind: 'timing', name: 'slow', duration: 360 }].forEach((spec) => {
      const a = tokens.adapt(spec, true);
      expect(a.kind).toBe('timing');
      expect(a.duration).toBeLessThanOrEqual(120);
      expect(a.movement).toBe(false);
    });
  });
  test('without reduce-motion springs stay springs', () => {
    expect(tokens.adapt({ kind: 'spring', name: 'settle' }, false)).toMatchObject({ kind: 'spring', movement: true });
  });
  test('no ad-hoc numbers: components take durations and springs from the token file', () => {
    // The tokens are the only place spring configs are written out.
    const SRC = path.join(__dirname, '../../src/ui');
    const walk = (d, o = []) => fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p, o) : /\.js$/.test(p) && o.push(p); return o; }) || o;
    const files = walk(SRC, []).filter((f) => !/motion\/tokens\.js$/.test(f));
    files.forEach((f) => expect(fs.readFileSync(f, 'utf8')).not.toMatch(/damping\s*:\s*\d|stiffness\s*:\s*\d/));
  });
});

describe('ink pacing', () => {
  test('units reproduce the text exactly', () => {
    const t = 'Hello  there, **world**.\n\n- item one\n- item two';
    expect(pacing.joinUnits(pacing.toWordUnits(t), 999)).toBe(t);
  });
  test('releases one word per tick while the backlog is small', () => {
    expect(pacing.nextShownCount(3, 8, true, false)).toBe(4);
  });
  test('catches up in bigger steps when behind, so it never lags the stream by more than a few ticks', () => {
    let shown = 0; let ticks = 0;
    while (shown < 120 && ticks < 200) { shown = pacing.nextShownCount(shown, 120, true, false); ticks += 1; }
    expect(shown).toBe(120);
    expect(ticks).toBeLessThan(40);
  });
  test('after the stream ends the remainder is flushed within about 280 ms', () => {
    let shown = 20; let ticks = 0;
    while (shown < 60) { shown = pacing.nextShownCount(shown, 60, false, false); ticks += 1; }
    expect(ticks * tokens.PACING.tickMs).toBeLessThanOrEqual(tokens.PACING.flushMs + tokens.PACING.tickMs);
  });
  test('reduce-motion shows everything at once; never overshoots the total', () => {
    expect(pacing.nextShownCount(0, 50, true, true)).toBe(50);
    expect(pacing.nextShownCount(49, 50, true, false)).toBe(50);
  });

  test('a reply we watch arrive is paced; one from history is instant', async () => {
    jest.useFakeTimers();
    const useInkPacing = require('../../src/ui/motion/useInkPacing').default;
    const text = 'one two three four five six seven eight';
    const seen = {};
    function Probe({ streaming, id }) { seen[id] = useInkPacing(text, streaming); return null; }
    await TestRenderer.act(async () => {
      TestRenderer.create(React.createElement(React.Fragment, null,
        React.createElement(Probe, { id: 'live', streaming: true }),
        React.createElement(Probe, { id: 'history', streaming: false })));
    });
    expect(seen.history.shown).toBe(text);
    expect(seen.live.shown.length).toBeLessThan(text.length);
    for (let i = 0; i < 20; i += 1) { await TestRenderer.act(async () => { jest.advanceTimersByTime(32); }); }
    expect(seen.live.shown).toBe(text);
    expect(seen.live.complete).toBe(true);
  });

  test('with reduce-motion a streamed reply is shown immediately', async () => {
    globalThis.__REDUCE_MOTION__ = true;
    const useInkPacing = require('../../src/ui/motion/useInkPacing').default;
    let out;
    function Probe() { out = useInkPacing('a b c d e f', true); return null; }
    await TestRenderer.act(async () => { TestRenderer.create(React.createElement(Probe)); await flush(); });
    expect(out.shown).toBe('a b c d e f');
  });
});

describe('optional native niceties are injected, never imported', () => {
  const probe = (value) => {
    let h;
    function P() { h = caps.useHaptics(); return null; }
    TestRenderer.act(() => { TestRenderer.create(React.createElement(caps.MyaCapabilitiesProvider, { value }, React.createElement(P))); });
    return h;
  };
  test('with no haptics provided every call is a harmless no-op', () => {
    const h = probe(undefined);
    expect(() => { h.light(); h.medium(); h.success(); }).not.toThrow();
  });
  test('provided haptics are called', () => {
    const light = jest.fn();
    probe({ haptics: { light } }).light();
    expect(light).toHaveBeenCalledTimes(1);
  });
  test('a throwing haptic never breaks the UI', () => {
    const h = probe({ haptics: { light: () => { throw new Error('boom'); } } });
    expect(() => h.light()).not.toThrow();
  });
  test('the SDK imports no haptics, gradient or blur library', () => {
    const SRC = path.join(__dirname, '../../src');
    const all = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? all(p) : /\.js$/.test(p) ? [p] : []; });
    all(SRC).forEach((f) => expect(fs.readFileSync(f, 'utf8')).not.toMatch(/(?:from|require\()\s*['"](?:react-native-(?:haptic|linear-gradient|svg)|@react-native-community\/blur)/));
  });
  test('MyaPressable fires the injected haptic and the press handler', () => {
    const MyaPressable = require('../../src/ui/MyaPressable').default;
    const medium = jest.fn(); const onPress = jest.fn();
    let tree;
    TestRenderer.act(() => {
      tree = TestRenderer.create(React.createElement(caps.MyaCapabilitiesProvider, { value: { haptics: { medium } } },
        React.createElement(MyaPressable, { onPress, haptic: 'medium', accessibilityLabel: 'go' }, null)));
    });
    const node = tree.root.findAll((n) => n.type === 'Pressable' && n.props.accessibilityLabel === 'go')[0];
    TestRenderer.act(() => node.props.onPress());
    expect(medium).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('petals', () => {
  test('a deterministic scatter of the requested size', () => {
    const { makePetals } = require('../../src/ui/MyaPetals');
    expect(makePetals(14)).toHaveLength(14);
    expect(makePetals(14)).toEqual(makePetals(14));
  });
  test('with reduce-motion nothing falls and onDone still fires', () => {
    globalThis.__REDUCE_MOTION__ = true;
    const MyaPetals = require('../../src/ui/MyaPetals').default;
    const onDone = jest.fn(); let tree;
    TestRenderer.act(() => { tree = TestRenderer.create(React.createElement(MyaPetals, { onDone })); });
    expect(tree.toJSON()).toBeNull();
    expect(onDone).toHaveBeenCalled();
  });
});

describe('honest loading states', () => {
  const SRC = path.join(__dirname, '../../src/ui');
  const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

  test('no invented analysis steps or "scanning" claims remain', () => {
    ['MyaLoadingDistraction.js', 'MyaMessageRow.js', 'MyaChat.js'].forEach((f) => {
      const t = read(f);
      expect(t).not.toMatch(/Cross-referencing|lab-backed|Scanning Strand|Strand DNA\.\.\.|HAIR LABS/);
    });
  });
  test('the loading card shows only the status it was given, or a plain default', async () => {
    const Loading = require('../../src/ui/MyaLoadingDistraction').default;
    let a; let b;
    await TestRenderer.act(async () => { a = TestRenderer.create(React.createElement(Loading, { status: 'Reading your HairID...' })); b = TestRenderer.create(React.createElement(Loading)); });
    expect(json(a)).toContain('Reading your HairID...');
    expect(json(b)).toContain('Checking your Hair Journey...');
  });
  test('tips carry no unsourced percentages', () => {
    expect(read('MyaLoadingDistraction.js')).not.toMatch(/up to \d+%/);
  });
  test('a photo turn says Mya is looking, not analysing', async () => {
    const MyaMessageRow = require('../../src/ui/MyaMessageRow').default;
    let t;
    await TestRenderer.act(async () => {
      t = TestRenderer.create(React.createElement(MyaMessageRow, { message: { id: 'a', role: 'assistant', content: '', isStreaming: true, isPhotoTurn: true }, showLabel: true }));
    });
    const out = json(t);
    expect(out).toContain('Looking at your photo');
    expect(out).not.toMatch(/Scanning|analys/i);
  });
});

describe('streamed replies in the message row', () => {
  const MyaMessageRow = require('../../src/ui/MyaMessageRow').default;
  test('a card waits until the text before it has been revealed', async () => {
    jest.useFakeTimers();
    const msg = { id: 'a', role: 'assistant', isStreaming: true, content: 'First part of the answer. Then more words follow after the card appears.', blocks: [{ id: 'b1', type: 'goal_card', position: 30, data: { title: 'Retain length' } }] };
    let t;
    await TestRenderer.act(async () => { t = TestRenderer.create(React.createElement(MyaMessageRow, { message: msg, showLabel: false })); });
    expect(json(t)).not.toContain('Retain length');
    for (let i = 0; i < 40; i += 1) { await TestRenderer.act(async () => { jest.advanceTimersByTime(32); }); }
    expect(json(t)).toContain('Retain length');
  });
  test('history rows render in full at once, with no pacing', async () => {
    const msg = { id: 'h', role: 'assistant', isStreaming: false, content: 'All of this is already here.', blocks: [] };
    let t;
    await TestRenderer.act(async () => { t = TestRenderer.create(React.createElement(MyaMessageRow, { message: msg, showLabel: false })); });
    expect(json(t)).toContain('All of this is already here.');
  });
});

describe('sheets and keyboard on Reanimated', () => {
  test('MyaSheet opens, and closing calls onClose once the close animation finishes', async () => {
    const MyaSheet = require('../../src/ui/MyaSheet').default;
    const onClose = jest.fn(); let t;
    await TestRenderer.act(async () => { t = TestRenderer.create(React.createElement(MyaSheet, { visible: true, onClose, title: 'Add a photo' })); await flush(); });
    expect(json(t)).toContain('Add a photo');
    const close = t.root.findAll((n) => n.props && n.props.accessibilityLabel === 'Close sheet' && typeof n.props.onPress === 'function')[0];
    await TestRenderer.act(async () => { close.props.onPress(); await flush(); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  test('a hidden sheet renders nothing', async () => {
    const MyaSheet = require('../../src/ui/MyaSheet').default;
    let t;
    await TestRenderer.act(async () => { t = TestRenderer.create(React.createElement(MyaSheet, { visible: false, title: 'x' })); });
    expect(t.toJSON()).toBeNull();
  });
  test('the keyboard margin style accepts a shared value or a plain number', () => {
    const { useKeyboardMarginStyle } = require('../../src/ui/useMyaKeyboard');
    let a; let b;
    function P() { a = useKeyboardMarginStyle({ value: 216 }); b = useKeyboardMarginStyle(0); return null; }
    TestRenderer.act(() => { TestRenderer.create(React.createElement(P)); });
    expect(a).toEqual({ marginBottom: 216 });
    expect(b).toEqual({ marginBottom: 0 });
  });
  test('no Mya component still uses the JS-thread Animated API', () => {
    const SRC = path.join(__dirname, '../../src/ui');
    const all = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? all(p) : /\.js$/.test(p) ? [p] : []; });
    all(SRC).forEach((f) => expect(fs.readFileSync(f, 'utf8')).not.toMatch(/Animated\.(timing|spring|loop|sequence|parallel|Value)\b/));
  });
});
