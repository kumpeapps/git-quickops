# Git QuickOps VS Code Extension - Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)
- VS Code (v1.75 or higher)

## Installation Steps

### 1. Install Dependencies

```bash
cd git_helpers/vscode
npm install
```

### 2. Compile the Extension

```bash
npm run compile
```

This will compile the TypeScript source files in `src/` to JavaScript in the `out/` directory.

### 3. Development Mode

To run the extension in development mode:

1. Open the `git_helpers/vscode` folder in VS Code
2. Press `F5` or go to Run → Start Debugging
3. This will open a new VS Code window with the extension loaded
4. In the new window, open a git repository
5. Press `Ctrl+Shift+P` and type "Git QuickOps" to see all commands

### 4. Watch Mode (for development)

To automatically recompile on file changes:

```bash
npm run watch
```

Keep this running in a terminal while developing.

### 5. Package as VSIX (for distribution)

To create a `.vsix` file for installation or publishing:

```bash
# Install vsce globally (one-time)
npm install -g @vscode/vsce

# Package the extension
vsce package
```

This will create a `.vsix` file (e.g., `git-quickops-1.0.0.vsix`) that can be installed in VS Code.

### 6. Install from VSIX

To install the packaged extension:

1. In VS Code, press `Ctrl+Shift+P`
2. Type "Extensions: Install from VSIX"
3. Select the `.vsix` file
4. Reload VS Code when prompted

## Quick Test

After installation, test the extension:

1. Open a git repository in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
3. Type "Git QuickOps: Show Main Menu"
4. You should see the main menu with all categories

## Troubleshooting

### Extension doesn't appear
- Make sure you compiled the TypeScript: `npm run compile`
- Check the Output panel (Help → Toggle Developer Tools → Console) for errors

### Git commands fail
- Ensure git is installed: `git --version`
- Make sure you're in a git repository

### TypeScript errors during compilation
- Try removing `node_modules` and reinstalling: `rm -rf node_modules && npm install`
- Ensure you have TypeScript 5.x: `npm list typescript`

## File Structure

```
git_helpers/vscode/
├── src/
│   ├── extension.ts        # Main extension logic and commands
│   └── gitUtils.ts          # Git utility functions
├── out/                     # Compiled JavaScript (generated)
├── node_modules/            # Dependencies (generated)
├── .vscode/
│   ├── launch.json          # Debug configuration
│   └── tasks.json           # Build tasks
├── package.json             # Extension manifest and dependencies
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.js             # ESLint configuration
├── .vscodeignore            # Files to exclude from VSIX
├── .gitignore               # Git ignore rules
└── README.md                # User documentation
```

## Development Workflow

1. Make changes to `src/extension.ts` or `src/gitUtils.ts`
2. Compile: `npm run compile` (or use watch mode)
3. Press `F5` to test in Extension Development Host
4. Debug using breakpoints in VS Code
5. Check console for errors

## Publishing (Optional)

To publish to VS Code Marketplace:

1. Create a [Personal Access Token](https://dev.azure.com/) with Marketplace access
2. Create a publisher account
3. Update `publisher` in `package.json`
4. Run: `vsce publish`

## Next Steps

- Test all commands thoroughly
- Customize the commit prefix templates
- Add keyboard shortcuts if desired (update `package.json` → `contributes.keybindings`)
- Consider adding icons for better visual appeal

## Support

For issues or questions, please visit:
https://github.com/kumpeapps/helper_scripts
