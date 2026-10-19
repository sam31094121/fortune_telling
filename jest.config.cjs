// Existing Jest suites use the real Jest runtime; the separate CJS runners keep
// their own entry points. Do not load application .env files in unit tests.
const nextJest = require('next/jest');
module.exports = nextJest()({
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/components/**/*.test.tsx', '<rootDir>/tests/integration/**/*.test.tsx', '<rootDir>/tests/ghost-asura-api.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  clearMocks: true,
  restoreMocks: true,
});
