import fs from 'fs';
import path from 'path';

/**
 * Stages the existing interactive demo as a static asset for the VitePress docs
 * site. The demo lives at the repo root (`demo.html`) and imports `./scanic.js`
 * as a sibling module, so we copy the built library next to it.
 *
 * Output lands in `docs/public/demo/`, which VitePress serves verbatim, so the
 * demo is published at `/scanic/demo/`. This directory is generated (gitignored);
 * `demo.html` remains the source of truth.
 */

const root = process.cwd();
const target = path.join(root, 'docs', 'public', 'demo');

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  ! skipped (missing): ${src}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

try {
  console.log('📦 Staging demo into docs/public/demo ...');

  if (!fs.existsSync(path.join(root, 'dist', 'scanic.js'))) {
    throw new Error('dist/scanic.js not found. Run "npm run build" first.');
  }

  fs.mkdirSync(target, { recursive: true });

  // demo.html → index.html (so /demo/ serves it)
  copyFile(path.join(root, 'demo.html'), path.join(target, 'index.html'));
  // The library bundle the demo imports as ./scanic.js
  copyFile(path.join(root, 'dist', 'scanic.js'), path.join(target, 'scanic.js'));
  // Lazy, code-split sibling chunks (mlDetector + bundled onnxruntime-web) that
  // scanic.js dynamically imports when `detector: 'ml'` is used.
  for (const chunk of fs.readdirSync(path.join(root, 'dist'))) {
    if (chunk.startsWith('scanic-') && chunk.endsWith('.js')) {
      copyFile(path.join(root, 'dist', chunk), path.join(target, chunk));
    }
  }
  // Assets the demo references
  copyFile(path.join(root, 'public', 'scanic-icon.png'), path.join(target, 'scanic-icon.png'));
  copyFile(path.join(root, 'public', 'favicon.ico'), path.join(target, 'favicon.ico'));

  // Only the sample images the demo gallery lists. testImages/ also holds
  // fixtures for the test suite that the demo does not show.
  const demoHtml = fs.readFileSync(path.join(root, 'demo.html'), 'utf8');
  const sampleList = demoHtml.match(/const SAMPLE_IMAGES = \[([^\]]*)\]/);
  if (!sampleList) {
    throw new Error('SAMPLE_IMAGES not found in demo.html');
  }
  const samples = [...sampleList[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  fs.rmSync(path.join(target, 'testImages'), { recursive: true, force: true });
  for (const name of samples) {
    copyFile(path.join(root, 'testImages', name), path.join(target, 'testImages', name));
  }
  console.log(`  - ${samples.length} sample images copied`);

  console.log('✅ Demo staged at docs/public/demo/');
} catch (err) {
  console.error('❌ Demo staging failed:', err.message);
  process.exit(1);
}
