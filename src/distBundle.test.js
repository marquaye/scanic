import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const distEntry = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'scanic.js');

// Only runs where dist exists (always true on the release path: prepublishOnly builds).
describe.skipIf(!existsSync(distEntry))('dist/scanic.js', () => {
  it('keeps the webpackIgnore comment on the lazy ML-chunk import', () => {
    const code = readFileSync(distEntry, 'utf8');
    // If the toolchain ever strips this comment, webpack consumers break — fail the release.
    expect(code).toMatch(
      /import\(\s*\/\* webpackIgnore: true \*\/\s*"\.\/scanic-mlDetector\.js"\s*\)/
    );
  });
});
