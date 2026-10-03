// The package is "type": "module"; the CommonJS build (consumed by the NestJS API and Jest)
// needs its own package.json so Node treats dist/cjs/*.js as CommonJS.
import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync(new URL('../dist/cjs/', import.meta.url), { recursive: true });
writeFileSync(
  new URL('../dist/cjs/package.json', import.meta.url),
  JSON.stringify({ type: 'commonjs' }) + '\n',
);
