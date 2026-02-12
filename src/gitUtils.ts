import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface GitConfig {
    userName?: string;
    userEmail?: string;
}

/**
 * Execute a git command and return the output
 */
export async function execGit(cwd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const gitPath = vscode.workspace.getConfiguration('git').get<string>('path') || 'git';
        
        cp.execFile(gitPath, args, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

/**
 * Get the root directory of the git repository
 */
export async function getGitRoot(workspaceFolder?: vscode.WorkspaceFolder): Promise<string> {
    const cwd = workspaceFolder?.uri.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!cwd) {
        throw new Error('No workspace folder open');
    }
    
    try {
        const root = await execGit(cwd, ['rev-parse', '--show-toplevel']);
        return root;
    } catch (error) {
        throw new Error('Not a git repository');
    }
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(gitRoot: string): Promise<string> {
    try {
        return await execGit(gitRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
    } catch (error) {
        throw new Error('Failed to get current branch');
    }
}

/**
 * Get the default branch name (main or master)
 */
export async function getDefaultBranch(gitRoot: string): Promise<string> {
    try {
        // Try to get the default branch from remote
        const remoteBranch = await execGit(gitRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD']);
        return remoteBranch.replace('refs/remotes/origin/', '');
    } catch {
        // Fall back to checking which exists
        try {
            await execGit(gitRoot, ['rev-parse', '--verify', 'main']);
            return 'main';
        } catch {
            try {
                await execGit(gitRoot, ['rev-parse', '--verify', 'master']);
                return 'master';
            } catch {
                return 'main'; // default fallback
            }
        }
    }
}

/**
 * Get list of all branches
 */
export async function getBranches(gitRoot: string, includeRemote: boolean = false): Promise<string[]> {
    try {
        const args = includeRemote ? ['branch', '-a'] : ['branch'];
        const output = await execGit(gitRoot, args);
        return output.split('\n')
            .map(b => b.replace(/^[\s*]+/, '').trim())
            .filter(b => b && !b.startsWith('remotes/origin/HEAD'));
    } catch (error) {
        return [];
    }
}

/**
 * Get list of remote names
 */
export async function getRemotes(gitRoot: string): Promise<string[]> {
    try {
        const output = await execGit(gitRoot, ['remote']);
        return output.split('\n').filter(r => r);
    } catch (error) {
        return [];
    }
}

/**
 * Get git config values
 */
export async function getGitConfig(gitRoot: string): Promise<GitConfig> {
    const config: GitConfig = {};
    
    try {
        config.userName = await execGit(gitRoot, ['config', 'user.name']);
    } catch {
        // user.name not set
    }
    
    try {
        config.userEmail = await execGit(gitRoot, ['config', 'user.email']);
    } catch {
        // user.email not set
    }
    
    return config;
}

/**
 * Set git config value
 */
export async function setGitConfig(gitRoot: string, key: string, value: string, global: boolean = false): Promise<void> {
    const args = global ? ['config', '--global', key, value] : ['config', key, value];
    await execGit(gitRoot, args);
}

/**
 * Get the status of the repository
 */
export async function getStatus(gitRoot: string): Promise<string> {
    try {
        return await execGit(gitRoot, ['status', '--short']);
    } catch (error) {
        throw new Error('Failed to get git status');
    }
}

/**
 * Check if there are uncommitted changes
 */
export async function hasUncommittedChanges(gitRoot: string): Promise<boolean> {
    const status = await getStatus(gitRoot);
    return status.length > 0;
}

/**
 * Get list of stashes
 */
export async function getStashes(gitRoot: string): Promise<string[]> {
    try {
        const output = await execGit(gitRoot, ['stash', 'list']);
        return output.split('\n').filter(s => s);
    } catch (error) {
        return [];
    }
}

/**
 * Get commit message prefix from config or repo file
 */
export async function getCommitPrefix(gitRoot: string): Promise<string> {
    // Priority order:
    // 1. .GIT_QUICKOPS_PREFIX file (new)
    // 2. .GIT_HELPER_PREFIX file (legacy support)
    // 3. GIT_QUICKOPS_PREFIX environment variable
    // 4. GIT_HELPER_PREFIX environment variable (legacy support)
    // 5. VS Code configuration setting
    
    // Check .GIT_QUICKOPS_PREFIX file
    const prefixFile = path.join(gitRoot, '.GIT_QUICKOPS_PREFIX');
    if (fs.existsSync(prefixFile)) {
        try {
            const content = fs.readFileSync(prefixFile, 'utf-8').trim();
            if (content) {
                return content;
            }
        } catch {
            // Ignore read errors
        }
    }
    
    // Check legacy .GIT_HELPER_PREFIX file
    const legacyPrefixFile = path.join(gitRoot, '.GIT_HELPER_PREFIX');
    if (fs.existsSync(legacyPrefixFile)) {
        try {
            const content = fs.readFileSync(legacyPrefixFile, 'utf-8').trim();
            if (content) {
                return content;
            }
        } catch {
            // Ignore read errors
        }
    }
    
    // Check GIT_QUICKOPS_PREFIX environment variable
    if (process.env.GIT_QUICKOPS_PREFIX) {
        return process.env.GIT_QUICKOPS_PREFIX;
    }
    
    // Check legacy GIT_HELPER_PREFIX environment variable
    if (process.env.GIT_HELPER_PREFIX) {
        return process.env.GIT_HELPER_PREFIX;
    }
    
    // Fall back to VS Code configuration
    const config = vscode.workspace.getConfiguration('gitQuickOps');
    return config.get<string>('commitPrefix', '');
}

/**
 * Extract ticket number from branch name
 * Supports patterns like: feature/PROJ-123-description, PROJ-123, etc.
 */
export function extractTicketFromBranch(branchName: string): string {
    // Match patterns like PROJ-123, ABC-456, etc.
    const match = branchName.match(/([A-Z]+-\d+)/);
    return match ? match[1] : '';
}

/**
 * Process commit message prefix template
 */
export async function processCommitPrefix(gitRoot: string, message: string): Promise<string> {
    const prefix = await getCommitPrefix(gitRoot);
    if (!prefix) {
        return message;
    }
    
    const branch = await getCurrentBranch(gitRoot);
    const ticket = extractTicketFromBranch(branch);
    
    let processedPrefix = prefix
        .replace(/\{\{branch\}\}/g, branch)
        .replace(/\{\{ticket\}\}/g, ticket);
    
    // If prefix ends with a space or message starts with a space, join directly
    // Otherwise add a space
    if (processedPrefix.endsWith(' ') || message.startsWith(' ')) {
        return processedPrefix + message;
    } else if (processedPrefix) {
        return processedPrefix + ' ' + message;
    }
    
    return message;
}

/**
 * Show output in a new terminal
 */
export function showInTerminal(title: string, command: string, cwd: string): void {
    const terminal = vscode.window.createTerminal({
        name: title,
        cwd: cwd
    });
    terminal.show();
    terminal.sendText(command);
}

/**
 * Run git command and show result in output channel
 */
export async function runGitCommand(gitRoot: string, args: string[], title?: string): Promise<void> {
    const outputChannel = vscode.window.createOutputChannel(title || 'Git QuickOps');
    outputChannel.show();
    outputChannel.appendLine(`Running: git ${args.join(' ')}`);
    outputChannel.appendLine('');
    
    try {
        const output = await execGit(gitRoot, args);
        outputChannel.appendLine(output);
        outputChannel.appendLine('');
        outputChannel.appendLine('✓ Command completed successfully');
    } catch (error) {
        outputChannel.appendLine(`✗ Error: ${error}`);
        throw error;
    }
}
