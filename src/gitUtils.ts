import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface GitConfig {
    userName?: string;
    userEmail?: string;
}

/**
 * Execute any command and return the output
 */
export async function execCommand(cwd: string, command: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number; commandNotFound: boolean }> {
    return new Promise((resolve) => {
        cp.execFile(command, args, { cwd }, (error, stdout, stderr) => {
            if (error) {
                // Check if command doesn't exist
                const commandNotFound = error.code === 'ENOENT' || 
                                       stderr.includes('command not found') || 
                                       stderr.includes('not recognized');
                
                // Get the actual exit code from the child process
                // @ts-ignore - error has these properties
                const exitCode = error.status !== undefined ? error.status : (commandNotFound ? 127 : 1);
                
                resolve({ 
                    stdout: stdout ? stdout.trim() : '', 
                    stderr: stderr ? stderr.trim() : error.message, 
                    exitCode,
                    commandNotFound
                });
            } else {
                resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0, commandNotFound: false });
            }
        });
    });
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
                resolve(stdout.trimEnd());
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
 * Config structure for .GIT_QUICKOPS_CONFIG
 */
interface GitQuickOpsConfig {
    commitPrefix?: string;
    requireTests?: 'disabled' | 'warn' | 'prevent';
    [key: string]: any;
}

/**
 * Read config from .GIT_QUICKOPS_CONFIG file
 */
export function getRepoConfig(gitRoot: string): GitQuickOpsConfig {
    const configFile = path.join(gitRoot, '.GIT_QUICKOPS_CONFIG');
    if (fs.existsSync(configFile)) {
        try {
            const content = fs.readFileSync(configFile, 'utf-8');
            return JSON.parse(content);
        } catch {
            return {};
        }
    }
    return {};
}

/**
 * Write config to .GIT_QUICKOPS_CONFIG file
 */
