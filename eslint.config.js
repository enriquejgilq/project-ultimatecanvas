const base = require('@ucanvas/eslint-config');
const reactConfig = require('@ucanvas/eslint-config/react');
const nestConfig = require('@ucanvas/eslint-config/nest');

/**
 * Package eslint.config.js files only work when ESLint's cwd is inside that
 * package (e.g. `turbo lint`). Tools that run from the repo root (lint-staged)
 * need one root config that knows which preset applies to which directory.
 */
function scopeToDir(configs, dir) {
  return configs.map((entry) => {
    if (entry.files) {
      return { ...entry, files: entry.files.map((pattern) => `${dir}/${pattern}`) };
    }
    if (entry.ignores && Object.keys(entry).length === 1) {
      return entry;
    }
    return { ...entry, files: [`${dir}/**/*.{js,jsx,ts,tsx,mjs,cjs}`] };
  });
}

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-node/**',
      '**/build/**',
      '**/storybook-static/**',
      '**/coverage/**',
      '**/.turbo/**',
      'packages/eslint-config/**',
    ],
  },
  ...base,
  ...scopeToDir(reactConfig, 'apps/web'),
  ...scopeToDir(reactConfig, 'packages/ui'),
  ...scopeToDir(nestConfig, 'apps/api'),
  ...scopeToDir(base, 'packages/shared'),
];
