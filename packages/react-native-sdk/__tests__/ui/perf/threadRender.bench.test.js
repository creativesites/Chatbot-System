/**
 * Thread render-cost benchmark (JS side only).
 *
 * Mounts the real MyaChat + useMyaChat + MyaMobileClient against stubbed
 * react-native, restores a realistic 40-message history with rich blocks, then
 * streams a reply through a mocked NDJSON body one frame at a time.
 *
 * It counts work, not frames: React commits, MyaMarkdown / MyaRichBlock renders
 * and JSON.stringify calls per streamed chunk, and what one composer keystroke
 * re-renders. Counts are deterministic, so they are the primary numbers; the
 * Profiler durations are Node timings and only indicative. This is NOT a device
 * measurement - layout, image decode and the UI thread are not exercised.
 *
 * It always runs as a regression guard; MYA_BENCH=1 prints the numbers.
 * MYA_SDK_ROOT points it at another checkout of this package (read-only), so the
 * same benchmark can be run against a different working tree (expect the guards
 * to fail on a tree without these optimisations).
 *   MYA_BENCH=1 npx jest --config jest.ui.config.js __tests__/ui/perf
 */
const path = require('path');
const React = require('react');
const TestRenderer = require('react-test-renderer');

const mockSdk = process.env.MYA_SDK_ROOT || path.resolve(__dirname, '../../..');
const mockCounts = { markdown: 0, rich: 0 };
// Count real renders of a component, whether or not it is wrapped in React.memo
// (a memo keeps its comparator, so skipped renders are not counted).
function mockCounted(Comp, name) {
  const R = require('react');
  const inner = Comp && Comp.type ? Comp.type : Comp;
  function Counted(props) { mockCounts[name] += 1; return inner(props); }
  return Comp && Comp.type ? R.memo(Counted, Comp.compare) : Counted;
}

jest.mock(require('path').join(process.env.MYA_SDK_ROOT || require('path').resolve(__dirname, '../../..'), 'src/ui/MyaMarkdown'), () => {
  const actual = jest.requireActual(require('path').join(process.env.MYA_SDK_ROOT || require('path').resolve(__dirname, '../../..'), 'src/ui/MyaMarkdown'));
  return { __esModule: true, ...actual, default: mockCounted(actual.default, 'markdown') };
});
jest.mock(require('path').join(process.env.MYA_SDK_ROOT || require('path').resolve(__dirname, '../../..'), 'src/ui/rich/MyaRichBlock'), () => {
  const actual = jest.requireActual(require('path').join(process.env.MYA_SDK_ROOT || require('path').resolve(__dirname, '../../..'), 'src/ui/rich/MyaRichBlock'));
  return { __esModule: true, ...actual, default: mockCounted(actual.default, 'rich') };
});

const { MemoryStorageAdapter } = require(path.join(mockSdk, 'src/storage/StorageAdapter'));
const MyaChat = require(path.join(mockSdk, 'src/ui/MyaChat')).default;

const HISTORY = 40;
const CHUNKS = 60;
const KEYSTROKES = 20;

function seedHistory() {
  const msgs = [];
  const t0 = Date.parse('2026-11-01T09:00:00Z');
  for (let i = 0; i < HISTORY; i++) {
    const ts = new Date(t0 + i * 60000).toISOString();
    if (i % 2 === 0) {
      msgs.push({ id: `u${i}`, role: 'user', content: `How should I handle my type 4C hair after wash day number ${i}?`, timestamp: ts });
    } else {
      msgs.push({
        id: `a${i}`,
        role: 'assistant',
        timestamp: ts,
        content:
          '**Wash day recap**\n\nYour last three logs show dryness at the ends. Try this:\n\n' +
          '- Pre-poo with a light oil for 20 minutes\n- Use the hydrating cleanser, then deep condition\n' +
          '- Seal with the curl cream while the hair is still damp\n\nTell me how it feels tomorrow.',
        blocks: [
          { id: `b${i}a`, type: 'routine_checklist', position: 60, data: { title: 'Wash day', items: [{ id: 1, label: 'Pre-poo' }, { id: 2, label: 'Cleanse' }, { id: 3, label: 'Deep condition' }, { id: 4, label: 'Seal' }] } },
          { id: `b${i}b`, type: 'goal_progress', data: { title: 'Length retention', progress: 0.4, notes: 'Ends are holding better than last month.' } },
        ],
        actions: [{ id: `q${i}`, label: 'Show my routine', payload: 'Show my routine' }],
      });
    }
  }
  return msgs;
}

function controllableStream() {
  const enc = new TextEncoder();
  let controller;
  const body = new ReadableStream({ start(c) { controller = c; } });
  return {
    response: { ok: true, status: 200, headers: { get: () => 'application/x-ndjson' }, body },
    push: (frame) => controller.enqueue(enc.encode(JSON.stringify(frame) + '\n')),
    close: () => controller.close(),
  };
}

const flush = async (n = 4) => {
  for (let i = 0; i < n; i++) {
    // eslint-disable-next-line no-await-in-loop
    await TestRenderer.act(async () => { await Promise.resolve(); });
  }
};

