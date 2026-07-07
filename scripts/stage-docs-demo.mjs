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

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

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
  copyFile(path.join(root, 'public', 'scanic-logo-bg.png'), path.join(target, 'scanic-logo-bg.png'));
  copyFile(path.join(root, 'public', 'favicon.ico'), path.join(target, 'favicon.ico'));

  // Sample images used by the demo gallery
  if (fs.existsSync(path.join(root, 'testImages'))) {
    copyRecursive(path.join(root, 'testImages'), path.join(target, 'testImages'));
    console.log('  - testImages/ copied');
  }

  console.log('✅ Demo staged at docs/public/demo/');
} catch (err) {
  console.error('❌ Demo staging failed:', err.message);
  process.exit(1);
}
