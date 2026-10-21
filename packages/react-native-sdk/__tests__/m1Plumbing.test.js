/**
 * TASK-008 M1: plumbing that can't lie.
 * Each block pins a P0/P1 behaviour. They were written to fail against the
 * pre-M1 code and pass after the fix.
 */

const mockReact = {
  useRef: jest.fn(),
  useState: jest.fn(),
  useEffect: jest.fn(),
  useCallback: jest.fn((fn) => fn)
};
jest.mock('react', () => mockReact);

const { MyaMobileClient, STORAGE_KEYS } = require('../src/client/MyaMobileClient');
const { MemoryStorageAdapter } = require('../src/storage/StorageAdapter');
const { useMyaChat } = require('../src/hooks/useMyaChat');
const { classifyError, errorCopy } = require('../src/client/errors');
const { normalizeAttachments, MAX_ATTACHMENTS } = require('../src/client/attachments');

function ndjsonResponse(frames) {
  const text = frames.map((f) => JSON.stringify(f)).join('\n') + '\n';
  return { ok: true, status: 200, body: null, text: async () => text };
}

function captureFetch() {
  const calls = [];
  const fetchFn = jest.fn(async (url, init) => {
    calls.push({ url, body: init.body ? JSON.parse(init.body) : null, headers: init.headers });
    return ndjsonResponse([{ t: 'delta', text: 'hi' }, { t: 'done' }]);
  });
  return { calls, fetchFn };
}

describe('P0-2 host userId always wins; logout clears the session', () => {
  let origFetch;
  beforeEach(() => { origFetch = global.fetch; });
  afterEach(() => { global.fetch = origFetch; });

  test('login A, logout, login B: B is on the wire and A is gone', async () => {
    const storage = new MemoryStorageAdapter();
    const { calls, fetchFn } = captureFetch();
    global.fetch = fetchFn;

    const a = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'user_A', storage });
    await a.init();
    await a.sendMessage({ message: 'hello' });
    expect(calls[0].body.userId).toBe('user_A');
    const convA = a.getConversationId();

    await a.clearSession();
    expect(storage.getItem(STORAGE_KEYS.USER_ID)).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.CONVERSATION_ID)).toBeNull();

    const b = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'user_B', storage });
    await b.init();
    await b.sendMessage({ message: 'hello' });
    expect(calls[1].body.userId).toBe('user_B');
    expect(calls[1].body.from).toBe('user_B');
    expect(calls[1].body.conversationId).not.toBe(convA);
  });

  test('without logout, a stale stored user never overrides the host userId', async () => {
    const storage = new MemoryStorageAdapter();
    storage.setItem(STORAGE_KEYS.USER_ID, 'user_A');
    storage.setItem(STORAGE_KEYS.CONVERSATION_ID, 'conv_of_A');

    const client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'user_B', storage });
    await client.init();

    expect(client.getUserId()).toBe('user_B');
    expect(client.getConversationId()).not.toBe('conv_of_A');
    expect(storage.getItem(STORAGE_KEYS.USER_ID)).toBe('user_B');
  });

  test('same host userId keeps the stored conversation (resume still works)', async () => {
    const storage = new MemoryStorageAdapter();
    storage.setItem(STORAGE_KEYS.USER_ID, 'user_A');
    storage.setItem(STORAGE_KEYS.CONVERSATION_ID, 'conv_of_A');
    const client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'user_A', storage });
    await client.init();
    expect(client.getConversationId()).toBe('conv_of_A');
  });

  test('guest (no host userId) still reuses the stored guest id', async () => {
    const storage = new MemoryStorageAdapter();
    storage.setItem(STORAGE_KEYS.USER_ID, 'usr_guest_1');
    const client = new MyaMobileClient({ apiBase: 'https://x.test', storage });
    await client.init();
    expect(client.getUserId()).toBe('usr_guest_1');
  });
});

describe('P0-3 no staging fallback', () => {
  const origEnv = process.env.NODE_ENV;
  const origBase = process.env.MYA_API_BASE;
  beforeEach(() => {
    delete process.env.MYA_API_BASE;
    mockReact.useRef.mockImplementation((v) => ({ current: v === undefined ? null : v }));
    mockReact.useState.mockImplementation((v) => [v, jest.fn()]);
    mockReact.useEffect.mockImplementation(() => {});
  });
  afterEach(() => {
    process.env.NODE_ENV = origEnv;
    if (origBase !== undefined) process.env.MYA_API_BASE = origBase;
  });

  test('missing apiBase throws in dev', () => {
    process.env.NODE_ENV = 'development';
    expect(() => useMyaChat({})).toThrow(/apiBase/);
  });

  test('missing apiBase in production reports and never contacts staging', async () => {
    process.env.NODE_ENV = 'production';
    const onError = jest.fn();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const hook = useMyaChat({ onError });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'config' }));
    await hook.sendMessage('hello');
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/run\.app/);
    spy.mockRestore();
  });
});

