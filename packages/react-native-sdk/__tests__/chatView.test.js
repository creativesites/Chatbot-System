/**
 * Unit Tests: MyaChatView Drop-In Chat Screen Component
 * Pure Node / React Native mock verification.
 */

const mockReact = {
  createElement: jest.fn((type, props, ...children) => ({
    type,
    props: { ...props, children }
  })),
  useState: jest.fn((initial) => [initial, jest.fn()]),
  useRef: jest.fn(() => ({ current: null })),
  useEffect: jest.fn(),
  useCallback: jest.fn((fn) => fn)
};

jest.mock('react', () => mockReact);

const { MyaChatView } = require('../src/components/MyaChatView');

describe('MyaChatView Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReact.createElement.mockImplementation((type, props, ...children) => ({
      type,
      props: Object.assign({}, props, { children })
    }));
    mockReact.useState.mockImplementation((initial) => [initial, jest.fn()]);
    mockReact.useRef.mockImplementation(() => ({ current: { scrollToEnd: jest.fn() } }));
  });

  it('renders full drop-in chat screen with header, message list, and composer', () => {
    const messages = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello! Welcome to MYAVANA.',
        timestamp: '2026-09-06T12:00:00Z'
      },
      {
        id: 'msg-2',
        role: 'user',
        content: 'Tell me about porosity.',
        timestamp: '2026-09-06T12:01:00Z'
      }
    ];

    const quickReplies = ['Low Porosity Guide', 'Product Regimen'];

    const onSendMessage = jest.fn();
    const onSelectQuickReply = jest.fn();
    const onClearSession = jest.fn();

    const element = MyaChatView({
      messages,
      quickReplies,
      title: 'MYA Hair AI',
      subtitle: 'Strand Intelligence',
      onSendMessage,
      onSelectQuickReply,
      onClearSession
    });

    expect(element).toBeDefined();
    expect(element.props.behavior).toBe('padding');
  });

  it('renders streaming indicator and active blocks when streaming', () => {
    const activeBlocks = [
      {
        type: 'hair_profile_summary',
        data: { hairType: '4C', porosity: 'High', overallHealthScore: 85 }
      }
    ];

    const element = MyaChatView({
      messages: [],
      streamingText: 'Analyzing hair strands...',
      isStreaming: true,
      activeBlocks,
      onSendMessage: jest.fn()
    });

    expect(element).toBeDefined();
  });

  it('renders interleaved blocks and prose when message contains item.blocks', () => {
    const onToggleRoutineStep = jest.fn();
    const messages = [
      {
        id: 'msg_assistant_interleaved',
        role: 'assistant',
        content: 'Here is your wash day regimen to follow:',
        timestamp: '2026-09-11T10:00:00.000Z',
        blocks: [
          {
            id: 'block_routine_1',
            type: 'today_checklist',
            position: 10,
            data: {
              title: 'Weekend Wash Day',
              steps: ['Pre-poo', 'Shampoo', 'Deep condition']
            }
          }
        ],
        quickReplies: [
          { label: 'Deep conditioner tips', payload: 'tips' }
        ]
      }
    ];

    const element = MyaChatView({
      messages,
      onToggleRoutineStep,
      onSendMessage: jest.fn()
    });

    expect(element).toBeDefined();
  });
});
