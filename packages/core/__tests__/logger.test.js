// packages/core/__tests__/logger.test.js
const { Logger, createLogger, getLogger } = require('../src/logger');
const winston = require('winston');

// Mock winston
jest.mock('winston', () => ({
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  },
  createLogger: jest.fn()
}));

describe('Logger', () => {
  let mockWinstonLogger;

  beforeEach(() => {
    mockWinstonLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    winston.createLogger.mockReturnValue(mockWinstonLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create logger with default options', () => {
      const logger = new Logger();
      
      expect(logger.serviceName).toBe('myavana-chatbot');
      expect(logger.environment).toBe('test'); // From test environment
      expect(winston.createLogger).toHaveBeenCalled();
    });

    test('should create logger with custom options', () => {
      const options = {
        serviceName: 'custom-service',
        environment: 'production',
        logLevel: 'debug'
      };
      
      const logger = new Logger(options);
      
      expect(logger.serviceName).toBe('custom-service');
      expect(logger.environment).toBe('production');
      expect(logger.logLevel).toBe('debug');
    });
  });

  describe('Basic Logging Methods', () => {
    let logger;

    beforeEach(() => {
      logger = new Logger();
    });

    test('should log info messages', () => {
      const message = 'Test info message';
      const meta = { userId: 'test-123' };

      logger.info(message, meta);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(message, meta);
    });

    test('should log error messages', () => {
      const message = 'Test error message';
      const meta = { error: 'Test error' };

      logger.error(message, meta);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(message, meta);
    });

    test('should log warning messages', () => {
      const message = 'Test warning message';
      const meta = { warning: true };

      logger.warn(message, meta);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(message, meta);
    });

    test('should log debug messages', () => {
      const message = 'Test debug message';
      const meta = { debug: true };

      logger.debug(message, meta);

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(message, meta);
    });
  });

  describe('Specialized Logging Methods', () => {
    let logger;

    beforeEach(() => {
      logger = new Logger();
    });

    test('should log request information', () => {
      const requestId = 'req-123';
      const method = 'POST';
      const url = '/api/chat';
      const body = { message: 'test' };

      logger.logRequest(requestId, method, url, body);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          requestId,
          method,
          url,
          bodySize: JSON.stringify(body).length
        })
      );
    });

    test('should log response information', () => {
      const requestId = 'req-123';
      const statusCode = 200;
      const responseTime = 150;

      logger.logResponse(requestId, statusCode, responseTime);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Response sent',
        expect.objectContaining({
          requestId,
          statusCode,
          responseTime: '150ms'
        })
      );
    });

    test('should log AI interactions', () => {
      const requestId = 'req-123';
      const model = 'gemini-pro';
      const prompt = 'Test prompt';
      const response = { message: 'AI response' };
      const responseTime = 2000;

      logger.logAIInteraction(requestId, model, prompt, response, responseTime);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'AI interaction',
        expect.objectContaining({
          requestId,
          model,
          promptLength: prompt.length,
          responseLength: JSON.stringify(response).length,
          responseTime: '2000ms'
        })
      );
    });

    test('should log database operations', () => {
      const operation = 'SELECT';
      const table = 'users';
      const duration = 50;
      const success = true;

      logger.logDatabaseOperation(operation, table, duration, success);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Database operation',
        expect.objectContaining({
          operation,
          table,
          duration: '50ms',
          success
        })
      );
    });

    test('should log cache operations', () => {
      const operation = 'GET';
      const key = 'user:123:profile';
      const hit = true;
      const duration = 5;

      logger.logCacheOperation(operation, key, hit, duration);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Cache operation',
        expect.objectContaining({
          operation,
          key: expect.stringContaining('user:***'),
          hit,
          duration: '5ms'
        })
      );
    });

    test('should log user actions', () => {
      const userId = 'user-123';
      const action = 'send_message';
      const conversationId = 'conv-456';

      logger.logUserAction(userId, action, conversationId);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'User action',
        expect.objectContaining({
          userId,
          action,
          conversationId
        })
      );
    });

    test('should log errors with context', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      const context = { userId: 'user-123' };

      logger.logError(error, context);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Application error',
        expect.objectContaining({
          message: error.message,
          stack: error.stack,
          name: error.name,
          userId: 'user-123'
        })
      );
    });

    test('should log performance metrics', () => {
      const operation = 'ai_response';
      const duration = 3000;

      logger.logPerformance(operation, duration);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Performance metric',
        expect.objectContaining({
          operation,
          duration: '3000ms',
          slow: false
        })
      );
    });

    test('should warn for slow operations', () => {
      const operation = 'slow_operation';
      const duration = 6000;

      logger.logPerformance(operation, duration);

      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        'Performance metric',
        expect.objectContaining({
          operation,
          duration: '6000ms',
          slow: true
        })
      );
    });

    test('should log security events', () => {
      const event = 'suspicious_login';
      const userId = 'user-123';
      const severity = 'high';

      logger.logSecurityEvent(event, userId, severity);

      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Security event',
        expect.objectContaining({
          event,
          userId,
          severity,
          timestamp: expect.any(String)
        })
      );
    });

    test('should log business metrics', () => {
      const metric = 'conversation_completed';
      const value = 1;
      const userId = 'user-123';
      const conversationId = 'conv-456';

      logger.logBusinessMetric(metric, value, userId, conversationId);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Business metric',
        expect.objectContaining({
          metric,
          value,
          userId,
          conversationId
        })
      );
    });
  });

  describe('Utility Methods', () => {
    let logger;

    beforeEach(() => {
      logger = new Logger();
    });

    test('should sanitize cache keys', () => {
      const key = 'user:12345:session:data';
      const sanitized = logger.sanitizeKey(key);

      expect(sanitized).toBe('user:***:session:data');
    });

    test('should truncate long keys', () => {
      const longKey = 'a'.repeat(200);
      const sanitized = logger.sanitizeKey(longKey);

      expect(sanitized).toHaveLength(100);
    });

    test('should create child logger', () => {
      const childMeta = { requestId: 'req-123' };
      const child = logger.child(childMeta);

      child.info('Test message', { additional: 'data' });

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Test message',
        expect.objectContaining({
          requestId: 'req-123',
          additional: 'data'
        })
      );
    });
  });

  describe('Middleware', () => {
    let logger;
    let middleware;
    let req, res, next;

    beforeEach(() => {
      logger = new Logger();
      middleware = logger.middleware();
      
      req = {
        method: 'POST',
        url: '/api/chat',
        body: { message: 'test' },
        get: jest.fn().mockReturnValue('test-agent'),
        ip: '127.0.0.1'
      };
      
      res = {
        end: jest.fn()
      };
      
      next = jest.fn();
    });

    test('should add logger and requestId to request', () => {
      middleware(req, res, next);

      expect(req.logger).toBeDefined();
      expect(req.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(next).toHaveBeenCalled();
    });

    test('should log request', () => {
      middleware(req, res, next);

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          requestId: req.requestId,
          method: 'POST',
          url: '/api/chat'
        })
      );
    });

    test('should log response when res.end is called', () => {
      res.statusCode = 200;
      middleware(req, res, next);
      
      // Simulate response ending
      res.end();

      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Response sent',
        expect.objectContaining({
          requestId: req.requestId,
          statusCode: 200,
          responseTime: expect.any(Number)
        })
      );
    });
  });

  describe('Singleton Functions', () => {
    test('should create singleton logger instance', () => {
      const logger1 = createLogger({ serviceName: 'test-service' });
      const logger2 = getLogger();

      expect(logger1).toBe(logger2);
      expect(logger1.serviceName).toBe('test-service');
    });

    test('should create default logger when getLogger called first', () => {
      // Clear any existing instance
      jest.resetModules();
      const { getLogger } = require('../src/logger');
      
      const logger = getLogger();
      
      expect(logger).toBeInstanceOf(Logger);
      expect(logger.serviceName).toBe('myavana-chatbot');
    });
  });

  describe('Transport Configuration', () => {
    test('should configure console transport for development', () => {
      process.env.NODE_ENV = 'development';
      
      new Logger({ environment: 'development' });
      
      expect(winston.transports.Console).toHaveBeenCalled();
    });

    test('should configure file transports for production', () => {
      process.env.NODE_ENV = 'production';
      
      new Logger({ environment: 'production' });
      
      expect(winston.transports.Console).toHaveBeenCalled();
      expect(winston.transports.File).toHaveBeenCalledTimes(3); // error, combined, performance
    });
  });
});