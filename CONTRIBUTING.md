# Contributing to Git QuickOps

Thank you for your interest in contributing to Git QuickOps! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18.x or 20.x
- npm (comes with Node.js)
- VS Code (latest stable version)
- Git

### Initial Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/kumpeapps/git-quickops.git
   cd git-quickops
   ```

2. **Install Dependencies**
   ```bash
   npm ci
   ```

3. **Compile the Extension**
   ```bash
   npm run compile
   ```

## Development Workflow

### Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Edit files in the `src/` directory
   - Follow the existing code style
   - Add tests if applicable

3. **Test Your Changes**
   ```bash
   # Compile and check for errors
   npm run compile
   
   # Run linter
   npm run lint
   
   # Run tests
   npm test
   ```

4. **Debug the Extension**
   - Press `F5` in VS Code to launch a new Extension Development Host
   - Test your changes in the development window
   - Check the Output panel for any errors

### Code Style

- Use TypeScript with strict type checking
- Follow the existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose

### Testing

#### Running Tests

```bash
# Run build tests (fast - for pre-commit)
npm test

# Run full integration tests (requires VS Code)
npm run test:integration

# Run build test only
npm run test:compile

# Run linter
npm run lint
```

#### Test Types

**Build Tests** (`npm test`)
- ✅ Fast (1-3 seconds)
- ✅ No VS Code required
- ✅ Validates compilation and module integrity
- ✅ Used by Git QuickOps pre-commit checks
- 📝 Located in: `src/test/suite/build.test.ts`

**Integration Tests** (`npm run test:integration`)
- ✅ Comprehensive end-to-end testing
- ⚠️ Downloads/requires VS Code
- ✅ Tests extension activation and commands
- ✅ Used in CI/CD pipeline
- 📝 Located in: `src/test/suite/extension.test.ts`

#### Adding Tests

**For build validation** (will run on every commit if tests are enabled):

```typescript
// src/test/suite/build.test.ts
test('My validation', () => {
    // Fast, synchronous checks
    assert.ok(true);
});
```

**For integration testing** (CI/CD only):

```typescript
// src/test/suite/extension.test.ts  
test('My integration test', async () => {
    const ext = vscode.extensions.getExtension('KumpeAppsLLC.git-quickops');
    assert.ok(ext);
});
```

### Git QuickOps Test Integration

This project uses its own test requirement feature! When you commit, it automatically runs `npm test` to validate the build.

To see this in action, check the `.GIT_QUICKOPS_CONFIG` file in the repository root.

#### Adding Tests

Create test files in `src/test/suite/` with the `.test.ts` extension:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('My Feature Test Suite', () => {
    test('Should do something', () => {
        // Your test here
        assert.strictEqual(1 + 1, 2);
    });
});
```

### Pre-Push Validation

Before pushing your changes, run the validation script to ensure everything works:

**Linux/macOS:**
```bash
./scripts/validate.sh
```

**Windows:**
```cmd
scripts\validate.bat
```

Or use npm:
```bash
npm run validate
```

This validates:
- ✅ Dependencies install cleanly
- ✅ Code passes linting
- ✅ TypeScript compiles without errors
- ✅ package.json is valid
- ✅ Extension packages successfully

## Submitting Changes

### Pull Request Process

1. **Update CHANGELOG**
   - Add your changes to the unreleased section
   - Follow the existing format

2. **Push Your Branch**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request**
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your feature branch
   - Fill in the PR template with:
     - Description of changes
     - Related issue numbers (if any)
     - Testing performed
     - Screenshots (if UI changes)

4. **CI Checks**
   - Wait for CI checks to pass
   - Fix any issues that arise
   - The PR will be tested on:
     - Ubuntu, Windows, macOS
     - Node.js 18.x and 20.x

5. **Code Review**
   - Address reviewer feedback
   - Make requested changes
   - Push updates to your branch

### PR Guidelines

- **Keep PRs focused** - One feature or fix per PR
- **Write clear commit messages** - Use conventional commits format
- **Update documentation** - Include README updates if needed
- **Add tests** - For new features or bug fixes
- **Pass all checks** - Ensure CI passes before requesting review

## Continuous Integration

### GitHub Actions Workflows

The project uses two main workflows:

1. **CI Build and Test** (`.github/workflows/ci.yml`)
   - Runs on every push and pull request
   - Tests on multiple platforms and Node versions
   - Must pass before merging

2. **Publish to Marketplace** (`.github/workflows/publish.yml`)
   - Runs on release creation
   - Publishes to VS Code Marketplace
   - Creates release artifacts

### What CI Tests

- ✅ Code linting (ESLint)
- ✅ TypeScript compilation
- ✅ Extension packaging
- ✅ Integration tests
- ✅ Package validation
- ✅ Multi-platform compatibility

## Project Structure

```
git-quickops/
├── .github/
│   ├── workflows/          # CI/CD workflows
│   └── instructions/       # Copilot instructions
├── media/                  # Webview assets (CSS, JS)
├── scripts/               # Build and validation scripts
├── src/
│   ├── changesTreeProvider.ts
│   ├── commitsTreeProvider.ts
│   ├── extension.ts       # Main entry point
│   ├── gitUtils.ts        # Git command utilities
│   ├── menuTreeProvider.ts
│   ├── navigationTreeProvider.ts
│   ├── webviewProvider.ts
│   └── test/              # Test files
│       ├── suite/
│       │   ├── extension.test.ts
│       │   └── index.ts
│       ├── runTest.ts
│       └── README.md
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript config
└── README.md
```

## Need Help?

- **Issues** - Open an issue on GitHub for bugs or feature requests
- **Discussions** - Use GitHub Discussions for questions
- **Documentation** - Check the README and inline code comments

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## License

By contributing to Git QuickOps, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing! 🎉
