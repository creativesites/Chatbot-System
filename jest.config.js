// jest.config.js - Jest configuration for the entire project
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directory for tests and modules
  rootDir: '.',
  
  // Test match patterns
  testMatch: [
    '<rootDir>/packages/**/__tests__/**/*.test.js',
    '<rootDir>/packages/**/?(*.)+(spec|test).js',
    '<rootDir>/tests/**/*.test.js'
  ],
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  collectCoverageFrom: [
    'packages/**/*.js',
    '!packages/**/__tests__/**',
    '!packages/**/*.test.js',
    '!packages/**/*.spec.js',
    '!packages/**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // Module paths
  moduleDirectories: [
    'node_modules',
    '<rootDir>/packages'
  ],
  
  // Transform settings
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Mock settings
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Watch settings for development
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/logs/'
  ],
  
  // Globals
  globals: {
    'NODE_ENV': 'test'
  }
};