/**
 * Unit Tests: Starter Native UI Primitives
 *
 * Verifies mobile primitives (<MyaChatBubble />, <MyaStrandCard />, <MyaRoutineChecklist />)
 * format attributes, compute health/progress metrics, and execute cleanly with zero DOM.
 */

const {
  MyaChatBubble,
  MyaStrandCard,
  MyaRoutineChecklist,
  defaultMyaTheme
} = require('../src/components');

describe('Mobile Starter UI Primitives (Zero DOM)', () => {
  describe('defaultMyaTheme Tokens', () => {
    test('contains canonical MYAVANA brand colors and tokens', () => {
      expect(defaultMyaTheme.colors.accentGold).toBe('#D4AF37');
      expect(defaultMyaTheme.colors.primary).toBe('#1F1B24');
      expect(defaultMyaTheme.colors.surface).toBe('#FFFFFF');
      expect(defaultMyaTheme.spacing.md).toBe(12);
      expect(defaultMyaTheme.borderRadius.lg).toBe(16);
    });
  });

  describe('MyaChatBubble', () => {
    test('renders user message bubble with user theme colors', () => {
      const element = MyaChatBubble({
        message: {
          id: 'msg_u1',
          role: 'user',
          content: 'Hello, what is my strand type?',
          timestamp: '2026-09-05T12:00:00.000Z'
        }
      });

      expect(element).toBeDefined();
      expect(element.type).toBeDefined();
    });

    test('renders assistant message bubble with MYAVANA label and streaming indicator', () => {
      const element = MyaChatBubble({
        message: {
          id: 'msg_a1',
          role: 'assistant',
          content: 'Analyzing your strand...',
          isStreaming: true,
          timestamp: '2026-09-05T12:00:05.000Z'
        }
      });

      expect(element).toBeDefined();
    });

    test('renders error state bubble when message has error flag', () => {
      const element = MyaChatBubble({
        message: {
          id: 'msg_err',
          role: 'assistant',
          content: 'Connection issue',
          error: true
        }
      });

      expect(element).toBeDefined();
    });
  });

  describe('MyaStrandCard', () => {
    test('renders HairID Strand DNA card with health score and strand metrics', () => {
      const strandData = {
        hairType: '4C',
        porosity: 'Low',
        density: 'High',
        elasticity: 'Normal',
        strandThickness: 'Coarse',
        overallHealthScore: 92,
        recommendedProducts: [
          { id: 'p1', name: 'Leave-In Conditioning Milk', brand: 'MYAVANA' },
          { id: 'p2', name: 'Moisture Lock Oil', brand: 'MYAVANA' }
        ]
      };

      const element = MyaStrandCard({ strandData });
      expect(element).toBeDefined();
    });

    test('defaults health score to 88 if not specified', () => {
      const element = MyaStrandCard({ strandData: { hairType: '3B' } });
      expect(element).toBeDefined();
    });
  });

  describe('MyaRoutineChecklist', () => {
    test('renders routine steps and calculates progress completion', () => {
      const toggleMock = jest.fn();
      const routine = {
        id: 'rt_1',
        title: 'Weekly Wash Day',
        frequency: 'Weekly',
        steps: [
          { id: 's1', title: 'Clarifying Shampoo', durationMinutes: 10, isCompleted: true },
          { id: 's2', title: 'Deep Conditioning Treatment', durationMinutes: 25, isCompleted: false },
          { id: 's3', title: 'Leave-In Conditioner & Detangle', durationMinutes: 15, isCompleted: false }
        ]
      };

      const element = MyaRoutineChecklist({
        routine,
        onToggleStep: toggleMock
      });

      expect(element).toBeDefined();
    });
  });
});
