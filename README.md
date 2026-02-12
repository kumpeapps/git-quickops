# Git QuickOps VS Code Extension

A comprehensive git operations toolkit with an intuitive menu-driven interface, bringing the power of the git-quickops shell script directly into VS Code.

## Features

- **Menu-driven interface** - Easy-to-navigate quick pick menus for all git operations
- **Common Commands** - Quick access to status, add, commit, push, pull, fetch, log, and diff
- **Branch Management** - Create, switch, rename, delete, and merge branches with ease
- **Commit History** - Rewrite, rebase, squash, undo, and amend commits
- **Cleanup Tools** - Prune remotes, delete orphan branches, and remove merged branches
- **Stash Operations** - Save, list, and pop stashes
- **Tag Management** - Create and push tags
- **Remote Operations** - Set upstream and push
- **Utilities** - Restore files, unstage changes, and configure commit prefixes
- **Commit Prefix Support** - Automatically prefix commits with branch name or ticket number

## Usage

### Open the Main Menu

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and type:
- **Git QuickOps: Show Main Menu** - Opens the main category menu

### Direct Command Access

You can also access specific categories directly:
- **Git QuickOps: Common Commands** - Quick access to common git operations
- **Git QuickOps: Branch Management** - Branch operations
- **Git QuickOps: Commit History** - History manipulation
- **Git QuickOps: Cleanup** - Repository cleanup operations
- **Git QuickOps: Stash** - Stash operations
- **Git QuickOps: Tags** - Tag management
- **Git QuickOps: Remotes** - Remote operations
- **Git QuickOps: Utilities** - Utility functions
- **Git QuickOps: Add → Commit → Push** - Quick workflow command

### Common Commands

- **Show Status** - Display git status
- **Add Changes** - Stage changes (all or selected files)
- **Add → Commit → Push** - Complete workflow in one command
- **Commit** - Commit staged changes with message
- **Push** - Push to remote
- **Pull** - Pull from remote
- **Fetch** - Fetch from remote
- **View Log** - View commit history
- **View Diff** - View changes (working directory or staged)

### Branch Management

- **Create Branch** - Create and switch to new branch
- **Create Branch From...** - Create branch from specific commit/branch
- **Switch Branch** - Switch to existing branch
- **Rename Branch** - Rename current branch
- **Delete Branch** - Delete one or more branches
- **Merge Branch** - Merge another branch into current

### Commit History

- **Rewrite to Single Commit** - Squash all commits into one
- **Rebase Onto Branch** - Rebase current branch onto another
- **Squash Last N Commits** - Interactive rebase to squash commits
- **Undo Last Commit** - Undo last commit but keep changes
- **Amend Last Commit Message** - Change the last commit message

### Cleanup

- **Fetch + Prune Remotes** - Update remote tracking and remove stale references
- **Delete Orphan Branches** - Remove local branches not present on remote
- **Delete Merged Branches** - Remove branches already merged into default branch

### Stash

- **Stash Save** - Save current changes to stash
- **Stash List** - View all stashes
- **Stash Pop** - Apply and remove a stash

### Tags

- **Create Tag** - Create a new tag (annotated or lightweight)

### Remotes

- **Push and Set Upstream** - Push current branch and set upstream tracking

### Utilities

- **Restore File from HEAD** - Discard changes to a specific file
- **Unstage All Changes** - Unstage all staged changes
- **Set Commit Prefix** - Configure automatic commit message prefixing

## Configuration

### Commit Prefix

Configure automatic commit message prefixing with placeholders:

**Settings:**
- `gitQuickOps.commitPrefix` - Default commit prefix template
- `gitQuickOps.defaultRemote` - Default remote name (default: "origin")

**Placeholders:**
- `{{branch}}` - Replaced with current branch name
- `{{ticket}}` - Automatically extracted from branch name (e.g., PROJ-123 from feature/PROJ-123-description)

**Examples:**
- `{{ticket}}: ` → "PROJ-123: my commit message"
- `[{{branch}}] ` → "[feature/my-feature] my commit message"
- `{{ticket}} - {{branch}}: ` → "PROJ-123 - feature/my-feature: my commit message"

**Repo-specific prefix:**
You can also set a repo-specific prefix by creating a `.GIT_QUICKOPS_PREFIX` file in your repository root. This takes precedence over the workspace setting.

**Note:** Legacy `.GIT_HELPER_PREFIX` files are also supported for backwards compatibility.

### Settings

Open VS Code settings and search for "Git QuickOps" to configure:

```json
{
  "gitQuickOps.commitPrefix": "{{ticket}}: ",
  "gitQuickOps.defaultRemote": "origin"
}
```

## Requirements

- Git must be installed and available on your system
- A git repository must be open in the workspace

## Installation

### From VSIX

1. Download the `.vsix` file
2. Open VS Code
3. Press `Ctrl+Shift+P` and type "Install from VSIX"
4. Select the downloaded file

### From Source

1. Clone the repository
2. Navigate to `git_helpers/vscode`
3. Run `npm install`
4. Run `npm run compile`
5. Press F5 to open extension development host

## Building

```bash
cd git_helpers/vscode
npm install
npm run compile
```

To package as VSIX:
```bash
npm install -g @vscode/vsce
vsce package
```

## Contributing

This extension is part of the [kumpeapps/helper_scripts](https://github.com/kumpeapps/helper_scripts) repository. Contributions are welcome!

## License

See the LICENSE file in the repository root.

## Changelog

### 1.0.0
- Initial release
- Converted from bash script to VS Code extension
- Full feature parity with git-quickops.sh
- Added VS Code-native UI integration
- Support for commit message prefixing
- Multi-select operations for branch deletion
- Output channels for command results

## Related

This extension is based on the git-quickops.sh bash script from the same repository. Both tools provide the same functionality with different interfaces - choose the one that fits your workflow best!
