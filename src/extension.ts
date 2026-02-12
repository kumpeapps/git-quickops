import * as vscode from 'vscode';
import * as git from './gitUtils';
import * as path from 'path';
import * as fs from 'fs';
import { MenuTreeProvider } from './menuTreeProvider';

const EXTENSION_VERSION = '1.0.0';

export function activate(context: vscode.ExtensionContext) {
    console.log('Git QuickOps extension is now active');

    // Register tree view
    const menuTreeProvider = new MenuTreeProvider();
    vscode.window.registerTreeDataProvider('gitQuickOpsMenu', menuTreeProvider);

    // Register all commands
    context.subscriptions.push(
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
        vscode.commands.registerCommand('git-quickops.addCommitPush', () => cmdAddCommitPush())
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
    const gitRoot = await git.getGitRoot();
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

// ========== Command Implementations ==========

async function cmdStatus() {
    const gitRoot = await git.getGitRoot();
    await git.runGitCommand(gitRoot, ['status'], 'Git Status');
}

async function cmdAdd() {
    const gitRoot = await git.getGitRoot();
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
                await git.execGit(gitRoot, ['add', file.label]);
            }
            vscode.window.showInformationMessage(`Added ${selected.length} file(s)`);
        }
    }
}

async function cmdCommit() {
    const gitRoot = await git.getGitRoot();
    
    const message = await vscode.window.showInputBox({
        prompt: 'Enter commit message',
        placeHolder: 'Commit message'
    });

    if (!message) {
        return;
    }

    const processedMessage = await git.processCommitPrefix(gitRoot, message);
    await git.runGitCommand(gitRoot, ['commit', '-m', processedMessage], 'Git Commit');
    vscode.window.showInformationMessage('Changes committed');
}

async function cmdAddCommitPush() {
    const gitRoot = await git.getGitRoot();
    
    // Add all changes
    await git.execGit(gitRoot, ['add', '-A']);
    vscode.window.showInformationMessage('Changes added');
    
    // Get commit message
    const message = await vscode.window.showInputBox({
        prompt: 'Enter commit message',
        placeHolder: 'Commit message'
    });

    if (!message) {
        return;
    }

    // Commit
    const processedMessage = await git.processCommitPrefix(gitRoot, message);
    await git.execGit(gitRoot, ['commit', '-m', processedMessage]);
    vscode.window.showInformationMessage('Changes committed');
    
    // Push
    const branch = await git.getCurrentBranch(gitRoot);
    const config = vscode.workspace.getConfiguration('gitQuickOps');
    const defaultRemote = config.get<string>('defaultRemote', 'origin');
    
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Pushing to ${defaultRemote}/${branch}...`,
        cancellable: false
    }, async () => {
        await git.execGit(gitRoot, ['push', defaultRemote, branch]);
    });
    
    vscode.window.showInformationMessage(`Changes pushed to ${defaultRemote}/${branch}`);
}

async function cmdPush() {
    const gitRoot = await git.getGitRoot();
    const branch = await git.getCurrentBranch(gitRoot);
    const config = vscode.workspace.getConfiguration('gitQuickOps');
    const defaultRemote = config.get<string>('defaultRemote', 'origin');
    
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Pushing to ${defaultRemote}/${branch}...`,
        cancellable: false
    }, async () => {
        await git.runGitCommand(gitRoot, ['push', defaultRemote, branch], 'Git Push');
    });
    
    vscode.window.showInformationMessage(`Pushed to ${defaultRemote}/${branch}`);
}

async function cmdPull() {
    const gitRoot = await git.getGitRoot();
    
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Pulling changes...',
        cancellable: false
    }, async () => {
        await git.runGitCommand(gitRoot, ['pull'], 'Git Pull');
    });
    
    vscode.window.showInformationMessage('Changes pulled');
}

async function cmdFetch() {
    const gitRoot = await git.getGitRoot();
    
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Fetching from remote...',
        cancellable: false
    }, async () => {
        await git.runGitCommand(gitRoot, ['fetch', '--all'], 'Git Fetch');
    });
    
    vscode.window.showInformationMessage('Fetched from remote');
}

async function cmdLog() {
    const gitRoot = await git.getGitRoot();
    await git.runGitCommand(gitRoot, ['log', '--oneline', '--graph', '--decorate', '-20'], 'Git Log');
}

async function cmdDiff() {
    const gitRoot = await git.getGitRoot();
    
    const choice = await vscode.window.showQuickPick([
        { label: 'Diff working directory', value: 'working' },
        { label: 'Diff staged changes', value: 'staged' },
    ], { placeHolder: 'Select diff type' });

    if (!choice) {
        return;
    }

    const args = choice.value === 'staged' ? ['diff', '--staged'] : ['diff'];
    await git.runGitCommand(gitRoot, args, 'Git Diff');
}

