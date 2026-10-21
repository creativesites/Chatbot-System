// UI tests: real React + react-test-renderer, react-native and native modules stubbed.
module.exports = {
  testEnvironment: 'node',
  // Keep the headless react mock (__mocks__/react.js) out of scope: UI tests use real React.
  roots: ['<rootDir>/__tests__/ui', '<rootDir>/src'],
  testMatch: ['<rootDir>/__tests__/ui/**/*.test.js'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-react'] }],
  },
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/ui/react-native.js',
    '^react-native-vector-icons/.*$': '<rootDir>/__mocks__/ui/icon.js',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/ui/safe-area.js',
    '\\.(png|jpe?g|webp)$': '<rootDir>/__mocks__/ui/file.js',
  },
  setupFiles: ['<rootDir>/__mocks__/ui/setup.js'],
  globals: { __DEV__: true },
};