export function setRepoConfig(gitRoot: string, config: GitQuickOpsConfig): void {
    const configFile = path.join(gitRoot, '.GIT_QUICKOPS_CONFIG');
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Run tests in the repository
 * Returns true if tests pass or no tests found, false if tests fail
 */
export async function runTests(gitRoot: string): Promise<{ passed: boolean; noTests: boolean; error?: string }> {
    try {
        // Try common test commands in order
        const testCommands = [
            { cmd: 'pytest', args: ['-q'], noTestExitCodes: [5], name: 'pytest' },
            { cmd: 'npm', args: ['test'], noTestExitCodes: [], name: 'npm test' },
            { cmd: 'npm', args: ['run', 'test'], noTestExitCodes: [], name: 'npm run test' },
            { cmd: 'python', args: ['-m', 'pytest', '-q'], noTestExitCodes: [5], name: 'python -m pytest' },
            { cmd: 'python', args: ['-m', 'unittest', 'discover'], noTestExitCodes: [], name: 'python unittest' }
        ];

        let foundTestRunner = false;
        
        for (const testCmd of testCommands) {
            const result = await execCommand(gitRoot, testCmd.cmd, testCmd.args);
            
            // Skip if command doesn't exist
            if (result.commandNotFound) {
                continue;
            }
            
            // Check for missing Python modules (pytest not installed)
            if (result.stderr.includes('No module named pytest') || result.stderr.includes('ModuleNotFoundError')) {
                // Try to install pytest
                const pythonCmd = testCmd.cmd === 'pytest' ? 'python' : testCmd.cmd;
                const installResult = await execCommand(gitRoot, pythonCmd, ['-m', 'pip', 'install', 'pytest']);
                
                if (installResult.exitCode === 0) {
                    // Retry the test after installation
                    const retryResult = await execCommand(gitRoot, testCmd.cmd, testCmd.args);
                    
                    if (retryResult.exitCode === 0) {
                        return { passed: true, noTests: false };
                    }
                    
                    if (testCmd.noTestExitCodes.includes(retryResult.exitCode)) {
                        return { passed: true, noTests: true };
                    }
                    
                    const errorMsg = retryResult.stderr || retryResult.stdout || `Tests failed with exit code ${retryResult.exitCode}`;
                    return { passed: false, noTests: false, error: errorMsg };
                } else {
                    // Couldn't install pytest, try next test runner
                    continue;
                }
            }
            
            // Check if this is a configuration issue (e.g., no package.json for npm)
            const configErrors = [
                'Could not read package.json',
                'no such file or directory, open',
                'package.json',
                'Missing script',
                'cannot find module',
                'is not recognized as an internal or external command'
            ];
            
            if (configErrors.some(err => result.stderr.includes(err) || result.stdout.includes(err))) {
                // Test runner exists but project not configured for it - try next one
                continue;
            }
            
            // Command exists, so we found a test runner
            foundTestRunner = true;
            
            // Exit code 0 - tests passed
            if (result.exitCode === 0) {
                return { passed: true, noTests: false };
            }
            
            // Check exit code for "no tests found"
            if (testCmd.noTestExitCodes.includes(result.exitCode)) {
                // No tests found - treat as success
                return { passed: true, noTests: true };
            }
            
            // Tests exist but failed
            const errorMsg = result.stderr || result.stdout || `Tests failed with exit code ${result.exitCode}`;
            return { passed: false, noTests: false, error: errorMsg };
        }
        
        // No test runner found - allow commit but note it
        return { passed: true, noTests: !foundTestRunner };
    } catch (error) {
        // Unexpected error - allow commit
        return { passed: true, noTests: true };
    }
}

/**
 * Check if tests should be run before commit and handle accordingly
 * Returns true if commit can proceed, false if it should be blocked
 */
export async function checkTestsBeforeCommit(gitRoot: string): Promise<{ canProceed: boolean; message?: string }> {
    const config = getRepoConfig(gitRoot);
    const requireTests = config.requireTests || 'disabled';
    
    if (requireTests === 'disabled') {
        return { canProceed: true };
    }
    
    // Run tests
    const testResult = await runTests(gitRoot);
    
    if (testResult.noTests) {
        // No tests found - allow commit but inform user
        return { canProceed: true, message: 'No tests found in repository' };
    }
    
    if (testResult.passed) {
        return { canProceed: true, message: 'Tests passed successfully' };
    }
    
    // Tests failed
    if (requireTests === 'warn') {
        return { 
            canProceed: true, 
            message: `Warning: Tests failed - ${testResult.error || 'see output for details'}`
        };
    }
    
    // requireTests === 'prevent'
    return { 
        canProceed: false, 
        message: `Commit blocked: Tests failed - ${testResult.error || 'see output for details'}`
    };
}

/**
 * Get commit message prefix from config or repo file
 */
export async function getCommitPrefix(gitRoot: string): Promise<string> {
    // Priority order:
    // 1. .GIT_QUICKOPS_CONFIG file (new JSON format)
    // 2. .GIT_QUICKOPS_PREFIX file (backwards compatibility)
    // 3. .GIT_HELPER_PREFIX file (legacy support)
    // 4. GIT_QUICKOPS_PREFIX environment variable
    // 5. GIT_HELPER_PREFIX environment variable (legacy support)
    // 6. VS Code configuration setting
    
    // Check .GIT_QUICKOPS_CONFIG file
    const config = getRepoConfig(gitRoot);
    if (config.commitPrefix) {
        return config.commitPrefix;
    }
    
    // Check .GIT_QUICKOPS_PREFIX file (backwards compatibility)
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
    const vsConfig = vscode.workspace.getConfiguration('gitQuickOps');
    return vsConfig.get<string>('commitPrefix', '');
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
 * Get the processed commit prefix (with variables replaced)
 */
export async function getProcessedPrefix(gitRoot: string): Promise<string> {
    const prefix = await getCommitPrefix(gitRoot);
    if (!prefix) {
        return '';
    }
    
    const branch = await getCurrentBranch(gitRoot);
    const ticket = extractTicketFromBranch(branch);
    
    return prefix
        .replace(/\{\{branch\}\}/g, branch)
        .replace(/\{\{ticket\}\}/g, ticket);
}

/**
 * Process commit message prefix template
 */
export async function processCommitPrefix(gitRoot: string, message: string): Promise<string> {
    const processedPrefix = await getProcessedPrefix(gitRoot);
    if (!processedPrefix) {
        return message;
    }
    
    // If prefix ends with a space or message starts with a space, join directly
    // Otherwise add a space
    if (processedPrefix.endsWith(' ') || message.startsWith(' ')) {
        return processedPrefix + message;
    } else {
        return processedPrefix + ' ' + message;
    }
    
    return message;
}

/**
 * Get list of commits with format: hash - message and graph
 */
export async function getCommits(gitRoot: string, limit: number = 50, showAllBranches: boolean = false): Promise<Array<{hash: string, message: string, author: string, date: string, graph: string, graphRaw: string, refs: string, display: string, isMerge: boolean, graphCols: number}>> {
    try {
        // Use --graph with custom format to get proper graph lines
        // By default show only current branch (like VS Code default), use showAllBranches=true for all branches
        const branchArg = showAllBranches ? '--all' : 'HEAD';
        const output = await execGit(gitRoot, ['log', branchArg, '--graph', '--oneline', '--decorate', '--color=never', `--pretty=format:%h|%s|%an|%ar|%D|%P`, `-n${limit}`]);
        const lines = output.split('\n').filter(line => line);
        
        return lines.map((line, idx) => {
            // Extract graph characters (everything before the hash)
            const hashMatch = line.match(/([a-f0-9]{7,})\|/);
            if (!hashMatch) {
                return null;
            }
            
            const hashIndex = line.indexOf(hashMatch[0]);
            const graphRaw = line.substring(0, hashIndex);
            
            // Count graph columns (each column is 2 chars: a symbol and a space)
            const graphCols = Math.ceil(graphRaw.length / 2);
            
            // Find the current commit position (where the * is)
            const commitPosMatch = graphRaw.match(/(\*|o)/);
            const commitPos = commitPosMatch ? Math.floor(graphRaw.indexOf(commitPosMatch[0]) / 2) : 0;
            
            // Check for merge/branch indicators
            const hasBackslash = graphRaw.includes('\\');
            const hasSlash = graphRaw.includes('/');
            const isMerge = hasBackslash; // Line merges in
            const isBranch = hasSlash;    // Line branches out
            
            // Parse commit data
            const dataLine = line.substring(hashIndex).trim();
            const parts = dataLine.split('|');
            const hash = parts[0] || '';
            const message = parts[1] || '';
            const author = parts[2] || '';
            const date = parts[3] || '';
            const refs = parts[4] || '';
            const parents = (parts[5] || '').trim();
            
            // Detect merge commits (have multiple parents)
            const parentCount = parents.split(' ').filter(p => p).length;
            const isActualMerge = parentCount > 1;
            
            // Clean the graph: keep only the essential structure (for tree view label)
            const cleanGraph = graphRaw
                .replace(/\*/g, '●')  // Convert * to filled circle
                .replace(/o/g, '○')   // Convert o to hollow circle
                .replace(/\|/g, '│')  // Vertical line
                .replace(/\\/g, '╱')  // Merge line coming down
                .replace(/\//g, '╱')   // Branch line going up
                .replace(/_/g, '─');   // Horizontal line
            
            return {
                hash,
                message,
                author,
                date,
                refs,
                graph: cleanGraph,
                graphRaw,
                isMerge: isActualMerge,
                graphCols,
                display: `${hash} - ${message}`
            };
        })
        .filter(commit => commit !== null) as Array<{hash: string, message: string, author: string, date: string, graph: string, graphRaw: string, refs: string, display: string, isMerge: boolean, graphCols: number}>;
    } catch (error) {
        return [];
    }
}

/**
 * Get detailed commit information
 */
export async function getCommitDetails(gitRoot: string, commitHash: string): Promise<string> {
    try {
        return await execGit(gitRoot, ['show', '--stat', commitHash]);
    } catch (error) {
        throw new Error(`Failed to get commit details: ${error}`);
    }
}

/**
 * Rewrite history from a specific commit forward
 */
export async function rewriteHistoryFrom(gitRoot: string, commitHash: string): Promise<void> {
    try {
        // Interactive rebase from the parent of the specified commit
        await execGit(gitRoot, ['rebase', '-i', `${commitHash}^`]);
    } catch (error) {
        throw new Error(`Failed to start rebase: ${error}`);
    }
}

/**
 * Get all workspace folders that contain git repositories
 */
export async function getGitWorkspaceFolders(): Promise<Array<{folder: vscode.WorkspaceFolder, gitRoot: string}>> {
    const folders = vscode.workspace.workspaceFolders || [];
    const gitFolders: Array<{folder: vscode.WorkspaceFolder, gitRoot: string}> = [];
    
    for (const folder of folders) {
        try {
            const gitRoot = await getGitRoot(folder);
            gitFolders.push({ folder, gitRoot });
        } catch {
            // Not a git repo, skip
        }
    }
    
    return gitFolders;
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