describe('P1 error taxonomy', () => {
  test.each([
    [Object.assign(new Error('x'), { name: 'AbortError' }), 'aborted'],
    [Object.assign(new Error('timed out'), { code: 'timeout' }), 'timeout'],
    [new Error('Network request failed'), 'offline'],
    [new Error('Network error during streaming request'), 'offline'],
    [new TypeError('Failed to fetch'), 'offline'],
    [new Error('HTTP 503: unavailable'), 'server'],
    [new Error('XHR HTTP 500: Stream failed'), 'server'],
    [new Error('HTTP 401: nope'), 'auth'],
    [new Error('something odd'), 'unknown']
  ])('classifies %p as %s', (err, kind) => {
    expect(classifyError(err).kind).toBe(kind);
  });

  test('every kind has its own distinct copy', () => {
    const kinds = ['offline', 'timeout', 'server', 'auth', 'aborted', 'attachment', 'config', 'unknown'];
    const copies = kinds.map((k) => errorCopy(k));
    expect(new Set(copies).size).toBe(kinds.length);
    copies.forEach((c) => expect(c.length).toBeGreaterThan(10));
  });
});

describe('P1 timeouts', () => {
  const hang = () => jest.fn((url, init) => new Promise((resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }));

  test('a stream that goes silent rejects with a timeout error', async () => {
    const client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'u', storage: new MemoryStorageAdapter(), timeoutMs: 60 });
    global.fetch = hang();
    await expect(client.sendMessage({ message: 'hi' })).rejects.toMatchObject({ code: 'timeout' });
  });

  test('history fetch times out instead of hanging', async () => {
    const client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'u', storage: new MemoryStorageAdapter(), fetchTimeoutMs: 50 });
    global.fetch = hang();
    await expect(client.fetchConversationHistory('c1')).rejects.toMatchObject({ code: 'timeout' });
  });

  test('journal fetch times out instead of hanging', async () => {
    const client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'u', storage: new MemoryStorageAdapter(), fetchTimeoutMs: 50 });
    global.fetch = hang();
    await expect(client.fetchJournalEntries()).rejects.toMatchObject({ code: 'timeout' });
  });
});

describe('P0-1 photos reach the model (attachment contract)', () => {
  const B64 = 'AAAA';

  test('picker asset with base64 becomes an inline data URL', () => {
    const r = normalizeAttachments([{ uri: 'file:///tmp/a.jpg', base64: B64, type: 'image/jpeg', fileName: 'a.jpg' }]);
    expect(r.ready).toEqual([{ url: `data:image/jpeg;base64,${B64}`, mimeType: 'image/jpeg', name: 'a.jpg' }]);
    expect(r.rejected).toHaveLength(0);
  });

  test('a bare file:// uri is rejected, never forwarded', () => {
    const r = normalizeAttachments([{ uri: 'file:///var/mobile/a.jpg', type: 'image/jpeg', fileName: 'a.jpg' }]);
    expect(r.ready).toHaveLength(0);
    expect(r.rejected[0]).toMatchObject({ name: 'a.jpg', reason: 'not_readable' });
  });

  test('https images and ready data URLs pass through', () => {
    const r = normalizeAttachments([
      { url: 'https://cdn.example.com/x.jpg' },
      { dataUrl: 'data:image/png;base64,QUJD', mimeType: 'image/png' }
    ]);
    expect(r.ready.map((a) => a.url)).toEqual(['https://cdn.example.com/x.jpg', 'data:image/png;base64,QUJD']);
  });

  test('plain http, javascript: and non-image data URLs are rejected', () => {
    const r = normalizeAttachments([
      { url: 'http://insecure.example.com/x.jpg' },
      { url: 'javascript:alert(1)' },
      { url: 'data:text/html;base64,PGI+' }
    ]);
    expect(r.ready).toHaveLength(0);
    expect(r.rejected).toHaveLength(3);
  });

  test('caps at four and reports the overflow', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ base64: B64, type: 'image/jpeg', fileName: `p${i}.jpg` }));
    const r = normalizeAttachments(many);
    expect(MAX_ATTACHMENTS).toBe(4);
    expect(r.ready).toHaveLength(4);
    expect(r.rejected.map((x) => x.reason)).toEqual(['too_many', 'too_many']);
  });

  test('client forwards only normalised attachments on the wire', async () => {
    const { calls, fetchFn } = captureFetch();
    global.fetch = fetchFn;
    const client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'u', storage: new MemoryStorageAdapter() });
    await client.sendMessage({ message: 'look', attachments: [{ uri: 'file:///a.jpg', base64: B64, type: 'image/jpeg' }] });
    expect(calls[0].body.attachments).toEqual([expect.objectContaining({ url: `data:image/jpeg;base64,${B64}`, mimeType: 'image/jpeg' })]);
  });

  test('client refuses to send when an attachment cannot be read', async () => {
    const { calls, fetchFn } = captureFetch();
    global.fetch = fetchFn;
    const client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'u', storage: new MemoryStorageAdapter() });
    await expect(client.sendMessage({ message: 'look', attachments: [{ uri: 'file:///a.jpg' }] })).rejects.toMatchObject({ kind: 'attachment' });
    expect(calls).toHaveLength(0);
  });
});

