// packages/core/__tests__/unifiedChatHandler.test.js
const UnifiedChatHandler = require('../src/unifiedChatHandler');

// Mock dependencies
jest.mock('@genkit-ai/googleai', () => ({
  gemini15Flash: { name: 'gemini15Flash' },
  gemini20FlashExp: { name: 'gemini20FlashExp' }
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  messages: [{
                    messageType: 'html',
                    message: 'Test AI response'
                  }]
                })
              }
            }
          ]
        })
      }
    }
  }));
});

describe('UnifiedChatHandler', () => {
  let handler;
  let mockConfig;
  let mockLogger;
  let mockValidator;
  let mockAnalytics;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    mockValidator = {
      validateRequest: jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        sanitizedData: {
          message: 'Test message',
          from: 'test-user',
          groupId: 'test-conversation'
        }
      })
    };

    mockAnalytics = {
      trackWelcomeEvent: jest.fn().mockResolvedValue(true),
      trackUserMessage: jest.fn().mockResolvedValue(true),
      trackAIResponse: jest.fn().mockResolvedValue(true)
    };

    mockConfig = {
      packageName: 'myavana',
      logger: mockLogger,
      validator: mockValidator,
      analytics: mockAnalytics,
      ai: {
        loadSession: jest.fn().mockResolvedValue({
          chat: jest.fn().mockReturnValue({
            send: jest.fn().mockResolvedValue({
              output: {
                messages: [{
                  messageType: 'html',
                  message: 'Test response'
                }]
              }
            })
          })
        })
      },
      xaiApiKey: 'test-key'
    };

    handler = new UnifiedChatHandler(mockConfig);
  });

  describe('Constructor', () => {
    test('should initialize with default configuration', () => {
      const defaultHandler = new UnifiedChatHandler();
      expect(defaultHandler.packageName).toBe('default');
    });

    test('should initialize with provided configuration', () => {
      expect(handler.packageName).toBe('myavana');
      expect(handler.logger).toBe(mockLogger);
      expect(handler.validator).toBe(mockValidator);
    });

    test('should initialize xAI client when API key provided', () => {
      expect(handler.xai).toBeDefined();
    });

    test('should set correct model configuration for myavana package', () => {
      const config = handler.modelConfig['myavana'];
      expect(config.primary.name).toBe('gemini20FlashExp');
      expect(config.fallback.name).toBe('gemini15Flash');
      expect(config.finalFallback).toBe('xai-grok-3-mini-fast');
    });
  });

  describe('handleRequest', () => {
    let req, res;

    beforeEach(() => {
      req = createMockRequest();
      res = createMockResponse();
      
      // Mock required core functions
      require('../src/session');
      require('../src/conversation');
      require('../src/user');
      require('../src/postResponseProcessing');
      
      jest.doMock('../src/conversation', () => ({
        getAllConversationsSummary: jest.fn().mockResolvedValue('Test summary'),
        getConversationHistory: jest.fn().mockResolvedValue([]),
        saveConversation: jest.fn().mockResolvedValue(true)
      }));
      
      jest.doMock('../src/user', () => ({
        getUserDetails: jest.fn().mockResolvedValue(createTestUser())
      }));
      
      jest.doMock('../src/postResponseProcessing', () => ({
        postProcessConversation: jest.fn().mockResolvedValue({}),
        postResponseProcessing: jest.fn().mockResolvedValue(true)
      }));
    });

    test('should handle valid request successfully', async () => {
      await handler.handleRequest(req, res);

      expect(mockValidator.validateRequest).toHaveBeenCalledWith(req.body);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          packageName: 'myavana',
          body: req.body
        })
      );
    });

    test('should handle validation errors', async () => {
      mockValidator.validateRequest.mockResolvedValueOnce({
        isValid: false,
        errors: [{ field: 'message', message: 'Required field' }]
      });

      await handler.handleRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: 'Invalid request'
        })
      );
    });

    test('should handle welcome event', async () => {
      req.body.eventName = 'WELCOME';
      
      // Mock welcome handler
      handler.getWelcomeHandler = jest.fn().mockReturnValue(
        jest.fn().mockResolvedValue(true)
      );

      await handler.handleRequest(req, res);

      expect(mockAnalytics.trackWelcomeEvent).toHaveBeenCalledWith(req.body.from);
    });

    test('should handle unhandled errors', async () => {
      const error = new Error('Test error');
      mockValidator.validateRequest.mockRejectedValueOnce(error);

      await handler.handleRequest(req, res);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unhandled error in chat handler',
        expect.objectContaining({
          error: error.message
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('generateAIResponse', () => {
    const mockParams = {
      userId: 'test-user',
      message: 'Test message',
      chatHistory: [],
      userInfo: createTestUser(),
      allchatsSummary: 'Test summary',
      session: {
        chat: jest.fn().mockReturnValue({
          send: jest.fn().mockResolvedValue({
            output: { messages: [{ messageType: 'html', message: 'Test response' }] }
          })
        })
      },
      requestId: 'test-request-id'
    };

    test('should generate AI response with primary model', async () => {
      const result = await handler.generateAIResponse(...Object.values(mockParams));

      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('modelUsed');
      expect(result).toHaveProperty('responseTime');
    });

    test('should fallback to secondary model on primary failure', async () => {
      // Mock primary model failure
      const mockSession = {
        chat: jest.fn().mockReturnValue({
          send: jest.fn()
            .mockRejectedValueOnce(new Error('Primary model failed'))
            .mockResolvedValueOnce({
              output: { messages: [{ messageType: 'html', message: 'Fallback response' }] }
            })
        })
      };

      const result = await handler.generateAIResponse(
        mockParams.userId,
        mockParams.message,
        mockParams.chatHistory,
        mockParams.userInfo,
        mockParams.allchatsSummary,
        mockSession,
        mockParams.requestId
      );

      expect(result).toHaveProperty('output');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Primary model failed, trying fallback',
        expect.any(Object)
      );
    });

    test('should use xAI as final fallback', async () => {
      // Mock both Gemini models failing
      const mockSession = {
        chat: jest.fn().mockReturnValue({
          send: jest.fn().mockRejectedValue(new Error('Gemini failed'))
        })
      };

      const mockCore = {
        ai: {
          chat: jest.fn().mockReturnValue({
            send: jest.fn().mockRejectedValue(new Error('Gemini fallback failed'))
          })
        }
      };
      
      jest.doMock('myavana-bot-test-core', () => mockCore);

      const result = await handler.generateAIResponse(
        mockParams.userId,
        mockParams.message,
        mockParams.chatHistory,
        mockParams.userInfo,
        mockParams.allchatsSummary,
        mockSession,
        mockParams.requestId
      );

      expect(result.modelUsed).toBe('xai-grok-3-mini-fast-fallback');
    });
  });

  describe('cleanKommunicateResponse', () => {
    test('should clean single response object', () => {
      const response = {
        messageType: 'html',
        message: 'Test message',
        platform: 'kommunicate'
      };

      const cleaned = handler.cleanKommunicateResponse(response);

      expect(cleaned).toEqual([{
        messageType: 'html',
        message: 'Test message'
      }]);
    });

    test('should clean array of response objects', () => {
      const responses = [
        {
          messageType: 'html',
          message: 'Test message 1',
          platform: 'kommunicate'
        },
        {
          messageType: 'html',
          message: 'Test message 2',
          platform: 'kommunicate'
        }
      ];

      const cleaned = handler.cleanKommunicateResponse(responses);

      expect(cleaned).toHaveLength(2);
      expect(cleaned[0]).not.toHaveProperty('platform');
      expect(cleaned[1]).not.toHaveProperty('platform');
    });

    test('should handle nested arrays', () => {
      const response = [[{
        messageType: 'html',
        message: 'Nested message',
        platform: 'kommunicate'
      }]];

      const cleaned = handler.cleanKommunicateResponse(response);

      expect(cleaned).toEqual([{
        messageType: 'html',
        message: 'Nested message'
      }]);
    });
  });

  describe('Error Handling', () => {
    test('should generate unique request IDs', () => {
      const id1 = handler.generateRequestId();
      const id2 = handler.generateRequestId();

      expect(id1).toMatch(/^myavana_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^myavana_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should send proper error response', () => {
      const res = createMockResponse();
      const requestId = 'test-request-id';

      handler.sendErrorResponse(res, 400, 'Test error', { field: 'test' }, requestId);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: true,
          message: 'Test error',
          details: { field: 'test' },
          requestId
        })
      );
    });
  });

  describe('Package-specific handlers', () => {
    test('should load package-specific construct prompt function', () => {
      const constructPrompt = handler.getConstructPromptFunction();
      expect(typeof constructPrompt).toBe('function');
    });

    test('should load package-specific welcome handler', () => {
      const welcomeHandler = handler.getWelcomeHandler();
      expect(typeof welcomeHandler).toBe('function');
    });

    test('should load package-specific image handler', () => {
      const imageHandler = handler.getImageHandler();
      expect(typeof imageHandler).toBe('function');
    });

    test('should fallback to defaults when package handlers not found', () => {
      const handlerWithMissingPackage = new UnifiedChatHandler({
        packageName: 'non-existent-package',
        logger: mockLogger
      });

      const constructPrompt = handlerWithMissingPackage.getConstructPromptFunction();
      const welcomeHandler = handlerWithMissingPackage.getWelcomeHandler();
      const imageHandler = handlerWithMissingPackage.getImageHandler();

      expect(typeof constructPrompt).toBe('function');
      expect(typeof welcomeHandler).toBe('function');
      expect(typeof imageHandler).toBe('function');
    });
  });

  describe('Performance', () => {
    test('should complete request within acceptable time', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const { duration } = await measureTime(async () => {
        await handler.handleRequest(req, res);
      });

      // Should complete within 5 seconds for test environment
      expect(duration).toBeLessThan(5000);
    });
  });
});