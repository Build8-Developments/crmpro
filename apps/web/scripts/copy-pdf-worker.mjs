// Copies the pdf.js worker into /public so the in-app PDF viewer can load it
// from the same origin. Runs before dev/build so the worker always matches
// the installed pdfjs-dist version.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const source = join(
  dirname(require.resolve('pdfjs-dist/package.json')),
  'build',
  'pdf.worker.min.mjs',
);
const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(publicDir, { recursive: true });
copyFileSync(source, join(publicDir, 'pdf.worker.min.mjs'));
