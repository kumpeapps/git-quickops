---
description: GitHub Copilot instructions for the Git QuickOps VS Code extension project
applyTo: '**'
---

# Git QuickOps Extension - Copilot Instructions

## Project Overview

Git QuickOps is a VS Code extension that provides a comprehensive, menu-driven interface for git operations. It offers both a webview sidebar interface and command palette access to all git operations.

## Architecture

### Core Components

1. **extension.ts** - Main extension entry point, command registration, and git operation implementations
2. **webviewProvider.ts** - Manages webview sidebar panels for repositories, menu, changes, and commits
3. **menuTreeProvider.ts** - Provides tree view data for menu navigation
4. **gitUtils.ts** - Core git command execution and utility functions
5. **changesTreeProvider.ts** - File change tracking and staging
6. **commitsTreeProvider.ts** - Commit history visualization
7. **navigationTreeProvider.ts** - Navigation state management

### File Locations

- Source code: `src/`
- Compiled output: `out/`
- Webview assets: `media/`
- Configuration: `.github/instructions/`

## Development Guidelines

### Adding New Features

1. **New Git Command:**
   - Add function to `src/gitUtils.ts` if needed
   - Implement command handler in `src/extension.ts` (named `cmdXxx()`)
   - Register command in `activate()` function
   - Add to webview menu in `src/webviewProvider.ts` under `_getMenuItems()`
   - Update README.md with feature documentation

2. **Webview Changes:**
   - Update `src/webviewProvider.ts` for data fetching
   - Modify `media/main.js` for rendering
   - Update `media/style.css` for styling

3. **Menu Items:**
   - Add to appropriate menu category in `_getMenuItems()` in webviewProvider
   - Format: `{ label: 'Action Name', icon: '🎯', command: 'git-quickops.cmd.actionName' }`

### Code Patterns

**Command Registration:**
```typescript
vscode.commands.registerCommand('git-quickops.cmd.commandName', () => cmdCommandName())
```

**Git Execution:**
```typescript
await git.execGit(gitRoot, ['command', 'args']);
```

**User Input:**
```typescript
const input = await vscode.window.showInputBox({
    prompt: 'Prompt text',
    placeHolder: 'placeholder'
});
```

**Branch/Option Selection:**
```typescript
const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select option'
});
```

### Testing Requirements

- Must test with both single and multiple repository workspaces
- Test with uncommitted changes present
- Verify error handling for invalid git states
- Check integration with Codacy for code quality

### Build Process

1. **Compile TypeScript:** `npm run compile`
2. **Package Extension:** `npx @vscode/vsce package`
3. **Install Locally:** `code --install-extension git-quickops-*.vsix`
4. **Test:** Reload VS Code window after installation

### Menu Structure

Current menu categories:
- **Common Commands**: Status, add, commit, push, pull, fetch, log, diff
- **Branch Management**: Create, create from, switch, checkout from remote, rename, delete, merge
- **Commit History**: Rewrite, rebase, squash, undo, amend
- **Cleanup**: Prune remotes, delete orphan/merged branches
- **Stash**: Save, list, pop
- **Tags**: Create tags
- **Remotes**: Set upstream
- **Utilities**: Restore files, unstage, set prefix
- **Setup**: Configure repository settings

### Important Notes

- Always use `RepositoryContext.getGitRoot()` to get current repository path
- Handle multiple workspace folders properly
- Show progress notifications for long-running operations
- Provide clear error messages with actionable guidance
- Support both local and remote branch operations
- Integrate with Codacy CLI for code analysis

### Common Issues

1. **Extension not updating:** Uninstall completely before reinstalling
2. **Webview not showing changes:** Check if media files are included in VSIX
3. **Commands not working:** Verify command registration in package.json and extension.ts
4. **Git operations failing:** Ensure proper error handling and user feedback

### Repository Information

- **Repository:** kumpeapps/git-quickops
- **Publisher:** kumpeapps
- **Current Version:** 0.0.1

### Key Features to Remember

- Webview sidebar with 4 panels (repositories, menu, changes, commits)
- Command palette access to all operations
- Automatic commit prefix support
- Test integration before commits
- Multi-repository support
- Interactive commit history with right-click menus
- File staging/unstaging in changes view
- Real-time auto-refresh of git state
