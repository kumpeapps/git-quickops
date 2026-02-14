#!/bin/bash
# Pre-push validation script
# Run this before pushing to ensure all checks pass

set -e

echo "🔍 Starting Git QuickOps validation..."
echo ""

echo "📦 Installing dependencies..."
npm ci
echo "✅ Dependencies installed"
echo ""

echo "🔍 Running ESLint..."
npm run lint
echo "✅ Lint passed"
echo ""

echo "🔨 Compiling TypeScript..."
npm run compile
echo "✅ Compilation successful"
echo ""

echo "🧪 Running build tests..."
npm test
echo "✅ Build tests passed"
echo ""

echo "📝 Validating package.json..."
node -e "
const pkg = require('./package.json');
const required = ['name', 'displayName', 'version', 'publisher', 'engines', 'categories', 'main'];
const missing = required.filter(f => !pkg[f]);
if (missing.length) {
  console.error('❌ Missing required fields:', missing);
  process.exit(1);
}
console.log('✅ Package.json valid');
"
echo ""

echo "📦 Packaging extension..."
npx @vscode/vsce package --no-dependencies
echo "✅ Extension packaged successfully"
echo ""

echo "🎉 All validation checks passed!"
echo ""
echo "Extension is ready to push/publish"
