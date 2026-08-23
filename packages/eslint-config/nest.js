const tseslint = require('typescript-eslint');
const globals = require('globals');
const base = require('./base');

module.exports = tseslint.config(...base, {
  files: ['**/*.ts'],
  languageOptions: {
    globals: globals.node,
  },
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
});
