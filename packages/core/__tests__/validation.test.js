// packages/core/__tests__/validation.test.js
const Validator = require('../src/validation');

// Mock dependencies
jest.mock('joi', () => ({
  object: jest.fn().mockReturnThis(),
  string: jest.fn().mockReturnThis(),
  array: jest.fn().mockReturnThis(),
  required: jest.fn().mockReturnThis(),
  optional: jest.fn().mockReturnThis(),
  max: jest.fn().mockReturnThis(),
  min: jest.fn().mockReturnThis(),
  trim: jest.fn().mockReturnThis(),
  pattern: jest.fn().mockReturnThis(),
  valid: jest.fn().mockReturnThis(),
  default: jest.fn().mockReturnThis(),
  custom: jest.fn().mockReturnThis(),
  items: jest.fn().mockReturnThis(),
  uri: jest.fn().mockReturnThis(),
  validate: jest.fn()
}));

jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((html) => html.replace(/<script.*?>.*?<\/script>/gi, ''))
}));

describe('Validator', () => {
  let validator;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    validator = new Validator({
      logger: mockLogger,
      maxMessageLength: 1000,
      maxImageSize: 5 * 1024 * 1024,
      allowedImageTypes: ['image/jpeg', 'image/png']
    });
  });

  describe('Constructor', () => {
    test('should initialize with default options', () => {
      const defaultValidator = new Validator();
      
      expect(defaultValidator.maxMessageLength).toBe(5000);
      expect(defaultValidator.maxImageSize).toBe(10 * 1024 * 1024);
      expect(defaultValidator.allowedImageTypes).toContain('image/jpeg');
    });

    test('should initialize with custom options', () => {
      expect(validator.maxMessageLength).toBe(1000);
      expect(validator.maxImageSize).toBe(5 * 1024 * 1024);
      expect(validator.allowedImageTypes).toEqual(['image/jpeg', 'image/png']);
    });
  });

  describe('validateRequest', () => {
    const Joi = require('joi');

    beforeEach(() => {
      // Reset Joi mock
      Joi.validate.mockClear();
    });

    test('should validate regular chat message successfully', async () => {
      const requestBody = {
        message: 'Hello, how are you?',
        from: 'user123',
        groupId: 'conv456',
        eventName: 'REGULAR'
      };

      Joi.validate.mockReturnValue({
        error: null,
        value: requestBody
      });

      const result = await validator.validateRequest(requestBody);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sanitizedData).toEqual(requestBody);
    });

    test('should validate welcome message successfully', async () => {
      const requestBody = {
        from: 'user123',
        eventName: 'WELCOME'
      };

      Joi.validate.mockReturnValue({
        error: null,
        value: requestBody
      });

      const result = await validator.validateRequest(requestBody);

      expect(result.isValid).toBe(true);
    });

    test('should validate image message successfully', async () => {
      const requestBody = {
        message: 'What do you think of my hair?',
        from: 'user123',
        groupId: 'conv456',
        eventName: 'KOMMUNICATE_MEDIA_EVENT',
        metadata: {
          KM_CHAT_CONTEXT: {
            attachments: [{
              type: 'image/jpeg',
              payload: {
                url: 'https://example.com/image.jpg'
              }
            }]
          }
        }
      };

      Joi.validate.mockReturnValue({
        error: null,
        value: requestBody
      });

      const result = await validator.validateRequest(requestBody);

      expect(result.isValid).toBe(true);
    });

    test('should handle validation errors', async () => {
      const requestBody = {
        message: '', // Empty message should fail
        from: 'user123'
      };

      const mockError = {
        details: [
          {
            path: ['message'],
            message: '"message" is not allowed to be empty',
            context: { value: '' }
          }
        ]
      };

      Joi.validate.mockReturnValue({
        error: mockError,
        value: null
      });

      const result = await validator.validateRequest(requestBody);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'message',
        message: '"message" is not allowed to be empty',
        value: ''
      });
    });

    test('should handle validation exceptions', async () => {
      const requestBody = { message: 'test' };

      Joi.validate.mockImplementation(() => {
        throw new Error('Validation exception');
      });

      const result = await validator.validateRequest(requestBody);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual([
        { field: 'general', message: 'Validation failed' }
      ]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('performSecurityChecks', () => {
    test('should pass clean data', async () => {
      const data = {
        message: 'Hello, how can I improve my hair health?',
        from: 'user123'
      };

      const result = await validator.performSecurityChecks(data);

      expect(result.passed).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should detect SQL injection patterns', async () => {
      const data = {
        message: "test'; DROP TABLE users; --",
        from: 'user123'
      };

      const result = await validator.performSecurityChecks(data);

      expect(result.passed).toBe(false);
      expect(result.errors).toEqual([
        {
          field: 'message',
          message: 'Potentially malicious content detected'
        }
      ]);
    });

    test('should detect excessive special characters', async () => {
      const data = {
        message: '!@#$%^&*()_+{}|:"<>?[]\\;\',./',
        from: 'user123'
      };

      const result = await validator.performSecurityChecks(data);

      expect(result.passed).toBe(false);
      expect(result.errors).toEqual([
        {
          field: 'message',
          message: 'Message contains excessive special characters'
        }
      ]);
    });

    test('should validate image URLs', async () => {
      const data = {
        message: 'Check my hair',
        from: 'user123',
        metadata: {
          KM_CHAT_CONTEXT: {
            attachments: [{
              payload: {
                url: 'javascript:alert("xss")'
              }
            }]
          }
        }
      };

      const result = await validator.performSecurityChecks(data);

      expect(result.passed).toBe(false);
      expect(result.errors).toEqual([
        {
          field: 'metadata.attachments',
          message: 'Invalid or potentially malicious image URL'
        }
      ]);
    });
  });

  describe('sanitizeText', () => {
    test('should remove control characters', () => {
      const text = 'Hello\x00\x08World\x7F';
      const sanitized = validator.sanitizeText(text);
      
      expect(sanitized).toBe('HelloWorld');
    });

    test('should normalize unicode', () => {
      const text = 'café'; // Contains unicode
      const sanitized = validator.sanitizeText(text);
      
      expect(sanitized).toBe('café');
    });

    test('should trim excessive whitespace', () => {
      const text = '  Hello    World  ';
      const sanitized = validator.sanitizeText(text);
      
      expect(sanitized).toBe('Hello World');
    });

    test('should handle non-string input', () => {
      const nonString = 123;
      const sanitized = validator.sanitizeText(nonString);
      
      expect(sanitized).toBe(123);
    });
  });

  describe('containsSqlInjectionPatterns', () => {
    test('should detect SELECT statements', () => {
      const text = 'test SELECT * FROM users';
      const result = validator.containsSqlInjectionPatterns(text);
      
      expect(result).toBe(true);
    });

    test('should detect UNION SELECT', () => {
      const text = 'test UNION SELECT password FROM users';
      const result = validator.containsSqlInjectionPatterns(text);
      
      expect(result).toBe(true);
    });

    test('should detect OR 1=1', () => {
      const text = "test' OR 1=1 --";
      const result = validator.containsSqlInjectionPatterns(text);
      
      expect(result).toBe(true);
    });

    test('should not flag normal text', () => {
      const text = 'How can I select the right hair products?';
      const result = validator.containsSqlInjectionPatterns(text);
      
      expect(result).toBe(false);
    });
  });

  describe('hasExcessiveSpecialChars', () => {
    test('should detect excessive special characters', () => {
      const text = '!@#$%^&*()'; // 100% special chars
      const result = validator.hasExcessiveSpecialChars(text);
      
      expect(result).toBe(true);
    });

    test('should not flag normal text with some special chars', () => {
      const text = 'Hello! How are you?'; // ~10% special chars
      const result = validator.hasExcessiveSpecialChars(text);
      
      expect(result).toBe(false);
    });

    test('should handle edge case of 30% threshold', () => {
      const text = 'abc!@#'; // 50% special chars
      const result = validator.hasExcessiveSpecialChars(text);
      
      expect(result).toBe(true);
    });
  });

  describe('isValidImageUrl', () => {
    test('should accept valid HTTPS URLs', () => {
      const url = 'https://example.com/image.jpg';
      const result = validator.isValidImageUrl(url);
      
      expect(result).toBe(true);
    });

    test('should accept valid HTTP URLs', () => {
      const url = 'http://example.com/image.jpg';
      const result = validator.isValidImageUrl(url);
      
      expect(result).toBe(true);
    });

    test('should reject file:// URLs', () => {
      const url = 'file:///etc/passwd';
      const result = validator.isValidImageUrl(url);
      
      expect(result).toBe(false);
    });

    test('should reject javascript: URLs', () => {
      const url = 'javascript:alert("xss")';
      const result = validator.isValidImageUrl(url);
      
      expect(result).toBe(false);
    });

    test('should reject localhost URLs', () => {
      const url = 'http://localhost:3000/image.jpg';
      const result = validator.isValidImageUrl(url);
      
      expect(result).toBe(false);
    });

    test('should reject private IP addresses', () => {
      const url = 'http://192.168.1.1/image.jpg';
      const result = validator.isValidImageUrl(url);
      
      expect(result).toBe(false);
    });

    test('should reject malformed URLs', () => {
      const url = 'not-a-valid-url';
      const result = validator.isValidImageUrl(url);
      
      expect(result).toBe(false);
    });
  });

  describe('sanitizeForLogging', () => {
    test('should sanitize email addresses', () => {
      const obj = { message: 'Contact me at user@example.com' };
      const sanitized = validator.sanitizeForLogging(obj);
      
      expect(sanitized.message).toBe('Contact me at [email]');
    });

    test('should sanitize credit card numbers', () => {
      const obj = { message: 'My card is 1234 5678 9012 3456' };
      const sanitized = validator.sanitizeForLogging(obj);
      
      expect(sanitized.message).toBe('My card is [card]');
    });

    test('should sanitize SSN', () => {
      const obj = { message: 'SSN: 123-45-6789' };
      const sanitized = validator.sanitizeForLogging(obj);
      
      expect(sanitized.message).toBe('SSN: [ssn]');
    });

    test('should redact sensitive keys', () => {
      const obj = { 
        message: 'Hello',
        password: 'secret123',
        apiKey: 'key-123',
        token: 'token-456'
      };
      const sanitized = validator.sanitizeForLogging(obj);
      
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.message).toBe('Hello');
    });

    test('should truncate long strings', () => {
      const longString = 'a'.repeat(300);
      const obj = { message: longString };
      const sanitized = validator.sanitizeForLogging(obj);
      
      expect(sanitized.message).toHaveLength(214); // 200 + '... [truncated]'
      expect(sanitized.message).toEndWith('... [truncated]');
    });

    test('should limit array length', () => {
      const longArray = Array(20).fill('item');
      const obj = { items: longArray };
      const sanitized = validator.sanitizeForLogging(obj);
      
      expect(sanitized.items).toHaveLength(10);
    });

    test('should handle nested objects with max depth', () => {
      const deepObj = {
        level1: {
          level2: {
            level3: {
              level4: 'deep value'
            }
          }
        }
      };
      const sanitized = validator.sanitizeForLogging(deepObj, 2);
      
      expect(sanitized.level1.level2).toBe('[Max Depth Reached]');
    });
  });

  describe('moderateContent', () => {
    test('should pass clean content', async () => {
      const text = 'Hello, how can I improve my hair health?';
      const result = await validator.moderateContent(text);
      
      expect(result.isClean).toBe(true);
      expect(result.confidence).toBe(0.1);
      expect(result.categories).toEqual([]);
    });

    test('should detect profanity', async () => {
      // Note: This test assumes profanity patterns are configured
      validator.containsProfanity = jest.fn().mockReturnValue(true);
      
      const text = 'This contains bad words';
      const result = await validator.moderateContent(text);
      
      expect(result.isClean).toBe(false);
      expect(result.confidence).toBe(0.8);
      expect(result.categories).toEqual(['profanity']);
    });
  });

  describe('Rate Limiting', () => {
    test('should create rate limit middleware', () => {
      const rateLimit = validator.createRateLimit({
        windowMs: 60000,
        max: 10
      });
      
      expect(typeof rateLimit).toBe('function');
    });

    test('should create slow down middleware', () => {
      const slowDown = validator.createSlowDown({
        windowMs: 60000,
        delayAfter: 5,
        delayMs: 1000
      });
      
      expect(typeof slowDown).toBe('function');
    });
  });
});