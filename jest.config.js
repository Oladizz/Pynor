export default {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/$1', // Alias for absolute imports
  },
  transform: {
    '^.+\.(ts|tsx)$': 'babel-jest',
    '^.+\.(js|jsx)$': 'babel-jest',
  },
  testMatch: ['<rootDir>/src/**/*.test.(ts|tsx|js|jsx)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
