# Release Process Documentation

This document describes the automated release process for Scanic using GitHub Actions.

## Overview

The release process is fully automated using GitHub Actions. When you push a version tag to the main branch, the following happens automatically:

1. **Build**: The project is built and tested
2. **GitHub Release**: A GitHub release is created with release notes
3. **NPM Publish**: The package is published to NPM
4. **Demo Update**: The demo site is updated on GitHub Pages

## Prerequisites

Before you can use the automated release process, you need to set up the following:

### 1. NPM Token

1. Go to [npmjs.com](https://www.npmjs.com/) and log in
2. Click on your profile → "Access Tokens"
3. Click "Generate New Token" → "Classic Token"
4. Select "Publish" scope
5. Copy the token

### 2. GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Add the following repository secrets:
   - `NPM_TOKEN`: Your NPM publish token from step 1

Note: `GITHUB_TOKEN` is automatically provided by GitHub Actions.

## Release Methods

### Method 1: Using the Release Script (Recommended)

The easiest way to create a release is using the provided release script:

```bash
# For patch version (0.1.1 → 0.1.2)
npm run release

# For minor version (0.1.1 → 0.2.0)
npm run release minor

# For major version (0.1.1 → 1.0.0)
npm run release major
```

The script will:
- Check you're on the main branch
- Verify working directory is clean
- Pull latest changes
- Install dependencies and build
- Run tests
- Bump version in package.json
- Prompt you to update CHANGELOG.md
- Commit changes
- Create and push a version tag
- Trigger the automated release workflow

### Method 2: Manual Release

If you prefer to do it manually:

1. **Ensure you're on the main branch**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Build and test**:
   ```bash
   npm ci
   npm run build
   npm test
   ```

3. **Update version** (choose one):
   ```bash
   npm version patch    # 0.1.1 → 0.1.2
   npm version minor    # 0.1.1 → 0.2.0
   npm version major    # 0.1.1 → 1.0.0
   ```

4. **Update CHANGELOG.md** with the new version information

5. **Commit and tag**:
   ```bash
   git add .
   git commit -m "chore: bump version to X.X.X"
   git tag "vX.X.X"
   ```

6. **Push changes**:
   ```bash
   git push origin main
   git push origin vX.X.X
   ```

## Workflow Details

### Release Workflow (.github/workflows/release.yml)

This workflow is triggered when:
- A tag matching `v*` is pushed (e.g., `v1.0.0`)
- Code is pushed to the main branch (for demo updates only)

**Jobs:**

1. **build**: Builds the project and creates artifacts
2. **create-release**: Creates a GitHub release with download links
3. **publish-npm**: Publishes the package to NPM
4. **update-demo**: Updates the GitHub Pages demo site

### CI Workflow (.github/workflows/ci.yml)

This workflow runs on:
- Pull requests to main
- Pushes to branches other than main

**Jobs:**

1. **test**: Tests the build on multiple Node.js versions (18, 20, 22)
2. **lint**: Runs linting if configured

## Package Contents

The NPM package includes only the necessary files:

```
scanic/
├── dist/                 # Built JavaScript files
│   ├── scanic.js        # ES module build
│   └── scanic.umd.cjs   # UMD build
├── wasm_blur/pkg/       # WebAssembly files
├── README.md
├── LICENSE
└── package.json
```

This is controlled by the `files` field in `package.json` and `.npmignore`.

## Version Strategy

We follow [Semantic Versioning](https://semver.org/):

- **PATCH** (0.1.1 → 0.1.2): Bug fixes, small improvements
- **MINOR** (0.1.1 → 0.2.0): New features, backwards compatible
- **MAJOR** (0.1.1 → 1.0.0): Breaking changes

## Troubleshooting

### Release fails with "403 Forbidden" on NPM

- Check that your NPM_TOKEN is valid and has publish permissions
- Ensure the package name is available on NPM
- Verify the token is correctly set in GitHub secrets

### GitHub release creation fails

- Check that GITHUB_TOKEN has the necessary permissions
- Ensure the tag format is correct (v1.0.0, not 1.0.0)

### Demo site doesn't update

- Check that GitHub Pages is enabled in repository settings
- Verify the workflow has permission to push to gh-pages branch

### Build fails

- Check that all dependencies are properly listed in package.json
- Ensure the build script works locally
- Verify that WASM files are present in the repository

## Manual NPM Publishing

If you need to publish manually:

```bash
# Build the project
npm run build

# Publish to NPM
npm publish

# Or publish with a tag
npm publish --tag beta
```

## Rollback

If you need to rollback a release:

1. **Unpublish from NPM** (within 24 hours):
   ```bash
   npm unpublish scanic@X.X.X
   ```

2. **Delete the GitHub release and tag**:
   - Go to GitHub → Releases → Delete the release
   - Delete the tag: `git tag -d vX.X.X && git push origin :refs/tags/vX.X.X`

3. **Revert the version commit**:
   ```bash
   git revert HEAD
   git push origin main
   ```