async function cmdBranchCreate() {
    const gitRoot = await git.getGitRoot();
    
    const branchName = await vscode.window.showInputBox({
        prompt: 'Enter new branch name',
        placeHolder: 'feature/my-branch'
    });

    if (!branchName) {
        return;
    }

    await git.execGit(gitRoot, ['checkout', '-b', branchName]);
    vscode.window.showInformationMessage(`Created and switched to branch: ${branchName}`);
}

async function cmdBranchCreateFrom() {
    const gitRoot = await git.getGitRoot();
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

    await git.execGit(gitRoot, ['checkout', '-b', branchName, sourceBranch]);
    vscode.window.showInformationMessage(`Created branch ${branchName} from ${sourceBranch}`);
}

async function cmdBranchSwitch() {
    const gitRoot = await git.getGitRoot();
    const branches = await git.getBranches(gitRoot);
    const currentBranch = await git.getCurrentBranch(gitRoot);
    
    const branch = await vscode.window.showQuickPick(
        branches.filter(b => b !== currentBranch),
        { placeHolder: 'Select branch to switch to' }
    );

    if (!branch) {
        return;
    }

    await git.execGit(gitRoot, ['checkout', branch]);
    vscode.window.showInformationMessage(`Switched to branch: ${branch}`);
}

async function cmdBranchRename() {
    const gitRoot = await git.getGitRoot();
    const currentBranch = await git.getCurrentBranch(gitRoot);
    
    const newName = await vscode.window.showInputBox({
        prompt: `Rename current branch (${currentBranch})`,
        placeHolder: 'new-branch-name',
        value: currentBranch
    });

    if (!newName || newName === currentBranch) {
        return;
    }

    await git.execGit(gitRoot, ['branch', '-m', newName]);
    vscode.window.showInformationMessage(`Branch renamed to: ${newName}`);
}

async function cmdBranchDelete() {
    const gitRoot = await git.getGitRoot();
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
            await git.execGit(gitRoot, ['branch', '-D', branch.label]);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to delete ${branch.label}: ${error}`);
        }
    }
    
    vscode.window.showInformationMessage(`Deleted ${selected.length} branch(es)`);
}

async function cmdMerge() {
    const gitRoot = await git.getGitRoot();
    const branches = await git.getBranches(gitRoot);
    const currentBranch = await git.getCurrentBranch(gitRoot);
    
    const branch = await vscode.window.showQuickPick(
        branches.filter(b => b !== currentBranch),
        { placeHolder: `Merge branch into ${currentBranch}` }
    );

    if (!branch) {
        return;
    }

    try {
        await git.runGitCommand(gitRoot, ['merge', branch], `Merge ${branch}`);
        vscode.window.showInformationMessage(`Merged ${branch} into ${currentBranch}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Merge conflict or error: ${error}`);
    }
}

async function cmdHistoryRewriteToSingle() {
    const gitRoot = await git.getGitRoot();
    const currentBranch = await git.getCurrentBranch(gitRoot);
    const defaultBranch = await git.getDefaultBranch(gitRoot);
    
    const confirm = await vscode.window.showWarningMessage(
        `Rewrite ${currentBranch} to a single commit? This will squash all commits.`,
        { modal: true },
        'Rewrite'
    );

    if (confirm !== 'Rewrite') {
        return;
    }

    const message = await vscode.window.showInputBox({
        prompt: 'Enter commit message for the single commit',
        placeHolder: 'Single commit message'
    });

    if (!message) {
        return;
    }

    try {
        await git.execGit(gitRoot, ['reset', '--soft', defaultBranch]);
        const processedMessage = await git.processCommitPrefix(gitRoot, message);
        await git.execGit(gitRoot, ['commit', '-m', processedMessage]);
        vscode.window.showInformationMessage('Branch rewritten to single commit');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to rewrite: ${error}`);
    }
}

async function cmdHistoryRebaseOnto() {
    const gitRoot = await git.getGitRoot();
    const branches = await git.getBranches(gitRoot);
    const currentBranch = await git.getCurrentBranch(gitRoot);
    
    const targetBranch = await vscode.window.showQuickPick(
        branches.filter(b => b !== currentBranch),
        { placeHolder: `Rebase ${currentBranch} onto which branch?` }
    );

    if (!targetBranch) {
        return;
    }

    try {
        await git.runGitCommand(gitRoot, ['rebase', targetBranch], `Rebase onto ${targetBranch}`);
        vscode.window.showInformationMessage(`Rebased onto ${targetBranch}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Rebase failed: ${error}`);
    }
}

