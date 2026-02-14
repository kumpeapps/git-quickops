# Git QuickOps VS Code Extension

[![CI Build and Test](https://github.com/kumpeapps/git-quickops/actions/workflows/ci.yml/badge.svg)](https://github.com/kumpeapps/git-quickops/actions/workflows/ci.yml)
[![Publish to VS Code Marketplace](https://github.com/kumpeapps/git-quickops/actions/workflows/publish.yml/badge.svg)](https://github.com/kumpeapps/git-quickops/actions/workflows/publish.yml)

![Git QuickOps Logo](icon.png)

A comprehensive git operations toolkit with both a visual sidebar interface and menu-driven command palette, bringing the power of the git-quickops shell script directly into VS Code with a native GUI experience.

## Features

- **Sidebar GUI Interface** - Comprehensive webview sidebar with 4 panels for repository management, menu navigation, file changes, and commit history
- **Menu-driven interface** - Easy-to-navigate quick pick menus for all git operations
- **Common Commands** - Quick access to status, add, commit, push, pull, fetch, log, and diff
- **Branch Management** - Create, switch, rename, delete, and merge branches with ease
- **Commit History** - Rewrite, rebase, squash, undo, and amend commits
- **Visual File Changes** - Stage/unstage files, view diffs, and manage changes through the sidebar
- **Interactive Commit History** - View commits with right-click context menus for quick actions
- **Cleanup Tools** - Prune remotes, delete orphan branches, and remove merged branches
- **Stash Operations** - Save, list, and pop stashes
- **Tag Management** - Create and push tags
- **Remote Operations** - Set upstream and push
- **Utilities** - Restore files, unstage changes, and configure commit prefixes
- **Commit Prefix Support** - Automatically prefix commits with branch name or ticket number
- **Multi-Repository Support** - Manage multiple git repositories in your workspace

## Usage

### Sidebar Interface (Recommended)

Click the **Git QuickOps** icon in the activity bar (left sidebar) to open the sidebar interface with 4 panels:

#### 1. **Repositories Panel**
- View all git repositories in your workspace
- Switch between repositories with a single click
- See the currently active repository

#### 2. **Menu Panel**
- Navigate through categorized git operations
- Click any menu item to execute the operation
- Browse by category: Common Commands, Branch Management, Commit History, Cleanup, Stash, Tags, Remotes, Utilities

#### 3. **Changes Panel**
- See all modified files in your working directory
- **Unstaged changes** - Files with modifications not yet staged
- **Staged changes** - Files ready to be committed
- Click on a file to view it
- Click the **[+]** button to stage a file
- Click the **[-]** button to unstage a file
- Click **[Diff]** to view changes

#### 4. **Commits Panel**
- View commit history (last 50 commits)
- See commit hash, message, author, and date
- Right-click on any commit for quick actions:
  - **Copy Hash** - Copy commit hash to clipboard
  - **Copy Message** - Copy commit message to clipboard
  - **Reword Commit** - Edit the commit message (HEAD only)
  - **Squash to Single** - Squash all commits from selected to HEAD into one commit

### Command Palette Interface

Alternatively, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and type:
- **Git QuickOps: Show Main Menu** - Opens the main category menu

### Direct Command Access

You can also access specific categories directly from the command palette:
- **Git QuickOps: Common Commands** - Quick access to common git operations
- **Git QuickOps: Branch Management** - Branch operations
- **Git QuickOps: Commit History** - History manipulation
- **Git QuickOps: Cleanup** - Repository cleanup operations
- **Git QuickOps: Stash** - Stash operations
- **Git QuickOps: Tags** - Tag management
- **Git QuickOps: Remotes** - Remote operations
- **Git QuickOps: Utilities** - Utility functions
- **Git QuickOps: Add → Commit → Push** - Quick workflow command

### Auto-Refresh

The sidebar interface automatically refreshes every 2 seconds to keep the view up-to-date with:
- Current repository status
- File changes (staged/unstaged)
- Latest commits
- Branch information

This ensures you always see the current state of your repository without manual refreshes.

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
- **Checkout from Remote** - Fetch and checkout branches from remote that don't exist locally
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

### GUI Configuration (Recommended)

The easiest way to configure Git QuickOps is through the sidebar interface:

1. Click the **Git QuickOps** icon in the activity bar
2. Navigate to the **Menu** panel
3. Scroll down and click **Setup** → **Configure Repository**
4. Set your preferences:
   - **Commit Prefix** - Template for automatic commit message prefixing (supports placeholders)
   - **Require Tests Before Commit** - Choose whether tests should run before committing
5. Click **Save Configuration**

This creates a `.GIT_QUICKOPS_CONFIG` file in your repository root with your settings.

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
You can also set a repo-specific prefix by creating a `.GIT_QUICKOPS_PREFIX` file in your repository root. This takes precedence over workspace settings. The GUI setup interface creates this file automatically.

**Note:** Legacy `.GIT_HELPER_PREFIX` files are also supported for backwards compatibility.

### VS Code Settings (Optional)

For workspace-wide defaults, you can configure settings in VS Code. The GUI configuration (above) is recommended for per-repository settings.

Open VS Code settings (`Ctrl+,` or `Cmd+,`) and search for "Git QuickOps":

**Available Settings:**
- `gitQuickOps.commitPrefix` - Default commit prefix template for all repositories
- `gitQuickOps.defaultRemote` - Default remote name (default: "origin")
- `gitQuickOps.commandTimeout` - Timeout for general commands in milliseconds (default: 30000, 0 = no timeout)
- `gitQuickOps.gitTimeout` - Timeout for git operations in milliseconds (default: 300000, 0 = no timeout)

**Example:**
```json
{
  "gitQuickOps.commitPrefix": "{{ticket}}: ",
  "gitQuickOps.defaultRemote": "origin",
  "gitQuickOps.commandTimeout": 30000,
  "gitQuickOps.gitTimeout": 300000
}
```

**Configuration Priority:**
1. `.GIT_QUICKOPS_CONFIG` file (recommended - set via GUI)
2. `.GIT_QUICKOPS_PREFIX` file (legacy)  
3. VS Code workspace settings
4. VS Code user settings

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

## Development

### Prerequisites
- Node.js 18.x or 20.x
- npm
- VS Code

### Building the Extension

```bash
# Install dependencies
npm ci

# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch
```

### Running Tests

```bash
# Run build tests (fast - used by pre-commit checks)
npm test

# Run full integration tests (requires VS Code)
npm run test:integration

# Run build validation only
npm run test:compile

# Run linter
npm run lint

# Run full validation suite
npm run validate
```

### Test Types

The project includes two types of tests:

**Build Tests** (Fast)
- Run with `npm test`
- Complete in 1-3 seconds
- Validate TypeScript compilation
- Check module integrity
- Perfect for pre-commit checks
- **Used by Git QuickOps `requireTests` feature**

**Integration Tests** (Comprehensive)
- Run with `npm run test:integration`
- Require VS Code to be downloaded/running
- Test full extension activation
- Validate command registration
- Used in CI/CD pipeline

### Git QuickOps Test Integration

This extension itself uses Git QuickOps' test requirement feature. To enable it in your repository, create a `.GIT_QUICKOPS_CONFIG` file:

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

When enabled, `npm test` runs automatically before each commit. If tests fail, the commit is blocked.

### Validation Scripts

Before pushing changes, run the validation script:

**Linux/macOS:**
```bash
./scripts/validate.sh
```

**Windows:**
```cmd
scripts\validate.bat
```

This will:
- ✅ Install dependencies
- ✅ Run ESLint
- ✅ Compile TypeScript
- ✅ Validate package.json
- ✅ Package the extension

### CI/CD

The project uses GitHub Actions for continuous integration:

- **CI Build and Test** - Runs on every push and PR
  - Tests on Ubuntu, Windows, and macOS
  - Tests with Node.js 18.x and 20.x
  - Runs linting, compilation, and packaging tests
  
- **Publish to Marketplace** - Runs on releases
  - Automatically publishes to VS Code Marketplace
  - Creates GitHub release with VSIX artifact

## Contributing

This extension is part of the [kumpeapps/helper_scripts](https://github.com/kumpeapps/helper_scripts) repository. Contributions are welcome!

## License

See the LICENSE file in the repository root.

## Changelog

### 1.0.0
- Initial release
- Converted from bash script to VS Code extension
- Full feature parity with git-quickops.sh
- **Sidebar GUI Interface** with 4 webview panels:
  - Repositories panel for multi-repo management
  - Menu panel for categorized operations
  - Changes panel for visual staging/unstaging
  - Commits panel with interactive history
- Command palette integration with quick pick menus
- Support for commit message prefixing with placeholders
- Multi-select operations for branch deletion
- Auto-refresh for real-time repository state updates
- Right-click context menus in commit history
- Output channels for command results

## Related

This extension is based on the git-quickops.sh bash script from the same repository. Both tools provide the same functionality with different interfaces - choose the one that fits your workflow best!
