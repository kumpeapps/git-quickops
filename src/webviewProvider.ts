import * as vscode from 'vscode';
import * as git from './gitUtils';
import * as path from 'path';
import { RepositoryContext } from './menuTreeProvider';

export class GitQuickOpsWebviewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _viewType: string;
    private _navigationStack: string[] = [];
    private _branchLabelCache = new Map<string, { label: string; updatedAt: number }>();
    private readonly _branchLabelCacheTtlMs = 30000;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        viewType: string
    ) {
        this._viewType = viewType;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            await this._handleMessage(data);
        });

        // Auto-refresh (but not for setup view to allow form interaction)
        setInterval(() => {
            if (this._viewType !== 'setup') {
                this.refresh();
            }
        }, 2000);
    }

    private async _handleMessage(data: any) {
        switch (data.command) {
            case 'webviewReady':
                this.refresh();
                break;
            case 'selectRepository':
                await RepositoryContext.selectRepository();
                this.refresh();
                break;
            case 'switchRepository':
                RepositoryContext.setSelectedRepo(data.repoPath);
                this.refresh();
                break;
            case 'showMenu':
                await vscode.commands.executeCommand('git-quickops.showMenu');
                break;
            case 'execCommand':
                await vscode.commands.executeCommand(data.commandId);
                this.refresh();
                break;
            case 'openFile':
                const uri = vscode.Uri.file(data.path);
                await vscode.window.showTextDocument(uri);
                break;
            case 'openDiff':
                await this._openDiff(data.path, data.staged);
                break;
            case 'stageFile':
                await this._stageFile(data.path);
                this.refresh();
                break;
            case 'unstageFile':
                await this._unstageFile(data.path);
                this.refresh();
                break;
            case 'viewCommit':
                await this._viewCommit(data.hash);
                break;
            case 'copyHash':
                await vscode.env.clipboard.writeText(data.hash);
                vscode.window.showInformationMessage(`Copied ${data.hash}`);
                break;
            case 'copyMessage':
                await vscode.env.clipboard.writeText(data.message);
                vscode.window.showInformationMessage('Copied commit message');
                break;
            case 'rewordCommit':
                await this._rewordCommit(data.hash);
                this.refresh();
                break;
            case 'squashToSingle':
                await this._squashToSingle(data.hash);
                this.refresh();
                break;
            case 'navigateTo':
                this._navigationStack.push(data.menuId);
                this.refresh();
                break;
            case 'navigateBack':
                this._navigationStack.pop();
                this.refresh();
                break;
            case 'execMenuCommand':
                await vscode.commands.executeCommand(data.commandId);
                this.refresh();
                break;
            case 'navigateToView':
                // Change view type temporarily for setup
                if (data.viewType === 'setup') {
                    this._viewType = 'setup';
                }
                this.refresh();
                break;
            case 'saveSetup':
                await this._saveSetup(data.config);
                // Return to menu view
                this._viewType = 'menu';
                this.refresh();
                break;
        }
    }

    private async _openDiff(filePath: string, staged: boolean) {
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            const fullPath = path.join(gitRoot, filePath);
            const uri = vscode.Uri.file(fullPath);
            
            if (staged) {
                await vscode.commands.executeCommand('git.openChange', uri);
            } else {
                await vscode.commands.executeCommand('git.openChange', uri);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open diff: ${error}`);
        }
    }

    private async _stageFile(filePath: string) {
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            await git.execGit(gitRoot, ['add', filePath]);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to stage file: ${error}`);
        }
    }

    private async _unstageFile(filePath: string) {
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            await git.execGit(gitRoot, ['restore', '--staged', filePath]);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to unstage file: ${error}`);
        }
    }

    private async _viewCommit(hash: string) {
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            const details = await git.getCommitDetails(gitRoot, hash);
            
            const doc = await vscode.workspace.openTextDocument({
                content: details,
                language: 'diff'
            });
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to view commit: ${error}`);
        }
    }

    private async _rewordCommit(hash: string) {
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            
            // Check if this is the HEAD commit
            const headHash = await git.execGit(gitRoot, ['rev-parse', 'HEAD']);
            const fullHash = await git.execGit(gitRoot, ['rev-parse', hash]);
            
            if (headHash.trim() !== fullHash.trim()) {
                vscode.window.showWarningMessage('Can only reword the most recent commit (HEAD). Use squash for older commits.');
                return;
            }
            
            // Get the current commit message
            const currentMessage = await git.execGit(gitRoot, ['log', '--format=%B', '-n', '1', hash]);
            
            // Prompt for new message
            const newMessage = await vscode.window.showInputBox({
                prompt: 'Enter new commit message',
                value: currentMessage.trim(),
                placeHolder: 'Commit message'
            });
            
            if (!newMessage) {
                return;
            }
            
            // Use amend to reword the HEAD commit
            await git.execGit(gitRoot, ['commit', '--amend', '-m', newMessage, '--no-verify']);
            vscode.window.showInformationMessage('Commit message updated');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to reword commit: ${error}`);
        }
    }

    private async _squashToSingle(hash: string) {
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            
            // Validate that the hash exists in the repository
            try {
                await git.execGit(gitRoot, ['cat-file', '-t', hash]);
            } catch (e) {
                vscode.window.showErrorMessage(`Commit not found: ${hash}. The commit may have been deleted or rebased.`);
                return;
            }
            
            // Get the full hash first (in case we have a short hash)
            const fullHash = await git.execGit(gitRoot, ['rev-parse', hash]);
            const fullHashTrimmed = fullHash.trim();
            
            // Get current branch name
            const currentBranch = await git.execGit(gitRoot, ['branch', '--show-current']);
            
            // Get list of commits from the selected commit to HEAD
            const commitCount = await git.execGit(gitRoot, ['rev-list', '--count', `${fullHashTrimmed}..HEAD`]);
            const count = parseInt(commitCount.trim());
            
            if (count === 0) {
                vscode.window.showInformationMessage('Cannot squash - this is already the most recent commit');
                return;
            }
            
            // Validate that this commit has a parent (can't squash the root commit)
            try {
                await git.execGit(gitRoot, ['rev-parse', `${fullHashTrimmed}~1`]);
            } catch (e) {
                vscode.window.showErrorMessage('Cannot squash the root commit of the repository. You need at least one commit before the one you want to squash.');
                return;
            }
            
            // Confirm the action
            const confirm = await vscode.window.showWarningMessage(
                `Squash ${count + 1} commit${count === 0 ? '' : 's'} (from ${hash} to HEAD) into one? This will require a force push.`,
                { modal: true },
                'Squash'
            );
            
            if (confirm !== 'Squash') {
                return;
            }
            
            // Check tests before committing
            let testResult: any;
            
            // Show running notification (without buttons so it auto-dismisses after ~5 seconds)
            vscode.window.showInformationMessage('⏳ Running tests...');
            
            testResult = await git.checkTestsBeforeCommit(gitRoot);
            
            // Show result message (also auto-dismisses)
            if (testResult.noTests) {
                vscode.window.showInformationMessage('✅ No tests found - proceeding with commit');
            } else if (testResult.passed) {
                vscode.window.showInformationMessage('✅ Tests passed successfully');
            }
            
            if (!testResult.canProceed) {
                vscode.window.showErrorMessage(testResult.message || 'Commit blocked by tests');
                return;
            }
            if (testResult.message && testResult.message.includes('Warning')) {
                const choice = await vscode.window.showWarningMessage(
                    testResult.message,
                    'Commit Anyway', 'Cancel'
                );
                if (choice !== 'Commit Anyway') {
                    return;
                }
            }
            
            // Prompt for the squashed commit message
            const prefix = await git.getProcessedPrefix(gitRoot);
            const message = await vscode.window.showInputBox({
                prompt: 'Enter commit message for squashed commit',
                placeHolder: 'Squashed commit message',
                value: prefix
            });
            
            if (!message) {
                return;
            }
            
            // Get the parent of the selected commit
            const parentHash = await git.execGit(gitRoot, ['rev-parse', `${fullHashTrimmed}~1`]);
            
            // Use reset --soft to squash
            await git.execGit(gitRoot, ['reset', '--soft', parentHash.trim()]);
            await git.execGit(gitRoot, ['commit', '-m', message, '--no-verify']);
            
            // Force push to remote
            try {
                const branch = currentBranch.trim();
                const pushTarget = await git.resolveForcePushTarget(gitRoot, branch);
                if (!pushTarget) {
                    vscode.window.showInformationMessage('Force push skipped.');
                    return;
                }

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Force pushing to ${pushTarget.display}...`,
                    cancellable: false
                }, async () => {
                    await git.runGitCommandInteractive(gitRoot, pushTarget.args, 'Git Force Push');
                });

                vscode.window.showInformationMessage(`${count + 1} commits squashed. Force push started in terminal to ${pushTarget.display}. Complete authentication if prompted.`);
            } catch (pushError) {
                const errorMessage = pushError instanceof Error ? pushError.message : String(pushError);
                vscode.window.showWarningMessage(`Commits squashed locally but push failed: ${errorMessage}. You may need to manually push.`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to squash commits: ${error}`);
        }
    }

    private async _saveSetup(config: any) {
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            const repoConfig = git.getRepoConfig(gitRoot);
            
            // Update config with new values
            repoConfig.commitPrefix = config.commitPrefix;
            repoConfig.requireTests = config.requireTests;
            
            git.setRepoConfig(gitRoot, repoConfig);
            vscode.window.showInformationMessage('Configuration saved');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save configuration: ${error}`);
        }
    }

    public async refresh() {
        if (this._view) {
            const data = await this._getData();
            this._view.webview.postMessage({ command: 'update', data: data });
        }
    }

    public invalidateRepositoryBranchCache(gitRoot?: string) {
        if (gitRoot) {
            this._branchLabelCache.delete(gitRoot);
            return;
        }

        this._branchLabelCache.clear();
    }

    private async _getData(): Promise<any> {
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            const gitFolders = await git.getGitWorkspaceFolders();

            switch (this._viewType) {
                case 'repositories':
                    return await this._getRepositoriesData(gitFolders, gitRoot);
                case 'menu':
                    // Determine current menu level from navigation stack
                    const currentMenuId = this._navigationStack.length > 0 
                        ? this._navigationStack[this._navigationStack.length - 1] 
                        : 'main';
                    
                    return {
                        type: 'menu',
                        menuItems: this._getMenuItems(currentMenuId),
                        showBackButton: this._navigationStack.length > 0
                    };
                case 'setup':
                    const config = git.getRepoConfig(gitRoot);
                    return {
                        type: 'setup',
                        config: {
                            commitPrefix: config.commitPrefix || '',
                            requireTests: config.requireTests || 'disabled'
                        }
                    };
                case 'changes':
                    return await this._getChangesData(gitRoot);
                case 'commits':
                    return await this._getCommitsData(gitRoot);
            }
        } catch (error) {
            return { error: 'No git repository' };
        }
    }

    private async _getRepositoriesData(gitFolders: Array<{ gitRoot: string }>, selectedRepo: string): Promise<any> {
        const activeRepoRoots = new Set(gitFolders.map(gf => gf.gitRoot));
        for (const cachedRepo of this._branchLabelCache.keys()) {
            if (!activeRepoRoots.has(cachedRepo)) {
                this._branchLabelCache.delete(cachedRepo);
            }
        }

        const repos = await Promise.all(gitFolders.map(async (gf) => {
            const branch = await this._getCachedRepositoryBranchLabel(gf.gitRoot);
            return {
                name: path.basename(gf.gitRoot),
                path: gf.gitRoot,
                branch
            };
        }));

        return {
            type: 'repositories',
            repos,
            selectedRepo
        };
    }

    private async _getCachedRepositoryBranchLabel(gitRoot: string): Promise<string> {
        const cached = this._branchLabelCache.get(gitRoot);
        if (cached && (Date.now() - cached.updatedAt) < this._branchLabelCacheTtlMs) {
            return cached.label;
        }

        const label = await this._getRepositoryBranchLabel(gitRoot);
        this._branchLabelCache.set(gitRoot, { label, updatedAt: Date.now() });
        return label;
    }

    private async _getRepositoryBranchLabel(gitRoot: string): Promise<string> {
        try {
            const branch = (await git.getCurrentBranch(gitRoot)).trim();
            if (!branch) {
                return 'unknown';
            }

            if (branch === 'HEAD') {
                return 'detached';
            }

            return branch;
        } catch (error) {
            console.error(`[Git QuickOps] Failed to resolve branch for repository: ${gitRoot}`, error);
            return 'unknown';
        }
    }

    private _getMenuItems(menuId: string): any[] {
        const menuStructure: { [key: string]: any[] } = {
            'main': [
                { label: 'Common Commands', icon: '🧰', menuId: 'common', hasSubmenu: true },
                { label: 'Branch Management', icon: '🌿', menuId: 'branches', hasSubmenu: true },
                { label: 'Commit History', icon: '📜', menuId: 'history', hasSubmenu: true },
                { label: 'Cleanup', icon: '🧹', menuId: 'cleanup', hasSubmenu: true },
                { label: 'Stash', icon: '📦', menuId: 'stash', hasSubmenu: true },
                { label: 'Tags', icon: '🏷️', menuId: 'tags', hasSubmenu: true },
                { label: 'Remotes', icon: '☁️', menuId: 'remotes', hasSubmenu: true },
                { label: 'Utilities', icon: '🛠️', menuId: 'utils', hasSubmenu: true },
                { label: 'Setup', icon: '⚙️', menuId: 'setup', hasSubmenu: true }
            ],
            'common': [
                { label: 'Show Status', icon: 'ℹ️', command: 'git-quickops.cmd.status' },
                { label: 'Add Changes', icon: '➕', command: 'git-quickops.cmd.add' },
                { label: 'Add → Commit → Push', icon: '🚀', command: 'git-quickops.cmd.addCommitPush' },
                { label: 'Commit', icon: '✅', command: 'git-quickops.cmd.commit' },
                { label: 'Push', icon: '⬆️', command: 'git-quickops.cmd.push' },
                { label: 'Pull', icon: '⬇️', command: 'git-quickops.cmd.pull' },
                { label: 'Fetch', icon: '🔄', command: 'git-quickops.cmd.fetch' },
                { label: 'View Log', icon: '📜', command: 'git-quickops.cmd.log' },
                { label: 'View Diff', icon: '🧾', command: 'git-quickops.cmd.diff' }
            ],
            'branches': [
                { label: 'Create Branch', icon: '➕', command: 'git-quickops.cmd.branchCreate' },
                { label: 'Create Branch From...', icon: '🌱', command: 'git-quickops.cmd.branchCreateFrom' },
                { label: 'Switch Branch', icon: '🔀', command: 'git-quickops.cmd.branchSwitch' },
                { label: 'Checkout from Remote', icon: '☁️', command: 'git-quickops.cmd.branchCheckoutFromRemote' },
                { label: 'Rename Branch', icon: '✏️', command: 'git-quickops.cmd.branchRename' },
                { label: 'Delete Branch', icon: '🗑️', command: 'git-quickops.cmd.branchDelete' },
                { label: 'Merge Branch', icon: '🧬', command: 'git-quickops.cmd.merge' }
            ],
            'history': [
                { label: 'Rewrite to Single Commit', icon: '📄', command: 'git-quickops.cmd.historyRewriteToSingle' },
                { label: 'Rebase Onto Branch', icon: '🔀', command: 'git-quickops.cmd.historyRebaseOnto' },
                { label: 'Squash Last N Commits', icon: '🧱', command: 'git-quickops.cmd.historySquashN' },
                { label: 'Undo Last Commit (keep changes)', icon: '↩️', command: 'git-quickops.cmd.historyUndoLast' },
                { label: 'Amend Last Commit Message', icon: '✏️', command: 'git-quickops.cmd.historyAmendMessage' }
            ],
            'cleanup': [
                { label: 'Fetch + Prune Remotes', icon: '🧹', command: 'git-quickops.cmd.cleanupPruneFetch' },
                { label: 'Delete Orphan Branches', icon: '🗑️', command: 'git-quickops.cmd.cleanupDeleteOrphans' },
                { label: 'Delete Merged Branches', icon: '✅', command: 'git-quickops.cmd.cleanupDeleteMerged' }
            ],
            'stash': [
                { label: 'Stash Save', icon: '📦', command: 'git-quickops.cmd.stashSave' },
                { label: 'Stash List', icon: '📃', command: 'git-quickops.cmd.stashList' },
                { label: 'Stash Pop', icon: '📤', command: 'git-quickops.cmd.stashPop' }
            ],
            'tags': [
                { label: 'Create Tag', icon: '🏷️', command: 'git-quickops.cmd.tagCreate' }
            ],
            'remotes': [
                { label: 'Push and Set Upstream', icon: '☁️', command: 'git-quickops.cmd.remotesSetUpstream' }
            ],
            'utils': [
                { label: 'Restore File from HEAD', icon: '📄', command: 'git-quickops.cmd.utilsRestoreFile' },
                { label: 'Unstage All Changes', icon: '🧽', command: 'git-quickops.cmd.utilsUnstageAll' },
                { label: 'Set Commit Prefix', icon: '🏷️', command: 'git-quickops.cmd.utilsSetPrefix' }
            ],
            'setup': [
                { label: 'Configure Repository', icon: '⚙️', view: 'setup' }
            ]
        };

        return menuStructure[menuId] || [];
    }

    private async _getChangesData(gitRoot: string): Promise<any> {
        const status = await git.getStatus(gitRoot);
        const lines = status.split('\n').filter(l => l.length >= 4);
        
        const staged = lines
            .filter(l => l.charAt(0) !== ' ' && l.charAt(0) !== '?')
            .map(l => {
                // Git status format: "XY filename" where X and Y are status chars
                // Use trimStart to handle any leading whitespace, then skip 2 status chars + space
                const trimmed = l.trimStart();
                const statusChar = trimmed.charAt(0);
                const filePath = trimmed.slice(2).trim();
                return {
                    status: statusChar,
                    path: filePath
                };
            });
        
        const unstaged = lines
            .filter(l => l.charAt(1) !== ' ' || l.charAt(0) === '?')
            .map(l => {
                // Use trimStart to handle any leading whitespace, then parse status and filename  
                const trimmed = l.trimStart();
                const statusChar = trimmed.charAt(1) !== ' ' ? trimmed.charAt(1) : trimmed.charAt(0);
                const filePath = trimmed.slice(2).trim();
                return {
                    status: statusChar,
                    path: filePath
                };
            });

        return {
            type: 'changes',
            staged,
            unstaged
        };
    }

    private async _getCommitsData(gitRoot: string): Promise<any> {
        const commits = await git.getCommits(gitRoot, 50);
        return {
            type: 'commits',
            commits
        };
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
            <link href="${styleUri}" rel="stylesheet">
            <title>Git QuickOps</title>
        </head>
        <body class="${this._viewType}-view" data-view-type="${this._viewType}">
            <div id="container">
                <div id="content">Loading...</div>
            </div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
