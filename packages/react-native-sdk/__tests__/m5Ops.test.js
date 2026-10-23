/**
 * TASK-008 M5 (headless): error reporting, remote kill switch, performance marks.
 */
const mockReact = { useRef: jest.fn(), useState: jest.fn(), useEffect: jest.fn(), useCallback: jest.fn((fn) => fn) };
jest.mock('react', () => mockReact);

const { createReporter } = require('../src/ops/reporter');
const flagsMod = require('../src/ops/remoteFlags');
const perf = require('../src/ops/perf');
const { MyaMobileClient } = require('../src/client/MyaMobileClient');
const { MemoryStorageAdapter } = require('../src/storage/StorageAdapter');
const { useMyaChat } = require('../src/hooks/useMyaChat');

describe('reporter', () => {
  test('adds the conversation to the error and hands it to the host', () => {
    const onReport = jest.fn();
    const { report } = createReporter({ onReport, getContext: () => ({ conversationId: 'conv_1', userId: 'u1' }) });
    const err = new Error('boom');
    report(err, 'send');
    expect(err.conversationId).toBe('conv_1');
    expect(onReport).toHaveBeenCalledWith(err, expect.objectContaining({ where: 'send', conversationId: 'conv_1', userId: 'u1' }));
  });
  test('wraps non-errors', () => {
    const onReport = jest.fn();
    createReporter({ onReport }).report('plain string', 'x');
    expect(onReport.mock.calls[0][0]).toBeInstanceOf(Error);
  });
  test('a failing host reporter never throws into the app', () => {
    const { report } = createReporter({ onReport: () => { throw new Error('reporter down'); } });
    expect(() => report(new Error('x'), 'w')).not.toThrow();
  });
});

describe('remote flags (kill switch)', () => {
  const ok = (body) => jest.fn(async () => ({ ok: true, status: 200, json: async () => body }));
  const base = { apiBase: 'https://x.test', platform: 'react-native-ios', appVersion: '10.10', sdkVersion: '1.3.0' };

  test('defaults are everything on', () => {
    expect(flagsMod.DEFAULT_FLAGS).toEqual({ serviceOffers: true, motion: true });
  });
  test('the server can turn offers and motion off', async () => {
    const r = await flagsMod.loadFlags({ ...base, storage: new MemoryStorageAdapter(), fetchFn: ok({ flags: { serviceOffers: false, motion: false } }) });
    expect(r).toEqual({ flags: { serviceOffers: false, motion: false }, source: 'network' });
  });
  test('the request names the platform, app version and SDK version', async () => {
    const f = ok({ flags: {} });
    await flagsMod.loadFlags({ ...base, storage: new MemoryStorageAdapter(), fetchFn: f });
    const url = new URL(f.mock.calls[0][0]);
    expect(url.pathname).toBe('/mobile/config');
    expect(url.searchParams.get('platform')).toBe('react-native-ios');
    expect(url.searchParams.get('appVersion')).toBe('10.10');
    expect(url.searchParams.get('sdkVersion')).toBe('1.3.0');
  });
  test('malformed answers are ignored field by field', async () => {
    const r = await flagsMod.loadFlags({ ...base, storage: new MemoryStorageAdapter(), fetchFn: ok({ flags: { serviceOffers: 'no', motion: false, extra: true } }) });
    expect(r.flags).toEqual({ serviceOffers: true, motion: false });
  });
  test('a fresh cache is used without a request', async () => {
    const storage = new MemoryStorageAdapter();
    await flagsMod.loadFlags({ ...base, storage, fetchFn: ok({ flags: { serviceOffers: false } }) });
    const f = ok({ flags: { serviceOffers: true } });
    const r = await flagsMod.loadFlags({ ...base, storage, fetchFn: f });
    expect(f).not.toHaveBeenCalled();
    expect(r).toMatchObject({ source: 'cache', flags: { serviceOffers: false } });
  });
  test('a failed request keeps the last cached answer when it has gone stale', async () => {
    const storage = new MemoryStorageAdapter();
    await flagsMod.loadFlags({ ...base, storage, now: 0, fetchFn: ok({ flags: { serviceOffers: false } }) });
    const onError = jest.fn();
    const r = await flagsMod.loadFlags({ ...base, storage, now: flagsMod.CACHE_TTL_MS + 5, fetchFn: jest.fn(async () => { throw new Error('offline'); }), onError });
    expect(r).toMatchObject({ source: 'cache', flags: { serviceOffers: false } });
    expect(onError).toHaveBeenCalled();
  });
  test('with no cache and no network the chat still gets the defaults', async () => {
    const r = await flagsMod.loadFlags({ ...base, storage: new MemoryStorageAdapter(), fetchFn: jest.fn(async () => { throw new Error('offline'); }) });
    expect(r).toEqual({ flags: { serviceOffers: true, motion: true }, source: 'default' });
  });
  test('an HTTP error falls back rather than throwing', async () => {
    const r = await flagsMod.loadFlags({ ...base, storage: new MemoryStorageAdapter(), fetchFn: jest.fn(async () => ({ ok: false, status: 500 })) });
    expect(r.source).toBe('default');
  });
});

