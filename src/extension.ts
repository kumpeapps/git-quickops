import * as vscode from 'vscode';
import * as git from './gitUtils';
import * as path from 'path';
import * as fs from 'fs';
import { RepositoryContext } from './menuTreeProvider';
import { GitQuickOpsWebviewProvider } from './webviewProvider';

const EXTENSION_VERSION = '1.0.0';

export function activate(context: vscode.ExtensionContext) {
    console.log('Git QuickOps extension is now active');

    // Register webview providers
    const repositoriesProvider = new GitQuickOpsWebviewProvider(context.extensionUri, 'repositories');
    const menuProvider = new GitQuickOpsWebviewProvider(context.extensionUri, 'menu');
    const changesProvider = new GitQuickOpsWebviewProvider(context.extensionUri, 'changes');
    const commitsProvider = new GitQuickOpsWebviewProvider(context.extensionUri, 'commits');
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('gitQuickOpsRepositories', repositoriesProvider),
        vscode.window.registerWebviewViewProvider('gitQuickOpsMenu', menuProvider),
        vscode.window.registerWebviewViewProvider('gitQuickOpsChanges', changesProvider),
        vscode.window.registerWebviewViewProvider('gitQuickOpsCommits', commitsProvider)
    );

    // Listen to repository changes and refresh all webviews
    RepositoryContext.onDidChangeRepo(() => {
        repositoriesProvider.refresh();
        menuProvider.refresh();
        changesProvider.refresh();
        commitsProvider.refresh();
    });

    // Register all commands
    context.subscriptions.push(
        // Refresh command
        vscode.commands.registerCommand('git-quickops.refresh', () => {
            repositoriesProvider.refresh();
            menuProvider.refresh();
            changesProvider.refresh();
            commitsProvider.refresh();
        }),
        
        // Repository selector command
        vscode.commands.registerCommand('git-quickops.selectRepository', async () => {
            await RepositoryContext.selectRepository();
            repositoriesProvider.refresh();
            menuProvider.refresh();
            changesProvider.refresh();
            commitsProvider.refresh();
        }),
        
        // Legacy menu commands
        vscode.commands.registerCommand('git-quickops.showMenu', () => showMainMenu()),
        vscode.commands.registerCommand('git-quickops.common', () => showCommonMenu()),
        vscode.commands.registerCommand('git-quickops.branches', () => showBranchesMenu()),
        vscode.commands.registerCommand('git-quickops.history', () => showHistoryMenu()),
        vscode.commands.registerCommand('git-quickops.cleanup', () => showCleanupMenu()),
        vscode.commands.registerCommand('git-quickops.stash', () => showStashMenu()),
        vscode.commands.registerCommand('git-quickops.tags', () => showTagsMenu()),
        vscode.commands.registerCommand('git-quickops.remotes', () => showRemotesMenu()),
        vscode.commands.registerCommand('git-quickops.utils', () => showUtilsMenu()),
        vscode.commands.registerCommand('git-quickops.status', () => cmdStatus()),
        vscode.commands.registerCommand('git-quickops.addCommitPush', () => cmdAddCommitPush()),
        
        // Common commands
        vscode.commands.registerCommand('git-quickops.cmd.status', () => cmdStatus()),
        vscode.commands.registerCommand('git-quickops.cmd.add', () => cmdAdd()),
        vscode.commands.registerCommand('git-quickops.cmd.commit', () => cmdCommit()),
        vscode.commands.registerCommand('git-quickops.cmd.addCommitPush', () => cmdAddCommitPush()),
        vscode.commands.registerCommand('git-quickops.cmd.push', () => cmdPush()),
        vscode.commands.registerCommand('git-quickops.cmd.pull', () => cmdPull()),
        vscode.commands.registerCommand('git-quickops.cmd.fetch', () => cmdFetch()),
        vscode.commands.registerCommand('git-quickops.cmd.log', () => cmdLog()),
        vscode.commands.registerCommand('git-quickops.cmd.diff', () => cmdDiff()),
        
        // Branch commands
        vscode.commands.registerCommand('git-quickops.cmd.branchCreate', () => cmdBranchCreate()),
        vscode.commands.registerCommand('git-quickops.cmd.branchCreateFrom', () => cmdBranchCreateFrom()),
        vscode.commands.registerCommand('git-quickops.cmd.branchSwitch', () => cmdBranchSwitch()),
        vscode.commands.registerCommand('git-quickops.cmd.branchCheckoutFromRemote', () => cmdBranchCheckoutFromRemote()),
        vscode.commands.registerCommand('git-quickops.cmd.branchRename', () => cmdBranchRename()),
        vscode.commands.registerCommand('git-quickops.cmd.branchDelete', () => cmdBranchDelete()),
        vscode.commands.registerCommand('git-quickops.cmd.merge', () => cmdMerge()),
        
        // History commands
        vscode.commands.registerCommand('git-quickops.cmd.historyRewriteToSingle', () => cmdHistoryRewriteToSingle()),
        vscode.commands.registerCommand('git-quickops.cmd.historyRebaseOnto', () => cmdHistoryRebaseOnto()),
        vscode.commands.registerCommand('git-quickops.cmd.historySquashN', () => cmdHistorySquashN()),
        vscode.commands.registerCommand('git-quickops.cmd.historyUndoLast', () => cmdHistoryUndoLast()),
        vscode.commands.registerCommand('git-quickops.cmd.historyAmendMessage', () => cmdHistoryAmendMessage()),
        
        // Cleanup commands
        vscode.commands.registerCommand('git-quickops.cmd.cleanupPruneFetch', () => cmdCleanupPruneFetch()),
        vscode.commands.registerCommand('git-quickops.cmd.cleanupDeleteOrphans', () => cmdCleanupDeleteOrphans()),
        vscode.commands.registerCommand('git-quickops.cmd.cleanupDeleteMerged', () => cmdCleanupDeleteMerged()),
        
        // Stash commands
        vscode.commands.registerCommand('git-quickops.cmd.stashSave', () => cmdStashSave()),
        vscode.commands.registerCommand('git-quickops.cmd.stashList', () => cmdStashList()),
        vscode.commands.registerCommand('git-quickops.cmd.stashPop', () => cmdStashPop()),
        
        // Tag commands
        vscode.commands.registerCommand('git-quickops.cmd.tagCreate', () => cmdTagCreate()),
        
        // Remote commands
        vscode.commands.registerCommand('git-quickops.cmd.remotesSetUpstream', () => cmdRemotesSetUpstream()),
        
        // Utility commands
        vscode.commands.registerCommand('git-quickops.cmd.utilsRestoreFile', () => cmdUtilsRestoreFile()),
        vscode.commands.registerCommand('git-quickops.cmd.utilsUnstageAll', () => cmdUtilsUnstageAll()),
        vscode.commands.registerCommand('git-quickops.cmd.utilsSetPrefix', () => cmdUtilsSetPrefix()),
        
        // New interactive tree commands
        vscode.commands.registerCommand('git-quickops.branch.switch', async (item) => {
            if (item && item.itemData) {
                await cmdBranchSwitchTo(item.itemData);
            } else {
                await cmdBranchSwitch();
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.branch.createFrom', async (item) => {
            if (item && item.itemData) {
                await cmdBranchCreateFromItem(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.branch.delete', async (item) => {
            if (item && item.itemData) {
                await cmdBranchDeleteSpecific(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.branch.rename', async (item) => {
            if (item && item.itemData) {
                await cmdBranchRenameSpecific(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.commit.view', async (item) => {
            if (item && item.itemData) {
                await cmdCommitView(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.commit.rewriteFrom', async (timelineItem) => {
            // Timeline items from the Git history
            if (timelineItem && timelineItem.id) {
                // Extract commit hash from timeline item ID (format: "git:commit:hash")
                const commitHash = timelineItem.id.replace('git:commit:', '');
                await cmdCommitRewriteFromHash(commitHash);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.commit.cherryPick', async (timelineItem) => {
            if (timelineItem && timelineItem.id) {
                const commitHash = timelineItem.id.replace('git:commit:', '');
                await cmdCommitCherryPickHash(commitHash);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.commit.revert', async (timelineItem) => {
            if (timelineItem && timelineItem.id) {
                const commitHash = timelineItem.id.replace('git:commit:', '');
                await cmdCommitRevertHash(commitHash);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.commit.copyHash', async (timelineItem) => {
            if (timelineItem && timelineItem.id) {
                const commitHash = timelineItem.id.replace('git:commit:', '');
                await vscode.env.clipboard.writeText(commitHash);
                vscode.window.showInformationMessage(`Copied commit hash: ${commitHash}`);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.commit.createBranch', async (timelineItem) => {
            if (timelineItem && timelineItem.id) {
                const commitHash = timelineItem.id.replace('git:commit:', '');
                await cmdCommitCreateBranchFromHash(commitHash);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.file.openDiff', async (resourceState) => {
            // SCM resource state
            if (resourceState && resourceState.resourceUri) {
                await vscode.commands.executeCommand('git.openChange', resourceState.resourceUri);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.file.stage', async (item) => {
            if (item && item.itemData) {
                await cmdFileStage(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.file.unstage', async (item) => {
            if (item && item.itemData) {
                await cmdFileUnstage(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.file.discard', async (item) => {
            if (item && item.itemData) {
                await cmdFileDiscard(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.stash.apply', async (item) => {
            if (item && item.itemData) {
                await cmdStashApply(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.stash.pop', async (item) => {
            if (item && item.itemData) {
                await cmdStashPopSpecific(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.stash.drop', async (item) => {
            if (item && item.itemData) {
                await cmdStashDrop(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.stash.view', async (item) => {
            if (item && item.itemData) {
                await cmdStashView(item.itemData);
            }
        }),
        
        vscode.commands.registerCommand('git-quickops.remote.add', async () => {
            await cmdRemoteAdd();
        }),
        
        // New commands for stage all, commit, unstage all
        vscode.commands.registerCommand('git-quickops.stageAll', async () => {
            await cmdStageAll();
            vscode.commands.executeCommand('git-quickops.refresh');
        }),
        
        vscode.commands.registerCommand('git-quickops.commit', async () => {
            await cmdCommitStaged();
            vscode.commands.executeCommand('git-quickops.refresh');
        }),
        
vscode.commands.registerCommand('git-quickops.unstageAll', async () => {
            await cmdUnstageAll();
            vscode.commands.executeCommand('git-quickops.refresh');
        }),
        
        vscode.commands.registerCommand('git-quickops.selectRepository', async () => {
            await RepositoryContext.selectRepository();
            vscode.commands.executeCommand('git-quickops.refresh');
        })
    );
}

export function deactivate() {}

// ========== Main Menu ==========

async function showMainMenu() {
    try {
        await git.getGitRoot();
        await checkGitConfig();
        
        const choice = await vscode.window.showQuickPick([
            { label: '$(git-commit) Common Commands', value: 'common' },
            { label: '$(git-branch) Branch Management', value: 'branches' },
            { label: '$(history) Commit History', value: 'history' },
            { label: '$(trash) Cleanup', value: 'cleanup' },
            { label: '$(archive) Stash', value: 'stash' },
            { label: '$(tag) Tags', value: 'tags' },
            { label: '$(cloud) Remotes', value: 'remotes' },
            { label: '$(tools) Utilities', value: 'utils' },
        ], {
            placeHolder: `Git QuickOps v${EXTENSION_VERSION} - Select a category`,
        });

        if (!choice) {
            return;
        }

        switch (choice.value) {
            case 'common': await showCommonMenu(); break;
            case 'branches': await showBranchesMenu(); break;
            case 'history': await showHistoryMenu(); break;
            case 'cleanup': await showCleanupMenu(); break;
            case 'stash': await showStashMenu(); break;
            case 'tags': await showTagsMenu(); break;
            case 'remotes': await showRemotesMenu(); break;
            case 'utils': await showUtilsMenu(); break;
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Git QuickOps: ${error}`);
    }
}

// ========== Check Git Config ==========

async function checkGitConfig(): Promise<void> {
    const gitRoot = await RepositoryContext.getGitRoot();
    const config = await git.getGitConfig(gitRoot);
    
    if (!config.userName) {
        const name = await vscode.window.showInputBox({
            prompt: 'Git user.name is not set. Please enter your name:',
            placeHolder: 'Your Name'
        });
        if (name) {
            const scope = await vscode.window.showQuickPick([
                { label: 'Global (all repositories)', value: 'global' },
                { label: 'Local (this repository only)', value: 'local' }
            ], { placeHolder: 'Set user.name globally or locally?' });
            
            if (scope) {
                await git.setGitConfig(gitRoot, 'user.name', name, scope.value === 'global');
            }
        }
    }
    
    if (!config.userEmail) {
        const email = await vscode.window.showInputBox({
            prompt: 'Git user.email is not set. Please enter your email:',
            placeHolder: 'your.email@example.com'
        });
        if (email) {
            const scope = await vscode.window.showQuickPick([
                { label: 'Global (all repositories)', value: 'global' },
                { label: 'Local (this repository only)', value: 'local' }
            ], { placeHolder: 'Set user.email globally or locally?' });
            
            if (scope) {
                await git.setGitConfig(gitRoot, 'user.email', email, scope.value === 'global');
            }
        }
    }
}

// ========== Common Commands Menu ==========

async function showCommonMenu() {
    const choice = await vscode.window.showQuickPick([
        { label: '$(info) Show Status', value: 'status' },
        { label: '$(add) Add Changes', value: 'add' },
        { label: '$(rocket) Add → Commit → Push', value: 'add_commit_push' },
        { label: '$(git-commit) Commit', value: 'commit' },
        { label: '$(cloud-upload) Push', value: 'push' },
        { label: '$(cloud-download) Pull', value: 'pull' },
        { label: '$(sync) Fetch', value: 'fetch' },
        { label: '$(history) View Log', value: 'log' },
        { label: '$(diff) View Diff', value: 'diff' },
        { label: '$(arrow-left) Back', value: 'back' },
    ], {
        placeHolder: 'Common Commands - Select an action',
    });

    if (!choice || choice.value === 'back') {
        return showMainMenu();
    }

    try {
        switch (choice.value) {
            case 'status': await cmdStatus(); break;
            case 'add': await cmdAdd(); break;
            case 'add_commit_push': await cmdAddCommitPush(); break;
            case 'commit': await cmdCommit(); break;
            case 'push': await cmdPush(); break;
            case 'pull': await cmdPull(); break;
            case 'fetch': await cmdFetch(); break;
            case 'log': await cmdLog(); break;
            case 'diff': await cmdDiff(); break;
        }
        await showCommonMenu(); // Return to menu after command
    } catch (error) {
        vscode.window.showErrorMessage(`${error}`);
        await showCommonMenu();
    }
}

// ========== Branch Management Menu ==========

async function showBranchesMenu() {
    const choice = await vscode.window.showQuickPick([
        { label: '$(add) Create Branch', value: 'create' },
        { label: '$(git-branch) Create Branch From...', value: 'create_from' },
        { label: '$(arrow-both) Switch Branch', value: 'switch' },
        { label: '$(cloud-download) Checkout from Remote', value: 'checkout_remote' },
        { label: '$(edit) Rename Branch', value: 'rename' },
        { label: '$(trash) Delete Branch', value: 'delete' },
        { label: '$(git-merge) Merge Branch', value: 'merge' },
        { label: '$(arrow-left) Back', value: 'back' },
    ], {
        placeHolder: 'Branch Management - Select an action',
    });

    if (!choice || choice.value === 'back') {
        return showMainMenu();
    }

    try {
        switch (choice.value) {
            case 'create': await cmdBranchCreate(); break;
            case 'create_from': await cmdBranchCreateFrom(); break;
            case 'switch': await cmdBranchSwitch(); break;
            case 'checkout_remote': await cmdBranchCheckoutFromRemote(); break;
            case 'rename': await cmdBranchRename(); break;
            case 'delete': await cmdBranchDelete(); break;
            case 'merge': await cmdMerge(); break;
        }
        await showBranchesMenu();
    } catch (error) {
        vscode.window.showErrorMessage(`${error}`);
        await showBranchesMenu();
    }
}

// ========== Commit History Menu ==========

async function showHistoryMenu() {
    const choice = await vscode.window.showQuickPick([
        { label: '$(file-binary) Rewrite to Single Commit', value: 'rewrite_single' },
        { label: '$(repo-forked) Rebase Onto Branch', value: 'rebase_onto' },
        { label: '$(fold) Squash Last N Commits', value: 'squash_n' },
        { label: '$(discard) Undo Last Commit (keep changes)', value: 'undo_last' },
        { label: '$(edit) Amend Last Commit Message', value: 'amend_msg' },
        { label: '$(arrow-left) Back', value: 'back' },
    ], {
        placeHolder: 'Commit History - Select an action',
    });

    if (!choice || choice.value === 'back') {
        return showMainMenu();
    }

    try {
        switch (choice.value) {
            case 'rewrite_single': await cmdHistoryRewriteToSingle(); break;
            case 'rebase_onto': await cmdHistoryRebaseOnto(); break;
            case 'squash_n': await cmdHistorySquashN(); break;
            case 'undo_last': await cmdHistoryUndoLast(); break;
            case 'amend_msg': await cmdHistoryAmendMessage(); break;
        }
        await showHistoryMenu();
    } catch (error) {
        vscode.window.showErrorMessage(`${error}`);
        await showHistoryMenu();
    }
}

// ========== Cleanup Menu ==========

async function showCleanupMenu() {
    const choice = await vscode.window.showQuickPick([
        { label: '$(sync) Fetch + Prune Remotes', value: 'prune_fetch' },
        { label: '$(trash) Delete Orphan Branches', value: 'delete_orphans' },
        { label: '$(git-merge) Delete Merged Branches', value: 'delete_merged' },
        { label: '$(arrow-left) Back', value: 'back' },
    ], {
        placeHolder: 'Cleanup - Select an action',
    });

    if (!choice || choice.value === 'back') {
        return showMainMenu();
    }

    try {
        switch (choice.value) {
            case 'prune_fetch': await cmdCleanupPruneFetch(); break;
            case 'delete_orphans': await cmdCleanupDeleteOrphans(); break;
            case 'delete_merged': await cmdCleanupDeleteMerged(); break;
        }
        await showCleanupMenu();
    } catch (error) {
        vscode.window.showErrorMessage(`${error}`);
        await showCleanupMenu();
    }
}

// ========== Stash Menu ==========

async function showStashMenu() {
    const choice = await vscode.window.showQuickPick([
        { label: '$(archive) Stash Save', value: 'save' },
        { label: '$(list-unordered) Stash List', value: 'list' },
        { label: '$(fold-up) Stash Pop', value: 'pop' },
        { label: '$(arrow-left) Back', value: 'back' },
    ], {
        placeHolder: 'Stash - Select an action',
    });

    if (!choice || choice.value === 'back') {
        return showMainMenu();
    }

    try {
        switch (choice.value) {
            case 'save': await cmdStashSave(); break;
            case 'list': await cmdStashList(); break;
            case 'pop': await cmdStashPop(); break;
        }
        await showStashMenu();
    } catch (error) {
        vscode.window.showErrorMessage(`${error}`);
        await showStashMenu();
    }
}

// ========== Tags Menu ==========

async function showTagsMenu() {
    const choice = await vscode.window.showQuickPick([
        { label: '$(tag) Create Tag', value: 'create' },
        { label: '$(arrow-left) Back', value: 'back' },
    ], {
        placeHolder: 'Tags - Select an action',
    });

    if (!choice || choice.value === 'back') {
        return showMainMenu();
    }

    try {
        switch (choice.value) {
            case 'create': await cmdTagCreate(); break;
        }
        await showTagsMenu();
    } catch (error) {
        vscode.window.showErrorMessage(`${error}`);
        await showTagsMenu();
    }
}

// ========== Remotes Menu ==========

async function showRemotesMenu() {
    const choice = await vscode.window.showQuickPick([
        { label: '$(cloud-upload) Push and Set Upstream', value: 'set_upstream' },
        { label: '$(arrow-left) Back', value: 'back' },
    ], {
        placeHolder: 'Remotes - Select an action',
    });

    if (!choice || choice.value === 'back') {
        return showMainMenu();
    }

    try {
        switch (choice.value) {
            case 'set_upstream': await cmdRemotesSetUpstream(); break;
        }
        await showRemotesMenu();
    } catch (error) {
        vscode.window.showErrorMessage(`${error}`);
        await showRemotesMenu();
    }
}

// ========== Utilities Menu ==========

async function showUtilsMenu() {
    const choice = await vscode.window.showQuickPick([
        { label: '$(file) Restore File from HEAD', value: 'restore_file' },
        { label: '$(discard) Unstage All Changes', value: 'unstage_all' },
        { label: '$(symbol-keyword) Set Commit Prefix', value: 'set_prefix' },
        { label: '$(arrow-left) Back', value: 'back' },
    ], {
        placeHolder: 'Utilities - Select an action',
    });

    if (!choice || choice.value === 'back') {
        return showMainMenu();
    }

    try {
        switch (choice.value) {
            case 'restore_file': await cmdUtilsRestoreFile(); break;
            case 'unstage_all': await cmdUtilsUnstageAll(); break;
            case 'set_prefix': await cmdUtilsSetPrefix(); break;
        }
        await showUtilsMenu();
    } catch (error) {
        vscode.window.showErrorMessage(`${error}`);
        await showUtilsMenu();
    }
}

// ========== Helper Functions ==========

function formatError(error: unknown): string {
    if (error instanceof Error && typeof error.message === 'string' && error.message.length > 0) {
        return error.message;
    }

    try {
        return String(error);
    } catch {
        return 'Unknown error';
    }
}

async function runCommand<T>(
    action: string,
    fn: () => Promise<T>
): Promise<T | undefined> {
    try {
        return await fn();
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to ${action}: ${formatError(error)}`);
        return undefined;
    }
}

async function ensureTestsAllowCommit(gitRoot: string): Promise<boolean> {
    vscode.window.showInformationMessage('⏳ Running tests...');

    const testResult: any = await git.checkTestsBeforeCommit(gitRoot);

    if (testResult.noTests) {
        vscode.window.showInformationMessage('✅ No tests found - proceeding with commit');
    } else if (testResult.passed) {
        vscode.window.showInformationMessage('✅ Tests passed successfully');
    }

    if (!testResult.canProceed) {
        vscode.window.showErrorMessage(testResult.message || 'Commit blocked by tests');
        return false;
    }

    if (testResult.message && testResult.message.includes('Warning')) {
        const choice = await vscode.window.showWarningMessage(
            testResult.message,
            'Commit Anyway', 'Cancel'
        );
        if (choice !== 'Commit Anyway') {
            return false;
        }
    }

    return true;
}

// ========== Command Implementations ==========

async function cmdStatus() {
    return runCommand('show status', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.runGitCommand(gitRoot, ['status'], 'Git Status');
    });
}

async function cmdAdd() {
    return runCommand('add changes', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const status = await git.getStatus(gitRoot);
        
        if (!status) {
            vscode.window.showInformationMessage('No changes to add');
            return;
        }

        const choice = await vscode.window.showQuickPick([
            { label: 'Add all changes', value: 'all' },
            { label: 'Select files to add', value: 'select' },
        ], { placeHolder: 'How would you like to add changes?' });

        if (!choice) {
            return;
        }

        if (choice.value === 'all') {
            await git.runGitCommand(gitRoot, ['add', '-A'], 'Git Add All');
            vscode.window.showInformationMessage('All changes added');
        } else {
            const files = status.split('\n').map(line => {
                const match = line.match(/^(.{2})\s+(.+)$/);
                return match ? { label: match[2], status: match[1] } : null;
            }).filter(f => f !== null);

            const selected = await vscode.window.showQuickPick(
                files.map(f => ({ label: f!.label, picked: false })),
                { canPickMany: true, placeHolder: 'Select files to add' }
            );

            if (selected && selected.length > 0) {
                for (const file of selected) {
                    await git.runGitCommand(gitRoot, ['add', file.label], `Add ${file.label}`);
                }
                vscode.window.showInformationMessage(`Added ${selected.length} file(s)`);
            }
        }
    });
}

async function cmdCommit() {
    return runCommand('commit', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        // Check if there are staged changes
        const status = await git.execGit(gitRoot, ['status', '--porcelain']);
        const hasStagedChanges = status.split('\n').some(line => line.match(/^[MADRC]/));
        
        if (!hasStagedChanges) {
            vscode.window.showWarningMessage('No staged changes to commit. Use "Add → Commit → Push" to stage all changes first.');
            return;
        }
        
        if (!(await ensureTestsAllowCommit(gitRoot))) {
            return;
        }
        
        const prefix = await git.getProcessedPrefix(gitRoot);
        const message = await vscode.window.showInputBox({
            prompt: 'Enter commit message',
            placeHolder: 'Commit message',
            value: prefix
        });

        if (!message) {
            return;
        }

        await git.runGitCommand(gitRoot, ['commit', '-m', message], 'Git Commit');
        vscode.window.showInformationMessage('Changes committed');
    });
}

async function cmdAddCommitPush() {
    return runCommand('add/commit/push', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        if (!(await ensureTestsAllowCommit(gitRoot))) {
            return;
        }
        
        // Get commit message first
        const prefix = await git.getProcessedPrefix(gitRoot);
        const message = await vscode.window.showInputBox({
            prompt: 'Enter commit message',
            placeHolder: 'Commit message',
            value: prefix
        });

        if (!message) {
            return;
        }

        // Add all changes (use execGit to wait for completion)
        await git.execGit(gitRoot, ['add', '-A']);
        vscode.window.showInformationMessage('Changes added');
        
        // Commit (use execGit to wait for completion)
        await git.execGit(gitRoot, ['commit', '-m', message]);
        vscode.window.showInformationMessage('Changes committed');
        
        // Push using terminal (interactive for authentication)
        const branch = await git.getCurrentBranch(gitRoot);
        const pushTarget = await resolvePushTarget(gitRoot, branch);
        if (!pushTarget) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Pushing to ${pushTarget.display}...`,
            cancellable: false
        }, async () => {
            await git.runGitCommandInteractive(gitRoot, pushTarget.args, 'Push Changes');
        });

        vscode.window.showInformationMessage(`Changes pushed to ${pushTarget.display}`);
    });
}

async function resolvePushTarget(gitRoot: string, branch: string): Promise<{ args: string[]; display: string } | null> {
    const upstream = await getBranchUpstream(gitRoot, branch);
    if (upstream) {
        return { args: ['push'], display: `${upstream.remote}/${upstream.branch}` };
    }

    const config = vscode.workspace.getConfiguration('gitQuickOps');
    const defaultRemote = config.get<string>('defaultRemote', 'origin');
    const remote = await selectRemoteForPush(gitRoot, defaultRemote);
    if (!remote) {
        return null;
    }

    const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: `No upstream set for ${branch}. Push and set upstream to ${remote}/${branch}?`
    });

    if (confirm !== 'Yes') {
        return null;
    }

    return { args: ['push', '-u', remote, branch], display: `${remote}/${branch}` };
}

async function getBranchUpstream(gitRoot: string, branch: string): Promise<{ remote: string; branch: string } | null> {
    try {
        const upstream = await git.execGit(gitRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', `${branch}@{u}`]);
        const separatorIndex = upstream.indexOf('/');
        if (separatorIndex === -1) {
            return null;
        }

        return {
            remote: upstream.slice(0, separatorIndex),
            branch: upstream.slice(separatorIndex + 1)
        };
    } catch {
        return null;
    }
}

async function selectRemoteForPush(gitRoot: string, defaultRemote: string): Promise<string | null> {
    let remotes = await git.getRemotes(gitRoot);

    if (remotes.length === 0) {
        const addChoice = await vscode.window.showWarningMessage(
            'No remotes are configured for this repository.',
            'Add Remote',
            'Cancel'
        );

        if (addChoice !== 'Add Remote') {
            return null;
        }

        const addedRemote = await promptAddRemote(gitRoot);
        if (!addedRemote) {
            return null;
        }

        remotes = await git.getRemotes(gitRoot);
    }

    if (remotes.includes(defaultRemote)) {
        return defaultRemote;
    }

    if (remotes.length === 1) {
        return remotes[0];
    }

    const items: vscode.QuickPickItem[] = remotes.map(remote => ({ label: remote }));
    items.push({ label: 'Add new remote...', description: 'Configure a new remote' });

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select remote for push'
    });

    if (!selected) {
        return null;
    }

    if (selected.label === 'Add new remote...') {
        return await promptAddRemote(gitRoot);
    }

    return selected.label;
}

async function promptAddRemote(gitRoot: string): Promise<string | null> {
    const existingRemotes = await git.getRemotes(gitRoot);

    let remoteName: string;
    while (true) {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter remote name',
            placeHolder: 'origin'
        });

        if (!input) {
            // User cancelled the input
            return null;
        }

        const trimmed = input.trim();
        if (!trimmed) {
            vscode.window.showErrorMessage('Remote name cannot be empty or whitespace.');
            continue;
        }

        if (/\s/.test(trimmed)) {
            vscode.window.showErrorMessage('Remote name cannot contain whitespace.');
            continue;
        }

        remoteName = trimmed;
        break;
    }

    let remoteUrl: string;
    while (true) {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter remote URL',
            placeHolder: 'https://github.com/user/repo.git'
        });

        if (!input) {
            // User cancelled the input
            return null;
        }

        const trimmed = input.trim();
        if (!trimmed) {
            vscode.window.showErrorMessage('Remote URL cannot be empty or whitespace.');
            continue;
        }

        remoteUrl = trimmed;
        break;
    }

    if (existingRemotes.includes(remoteName)) {
        const overwrite = await vscode.window.showWarningMessage(
            `Remote "${remoteName}" already exists. Update its URL?`,
            'Update',
            'Cancel'
        );

        if (overwrite !== 'Update') {
            return null;
        }

        await git.runGitCommand(gitRoot, ['remote', 'set-url', remoteName, remoteUrl], `Set Remote ${remoteName}`);
    } else {
        await git.runGitCommand(gitRoot, ['remote', 'add', remoteName, remoteUrl], `Add Remote ${remoteName}`);
    }

    vscode.window.showInformationMessage(`Remote configured: ${remoteName}`);
    return remoteName;
}

async function cmdPush() {
    return runCommand('push', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const branch = await git.getCurrentBranch(gitRoot);
        const pushTarget = await resolvePushTarget(gitRoot, branch);
        if (!pushTarget) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Pushing to ${pushTarget.display}...`,
            cancellable: false
        }, async () => {
            await git.runGitCommandInteractive(gitRoot, pushTarget.args, 'Git Push');
        });

        vscode.window.showInformationMessage(`Pushed to ${pushTarget.display}`);
    });
}

async function cmdPull() {
    return runCommand('pull', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        // Use interactive terminal for pull (may require authentication)
        await git.runGitCommandInteractive(gitRoot, ['pull'], 'Git Pull');
        
        // Wait a moment for command to start, then show completion
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        vscode.window.showInformationMessage('Changes pulled');
    });
}

async function cmdFetch() {
    return runCommand('fetch', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        // Use interactive terminal for fetch (may require authentication)
        await git.runGitCommandInteractive(gitRoot, ['fetch', '--all'], 'Git Fetch');
        
        // Wait a moment for command to start, then show completion
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        vscode.window.showInformationMessage('Fetched from remote');
    });
}

async function cmdLog() {
    return runCommand('show log', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.runGitCommand(gitRoot, ['log', '--oneline', '--graph', '--decorate', '-20'], 'Git Log');
    });
}

async function cmdDiff() {
    return runCommand('show diff', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const choice = await vscode.window.showQuickPick([
            { label: 'Diff working directory', value: 'working' },
            { label: 'Diff staged changes', value: 'staged' },
        ], { placeHolder: 'Select diff type' });

        if (!choice) {
            return;
        }

        const args = choice.value === 'staged' ? ['diff', '--staged'] : ['diff'];
        await git.runGitCommand(gitRoot, args, 'Git Diff');
    });
}

async function cmdBranchCreate() {
    return runCommand('create branch', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const branchName = await vscode.window.showInputBox({
            prompt: 'Enter new branch name',
            placeHolder: 'feature/my-branch'
        });

        if (!branchName) {
            return;
        }

        await git.runGitCommand(gitRoot, ['checkout', '-b', branchName], `Create ${branchName}`);
        vscode.window.showInformationMessage(`Created and switched to branch: ${branchName}`);
    });
}

async function cmdBranchCreateFrom() {
    return runCommand('create branch from source', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const branches = await git.getBranches(gitRoot, true);
        
        const sourceBranch = await vscode.window.showQuickPick(branches, {
            placeHolder: 'Select source branch'
        });

        if (!sourceBranch) {
            return;
        }

        const branchName = await vscode.window.showInputBox({
            prompt: 'Enter new branch name',
            placeHolder: 'feature/my-branch'
        });

        if (!branchName) {
            return;
        }

        await git.runGitCommand(gitRoot, ['checkout', '-b', branchName, sourceBranch], `Create ${branchName}`);
        vscode.window.showInformationMessage(`Created branch ${branchName} from ${sourceBranch}`);
    });
}

async function cmdBranchSwitch() {
    return runCommand('switch branch', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const branches = await git.getBranches(gitRoot);
        const currentBranch = await git.getCurrentBranch(gitRoot);
        
        const branch = await vscode.window.showQuickPick(
            branches.filter(b => b !== currentBranch),
            { placeHolder: 'Select branch to switch to' }
        );

        if (!branch) {
            return;
        }

        await git.runGitCommand(gitRoot, ['checkout', branch], `Checkout ${branch}`);
        vscode.window.showInformationMessage(`Switched to branch: ${branch}`);
    });
}

async function cmdBranchCheckoutFromRemote() {
    return runCommand('checkout from remote', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        // Fetch latest branches using interactive terminal
        await git.runGitCommandInteractive(gitRoot, ['fetch', '--all'], 'Fetch Remote Branches');
        
        // Wait a moment for fetch to start
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get all branches including remote
        const allBranches = await git.getBranches(gitRoot, true);
        const localBranches = await git.getBranches(gitRoot, false);
        
        // Filter to only remote branches and format them
        const remoteBranches = allBranches
            .filter(b => b.startsWith('remotes/'))
            .map(b => {
                // Extract branch name from remotes/origin/branch-name
                const match = b.match(/^remotes\/([^\/]+)\/(.+)$/);
                if (match) {
                    const remote = match[1];
                    const branchName = match[2];
                    return {
                        label: branchName,
                        description: `from ${remote}`,
                        remote: remote,
                        branchName: branchName,
                        fullPath: b
                    };
                }
                return null;
            })
            .filter(b => b !== null) as Array<{label: string; description: string; remote: string; branchName: string; fullPath: string}>;
        
        // Filter out branches that already exist locally
        const availableRemoteBranches = remoteBranches.filter(rb => 
            !localBranches.includes(rb.branchName)
        );
        
        if (availableRemoteBranches.length === 0) {
            vscode.window.showInformationMessage('All remote branches are already checked out locally');
            return;
        }
        
        const selected = await vscode.window.showQuickPick(availableRemoteBranches, {
            placeHolder: 'Select a remote branch to checkout'
        });
        
        if (!selected) {
            return;
        }
        
        // Checkout the branch (this will create a local tracking branch) using terminal
        await git.runGitCommandInteractive(gitRoot, ['checkout', '-b', selected.branchName, selected.fullPath], `Checkout ${selected.branchName}`);
        vscode.window.showInformationMessage(`Checked out branch: ${selected.branchName}`);
    });
}

async function cmdBranchRename() {
    return runCommand('rename branch', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const currentBranch = await git.getCurrentBranch(gitRoot);
        
        const newName = await vscode.window.showInputBox({
            prompt: `Rename current branch (${currentBranch})`,
            placeHolder: 'new-branch-name',
            value: currentBranch
        });

        if (!newName || newName === currentBranch) {
            return;
        }

        await git.runGitCommand(gitRoot, ['branch', '-m', newName], `Rename to ${newName}`);
        vscode.window.showInformationMessage(`Branch renamed to: ${newName}`);
    });
}

async function cmdBranchDelete() {
    return runCommand('delete branches', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const branches = await git.getBranches(gitRoot);
        const currentBranch = await git.getCurrentBranch(gitRoot);
        
        const selected = await vscode.window.showQuickPick(
            branches.filter(b => b !== currentBranch).map(b => ({ label: b, picked: false })),
            { canPickMany: true, placeHolder: 'Select branches to delete' }
        );

        if (!selected || selected.length === 0) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Delete ${selected.length} branch(es)?`,
            { modal: true },
            'Delete'
        );

        if (confirm !== 'Delete') {
            return;
        }

        for (const branch of selected) {
            try {
                await git.runGitCommand(gitRoot, ['branch', '-D', branch.label], `Delete ${branch.label}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to delete ${branch.label}: ${error}`);
            }
        }
        
        vscode.window.showInformationMessage(`Deleted ${selected.length} branch(es)`);
    });
}

async function cmdMerge() {
    return runCommand('merge', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const branches = await git.getBranches(gitRoot);
        const currentBranch = await git.getCurrentBranch(gitRoot);
        
        const branch = await vscode.window.showQuickPick(
            branches.filter(b => b !== currentBranch),
            { placeHolder: `Merge branch into ${currentBranch}` }
        );

        if (!branch) {
            return;
        }

        await git.runGitCommandInteractive(gitRoot, ['merge', branch], `Merge ${branch}`);
        vscode.window.showInformationMessage(`Merged ${branch} into ${currentBranch}`);
    });
}

async function cmdHistoryRewriteToSingle() {
    return runCommand('rewrite history', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const currentBranch = await git.getCurrentBranch(gitRoot);
        const defaultBranch = await git.getDefaultBranch(gitRoot);
        
        // Get list of commits
        const commits = await git.getCommits(gitRoot, 50);
        
        if (commits.length === 0) {
            vscode.window.showInformationMessage('No commits found');
            return;
        }
        
        // Show commit picker
        const selectedCommit = await vscode.window.showQuickPick(
            commits.map(c => ({
                label: c.display,
                description: '',
                commit: c
            })),
            {
                placeHolder: 'Select the commit to rewrite FROM (all commits from here forward will be squashed)'
            }
        );
        
        if (!selectedCommit) {
            return;
        }
        
        const confirm = await vscode.window.showWarningMessage(
            `Rewrite ${currentBranch} from commit ${selectedCommit.commit.hash}? This will squash all commits from this point forward into a single commit.`,
            { modal: true },
            'Rewrite'
        );

        if (confirm !== 'Rewrite') {
            return;
        }

        if (!(await ensureTestsAllowCommit(gitRoot))) {
            return;
        }

        const prefix = await git.getProcessedPrefix(gitRoot);
        const message = await vscode.window.showInputBox({
            prompt: 'Enter commit message for the single commit',
            placeHolder: 'Single commit message',
            value: prefix
        });

        if (!message) {
            return;
        }

        // Reset to the commit before the selected one using terminal
        await git.runGitCommand(gitRoot, ['reset', '--soft', `${selectedCommit.commit.hash}~1`], 'Reset');
        await git.runGitCommand(gitRoot, ['commit', '-m', message], 'Commit');
        vscode.window.showInformationMessage(`Branch rewritten to single commit from ${selectedCommit.commit.hash}`);
        // Refresh tree views immediately to show updated commit history
        await vscode.commands.executeCommand('git-quickops.refresh');
    });
}

async function cmdHistoryRebaseOnto() {
    return runCommand('rebase', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const branches = await git.getBranches(gitRoot);
        const currentBranch = await git.getCurrentBranch(gitRoot);
        
        const targetBranch = await vscode.window.showQuickPick(
            branches.filter(b => b !== currentBranch),
            { placeHolder: `Rebase ${currentBranch} onto which branch?` }
        );

        if (!targetBranch) {
            return;
        }

        await git.runGitCommandInteractive(gitRoot, ['rebase', targetBranch], `Rebase onto ${targetBranch}`);
        vscode.window.showInformationMessage(`Rebased onto ${targetBranch}`);
        // Refresh tree views immediately to show updated commit history
        await vscode.commands.executeCommand('git-quickops.refresh');
    });
}

async function cmdHistorySquashN() {
    return runCommand('start squash', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const n = await vscode.window.showInputBox({
            prompt: 'How many commits to squash?',
            placeHolder: '2',
            validateInput: (value) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 2) {
                    return 'Please enter a number >= 2';
                }
                return null;
            }
        });

        if (!n) {
            return;
        }

        await git.runGitCommandInteractive(gitRoot, ['rebase', '-i', `HEAD~${n}`], `Squash ${n} commits`);
        vscode.window.showInformationMessage('Interactive rebase started. Complete in terminal.');
    });
}

async function cmdHistoryUndoLast() {
    return runCommand('undo commit', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const confirm = await vscode.window.showWarningMessage(
            'Undo last commit but keep changes?',
            { modal: true },
            'Undo'
        );

        if (confirm !== 'Undo') {
            return;
        }

        await git.runGitCommand(gitRoot, ['reset', '--soft', 'HEAD~1'], 'Undo Last Commit');
        vscode.window.showInformationMessage('Last commit undone, changes kept');
    });
}

async function cmdHistoryAmendMessage() {
    return runCommand('amend commit message', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        // Get current commit message
        const currentMessage = await git.execGit(gitRoot, ['log', '--format=%B', '-n', '1', 'HEAD']);
        
        const message = await vscode.window.showInputBox({
            prompt: 'Enter new commit message',
            placeHolder: 'Updated commit message',
            value: currentMessage.trim()
        });

        if (!message) {
            return;
        }

        await git.runGitCommand(gitRoot, ['commit', '--amend', '-m', message], 'Amend Commit');
        vscode.window.showInformationMessage('Commit message amended');
    });
}

async function cmdCleanupPruneFetch() {
    return runCommand('fetch and prune', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        // Fetch and prune using interactive terminal
        await git.runGitCommandInteractive(gitRoot, ['fetch', '--all'], 'Fetch All');
        await git.runGitCommandInteractive(gitRoot, ['fetch', '-p'], 'Fetch Prune');
        
        // Wait for commands to start
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        vscode.window.showInformationMessage('Fetched and pruned');
    });
}

async function cmdCleanupDeleteOrphans() {
    return runCommand('delete orphan branches', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const defaultBranch = await git.getDefaultBranch(gitRoot);
        
        // Switch to default branch using interactive terminal
        await git.runGitCommandInteractive(gitRoot, ['checkout', defaultBranch], `Checkout ${defaultBranch}`);
        
        // Fetch and prune using interactive terminal
        await git.runGitCommandInteractive(gitRoot, ['fetch', '--all', '--prune'], 'Fetch and Prune');
        
        // Wait for commands to start
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Get remote branches
        const remoteBranches = await git.getBranches(gitRoot, true);
        const remoteShortNames = remoteBranches
            .filter(b => b.startsWith('remotes/origin/'))
            .map(b => b.replace('remotes/origin/', ''));
        
        // Get local branches
        const localBranches = await git.getBranches(gitRoot);
        const currentBranch = await git.getCurrentBranch(gitRoot);
        
        // Find orphans
        const orphans = localBranches.filter(b => 
            b !== currentBranch && !remoteShortNames.includes(b)
        );
        
        if (orphans.length === 0) {
            vscode.window.showInformationMessage('No orphan branches found');
            return;
        }
        
        const selected = await vscode.window.showQuickPick(
            orphans.map(b => ({ label: b, picked: false })),
            { canPickMany: true, placeHolder: 'Select orphan branches to delete' }
        );

        if (!selected || selected.length === 0) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Delete ${selected.length} orphan branch(es)?`,
            { modal: true },
            'Delete'
        );

        if (confirm !== 'Delete') {
            return;
        }

        for (const branch of selected) {
            await git.runGitCommand(gitRoot, ['branch', '-D', branch.label], `Delete ${branch.label}`);
        }
        
        vscode.window.showInformationMessage(`Deleted ${selected.length} orphan branch(es)`);
    });
}

async function cmdCleanupDeleteMerged() {
    return runCommand('delete merged branches', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const defaultBranch = await git.getDefaultBranch(gitRoot);
        
        // Fetch to ensure we have latest using interactive terminal
        await git.runGitCommandInteractive(gitRoot, ['fetch', '--all', '--prune'], 'Fetch Branches');
        
        // Wait for fetch to start
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get merged branches
        const output = await git.execGit(gitRoot, ['branch', '--merged', defaultBranch]);
        const mergedBranches = output.split('\n')
            .map(b => b.replace(/^[\s*]+/, '').trim())
            .filter(b => b && b !== defaultBranch);
        
        const currentBranch = await git.getCurrentBranch(gitRoot);
        const toDelete = mergedBranches.filter(b => b !== currentBranch);
        
        if (toDelete.length === 0) {
            vscode.window.showInformationMessage(`No branches merged into ${defaultBranch}`);
            return;
        }
        
        const selected = await vscode.window.showQuickPick(
            toDelete.map(b => ({ label: b, picked: false })),
            { canPickMany: true, placeHolder: `Select branches merged into ${defaultBranch} to delete` }
        );

        if (!selected || selected.length === 0) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Delete ${selected.length} merged branch(es)?`,
            { modal: true },
            'Delete'
        );

        if (confirm !== 'Delete') {
            return;
        }

        for (const branch of selected) {
            await git.execGit(gitRoot, ['branch', '-d', branch.label]);
        }
        
        vscode.window.showInformationMessage(`Deleted ${selected.length} merged branch(es)`);
    });
}

async function cmdStashSave() {
    return runCommand('stash changes', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const message = await vscode.window.showInputBox({
            prompt: 'Enter stash message (optional)',
            placeHolder: 'Stash message'
        });

        const args = message ? ['stash', 'save', message] : ['stash', 'save'];
        await git.execGit(gitRoot, args);
        vscode.window.showInformationMessage('Changes stashed');
    });
}

async function cmdStashList() {
    return runCommand('list stashes', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.runGitCommand(gitRoot, ['stash', 'list'], 'Stash List');
    });
}

async function cmdStashPop() {
    return runCommand('pop stash', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const stashes = await git.getStashes(gitRoot);
        
        if (stashes.length === 0) {
            vscode.window.showInformationMessage('No stashes found');
            return;
        }
        
        const selected = await vscode.window.showQuickPick(stashes, {
            placeHolder: 'Select stash to pop'
        });

        if (!selected) {
            return;
        }

        const stashIndex = stashes.indexOf(selected);
        await git.execGit(gitRoot, ['stash', 'pop', `stash@{${stashIndex}}`]);
        vscode.window.showInformationMessage('Stash popped');
    });
}

async function cmdTagCreate() {
    return runCommand('create tag', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const tagName = await vscode.window.showInputBox({
            prompt: 'Enter tag name',
            placeHolder: 'v1.0.0'
        });

        if (!tagName) {
            return;
        }

        const message = await vscode.window.showInputBox({
            prompt: 'Enter tag message (optional)',
            placeHolder: 'Tag message'
        });

        const args = message ? ['tag', '-a', tagName, '-m', message] : ['tag', tagName];
        await git.execGit(gitRoot, args);
        vscode.window.showInformationMessage(`Tag created: ${tagName}`);
        
        const pushTag = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Push tag to remote?'
        });
        
        if (pushTag === 'Yes') {
            const config = vscode.workspace.getConfiguration('gitQuickOps');
            const defaultRemote = config.get<string>('defaultRemote', 'origin');
            await git.execGit(gitRoot, ['push', defaultRemote, tagName]);
            vscode.window.showInformationMessage(`Tag pushed to ${defaultRemote}`);
        }
    });
}

async function cmdRemotesSetUpstream() {
    return runCommand('set upstream', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const remotes = await git.getRemotes(gitRoot);
        
        let remote = 'origin';
        if (remotes.length > 1) {
            const selected = await vscode.window.showQuickPick(remotes, {
                placeHolder: 'Select remote'
            });
            if (selected) {
                remote = selected;
            }
        }
        
        const branch = await git.getCurrentBranch(gitRoot);
        
        const confirm = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: `Push and set upstream to ${remote}/${branch}?`
        });

        if (confirm !== 'Yes') {
            return;
        }

        await git.runGitCommand(gitRoot, ['push', '-u', remote, branch], 'Push with upstream');
        vscode.window.showInformationMessage(`Upstream set to ${remote}/${branch}`);
    });
}

async function cmdUtilsRestoreFile() {
    return runCommand('restore file', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const filePath = await vscode.window.showInputBox({
            prompt: 'Enter file path to restore from HEAD',
            placeHolder: 'path/to/file.txt'
        });

        if (!filePath) {
            return;
        }

        const confirm = await vscode.window.showWarningMessage(
            `Restore ${filePath} from HEAD? This will discard working tree changes.`,
            { modal: true },
            'Restore'
        );

        if (confirm !== 'Restore') {
            return;
        }

        await git.execGit(gitRoot, ['restore', '--source', 'HEAD', '--', filePath]);
        vscode.window.showInformationMessage(`Restored ${filePath} from HEAD`);
    });
}

async function cmdUtilsUnstageAll() {
    return runCommand('unstage changes', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const confirm = await vscode.window.showWarningMessage(
            'Unstage all changes?',
            { modal: true },
            'Unstage'
        );

        if (confirm !== 'Unstage') {
            return;
        }

        await git.execGit(gitRoot, ['reset']);
        vscode.window.showInformationMessage('All changes unstaged');
    });
}

async function cmdUtilsSetPrefix() {
    return runCommand('set prefix', async () => {
        const choice = await vscode.window.showQuickPick([
            { label: 'Workspace Setting (applies to all repos)', value: 'workspace' },
            { label: 'Repo-specific (.GIT_QUICKOPS_CONFIG file)', value: 'repo' },
        ], { placeHolder: 'Where should the prefix be configured?' });

        if (!choice) {
            return;
        }

        const gitRoot = await RepositoryContext.getGitRoot();
        const currentPrefix = await git.getCommitPrefix(gitRoot);
        
        const prefix = await vscode.window.showInputBox({
            prompt: 'Enter commit prefix (use {{branch}} and {{ticket}} as placeholders)',
            placeHolder: '{{ticket}}: ',
            value: currentPrefix
        });

        if (prefix === undefined) {
            return;
        }

        if (choice.value === 'workspace') {
            const config = vscode.workspace.getConfiguration('gitQuickOps');
            await config.update('commitPrefix', prefix, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('Commit prefix updated in workspace settings');
        } else {
            const configFile = path.join(gitRoot, '.GIT_QUICKOPS_CONFIG');
            const legacyPrefixFile = path.join(gitRoot, '.GIT_QUICKOPS_PREFIX');
            const legacyHelperFile = path.join(gitRoot, '.GIT_HELPER_PREFIX');
            
            // Read existing config or create new one
            const config = git.getRepoConfig(gitRoot);
            config.commitPrefix = prefix;
            git.setRepoConfig(gitRoot, config);
            
            let message = `Commit prefix saved to ${configFile}`;
            if (fs.existsSync(legacyPrefixFile)) {
                message += `\n\nNote: Legacy .GIT_QUICKOPS_PREFIX file exists. The new .GIT_QUICKOPS_CONFIG will take precedence.`;
            }
            if (fs.existsSync(legacyHelperFile)) {
                message += `\n\nNote: Legacy .GIT_HELPER_PREFIX file exists. The new .GIT_QUICKOPS_CONFIG will take precedence.`;
            }
            vscode.window.showInformationMessage(message);
        }
    });
}

// ========== New Interactive Tree Commands ==========

async function cmdBranchSwitchTo(branchName: string) {
    return runCommand('switch branch', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['checkout', branchName]);
        vscode.window.showInformationMessage(`Switched to branch: ${branchName}`);
    });
}

async function cmdBranchCreateFromItem(branchName: string) {
    return runCommand('create branch', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const newBranchName = await vscode.window.showInputBox({
            prompt: `Create new branch from ${branchName}`,
            placeHolder: 'new-branch-name'
        });
        
        if (!newBranchName) {
            return;
        }
        
        await git.execGit(gitRoot, ['checkout', '-b', newBranchName, branchName]);
        vscode.window.showInformationMessage(`Created and switched to branch: ${newBranchName}`);
    });
}

async function cmdBranchDeleteSpecific(branchName: string) {
    return runCommand('delete branch', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const currentBranch = await git.getCurrentBranch(gitRoot);
        
        if (branchName === currentBranch) {
            vscode.window.showErrorMessage('Cannot delete the currently checked out branch');
            return;
        }
        
        const confirm = await vscode.window.showWarningMessage(
            `Delete branch "${branchName}"?`,
            { modal: true },
            'Delete',
            'Force Delete'
        );
        
        if (!confirm) {
            return;
        }
        
        const forceFlag = confirm === 'Force Delete' ? '-D' : '-d';
        await git.execGit(gitRoot, ['branch', forceFlag, branchName]);
        vscode.window.showInformationMessage(`Deleted branch: ${branchName}`);
    });
}

async function cmdBranchRenameSpecific(branchName: string) {
    return runCommand('rename branch', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const newName = await vscode.window.showInputBox({
            prompt: `Rename branch "${branchName}" to:`,
            placeHolder: 'new-branch-name',
            value: branchName
        });
        
        if (!newName || newName === branchName) {
            return;
        }
        
        const currentBranch = await git.getCurrentBranch(gitRoot);
        if (branchName === currentBranch) {
            await git.execGit(gitRoot, ['branch', '-m', newName]);
        } else {
            await git.execGit(gitRoot, ['branch', '-m', branchName, newName]);
        }
        
        vscode.window.showInformationMessage(`Renamed branch ${branchName} to ${newName}`);
    });
}

async function cmdCommitView(commitData: any) {
    return runCommand('view commit', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const details = await git.getCommitDetails(gitRoot, commitData.hash);
        
        const doc = await vscode.workspace.openTextDocument({
            content: details,
            language: 'diff'
        });
        
        await vscode.window.showTextDocument(doc, { preview: true });
    });
}

async function cmdCommitRewriteFrom(commitData: any) {
    return runCommand('start rebase', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const confirm = await vscode.window.showWarningMessage(
            `Rewrite commit history from "${commitData.hash} - ${commitData.message}"?`,
            { modal: true },
            'This will start an interactive rebase. Make sure you understand the implications.'
        );
        
        if (!confirm) {
            return;
        }
        
        // Open terminal and run interactive rebase
        const terminal = vscode.window.createTerminal({
            name: 'Git Rebase',
            cwd: gitRoot
        });
        terminal.show();
        terminal.sendText(`git rebase -i ${commitData.hash}^`);
        
        vscode.window.showInformationMessage('Interactive rebase started in terminal');
    });
}

async function cmdCommitRewriteFromHash(commitHash: string) {
    return runCommand('start rebase', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const confirm = await vscode.window.showWarningMessage(
            `Rewrite commit history from "${commitHash}"?`,
            { modal: true },
            'Continue'
        );
        
        if (!confirm) {
            return;
        }
        
        // Open terminal and run interactive rebase
        const terminal = vscode.window.createTerminal({
            name: 'Git Rebase',
            cwd: gitRoot
        });
        terminal.show();
        terminal.sendText(`git rebase -i ${commitHash}^`);
        
        vscode.window.showInformationMessage('Interactive rebase started in terminal');
    });
}

async function cmdCommitCherryPick(commitData: any) {
    return runCommand('cherry-pick', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['cherry-pick', commitData.hash]);
        vscode.window.showInformationMessage(`Cherry-picked commit: ${commitData.hash}`);
    });
}

async function cmdCommitCherryPickHash(commitHash: string) {
    return runCommand('cherry-pick', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['cherry-pick', commitHash]);
        vscode.window.showInformationMessage(`Cherry-picked commit: ${commitHash}`);
    });
}

async function cmdCommitRevert(commitData: any) {
    return runCommand('revert', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['revert', commitData.hash]);
        vscode.window.showInformationMessage(`Reverted commit: ${commitData.hash}`);
    });
}

async function cmdCommitRevertHash(commitHash: string) {
    return runCommand('revert', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['revert', commitHash]);
        vscode.window.showInformationMessage(`Reverted commit: ${commitHash}`);
    });
}

async function cmdCommitCopyHash(commitData: any) {
    await vscode.env.clipboard.writeText(commitData.hash);
    vscode.window.showInformationMessage(`Copied commit hash: ${commitData.hash}`);
}

async function cmdCommitCreateBranch(commitData: any) {
    return runCommand('create branch', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const branchName = await vscode.window.showInputBox({
            prompt: `Create branch from commit ${commitData.hash}`,
            placeHolder: 'new-branch-name'
        });
        
        if (!branchName) {
            return;
        }
        
        const switchToBranch = await vscode.window.showQuickPick(
            ['Yes', 'No'],
            { placeHolder: 'Switch to new branch?' }
        );
        
        if (switchToBranch === 'Yes') {
            await git.execGit(gitRoot, ['checkout', '-b', branchName, commitData.hash]);
            vscode.window.showInformationMessage(`Created and switched to branch: ${branchName}`);
        } else {
            await git.execGit(gitRoot, ['branch', branchName, commitData.hash]);
            vscode.window.showInformationMessage(`Created branch: ${branchName}`);
        }
    });
}

async function cmdCommitCreateBranchFromHash(commitHash: string) {
    return runCommand('create branch', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        const branchName = await vscode.window.showInputBox({
            prompt: `Create branch from commit ${commitHash}`,
            placeHolder: 'new-branch-name'
        });
        
        if (!branchName) {
            return;
        }
        
        const switchToBranch = await vscode.window.showQuickPick(
            ['Yes', 'No'],
            { placeHolder: 'Switch to new branch?' }
        );
        
        if (switchToBranch === 'Yes') {
            await git.execGit(gitRoot, ['checkout', '-b', branchName, commitHash]);
            vscode.window.showInformationMessage(`Created and switched to branch: ${branchName}`);
        } else {
            await git.execGit(gitRoot, ['branch', branchName, commitHash]);
            vscode.window.showInformationMessage(`Created branch: ${branchName}`);
        }
    });
}

async function cmdFileOpenDiff(fileData: any) {
    return runCommand('open diff', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const filePath = path.join(gitRoot, fileData.path);
        const uri = vscode.Uri.file(filePath);
        
        // Open diff view
        const gitUri = uri.with({ scheme: 'git', query: 'HEAD' });
        await vscode.commands.executeCommand('vscode.diff', gitUri, uri, `${fileData.path} (Working Tree)`);
    });
}

async function cmdFileStage(fileData: any) {
    return runCommand('stage file', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['add', fileData.path]);
        vscode.window.showInformationMessage(`Staged: ${fileData.path}`);
    });
}

async function cmdFileUnstage(fileData: any) {
    return runCommand('unstage file', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['reset', 'HEAD', fileData.path]);
        vscode.window.showInformationMessage(`Unstaged: ${fileData.path}`);
    });
}

async function cmdFileDiscard(fileData: any) {
    return runCommand('discard changes', async () => {
        const confirm = await vscode.window.showWarningMessage(
            `Discard changes to ${fileData.path}?`,
            { modal: true },
            'Discard'
        );
        
        if (!confirm) {
            return;
        }
        
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['checkout', '--', fileData.path]);
        vscode.window.showInformationMessage(`Discarded changes: ${fileData.path}`);
    });
}

async function cmdStashApply(stashData: any) {
    return runCommand('apply stash', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['stash', 'apply', `stash@{${stashData.index}}`]);
        vscode.window.showInformationMessage('Stash applied');
    });
}

async function cmdStashPopSpecific(stashData: any) {
    return runCommand('pop stash', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['stash', 'pop', `stash@{${stashData.index}}`]);
        vscode.window.showInformationMessage('Stash popped');
    });
}

async function cmdStashDrop(stashData: any) {
    return runCommand('drop stash', async () => {
        const confirm = await vscode.window.showWarningMessage(
            'Drop this stash?',
            { modal: true },
            'Drop'
        );
        
        if (!confirm) {
            return;
        }
        
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['stash', 'drop', `stash@{${stashData.index}}`]);
        vscode.window.showInformationMessage('Stash dropped');
    });
}

async function cmdStashView(stashData: any) {
    return runCommand('view stash', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        const details = await git.execGit(gitRoot, ['stash', 'show', '-p', `stash@{${stashData.index}}`]);
        
        const doc = await vscode.workspace.openTextDocument({
            content: details,
            language: 'diff'
        });
        
        await vscode.window.showTextDocument(doc, { preview: true });
    });
}

async function cmdRemoteAdd() {
    return runCommand('add remote', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await promptAddRemote(gitRoot);
    });
}

async function cmdStageAll() {
    return runCommand('stage all changes', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['add', '-A']);
        vscode.window.showInformationMessage('All changes staged');
    });
}

async function cmdCommitStaged() {
    return runCommand('commit', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        
        if (!(await ensureTestsAllowCommit(gitRoot))) {
            return;
        }
        
        // Get the processed prefix
        const prefix = await git.getProcessedPrefix(gitRoot);
        
        const message = await vscode.window.showInputBox({
            prompt: 'Enter commit message',
            placeHolder: 'Commit message',
            value: prefix
        });
        
        if (!message) {
            return;
        }
        
        await git.execGit(gitRoot, ['commit', '-m', message]);
        vscode.window.showInformationMessage('Changes committed');
    });
}

async function cmdUnstageAll() {
    return runCommand('unstage all changes', async () => {
        const gitRoot = await RepositoryContext.getGitRoot();
        await git.execGit(gitRoot, ['reset', 'HEAD']);
        vscode.window.showInformationMessage('All changes unstaged');
    });
}
