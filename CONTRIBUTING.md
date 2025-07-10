# Contributing to Scanic

Thank you for your interest in contributing to Scanic! This guide will help you get started.

## Development Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/marquaye/scanic.git
   cd scanic
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

## Project Structure

```
scanic/
├── src/                 # Source code
│   ├── index.js        # Main entry point
│   ├── edgeDetection.js # Edge detection algorithms
│   ├── contourDetection.js # Contour detection
│   ├── cornerDetection.js # Corner detection
│   ├── liveScanner.js  # Live scanner functionality
│   └── ...
├── wasm_blur/          # Rust WebAssembly module
├── dist/               # Built files
├── testImages/         # Test images for development
├── dev/                # Development files
└── docs/               # Documentation
```

## Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow the existing code style
   - Add comments for complex algorithms
   - Update documentation if needed

3. **Test your changes**:
   ```bash
   npm run build
   # Test manually using the dev server
   npm run dev
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

## Release Process

For maintainers creating releases:

```bash
# Simple release process
npm run release [patch|minor|major]
```

This will:
- Check you're on main branch
- Verify working directory is clean
- Build WASM module using Docker
- Build the project
- Bump version
- Create git tag
- Push changes and trigger GitHub Actions

You can also build just the WASM module:
```bash
npm run build:wasm
```

## Commit Message Format

We use conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks

## Pull Request Process

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a pull request**:
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

3. **Code review**:
   - Address any feedback
   - Make changes if requested
   - Keep the PR updated

## Areas for Contribution

### 🐛 Bug Reports
- Use the GitHub issue tracker
- Include reproduction steps
- Provide example images if relevant

### 💡 Feature Requests
- Discuss in issues first
- Consider performance implications
- Ensure compatibility across browsers

### 🔧 Code Contributions
- **Performance optimizations**: Always welcome
- **New algorithms**: Document thoroughly
- **Browser compatibility**: Test across browsers
- **WebAssembly improvements**: Rust experience helpful

### 📚 Documentation
- API documentation improvements
- Example code and tutorials
- Performance guides
- Integration examples

## WebAssembly Development

If you want to work on the Rust WebAssembly module:

1. **Install Rust**:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install wasm-pack**:
   ```bash
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

3. **Build the WASM module**:
   ```bash
   cd wasm_blur
   wasm-pack build --target web
   ```

4. **Or use Docker**:
   ```bash
   docker compose -f docker-compose.yml up -d --build
   ```

## Testing

Currently, we rely on manual testing with the development server. We welcome contributions to add:

- Unit tests for individual algorithms
- Integration tests for the main API
- Performance benchmarks
- Cross-browser testing

## Performance Considerations

When contributing, please consider:

- **Memory usage**: Avoid memory leaks in image processing
- **Processing time**: Profile your changes
- **Bundle size**: Keep additions minimal
- **Browser compatibility**: Test on different browsers

## Code Style

- Use ES6+ features where appropriate
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Keep functions focused and small
- Use meaningful variable names

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For general questions and ideas
- **Code Review**: In pull requests

## License

By contributing to Scanic, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:
- README.md acknowledgments
- Release notes for significant contributions
- GitHub contributor graphs

Thank you for helping make Scanic better! 🚀
