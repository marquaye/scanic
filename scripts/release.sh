#!/bin/bash

# Release script for scanic
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Default to patch if no argument provided
RELEASE_TYPE=${1:-patch}

echo "🚀 Starting release process..."

# Check if we're on the main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: Please switch to the main branch before creating a release"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies and build
echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building project..."
npm run build

# Run tests if they exist
echo "🧪 Running tests..."
npm test --if-present

# Version bump
echo "📝 Bumping version ($RELEASE_TYPE)..."
npm version $RELEASE_TYPE --no-git-tag-version

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "📊 New version: $NEW_VERSION"

# Update CHANGELOG
echo "📋 Please update CHANGELOG.md with the new version information"
echo "Press Enter when you've updated the changelog..."
read

# Commit changes
echo "💾 Committing changes..."
git add .
git commit -m "chore: bump version to $NEW_VERSION"

# Create and push tag
echo "🏷️ Creating tag v$NEW_VERSION..."
git tag "v$NEW_VERSION"

echo "⬆️ Pushing changes and tags..."
git push origin main
git push origin "v$NEW_VERSION"

echo "✅ Release $NEW_VERSION has been created!"
echo "🎉 The GitHub Actions workflow will now:"
echo "   - Create a GitHub release"
echo "   - Publish to NPM"
echo "   - Update the demo site"
echo ""
echo "📖 Check the progress at: https://github.com/marquaye/scanic/actions"
