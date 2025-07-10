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

function updateVersion(type = 'patch') {
  console.log(`\n📦 Bumping ${type} version...`);
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const [major, minor, patch] = packageJson.version.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  const oldVersion = packageJson.version;
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ Version updated: ${oldVersion} → ${newVersion}`);
  return newVersion;
}

async function main() {
  console.log('🚀 Starting Scanic Release Process...\n');
  
  try {
    // Check if we're in a clean git state
    console.log('📋 Checking git status...');
    run('git status --porcelain', { stdio: 'pipe' });
    
    // Build WASM module (optional if already built)
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
    const newVersion = updateVersion(releaseType);
    
    // Commit changes
    console.log('\n📝 Committing changes...');
    run('git add .');
    run(`git commit -m "chore: release v${newVersion}"`);
    
    // Create tag
    console.log('\n🏷️  Creating tag...');
    run(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
    
    // Push to GitHub
    console.log('\n🚀 Pushing to GitHub...');
    run('git push origin main');
    run('git push origin --tags');
    
    console.log(`\n✅ Release v${newVersion} completed successfully!`);
    console.log('🎉 GitHub Action will now handle NPM publishing and GitHub release creation.');
    console.log('\n📊 Monitor the release at: https://github.com/marquaye/scanic/actions');
    
  } catch (error) {
    console.error('\n❌ Release failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
