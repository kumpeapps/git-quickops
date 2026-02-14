# Git QuickOps Tests

This directory contains tests for the Git QuickOps VS Code extension.

## Test Structure

- `suite/build.test.ts` - **Build validation tests** (fast, no VS Code required)
- `suite/buildRunner.ts` - Lightweight test runner for build tests
- `suite/extension.test.ts` - **Integration tests** (requires VS Code)
- `suite/index.ts` - Full test suite runner configuration
- `runTest.ts` - VS Code test harness entry point

## Test Types

### Build Tests (Fast - For Pre-Commit Checks)

**Purpose**: Quick validation that the extension compiles and is properly configured.

**Requirements**: None - runs on compiled JavaScript

**What it tests**:
- ✅ TypeScript compiles without errors
- ✅ All modules are importable
- ✅ Package.json is valid
- ✅ Required fields are present

**Run with**:
```bash
npm test
# or
npm run test:build
```

**Use case**: 
- Pre-commit validation in Git QuickOps
- Quick local checks
- CI build validation

### Integration Tests (Slow - Full Extension Testing)

**Purpose**: Full end-to-end testing with VS Code running.

**Requirements**: VS Code test runner (downloads VS Code if needed)

**What it tests**:
- ✅ Extension loads in VS Code
- ✅ Extension activates successfully
- ✅ All commands are registered
- ✅ Commands execute properly

**Run with**:
```bash
npm run test:integration
```

**Use case**:
- Full CI/CD pipeline testing
- Pre-release validation
- Deep integration checks

## Running Tests

### Quick build validation (used by Git QuickOps pre-commit)
```bash
npm test
```

### Full integration tests
```bash
npm run test:integration
```

### Just compile and verify
```bash
npm run test:compile
```

### Run linter
```bash
npm run lint
```

## Git QuickOps Integration

When Git QuickOps is configured with `requireTests` enabled, it will run:

```bash
npm test
```

This runs the **build tests** which:
- ✅ Complete in seconds (no VS Code download)
- ✅ Validate TypeScript compilation
- ✅ Check module integrity
- ✅ Verify package.json validity
- ❌ Do NOT require VS Code to be running

This is perfect for pre-commit checks because it's:
- **Fast**: Completes in 1-3 seconds
- **Reliable**: No external dependencies
- **Thorough**: Catches build and configuration errors

## Configuration

### .GIT_QUICKOPS_CONFIG Example

To enable test requirements on commit, create `.GIT_QUICKOPS_CONFIG`:

```json
{
  "prefix": "{{ticket}}",
  "requireTests": "prevent"
}
```

Options for `requireTests`:
- `"disabled"` - No tests run (default)
- `"warn"` - Tests run but don't block commits
- `"prevent"` - Tests must pass to commit

## CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Multiple OS platforms (Ubuntu, Windows, macOS)
- Multiple Node.js versions (18.x, 20.x)

CI runs BOTH test types:
1. **Build tests** - Quick validation
2. **Integration tests** - Full VS Code testing

## Adding New Tests

### Build Tests (for pre-commit)

Add to `suite/build.test.ts`:

```typescript
test('My build validation', () => {
    // Your validation here
    assert.ok(true);
});
```

### Integration Tests (for CI/CD)

Add to `suite/extension.test.ts`:

```typescript
test('My integration test', async () => {
    const ext = vscode.extensions.getExtension('KumpeAppsLLC.git-quickops');
    assert.ok(ext);
});
```
