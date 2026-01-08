#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run(command, options = {}) {
  console.log(`\n🔄 Running: ${command}`);
  try {
    const result = execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      ...options 
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    if (options.optional) {
      console.log('⚠️  Optional command failed, continuing...');
      return null;
    }
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting Scanic Release Process...\n');
  
  try {
    // 1. Check if we're in a clean git state
    console.log('📋 Checking git status...');
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim() !== '') {
      console.error('❌ Git working directory is not clean. Please commit or stash changes.');
      process.exit(1);
    }
    
    // 2. Run Tests
    console.log('\n🧪 Running tests...');
    run('npm test');
    
    // 3. Build WASM module (optional if already built)
    console.log('\n🦀 Building WASM module...');
    const wasmResult = run('docker-compose -f dev/docker-compose.yml up --build', { optional: true });
    
    if (wasmResult === null) {
      console.log('⚠️  Docker not available, checking if WASM module already exists...');
      const wasmPath = path.join(process.cwd(), 'wasm_blur', 'pkg', 'wasm_blur.js');
      if (fs.existsSync(wasmPath)) {
        console.log('✅ WASM module already exists, continuing...');
      } else {
        console.error('❌ WASM module not found and Docker not available. Please build the WASM module first.');
        process.exit(1);
      }
    }
    
    // Build the project
    console.log('\n🏗️  Building project...');
    run('npm run build');
    
    // Update version
    const releaseType = process.argv[2] || 'patch';
    console.log(`\n📦 Bumping ${releaseType} version...`);
    run(`npm version ${releaseType} -m "chore: release v%s"`);
    
    // Get the new version from package.json
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const newVersion = packageJson.version;
    
    // Push to GitHub
    console.log('\n🚀 Pushing to GitHub...');
    run('git push origin main --follow-tags');
    
    console.log(`\n✅ Release v${newVersion} completed successfully!`);
    console.log('🎉 GitHub Action will now handle NPM publishing and GitHub release creation.');
    console.log('\n📊 Monitor the release at: https://github.com/marquaye/scanic/actions');
    
  } catch (error) {
    console.error('\n❌ Release failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
