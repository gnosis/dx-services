module.exports = {
  verbose: true,
  testMatch: [
    // '**/__tests__/**/*.js?(x)',
    '**/?(*.)(spec|test).js?(x)'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    // Exclude files
    '!**/*Mock.js',
    '!src/main.js',
    '!src/cli/**',
    '!src/web/**'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    'tests/safe-module'
  ]
}
