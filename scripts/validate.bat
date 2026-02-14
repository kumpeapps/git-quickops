@echo off
REM Pre-push validation script for Windows
REM Run this before pushing to ensure all checks pass

echo Starting Git QuickOps validation...
echo.

echo Installing dependencies...
call npm ci
if errorlevel 1 (
    echo Dependencies installation failed
    exit /b 1
)
echo Dependencies installed
echo.

echo Running ESLint...
call npm run lint
if errorlevel 1 (
    echo Lint check failed
    exit /b 1
)
echo Lint passed
echo.

echo Compiling TypeScript...
call npm run compile
if errorlevel 1 (
    echo Compilation failed
    exit /b 1
)
echo Compilation successful
echo.

echo Running build tests...
call npm test
if errorlevel 1 (
    echo Build tests failed
    exit /b 1
)
echo Build tests passed
echo.

echo Validating package.json...
node -e "const pkg = require('./package.json'); const required = ['name', 'displayName', 'version', 'publisher', 'engines', 'categories', 'main']; const missing = required.filter(f => !pkg[f]); if (missing.length) { console.error('Missing required fields:', missing); process.exit(1); } console.log('Package.json valid');"
if errorlevel 1 (
    echo Package validation failed
    exit /b 1
)
echo.

echo Packaging extension...
call npx @vscode/vsce package --no-dependencies
if errorlevel 1 (
    echo Packaging failed
    exit /b 1
)
echo Extension packaged successfully
echo.

echo All validation checks passed!
echo.
echo Extension is ready to push/publish
