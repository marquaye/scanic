# Release script for scanic (PowerShell version)
# Usage: .\scripts\release.ps1 [patch|minor|major]

param(
    [string]$ReleaseType = "patch"
)

Write-Host "🚀 Starting release process..." -ForegroundColor Green

# Check if we're on the main branch
$CurrentBranch = git rev-parse --abbrev-ref HEAD
if ($CurrentBranch -ne "main") {
    Write-Host "❌ Error: Please switch to the main branch before creating a release" -ForegroundColor Red
    exit 1
}

# Check if working directory is clean
$GitStatus = git status --porcelain
if ($GitStatus) {
    Write-Host "❌ Error: Working directory is not clean. Please commit or stash changes." -ForegroundColor Red
    exit 1
}

# Pull latest changes
Write-Host "📥 Pulling latest changes..." -ForegroundColor Blue
git pull origin main

# Install dependencies and build
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm ci

Write-Host "🔨 Building project..." -ForegroundColor Blue
npm run build

# Run tests if they exist
Write-Host "🧪 Running tests..." -ForegroundColor Blue
npm test --if-present

# Version bump
Write-Host "📝 Bumping version ($ReleaseType)..." -ForegroundColor Blue
npm version $ReleaseType --no-git-tag-version

# Get the new version
$NewVersion = (Get-Content package.json | ConvertFrom-Json).version
Write-Host "📊 New version: $NewVersion" -ForegroundColor Green

# Update CHANGELOG
Write-Host "📋 Please update CHANGELOG.md with the new version information" -ForegroundColor Yellow
Write-Host "Press Enter when you've updated the changelog..."
Read-Host

# Commit changes
Write-Host "💾 Committing changes..." -ForegroundColor Blue
git add .
git commit -m "chore: bump version to $NewVersion"

# Create and push tag
Write-Host "🏷️ Creating tag v$NewVersion..." -ForegroundColor Blue
git tag "v$NewVersion"

Write-Host "⬆️ Pushing changes and tags..." -ForegroundColor Blue
git push origin main
git push origin "v$NewVersion"

Write-Host "✅ Release $NewVersion has been created!" -ForegroundColor Green
Write-Host "🎉 The GitHub Actions workflow will now:" -ForegroundColor Green
Write-Host "   - Create a GitHub release"
Write-Host "   - Publish to NPM"
Write-Host "   - Update the demo site"
Write-Host ""
Write-Host "📖 Check the progress at: https://github.com/marquaye/scanic/actions" -ForegroundColor Blue