test('thread render cost: restore, stream and type', async () => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  const tick = async (ms) => { await TestRenderer.act(async () => { jest.advanceTimersByTime(ms); }); };
  const storage = new MemoryStorageAdapter();
  await storage.setItem('mya_chat_mobile_user_A', JSON.stringify(seedHistory()));

  const stream = controllableStream();
  global.fetch = jest.fn(async (url) => (String(url).includes('/chat/stream')
    ? stream.response
    : { ok: true, status: 200, json: async () => ({}), text: async () => '' }));

  const prof = { commits: 0, ms: 0 };
  const onRender = (_id, _phase, actual) => { prof.commits += 1; prof.ms += actual; };

  let tree;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      React.createElement(React.Profiler, { id: 'chat', onRender },
        React.createElement(MyaChat, {
          apiBase: 'https://x.test', storage, userId: 'user_A', userName: 'Candace Smith',
          screen: { name: 'Dashboard', title: 'Dashboard' }, starters: [],
        }))
    );
  });
  await flush(8);
  const restored = { ...mockCounts, commits: prof.commits, ms: prof.ms };

  // Send, then stream CHUNKS deltas with a block in the middle.
  const input = tree.root.findAll((n) => n.type === 'TextInput')[0];
  await TestRenderer.act(async () => { input.props.onChangeText('What should I do tonight?'); });
  const sendBtn = tree.root.findAll((n) => n.props && n.props.accessibilityLabel === 'Send message' && n.props.onPress)[0];
  await TestRenderer.act(async () => { sendBtn.props.onPress(); });
  await flush(4);

  const before = { ...mockCounts, commits: prof.commits, ms: prof.ms };
  const realStringify = JSON.stringify;
  let stringifyCalls = 0;
  JSON.stringify = function counted(...a) { stringifyCalls += 1; return realStringify.apply(this, a); };
  try {
    for (let i = 0; i < CHUNKS; i++) {
      if (i === CHUNKS / 2) {
        stream.push({ t: 'block', block: { id: 'live1', type: 'routine_checklist', data: { title: 'Tonight', items: [{ id: 1, label: 'Satin bonnet' }] } } });
        // eslint-disable-next-line no-await-in-loop
        await flush(2);
      }
      stream.push({ t: 'delta', text: `word${i} ` });
      // eslint-disable-next-line no-await-in-loop
      await flush(2);
      // One pacing tick per chunk, so the streaming row draws what arrived.
      // eslint-disable-next-line no-await-in-loop
      await tick(40);
    }
  } finally {
    JSON.stringify = realStringify;
  }
  const streamed = {
    commits: prof.commits - before.commits,
    ms: prof.ms - before.ms,
    markdown: mockCounts.markdown - before.markdown,
    rich: mockCounts.rich - before.rich,
    stringify: stringifyCalls,
  };

  stream.push({ t: 'done', meta: {} });
  stream.close();
  await flush(6);
  await tick(5000);
  await flush(2);

  // Typing into the composer with a full thread on screen.
  const k0 = { ...mockCounts, commits: prof.commits, ms: prof.ms };
  const input2 = tree.root.findAll((n) => n.type === 'TextInput')[0];
  for (let i = 0; i < KEYSTROKES; i++) {
    // eslint-disable-next-line no-await-in-loop
    await TestRenderer.act(async () => { input2.props.onChangeText('abcdefghijklmnopqrstuvwxyz'.slice(0, i + 1)); });
  }
  const typing = {
    commits: prof.commits - k0.commits,
    ms: prof.ms - k0.ms,
    markdown: mockCounts.markdown - k0.markdown,
    rich: mockCounts.rich - k0.rich,
  };

  const per = (v, n) => Math.round((v / n) * 100) / 100;
  const report = {
    sdk: mockSdk,
    restore: { markdownRenders: restored.markdown, richRenders: restored.rich, commits: restored.commits, ms: Math.round(restored.ms) },
    perStreamedChunk: {
      markdownRenders: per(streamed.markdown, CHUNKS),
      richRenders: per(streamed.rich, CHUNKS),
      jsonStringifyCalls: per(streamed.stringify, CHUNKS),
      commits: per(streamed.commits, CHUNKS),
      ms: per(streamed.ms, CHUNKS),
    },
    perKeystroke: {
      markdownRenders: per(typing.markdown, KEYSTROKES),
      richRenders: per(typing.rich, KEYSTROKES),
      commits: per(typing.commits, KEYSTROKES),
      ms: per(typing.ms, KEYSTROKES),
    },
  };
  if (process.env.MYA_BENCH) {
    // eslint-disable-next-line no-console
    console.log(`MYA_BENCH ${JSON.stringify(report, null, 2)}`);
  }
  expect(restored.markdown).toBeGreaterThan(0);
  // Regression guards. Before this work: 82.35 stringify calls and 1.02 rich-card
  // renders per chunk. One stringify per chunk is this test encoding the frame.
  expect(report.perStreamedChunk.jsonStringifyCalls).toBeLessThanOrEqual(1.1);
  expect(report.perStreamedChunk.richRenders).toBeLessThan(0.1);
  // Only the live text run re-renders: about two renders per chunk (delta + pacing tick).
  expect(report.perStreamedChunk.markdownRenders).toBeLessThanOrEqual(2.1);
  expect(report.perKeystroke.markdownRenders).toBe(0);
  TestRenderer.act(() => tree.unmount());
  jest.useRealTimers();
}, 60000);