describe('perf', () => {
  test('percentile uses nearest rank', () => {
    expect(perf.percentile([100, 200, 300, 400], 75)).toBe(300);
    expect(perf.percentile([], 75)).toBeNull();
  });
  test('budgets: chat interactive under 1 s; first token p75 under 2.5 s', () => {
    expect(perf.BUDGETS).toEqual({ chatInteractiveMs: 1000, firstTokenP75Ms: 2500 });
    expect(perf.withinBudget('chat_interactive', [400, 900]).ok).toBe(true);
    expect(perf.withinBudget('chat_interactive', [400, 1200]).ok).toBe(false);
    expect(perf.withinBudget('first_token', [1000, 1200, 1400, 2400]).ok).toBe(true);
    expect(perf.withinBudget('first_token', [1000, 3000, 3200, 3400]).ok).toBe(false);
    expect(perf.withinBudget('first_token', []).ok).toBe(false); // no data is not a pass
  });
  test('a span reports its duration once and a failing sink is harmless', () => {
    let t = 1000; const onMark = jest.fn(() => { throw new Error('sink'); });
    const p = perf.createPerf({ now: () => t, onMark });
    p.start('x'); t = 1450;
    expect(p.end('x')).toBe(450);
    expect(p.end('x')).toBeNull();
  });
});

describe('hook: errors carry the conversation and nothing is swallowed', () => {
  let client; let messages;
  function setup(sendImpl, opts = {}, storage = new MemoryStorageAdapter()) {
    messages = [];
    client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'u', conversationId: 'conv_77', storage });
    jest.spyOn(client, 'sendMessage').mockImplementation(sendImpl);
    mockReact.useCallback.mockImplementation((fn) => fn);
    mockReact.useEffect.mockImplementation(() => {});
    mockReact.useRef.mockReturnValue({ current: client });
    let i = 0;
    mockReact.useState.mockImplementation((initial) => {
      i += 1;
      if (i === 1) return [messages, (u) => { messages = typeof u === 'function' ? u(messages) : u; }];
      return [initial, jest.fn()];
    });
    return useMyaChat({ client, ...opts });
  }

  test('a failed send is reported with its conversation id', async () => {
    const onReportError = jest.fn(); const onError = jest.fn();
    const hook = setup(async () => { throw new Error('HTTP 503: down'); }, { onReportError, onError });
    await hook.sendMessage('hello');
    const [err, ctx] = onReportError.mock.calls[0];
    expect(err.conversationId).toBe('conv_77');
    expect(ctx).toMatchObject({ where: 'send', conversationId: 'conv_77' });
    expect(onError.mock.calls[0][0].conversationId).toBe('conv_77');
  });
  test('a storage failure while saving the thread is reported, not swallowed', async () => {
    const storage = new MemoryStorageAdapter();
    storage.setItem = () => { throw new Error('disk full'); };
    const onReportError = jest.fn();
    const hook = setup(async (o) => { o.onDelta && o.onDelta('hi', 'hi'); o.onDone && o.onDone({}); return { content: 'hi', blocks: [], actions: [] }; }, { onReportError, persistMessages: true }, storage);
    await hook.sendMessage('hello');
    await new Promise((r) => setTimeout(r, 0));
    expect(onReportError.mock.calls.map((c) => c[1].where)).toContain('persist_messages');
  });
  test('first-token latency is reported once per reply', async () => {
    const onPerf = jest.fn();
    const hook = setup(async (o) => { o.onDelta('a', 'a'); o.onDelta('b', 'ab'); o.onDone({}); return { content: 'ab', blocks: [], actions: [] }; }, { onPerf });
    await hook.sendMessage('hello');
    expect(onPerf).toHaveBeenCalledTimes(1);
    expect(onPerf).toHaveBeenCalledWith('first_token', expect.any(Number), { conversationId: 'conv_77' });
  });
  test('a throwing host reporter does not break the failure path', async () => {
    const hook = setup(async () => { throw new Error('Network request failed'); }, { onReportError: () => { throw new Error('sentry down'); } });
    await expect(hook.sendMessage('hello')).resolves.toBeUndefined();
  });
});