describe('hook behaviour: in-flight guard, restore draft, partial replies, stop marker', () => {
  let client; let messages; let unsent; let error;

  function setupHook(sendImpl, opts = {}) {
    messages = [];
    unsent = null;
    error = null;
    client = new MyaMobileClient({ apiBase: 'https://x.test', userId: 'u', conversationId: 'c', storage: new MemoryStorageAdapter() });
    jest.spyOn(client, 'sendMessage').mockImplementation(sendImpl);
    mockReact.useCallback.mockImplementation((fn) => fn);
    mockReact.useEffect.mockImplementation(() => {});
    mockReact.useRef.mockReturnValue({ current: client });
    const setMessages = (u) => { messages = typeof u === 'function' ? u(messages) : u; };
    let i = 0;
    mockReact.useState.mockImplementation((initial) => {
      i += 1;
      switch (i) {
        case 1: return [messages, setMessages];
        case 4: return [error, (e) => { error = e; }];
        case 9: return [unsent, (d) => { unsent = typeof d === 'function' ? d(unsent) : d; }];
        default: return [initial, jest.fn()];
      }
    });
    return useMyaChat({ client, ...opts });
  }

  test('two sends in the same tick make exactly one request', async () => {
    let release;
    const gate = new Promise((r) => { release = r; });
    const hook = setupHook(async (o) => { await gate; o.onDone && o.onDone({}); return { content: '', blocks: [], actions: [] }; });
    const first = hook.sendMessage('one');
    const second = hook.sendMessage('two');
    release();
    await Promise.all([first, second]);
    expect(client.sendMessage).toHaveBeenCalledTimes(1);
    expect(messages.filter((m) => m.role === 'user')).toHaveLength(1);
  });

  test('guard releases after a turn so the next send works', async () => {
    const hook = setupHook(async (o) => { o.onDone && o.onDone({}); return { content: 'x', blocks: [], actions: [] }; });
    await hook.sendMessage('one');
    await hook.sendMessage('two');
    expect(client.sendMessage).toHaveBeenCalledTimes(2);
  });

  test('failure before any text removes the turn and hands the draft back', async () => {
    const hook = setupHook(async () => { throw new Error('Network request failed'); });
    await hook.sendMessage('my unsent message');
    expect(messages).toHaveLength(0);
    expect(unsent).toMatchObject({ text: 'my unsent message' });
    expect(error.kind).toBe('offline');
  });

  test('failure handled once even when both onError and a throw fire', async () => {
    const onError = jest.fn();
    const hook = setupHook(async (o) => { const e = new Error('HTTP 503: down'); o.onError && o.onError(e); throw e; }, { onError });
    await hook.sendMessage('hello');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(error.kind).toBe('server');
  });

  test('partial reply is kept and flagged, not replaced', async () => {
    const hook = setupHook(async (o) => {
      o.onDelta && o.onDelta('Here is part of ', 'Here is part of ');
      throw new Error('Network error during streaming request');
    });
    await hook.sendMessage('hello');
    const a = messages.find((m) => m.role === 'assistant');
    expect(a.content).toBe('Here is part of ');
    expect(a.interrupted).toBe(true);
    expect(a.errorKind).toBe('offline');
    expect(a.isStreaming).toBe(false);
    expect(messages.some((m) => m.role === 'user')).toBe(true);
    expect(unsent).toBeNull();
  });

  test('attachment that cannot be read never sends and restores the draft', async () => {
    const hook = setupHook(async () => ({ content: '', blocks: [], actions: [] }));
    await hook.sendMessage('look at this', undefined, { attachments: [{ uri: 'file:///a.jpg' }] });
    expect(client.sendMessage).not.toHaveBeenCalled();
    expect(error.kind).toBe('attachment');
    expect(unsent.text).toBe('look at this');
    expect(messages).toHaveLength(0);
  });

  test('stopping mid-reply keeps the partial text and marks it stopped', async () => {
    const hook = setupHook(async (o) => { o.onDelta && o.onDelta('partial', 'partial'); return { content: 'partial', blocks: [], actions: [] }; });
    await hook.sendMessage('hi');
    hook.abortStream();
    const a = messages.find((m) => m.role === 'assistant');
    expect(a.stopped).toBe(true);
    expect(a.content).toBe('partial');
  });
});
