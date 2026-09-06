/**
 * Unit Tests: useMyaChat Headless Hook
 *
 * Verifies mobile hook state machine transitions, streaming updates,
 * optimistic updates, and conversation reset with zero DOM assumptions.
 */

const mockReact = {
  useRef: jest.fn(),
  useState: jest.fn(),
  useEffect: jest.fn(),
  useCallback: jest.fn((fn) => fn)
};

jest.mock('react', () => mockReact);

const { useMyaChat } = require('../src/hooks/useMyaChat');
const { MyaMobileClient } = require('../src/client/MyaMobileClient');
const { MemoryStorageAdapter } = require('../src/storage/StorageAdapter');

describe('useMyaChat Headless Hook State Machine', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReact.useCallback.mockImplementation((fn) => fn);
    mockReact.useEffect.mockImplementation(() => {});

    mockClient = new MyaMobileClient({
      apiBase: 'https://myavana-staging.example.com',
      userId: 'usr_hook_test',
      conversationId: 'conv_hook_test',
      storage: new MemoryStorageAdapter()
    });

    mockReact.useRef.mockReturnValue({ current: mockClient });
  });

  test('initializes with default state values', () => {
    mockReact.useState.mockImplementation((initial) => [initial, jest.fn()]);

    const hookResult = useMyaChat({ client: mockClient });

    expect(hookResult.messages).toEqual([]);
    expect(hookResult.isStreaming).toBe(false);
    expect(hookResult.isThinking).toBe(false);
    expect(hookResult.error).toBeNull();
    expect(hookResult.activeBlocks).toEqual([]);
    expect(hookResult.activeActions).toEqual([]);
    expect(hookResult.conversationId).toBe('conv_hook_test');
    expect(hookResult.userId).toBe('usr_hook_test');
  });

  test('sendMessage triggers streaming flow and dispatches state updates', async () => {
    let currentMessages = [];
    const setMessages = jest.fn((updater) => {
      currentMessages = typeof updater === 'function' ? updater(currentMessages) : updater;
    });

    let streaming = false;
    const setIsStreaming = jest.fn((val) => (streaming = val));

    let thinking = false;
    const setIsThinking = jest.fn((val) => (thinking = val));

    let activeBlocks = [];
    const setActiveBlocks = jest.fn((updater) => {
      activeBlocks = typeof updater === 'function' ? updater(activeBlocks) : updater;
    });

    let activeActions = [];
    const setActiveActions = jest.fn((updater) => {
      activeActions = typeof updater === 'function' ? updater(activeActions) : updater;
    });

    let hookError = null;
    const setError = jest.fn((val) => (hookError = val));

    let stateCallIdx = 0;
    mockReact.useState.mockImplementation((initial) => {
      stateCallIdx++;
      switch (stateCallIdx) {
        case 1:
          return [currentMessages, setMessages];
        case 2:
          return [streaming, setIsStreaming];
        case 3:
          return [thinking, setIsThinking];
        case 4:
          return [hookError, setError];
        case 5:
          return [activeBlocks, setActiveBlocks];
        case 6:
          return [activeActions, setActiveActions];
        case 7:
          return ['conv_hook_test', jest.fn()];
        case 8:
          return ['usr_hook_test', jest.fn()];
        default:
          return [initial, jest.fn()];
      }
    });

    jest.spyOn(mockClient, 'sendMessage').mockImplementation(async (opts) => {
      opts.onDelta && opts.onDelta('Hello! ', 'Hello! ');
      opts.onDelta && opts.onDelta('I am Mya.', 'Hello! I am Mya.');
      opts.onBlock && opts.onBlock({ id: 'b1', type: 'routine_card', title: 'Hydration Routine' });
      opts.onAction && opts.onAction({ type: 'quick_reply', label: 'View Products' });
      opts.onDone && opts.onDone({ modelUsed: 'gemini37Flash-stream' });
      return {
        content: 'Hello! I am Mya.',
        blocks: [{ id: 'b1', type: 'routine_card', title: 'Hydration Routine' }],
        actions: [{ type: 'quick_reply', label: 'View Products' }]
      };
    });

    const onStreamComplete = jest.fn();
    const hookResult = useMyaChat({ client: mockClient, onStreamComplete });

    await hookResult.sendMessage('Hi Mya!');

    expect(setMessages).toHaveBeenCalled();
    expect(currentMessages.length).toBeGreaterThanOrEqual(2);
    expect(currentMessages[0].role).toBe('user');
    expect(currentMessages[0].content).toBe('Hi Mya!');

    const finalAssistant = currentMessages[1];
    expect(finalAssistant.role).toBe('assistant');
    expect(finalAssistant.content).toBe('Hello! I am Mya.');
    expect(finalAssistant.isStreaming).toBe(false);
    expect(finalAssistant.blocks).toHaveLength(1);
    expect(finalAssistant.actions).toHaveLength(1);

    expect(onStreamComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Hello! I am Mya.',
        isStreaming: false
      })
    );
  });

  test('restartConversation clears conversation state and provisions new ID', async () => {
    let currentMessages = [{ id: 'm1', content: 'test' }];
    const setMessages = jest.fn((val) => (currentMessages = val));

    let activeBlocks = [{ id: 'b1' }];
    const setActiveBlocks = jest.fn((val) => (activeBlocks = val));

    let conversationId = 'old_conv';
    const setConversationId = jest.fn((val) => (conversationId = val));

    let stateCallIdx = 0;
    mockReact.useState.mockImplementation((initial) => {
      stateCallIdx++;
      switch (stateCallIdx) {
        case 1:
          return [currentMessages, setMessages];
        case 2:
          return [false, jest.fn()];
        case 3:
          return [false, jest.fn()];
        case 4:
          return [null, jest.fn()];
        case 5:
          return [activeBlocks, setActiveBlocks];
        case 6:
          return [[], jest.fn()];
        case 7:
          return [conversationId, setConversationId];
        case 8:
          return ['usr_1', jest.fn()];
        default:
          return [initial, jest.fn()];
      }
    });

    const hookResult = useMyaChat({ client: mockClient });
    const newId = await hookResult.restartConversation();

    expect(setMessages).toHaveBeenCalledWith([]);
    expect(setActiveBlocks).toHaveBeenCalledWith([]);
    expect(setConversationId).toHaveBeenCalledWith(newId);
    expect(newId).toMatch(/^conv_/);
  });
});
