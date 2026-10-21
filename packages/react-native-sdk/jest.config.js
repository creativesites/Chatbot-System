// Headless tests (client, stream, hook, protocol). UI tests run via jest.ui.config.js.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/ui/'],
  moduleNameMapper: {
    '^react$': '<rootDir>/__mocks__/react.js'
  }
};
