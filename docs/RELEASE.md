# Release Process Documentation

This document describes the simplified automated release process for Scanic.

## Prerequisites

1. **NPM Token**: Create an NPM access token with publish permissions and add it as `NPM_TOKEN` in GitHub repository secrets.
2. **Docker**: Ensure Docker is installed locally for WASM builds.

## Release Process

### Simple Release (Recommended)

```bash
# Create a patch release (0.1.1 → 0.1.2)
npm run release

# Create a minor release (0.1.1 → 0.2.0)
npm run release minor

# Create a major release (0.1.1 → 1.0.0)
npm run release major
```

The release script will:
1. ✅ Check you're on main branch
2. ✅ Verify working directory is clean
3. ✅ Build WASM module using Docker
4. ✅ Build the project
5. ✅ Bump version in package.json
6. ✅ Commit and tag the release
7. ✅ Push to GitHub (triggers automated workflow)

### What Happens Automatically

When you push a version tag (e.g., `v1.0.0`), GitHub Actions will:
- Build the project with WASM module
- Create a GitHub release
- Publish to NPM
- Update the demo site

## Manual Process

If you prefer manual control:

```bash
# 1. Build WASM module
npm run build:wasm

# 2. Build project
npm run build

# 3. Version bump
npm version patch  # or minor/major

# 4. Push tag
git push origin main --tags
```

## Package Contents

The NPM package includes:
- `dist/` - Built JavaScript files
- `wasm_blur/pkg/` - WebAssembly files
- `README.md`, `LICENSE`, `package.json`

## Troubleshooting

- **Docker issues**: Ensure Docker is running and the compose file is accessible
- **NPM publish fails**: Check NPM_TOKEN in GitHub secrets
- **WASM build fails**: Verify Docker compose setup in `dev/docker-compose.yml`
