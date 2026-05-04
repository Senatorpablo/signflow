/**
 * ESLint Configuration
 * Strict Node.js configuration
 */
module.exports = {
  env: {
    node: true,
    es2024: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Strict warnings
    'no-unused-vars': ['warn', { args: 'after-used' }],
    'no-console': ['warn', { allow: ['error', 'warn', 'log'] }],
    'no-var': 'error',
    'prefer-const': 'warn',
    'eqeqeq': ['error', 'smart'],
    'no-throw-literal': 'error',
    'no-return-await': 'error',
    'require-atomic-updates': 'warn',

    // Style
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'indent': ['warn', 2, { SwitchCase: 1 }],
    'max-len': ['warn', { code: 120 }],

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
  },
};
