import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');

/**
 * Robustly copy a file or directory recursively
 */
function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

try {
    console.log('📦 Post-build: Copying assets to dist...');
    
    // Copy demo.html to dist/index.html to make it the default page on GH Pages
    if (fs.existsSync('demo.html')) {
        fs.copyFileSync('demo.html', path.join(distDir, 'index.html'));
        console.log('  - demo.html copied as index.html');
    }

    // Copy testImages
    if (fs.existsSync('testImages')) {
        copyRecursive('testImages', path.join(distDir, 'testImages'));
        console.log('  - testImages/ copied');
    }

    console.log('✅ Post-build: Complete!');
} catch (err) {
    console.error('❌ Post-build failed:', err.message);
    process.exit(1);
}
