/**
 * Unit Tests: StreamAdapter & NDJSON Parsing
 *
 * Verifies chunked NDJSON streaming frames without browser APIs.
 */

const {
  NDJSONStreamParser,
  dispatchFrame,
  parseNDJSON,
  streamFetch
} = require('../src/client/StreamAdapter');
const { FrameType, BlockType } = require('../src/types');

describe('StreamAdapter & NDJSON Parser', () => {
  test('Zero DOM verification: runs without window or document globals', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
    expect(typeof HTMLElement).toBe('undefined');
    // Note: Node 22 introduces experimental globalThis.localStorage, but window/document DOM globals must remain undefined
    expect(typeof globalThis.window).toBe('undefined');
  });

  describe('NDJSONStreamParser', () => {
    test('parses single-line frames correctly', () => {
      const frames = [];
      const parser = new NDJSONStreamParser((frame) => frames.push(frame));

      parser.feed('{"t":"delta","text":"Hello "}\n');
      parser.feed('{"t":"delta","text":"world!"}\n');

      expect(frames).toHaveLength(2);
      expect(frames[0]).toEqual({ t: 'delta', text: 'Hello ' });
      expect(frames[1]).toEqual({ t: 'delta', text: 'world!' });
    });

    test('handles chunks split across arbitrary byte/character boundaries', () => {
      const frames = [];
      const parser = new NDJSONStreamParser((frame) => frames.push(frame));

      // Feeding partial chunks
      parser.feed('{"t":"delta","te');
      expect(frames).toHaveLength(0);

      parser.feed('xt":"Welcome to MYAVANA"}\n{"t":"bl');
      expect(frames).toHaveLength(1);
      expect(frames[0]).toEqual({ t: 'delta', text: 'Welcome to MYAVANA' });

      parser.feed('ock","block":{"id":"blk_1","type":"routine_card"}}\n');
      expect(frames).toHaveLength(2);
      expect(frames[1].t).toBe('block');
      expect(frames[1].block.id).toBe('blk_1');
    });

    test('flushes trailing line buffer on stream end without newline', () => {
      const frames = [];
      const parser = new NDJSONStreamParser((frame) => frames.push(frame));

      parser.feed('{"t":"done","meta":{"finished":true}}');
      expect(frames).toHaveLength(0);

      parser.flush();
      expect(frames).toHaveLength(1);
      expect(frames[0]).toEqual({ t: 'done', meta: { finished: true } });
    });

    test('gracefully recovers from malformed lines without crashing parser', () => {
      const frames = [];
      const errors = [];
      const parser = new NDJSONStreamParser(
        (frame) => frames.push(frame),
        (err) => errors.push(err)
      );

      parser.feed('{"valid":"one"}\n');
      parser.feed('THIS IS NOT VALID JSON\n');
      parser.feed('{"valid":"two"}\n');

      expect(frames).toHaveLength(2);
      expect(frames[0]).toEqual({ valid: 'one' });
      expect(frames[1]).toEqual({ valid: 'two' });
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Failed to parse NDJSON frame');
    });
  });

  describe('dispatchFrame', () => {
    test('dispatches delta frames and accumulates text', () => {
      const state = { accumulatedText: '', blocks: [], actions: [] };
      const deltas = [];

      const callbacks = {
        onDelta: (delta, accumulated) => deltas.push({ delta, accumulated })
      };

      dispatchFrame({ t: 'delta', text: 'Hello' }, callbacks, state);
      dispatchFrame({ t: 'delta', text: ' Mya' }, callbacks, state);

      expect(state.accumulatedText).toBe('Hello Mya');
      expect(deltas).toEqual([
        { delta: 'Hello', accumulated: 'Hello' },
        { delta: ' Mya', accumulated: 'Hello Mya' }
      ]);
    });

    test('dispatches text_delta semantic frame alias', () => {
      const state = { accumulatedText: '', blocks: [], actions: [] };
      let receivedDelta = '';

      dispatchFrame(
        { t: 'text_delta', text: 'Hair Care' },
        { onDelta: (d) => (receivedDelta = d) },
        state
      );

      expect(receivedDelta).toBe('Hair Care');
      expect(state.accumulatedText).toBe('Hair Care');
    });

    test('dispatches block frames', () => {
      const state = { accumulatedText: '', blocks: [], actions: [] };
      let receivedBlock = null;

      const blockPayload = {
        id: 'blk_123',
        type: BlockType.HAIR_PROFILE_SUMMARY,
        title: 'Your Hair Profile'
      };

      dispatchFrame(
        { t: FrameType.BLOCK, block: blockPayload },
        { onBlock: (b) => (receivedBlock = b) },
        state
      );

      expect(receivedBlock).toEqual(blockPayload);
      expect(state.blocks).toContainEqual(blockPayload);
    });

    test('dispatches action frames', () => {
      const state = { accumulatedText: '', blocks: [], actions: [] };
      const receivedActions = [];

      dispatchFrame(
        {
          t: FrameType.ACTION,
          actions: [
            { type: 'quick_reply', label: 'Check porosity' },
            { type: 'quick_reply', label: 'View routine' }
          ]
        },
        { onAction: (a) => receivedActions.push(a) },
        state
      );

      expect(receivedActions).toHaveLength(2);
      expect(state.actions).toHaveLength(2);
      expect(receivedActions[0].label).toBe('Check porosity');
    });

    test('dispatches metadata and tool_call frames to onFrame', () => {
      const state = { accumulatedText: '', blocks: [], actions: [] };
      const frames = [];

      const callbacks = {
        onFrame: (f) => frames.push(f)
      };

      dispatchFrame({ t: 'metadata', model: 'gemini-3.7-flash' }, callbacks, state);
      dispatchFrame({ t: 'tool_call', tool: 'getHairProfile' }, callbacks, state);

      expect(frames).toHaveLength(2);
      expect(frames[0].t).toBe('metadata');
      expect(frames[1].t).toBe('tool_call');
    });

    test('dispatches done frame with metadata', () => {
      const state = { accumulatedText: '', blocks: [], actions: [] };
      let doneMeta = null;

      dispatchFrame(
        { t: FrameType.DONE, meta: { modelUsed: 'gemini37Flash-stream' } },
        { onDone: (m) => (doneMeta = m) },
        state
      );

      expect(doneMeta).toEqual({ modelUsed: 'gemini37Flash-stream' });
    });

    test('dispatches error frame', () => {
      const state = { accumulatedText: '', blocks: [], actions: [] };
      let errorReceived = null;

      dispatchFrame(
        { t: FrameType.ERROR, message: 'Upstream stream disconnected' },
        { onError: (err) => (errorReceived = err) },
        state
      );

      expect(errorReceived).toBeInstanceOf(Error);
      expect(errorReceived.message).toBe('Upstream stream disconnected');
    });
  });

  describe('parseNDJSON helper', () => {
    test('parses multiple lines of ndjson string into frame array', () => {
      const raw = '{"t":"delta","text":"A"}\n\n{"t":"delta","text":"B"}\n{"t":"done"}';
      const parsed = parseNDJSON(raw);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].text).toBe('A');
      expect(parsed[1].text).toBe('B');
      expect(parsed[2].t).toBe('done');
    });

    test('returns empty array for empty or non-string input', () => {
      expect(parseNDJSON('')).toEqual([]);
      expect(parseNDJSON(null)).toEqual([]);
    });
  });

  describe('streamFetch with mocked streaming reader', () => {
    test('correctly consumes chunked ReadableStream in mobile environment', async () => {
      const streamChunks = [
        '{"t":"delta","text":"Welcome to "}\n',
        '{"t":"delta","text":"MYAVANA Mobile!"}\n',
        '{"t":"block","block":{"id":"b1","type":"goal_card"}}\n',
        '{"t":"done"}\n'
      ];

      let chunkIdx = 0;
      const mockReader = {
        read: jest.fn().mockImplementation(async () => {
          if (chunkIdx < streamChunks.length) {
            const val = streamChunks[chunkIdx++];
            return { done: false, value: Buffer.from(val) };
          }
          return { done: true, value: undefined };
        }),
        cancel: jest.fn()
      };

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => mockReader
        }
      });

      const deltas = [];
      const blocks = [];
      let isDone = false;

      const result = await streamFetch(
        'https://myavana-staging.example.com/chat/stream',
        { fetchFn: mockFetch },
        {
          onDelta: (d) => deltas.push(d),
          onBlock: (b) => blocks.push(b),
          onDone: () => (isDone = true)
        }
      );

      expect(result.accumulatedText).toBe('Welcome to MYAVANA Mobile!');
      expect(deltas).toEqual(['Welcome to ', 'MYAVANA Mobile!']);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].id).toBe('b1');
      expect(isDone).toBe(true);
    });
  });
});
