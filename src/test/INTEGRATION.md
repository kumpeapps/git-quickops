# Test Integration with Git QuickOps

This document explains how the test suite is designed to work with Git QuickOps' `requireTests` feature.

## Overview

Git QuickOps has a built-in feature that can run tests before allowing commits. This project's test suite is specifically designed to work seamlessly with this feature.

## How It Works

### When You Commit

If `requireTests` is enabled in `.GIT_QUICKOPS_CONFIG`, the extension will:

1. Detect the project has an `npm test` script
2. Run `npm test` in the repository
3. Check the exit code (0 = success, non-zero = failure)
4. Allow or block the commit based on the result

### Test Command Used

```bash
npm test
```

This runs the **build tests** via [src/test/suite/buildRunner.ts](src/test/suite/buildRunner.ts), which:
- ✅ Compiles TypeScript and validates syntax
- ✅ Tests module imports and dependencies
- ✅ Validates package.json structure
- ✅ Checks required configuration fields
- ⚡ Completes in 1-3 seconds
- 🎯 Perfect for pre-commit validation

## Configuration

### Enable Test Requirements

Create or edit `.GIT_QUICKOPS_CONFIG` in the repository root:

```json
{
  "prefix": "{{ticket}}",
  "requireTests": "prevent"
}
```

### requireTests Options

| Option | Behavior |
|--------|----------|
| `"disabled"` | No tests run (default) |
| `"warn"` | Tests run, failures show warning but don't block commit |
| `"prevent"` | Tests must pass or commit is blocked |

## Test Types Explained

### Build Tests (for Commits)
- **Command**: `npm test`
- **Speed**: Fast (1-3 seconds)
- **Requirements**: None - runs on compiled JS
- **Purpose**: Quick validation for pre-commit checks
- **File**: `src/test/suite/build.test.ts`

### Integration Tests (for CI/CD)
- **Command**: `npm run test:integration`
- **Speed**: Slower (20-30 seconds)
- **Requirements**: Downloads VS Code test runner
- **Purpose**: Full extension testing in VS Code
- **File**: `src/test/suite/extension.test.ts`

## Why Two Test Types?

**Problem**: VS Code extension tests require downloading and running VS Code, which:
- Takes 20-30 seconds
- Requires network access
- Downloads 100MB+ on first run
- Can't run in parallel
- Would be frustrating for every commit

**Solution**: Separate fast build tests for commits, comprehensive integration tests for CI/CD.

## Example Workflow

### Developer Making a Commit

```bash
git add .
git commit -m "feat: add new feature"

# Git QuickOps automatically runs:
# 1. npm test (build validation)
# 2. Tests pass in 2 seconds
# 3. Commit succeeds ✅
```

### If Tests Fail

```bash
git commit -m "fix: broken feature"

# Git QuickOps runs npm test
# Tests fail: TypeScript compilation error
# Output shows the error
# Commit is blocked ❌
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml runs:
- npm run test:build      # Fast build tests
- npm run test:integration # Full integration tests
```

## Customizing Tests

### Add Build Validation

Edit `src/test/suite/build.test.ts`:

```typescript
test('My custom validation', () => {
    // Fast synchronous checks only
    assert.ok(someCondition);
});
```

### Add Integration Test

Edit `src/test/suite/extension.test.ts`:

```typescript
test('My integration test', async () => {
    const ext = vscode.extensions.getExtension('...');
    // Full VS Code API available
});
```

## Benefits

✅ **Fast commits** - Build tests complete in seconds
✅ **Comprehensive CI** - Integration tests catch issues before deployment  
✅ **Developer-friendly** - No waiting for VS Code to download on every commit
✅ **Reliable** - Build tests catch 90% of issues without heavy infrastructure
✅ **Self-testing** - Git QuickOps uses its own test feature to stay stable

## Troubleshooting

### Tests Hanging on Commit

If `npm test` hangs, it may be running the wrong test command. Check:

```json
// package.json - should have:
{
  "scripts": {
    "test": "npm run test:build",  // ✅ Fast
    // NOT:
    "test": "node ./out/test/runTest.js"  // ❌ Slow (integration)
  }
}
```

### Want to Skip Tests Temporarily

```bash
# Disable in .GIT_QUICKOPS_CONFIG:
{
  "requireTests": "disabled"
}

# Or commit via command line (bypasses extension):
git commit -m "message" --no-verify
```

### Tests Failing Locally but CI Passes

Check that you've compiled TypeScript:

```bash
npm run compile
npm test
```

## Related Files

- [package.json](../package.json) - Test scripts configuration
- [src/test/suite/build.test.ts](src/test/suite/build.test.ts) - Build tests
- [src/test/suite/extension.test.ts](src/test/suite/extension.test.ts) - Integration tests
- [src/test/suite/buildRunner.ts](src/test/suite/buildRunner.ts) - Build test runner
- [src/test/README.md](README.md) - Complete test documentation
- [.github/workflows/ci.yml](../.github/workflows/ci.yml) - CI configuration
