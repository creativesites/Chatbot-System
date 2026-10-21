/**
 * Unit Tests: MyaMobileClient & Telemetry Attribution
 *
 * Verifies mobile client lifecycle, session persistence, device telemetry attribution,
 * and streaming payload construction with zero DOM assumptions.
 */

const { MyaMobileClient } = require('../src/client/MyaMobileClient');
const { MemoryStorageAdapter } = require('../src/storage/StorageAdapter');
const {
  getDeviceTelemetry,
  resolveMobilePlatform,
  enrichExperienceContext
} = require('../src/telemetry/deviceTelemetry');
const streamAdapter = require('../src/client/StreamAdapter');

describe('MyaMobileClient & Mobile Telemetry', () => {
  describe('Device Telemetry & Platform Attribution', () => {
    test('resolves default platform to react-native-ios', () => {
      const platform = resolveMobilePlatform();
      expect(platform).toBe('react-native-ios');
    });

    test('respects explicit ios or android platform overrides', () => {
      expect(resolveMobilePlatform('ios')).toBe('react-native-ios');
      expect(resolveMobilePlatform('android')).toBe('react-native-android');
      expect(resolveMobilePlatform('react-native-android')).toBe('react-native-android');
    });

    test('generates full telemetry payload with sdkVersion and appVersion', () => {
      const telemetry = getDeviceTelemetry({
        platform: 'react-native-ios',
        appVersion: '2.4.0',
        deviceModel: 'iPhone 15 Pro',
        osVersion: '17.4'
      });

      expect(telemetry.platform).toBe('react-native-ios');
      expect(telemetry.sdkVersion).toBe('1.3.0');
      expect(telemetry.appVersion).toBe('2.4.0');
      expect(telemetry.deviceModel).toBe('iPhone 15 Pro');
      expect(telemetry.osVersion).toBe('17.4');
    });

    test('enriches experienceContext with verified mobile platform attribution', () => {
      const baseContext = {
        wpUserId: 42,
        currentView: 'hair-routine'
      };

      const enriched = enrichExperienceContext(baseContext, {
        platform: 'react-native-android',
        appVersion: '1.2.0'
      });

      expect(enriched.platform).toBe('react-native-android');
      expect(enriched.channel).toBe('mobile-sdk');
      expect(enriched.wpUserId).toBe(42);
      expect(enriched.currentView).toBe('hair-routine');
      expect(enriched.sdkVersion).toBe('1.3.0');
      expect(enriched.telemetryTimestamp).toBeDefined();
    });
  });

  describe('StorageAdapter', () => {
    test('MemoryStorageAdapter performs get, set, remove without localStorage', async () => {
      const storage = new MemoryStorageAdapter();

      expect(storage.getItem('key')).toBeNull();
      storage.setItem('key', 'value_123');
      expect(storage.getItem('key')).toBe('value_123');
      storage.removeItem('key');
      expect(storage.getItem('key')).toBeNull();
    });
  });

  describe('MyaMobileClient Core Functionality', () => {
    test('throws error if apiBase is omitted', () => {
      expect(() => new MyaMobileClient({})).toThrow('MyaMobileClient requires apiBase');
    });

    test('initializes with custom or generated user and conversation IDs', () => {
      const client = new MyaMobileClient({
        apiBase: 'https://myavana-staging.example.com/',
        userId: 'usr_candace_1',
        conversationId: 'conv_hair_journey_99'
      });

      expect(client.apiBase).toBe('https://myavana-staging.example.com');
      expect(client.getUserId()).toBe('usr_candace_1');
      expect(client.getConversationId()).toBe('conv_hair_journey_99');
    });

    test('persists user and conversation IDs in mobile storage during init()', async () => {
      const storage = new MemoryStorageAdapter();
      const client = new MyaMobileClient({
        apiBase: 'https://myavana-staging.example.com',
        userId: 'persisted_user_1',
        conversationId: 'persisted_conv_1',
        storage
      });

      await client.init();

      expect(storage.getItem('myavana_mobile_user_id')).toBe('persisted_user_1');
      expect(storage.getItem('myavana_mobile_conversation_id')).toBe('persisted_conv_1');
    });

    test('restores previously stored user and conversation IDs on init()', async () => {
      const storage = new MemoryStorageAdapter();
      storage.setItem('myavana_mobile_user_id', 'existing_user_77');
      storage.setItem('myavana_mobile_conversation_id', 'existing_conv_88');

      const client = new MyaMobileClient({
        apiBase: 'https://myavana-staging.example.com',
        storage
      });

      await client.init();

      expect(client.getUserId()).toBe('existing_user_77');
      expect(client.getConversationId()).toBe('existing_conv_88');
    });

    test('createNewConversation provisions a new conversation ID and saves it', async () => {
      const storage = new MemoryStorageAdapter();
      const client = new MyaMobileClient({
        apiBase: 'https://myavana-staging.example.com',
        storage
      });

      const oldId = client.getConversationId();
      const newId = await client.createNewConversation();

      expect(newId).not.toBe(oldId);
      expect(client.getConversationId()).toBe(newId);
      expect(storage.getItem('myavana_mobile_conversation_id')).toBe(newId);
    });

    test('sendMessage sends enriched payload and parses streaming response', async () => {
      const client = new MyaMobileClient({
        apiBase: 'https://myavana-staging.example.com',
        userId: 'usr_mobile_test',
        conversationId: 'conv_mobile_test',
        telemetry: { platform: 'react-native-ios' }
      });

      // Spy on streamFetch
      const streamFetchSpy = jest.spyOn(streamAdapter, 'streamFetch').mockImplementation(
        async (url, options, callbacks) => {
          expect(url).toBe('https://myavana-staging.example.com/chat/stream');
          expect(options.method).toBe('POST');
          expect(options.headers['X-Platform']).toBe('react-native-ios');
          expect(options.headers['X-User-Id']).toBe('usr_mobile_test');

          const body = options.body;
          expect(body.message).toBe('What is my hair porosity?');
          expect(body.from).toBe('usr_mobile_test');
          expect(body.conversationId).toBe('conv_mobile_test');
          expect(body.format).toBe('ndjson');
          expect(body.experienceContext.platform).toBe('react-native-ios');
          expect(body.experienceContext.channel).toBe('mobile-sdk');

          // Simulate incoming streaming callbacks
          callbacks.onDelta && callbacks.onDelta('Your porosity is ', 'Your porosity is ');
          callbacks.onDelta && callbacks.onDelta('Medium-High.', 'Your porosity is Medium-High.');
          callbacks.onBlock &&
            callbacks.onBlock({
              id: 'blk_porosity_1',
              type: 'hair_profile_summary',
              data: { porosity: 'Medium-High' }
            });
          callbacks.onDone && callbacks.onDone({ modelUsed: 'gemini37Flash-stream' });

          return {
            accumulatedText: 'Your porosity is Medium-High.',
            blocks: [
              {
                id: 'blk_porosity_1',
                type: 'hair_profile_summary',
                data: { porosity: 'Medium-High' }
              }
            ],
            actions: []
          };
        }
      );

      const deltas = [];
      const blocks = [];
      let doneMeta = null;

      const response = await client.sendMessage({
        message: 'What is my hair porosity?',
        onDelta: (d) => deltas.push(d),
        onBlock: (b) => blocks.push(b),
        onDone: (m) => (doneMeta = m)
      });

      expect(response.content).toBe('Your porosity is Medium-High.');
      expect(deltas).toEqual(['Your porosity is ', 'Medium-High.']);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].id).toBe('blk_porosity_1');
      expect(doneMeta).toEqual({ modelUsed: 'gemini37Flash-stream' });

      streamFetchSpy.mockRestore();
    });

    test('abort() halts active in-flight streaming request', async () => {
      const client = new MyaMobileClient({
        apiBase: 'https://myavana-staging.example.com'
      });

      let observedSignal = null;
      const streamFetchSpy = jest.spyOn(streamAdapter, 'streamFetch').mockImplementation(
        async (url, options) => {
          observedSignal = options.signal;
          return new Promise((resolve) => {
            if (options.signal) {
              options.signal.addEventListener('abort', () => {
                resolve({ accumulatedText: '', blocks: [], actions: [] });
              });
            }
          });
        }
      );

      const sendPromise = client.sendMessage({ message: 'Test abort' });
      expect(observedSignal).toBeDefined();
      expect(observedSignal.aborted).toBe(false);

      client.abort();
      expect(observedSignal.aborted).toBe(true);

      const res = await sendPromise;
      expect(res.content).toBe('');

      streamFetchSpy.mockRestore();
    });

    test('registerPlatformAdapter and setScreenContext enrich streaming and dispatch actions', async () => {
      const client = new MyaMobileClient({
        apiBase: 'https://myavana-staging.example.com'
      });

      const dispatchedActions = [];
      const mockAdapter = {
        name: 'Myavana Mobile App',
        platform: 'react-native-ios',
        onActionDispatched: (action) => {
          dispatchedActions.push(action);
        }
      };

      client.registerPlatformAdapter(mockAdapter);
      expect(client.getPlatformAdapter()).toBe(mockAdapter);

      const screenContext = {
        surface: 'myavana-mobile-app',
        screen: 'RegimeDetails',
        title: 'Wash Day Regimen'
      };
      client.setScreenContext(screenContext);
      expect(client.getScreenContext()).toEqual(screenContext);

      let capturedBody = null;
      const streamFetchSpy = jest.spyOn(streamAdapter, 'streamFetch').mockImplementation(
        async (url, options, handlers) => {
          capturedBody = options.body;
          if (handlers && handlers.onAction) {
            handlers.onAction({ type: 'navigate', label: 'View Products', target: 'ProductDetails' });
          }
          return {
            accumulatedText: 'Here is your regimen step.',
            blocks: [],
            actions: [{ type: 'navigate', label: 'View Products' }]
          };
        }
      );

      await client.sendMessage({ message: 'What step is next?' });

      expect(capturedBody.experienceContext.screenContext).toEqual(screenContext);
      expect(dispatchedActions).toHaveLength(1);
      expect(dispatchedActions[0].type).toBe('navigate');
      expect(dispatchedActions[0].target).toBe('ProductDetails');

      streamFetchSpy.mockRestore();
    });
  });
});
