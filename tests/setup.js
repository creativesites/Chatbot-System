// tests/setup.js - Global test setup
const { TextEncoder, TextDecoder } = require('util');

// Global setup for all tests
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests

// Global mocks
global.mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis()
};

// Mock external dependencies
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    quit: jest.fn().mockResolvedValue(true),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    isReady: true
  }))
}));

jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn()
    }),
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    totalCount: 5,
    idleCount: 3,
    waitingCount: 0
  })),
  Client: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: jest.fn().mockResolvedValue(true)
  }))
}));

// Global test utilities
global.createMockRequest = (overrides = {}) => ({
  body: {
    message: 'Test message',
    from: 'test-user-123',
    groupId: 'test-conversation-456',
    eventName: 'REGULAR',
    ...overrides
  },
  ip: '127.0.0.1',
  get: jest.fn().mockReturnValue('test-user-agent'),
  path: '/test',
  method: 'POST'
});

global.createMockResponse = () => {
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  };
  return res;
};

// Async test helpers
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test database helpers
global.createTestUser = () => ({
  user_id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com',
  hair_type: '3C',
  created_at: new Date().toISOString()
});

global.createTestConversation = () => ({
  conversation_id: 'test-conversation-456',
  user_id: 'test-user-123',
  messages: [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there!' }
  ],
  created_at: new Date().toISOString()
});

// Error testing helpers
global.createTestError = (category = 'SYSTEM', severity = 'medium') => {
  const error = new Error('Test error');
  error.category = category;
  error.severity = severity;
  return error;
};

// Performance testing helpers
global.measureTime = async (fn) => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds
  return { result, duration };
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global teardown
afterAll(async () => {
  // Close any open handles
  jest.clearAllTimers();
});