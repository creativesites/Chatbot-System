/**
 * Unit Tests: MyaPlatformAdapter, useMyaRouteSync, and MyaFloatingTrigger
 * Native parity integration verification.
 */

const mockReact = {
  useState: jest.fn((initial) => [initial, jest.fn()]),
  useCallback: jest.fn((fn) => fn),
  useMemo: jest.fn((fn) => fn()),
  createElement: jest.fn((type, props, ...children) => ({
    type,
    props: Object.assign({}, props, { children })
  }))
};

jest.mock('react', () => mockReact);

const {
  registerPlatformAdapter,
  getPlatformAdapter,
  resetPlatformAdapter
} = require('../src/client/MyaPlatformAdapter');

const { useMyaRouteSync, SCREEN_PROMPT_STARTERS } = require('../src/hooks/useMyaRouteSync');
const { MyaFloatingTrigger } = require('../src/components/MyaFloatingTrigger');

describe('Mobile Native Parity: Platform Adapter, Route Sync, and Floating Trigger', () => {
  beforeEach(() => {
    mockReact.useState.mockImplementation((initial) => [initial, jest.fn()]);
    mockReact.useCallback.mockImplementation((fn) => fn);
    mockReact.useMemo.mockImplementation((fn) => fn());
    mockReact.createElement.mockImplementation((type, props, ...children) => ({
      type,
      props: Object.assign({}, props, { children })
    }));
  });

  afterEach(() => {
    resetPlatformAdapter();
  });

  describe('MyaPlatformAdapter Registry', () => {
    it('registers and retrieves host platform adapter', async () => {
      let navigatedTo = null;
      let hairProfileCalled = false;

      registerPlatformAdapter({
        getHairProfile: async () => {
          hairProfileCalled = true;
          return {
            hairType: '4C',
            porosity: 'High',
            overallHealthScore: 94
          };
        },
        navigate: (screen, params) => {
          navigatedTo = { screen, params };
        }
      });

      const adapter = getPlatformAdapter();
      expect(adapter).toBeDefined();

      const profile = await adapter.getHairProfile();
      expect(hairProfileCalled).toBe(true);
      expect(profile.hairType).toBe('4C');

      adapter.navigate('RegimeDetails', { stepId: 'step_4' });
      expect(navigatedTo).toEqual({
        screen: 'RegimeDetails',
        params: { stepId: 'step_4' }
      });
    });

    it('resets platform adapter cleanly', () => {
      registerPlatformAdapter({ openCamera: jest.fn() });
      expect(getPlatformAdapter()).toBeDefined();
      resetPlatformAdapter();
      expect(getPlatformAdapter()).toBeNull();
    });
  });

  describe('useMyaRouteSync Hook', () => {
    it('generates route context and smart quick replies for Analysis screen', () => {
      const syncResult = useMyaRouteSync('Analysis');

      expect(syncResult.currentScreen).toBe('Analysis');
      expect(syncResult.screenContext).toEqual({
        surface: 'myavana-mobile-app',
        page: 'app://analysis',
        route: 'Analysis',
        screen: 'Analysis',
        title: 'Analysis Screen',
        params: undefined
      });

      expect(syncResult.suggestedQuickReplies).toEqual(SCREEN_PROMPT_STARTERS.Analysis);
    });

    it('generates route context and smart quick replies for Regime screen', () => {
      const syncResult = useMyaRouteSync('Regime');
      expect(syncResult.suggestedQuickReplies).toEqual(SCREEN_PROMPT_STARTERS.Regime);
    });

    it('falls back to default prompt starters for unknown screens', () => {
      const syncResult = useMyaRouteSync('CustomSettingsScreen');
      expect(syncResult.suggestedQuickReplies).toContain('Hair Care Tips');
    });
  });

  describe('MyaFloatingTrigger', () => {
    it('renders floating action trigger with label and unread badge', () => {
      let pressed = false;
      const element = MyaFloatingTrigger({
        onPress: () => {
          pressed = true;
        },
        unreadCount: 3,
        position: 'bottom-right',
        label: 'M'
      });

      expect(element).toBeDefined();
      expect(element.props.style).toBeDefined();
    });
  });
});