async function cmdHistorySquashN() {
    const gitRoot = await git.getGitRoot();
    
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

    try {
        await git.runGitCommand(gitRoot, ['rebase', '-i', `HEAD~${n}`], `Squash ${n} commits`);
        vscode.window.showInformationMessage('Interactive rebase started. Complete in terminal.');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to start rebase: ${error}`);
    }
}

async function cmdHistoryUndoLast() {
    const gitRoot = await git.getGitRoot();
    
    const confirm = await vscode.window.showWarningMessage(
        'Undo last commit but keep changes?',
        { modal: true },
        'Undo'
    );

    if (confirm !== 'Undo') {
        return;
    }

    await git.execGit(gitRoot, ['reset', '--soft', 'HEAD~1']);
    vscode.window.showInformationMessage('Last commit undone, changes kept');
}

async function cmdHistoryAmendMessage() {
    const gitRoot = await git.getGitRoot();
    
    const message = await vscode.window.showInputBox({
        prompt: 'Enter new commit message',
        placeHolder: 'Updated commit message'
    });

    if (!message) {
        return;
    }

    const processedMessage = await git.processCommitPrefix(gitRoot, message);
    await git.execGit(gitRoot, ['commit', '--amend', '-m', processedMessage]);
    vscode.window.showInformationMessage('Commit message amended');
}

async function cmdCleanupPruneFetch() {
    const gitRoot = await git.getGitRoot();
    
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Fetching and pruning...',
        cancellable: false
    }, async () => {
        await git.execGit(gitRoot, ['fetch', '--all']);
        await git.execGit(gitRoot, ['fetch', '-p']);
    });
    
    vscode.window.showInformationMessage('Fetched and pruned');
}

async function cmdCleanupDeleteOrphans() {
    const gitRoot = await git.getGitRoot();
    const defaultBranch = await git.getDefaultBranch(gitRoot);
    
    // Switch to default branch
    await git.execGit(gitRoot, ['checkout', defaultBranch]);
    
    // Fetch and prune
    await git.execGit(gitRoot, ['fetch', '--all', '--prune']);
    
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
        await git.execGit(gitRoot, ['branch', '-D', branch.label]);
    }
    
    vscode.window.showInformationMessage(`Deleted ${selected.length} orphan branch(es)`);
}

async function cmdCleanupDeleteMerged() {
    const gitRoot = await git.getGitRoot();
    const defaultBranch = await git.getDefaultBranch(gitRoot);
    
    // Fetch to ensure we have latest
    await git.execGit(gitRoot, ['fetch', '--all', '--prune']);
    
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
}

async function cmdStashSave() {
    const gitRoot = await git.getGitRoot();
    
    const message = await vscode.window.showInputBox({
        prompt: 'Enter stash message (optional)',
        placeHolder: 'Stash message'
    });

    const args = message ? ['stash', 'save', message] : ['stash', 'save'];
    await git.execGit(gitRoot, args);
    vscode.window.showInformationMessage('Changes stashed');
}

async function cmdStashList() {
    const gitRoot = await git.getGitRoot();
    await git.runGitCommand(gitRoot, ['stash', 'list'], 'Stash List');
}

async function cmdStashPop() {
    const gitRoot = await git.getGitRoot();
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
}

async function cmdTagCreate() {
    const gitRoot = await git.getGitRoot();
    
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
}

async function cmdRemotesSetUpstream() {
    const gitRoot = await git.getGitRoot();
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
}

async function cmdUtilsRestoreFile() {
    const gitRoot = await git.getGitRoot();
    
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
}

async function cmdUtilsUnstageAll() {
    const gitRoot = await git.getGitRoot();
    
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
}

async function cmdUtilsSetPrefix() {
    const choice = await vscode.window.showQuickPick([
        { label: 'Workspace Setting (applies to all repos)', value: 'workspace' },
        { label: 'Repo-specific (.GIT_QUICKOPS_PREFIX file)', value: 'repo' },
    ], { placeHolder: 'Where should the prefix be configured?' });

    if (!choice) {
        return;
    }

    const gitRoot = await git.getGitRoot();
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
        const prefixFile = path.join(gitRoot, '.GIT_QUICKOPS_PREFIX');
        const legacyPrefixFile = path.join(gitRoot, '.GIT_HELPER_PREFIX');
        fs.writeFileSync(prefixFile, prefix);
        
        let message = `Commit prefix saved to ${prefixFile}`;
        if (fs.existsSync(legacyPrefixFile)) {
            message += `\n\nNote: Legacy .GIT_HELPER_PREFIX file exists. The new .GIT_QUICKOPS_PREFIX will take precedence.`;
        }
        vscode.window.showInformationMessage(message);
    }
}
