#!/usr/bin/env node

/**
 * Simple release script for scanic (non-interactive)
 * Usage: npm run release:auto [patch|minor|major]
 */

import { execSync } from 'child_process';
import fs from 'fs';

const releaseType = process.argv[2] || 'patch';

function exec(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Error executing: ${command}`);
    process.exit(1);
  }
}

function getCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
}

function isWorkingDirectoryClean() {
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  return status === '';
}

function getPackageVersion() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return packageJson.version;
}

console.log('🚀 Starting automated release process...');

// Check if we're on the main branch
const currentBranch = getCurrentBranch();
if (currentBranch !== 'main') {
  console.error('❌ Error: Please switch to the main branch before creating a release');
  process.exit(1);
}

// Check if working directory is clean
if (!isWorkingDirectoryClean()) {
  console.error('❌ Error: Working directory is not clean. Please commit or stash changes.');
  process.exit(1);
}

// Pull latest changes
console.log('📥 Pulling latest changes...');
exec('git pull origin main');

// Install dependencies and build
console.log('📦 Installing dependencies...');
exec('npm ci');

console.log('🔨 Building project...');
exec('npm run build');

// Run tests if they exist
console.log('🧪 Running tests...');
try {
  exec('npm test');
} catch (error) {
  console.log('ℹ️ No tests found, skipping...');
}

// Version bump
console.log(`📝 Bumping version (${releaseType})...`);
exec(`npm version ${releaseType} --no-git-tag-version`);

// Get the new version
const newVersion = getPackageVersion();
console.log(`📊 New version: ${newVersion}`);

// Commit changes
console.log('💾 Committing changes...');
exec('git add .');
exec(`git commit -m "chore: bump version to ${newVersion}"`);

console.log(`🏷️ Creating tag v${newVersion}...`);
exec(`git tag "v${newVersion}"`);

console.log('⬆️ Pushing changes and tags...');
exec('git push origin main');
exec(`git push origin "v${newVersion}"`);

console.log(`✅ Release ${newVersion} has been created!`);
console.log('🎉 The GitHub Actions workflow will now:');
console.log('   - Create a GitHub release');
console.log('   - Publish to NPM');
console.log('   - Update the demo site');
console.log('');
console.log('📖 Check the progress at: https://github.com/marquaye/scanic/actions');
