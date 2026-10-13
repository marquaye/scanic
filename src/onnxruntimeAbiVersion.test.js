// @vitest-environment node
//
// Guard test: onnxruntime-web's JS/wasm ABI is version-locked to the exact
// ONNX Runtime build scanic-ml/dist's custom minimal wasm assets were
// compiled from (see scanic-ml/README.md's "Version pinning" section and
// scanic-ml/build/build.sh's ORT_VERSION). Bumping the installed
// onnxruntime-web past that range (e.g. via a routine dependency-update PR)
// does NOT fail mlDetector.test.js / baseline.ml.test.js -- those run in
// Node, where the mismatch is invisible. It only breaks in a real browser
// ("no available backend found ... Failed to fetch
// ort-wasm-simd-threaded.jsep.mjs"), which previously let a bad bump slip
// through review unnoticed. This test catches it in CI before it ships.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// onnxruntime-web's "exports" map doesn't expose ./package.json, so
// require('onnxruntime-web/package.json') always throws. This test used to read
// that as "not installed" and skip itself, in CI too. Resolve the entry point
// instead and walk up to the package root.
function installedOrtVersion() {
  let entry;
  try {
    entry = require.resolve('onnxruntime-web');
  } catch {
    return null;
  }
  let dir = path.dirname(entry);
  while (dir !== path.dirname(dir)) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name === 'onnxruntime-web') return pkg.version;
    }
    dir = path.dirname(dir);
  }
  return null;
}

// Must stay in sync with scanic-ml/README.md's "Version pinning" section and
// scanic-ml/build/build.sh's ORT_VERSION. If you deliberately rebuild
// scanic-ml's wasm assets against a newer ONNX Runtime, update all three
// together (and package.json's onnxruntime-web range to match).
const REQUIRED_ORT_ABI_PREFIX = '1.27.';

describe('onnxruntime-web ABI version lock', () => {
  it('matches the version scanic-ml/dist wasm assets were built against', () => {
    // onnxruntime-web is a devDependency, so `npm ci` always installs it. A
    // missing package must fail loudly rather than skip the guard.
    const installedVersion = installedOrtVersion();
    expect(installedVersion, 'onnxruntime-web is not installed (it is a devDependency)').not.toBeNull();

    expect(
      installedVersion.startsWith(REQUIRED_ORT_ABI_PREFIX),
      `Installed onnxruntime-web@${installedVersion} does not match the ABI-locked ` +
      `version (${REQUIRED_ORT_ABI_PREFIX}x) that scanic-ml/dist's custom minimal wasm ` +
      'build requires (see scanic-ml/README.md "Version pinning"). Newer onnxruntime-web ' +
      "releases expect a JSEP/WebGPU-capable wasm+loader pair this build doesn't ship, and " +
      'fail only in a real browser ("no available backend found"), never in these Node ' +
      "tests -- do not bump this dependency without rebuilding scanic-ml's wasm assets to " +
      'match (or explicitly ignoring it in .github/dependabot.yml).'
    ).toBe(true);
  });
});
