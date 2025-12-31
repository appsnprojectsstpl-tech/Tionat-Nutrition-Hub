const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you soon)
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
const jestConfig = createJestConfig(customJestConfig);

// Handle esm modules
jestConfig.transformIgnorePatterns = [
    '/node_modules/(?!(lucide-react|@lucide|lucide|d3-shape|d3-path)/)',
]

module.exports = jestConfig;
