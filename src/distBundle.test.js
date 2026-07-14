import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import webpack from 'webpack';

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

  // Regression test for: "Module not found: Error: Can't resolve 'ort.wasm.min.mjs'
  // in '.../node_modules/scanic/dist'" — reported against CRA/Next.js (webpack)
  // consumers using scanic for CLASSICAL-ONLY detection (no `detector: 'ml'` usage
  // at all). Without the webpackIgnore comment checked above, webpack statically
  // follows the lazy `import('./mlDetector.js')` into the ORT chunk at COMPILE
  // TIME regardless of whether that code path ever runs, can't resolve the
  // CDN-only ort.wasm.min.mjs loader, and also raises a "Critical dependency: the
  // request of a dependency is an expression" warning (which CRA's `CI=true`
  // build treats as fatal). The comment-presence check above is a fast proxy for
  // this, but only an actual webpack build proves consumers aren't broken.
  it('bundles a classical-only consumer through webpack without a resolution error', async () => {
    const tmpDir = mkdtempSync(path.join(tmpdir(), 'scanic-webpack-'));
    const entryFile = path.join(tmpDir, 'entry.js');
    const outDir = path.join(tmpDir, 'out');
    // Posix-style path so the generated import specifier is valid on Windows too.
    const distEntrySpecifier = distEntry.replace(/\\/g, '/');

    writeFileSync(
      entryFile,
      `import { scanDocument, Scanner } from ${JSON.stringify(distEntrySpecifier)};\n` +
      `export { scanDocument, Scanner };\n`
    );

    try {
      const stats = await new Promise((resolve, reject) => {
        webpack(
          {
            mode: 'production',
            target: 'web',
            entry: entryFile,
            output: { path: outDir, filename: 'bundle.js' },
          },
          (err, stats) => (err ? reject(err) : resolve(stats))
        );
      });

      const info = stats.toJson({ errors: true, warnings: true, errorDetails: false });
      const problems = [...(info.errors ?? []), ...(info.warnings ?? [])]
        .map((e) => e.message)
        .join('\n');

      expect(stats.hasErrors(), `webpack build failed:\n${problems}`).toBe(false);
      expect(
        problems,
        `webpack emitted the exact warning/error this regression test guards against:\n${problems}`
      ).not.toMatch(/Can't resolve|ort\.wasm\.min\.mjs|Critical dependency/i);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 30_000);
});
