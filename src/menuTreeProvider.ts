import * as vscode from 'vscode';
import * as git from './gitUtils';
import * as path from 'path';

export enum MenuItemType {
    REPOSITORY = 'repository',
    BRANCH_SECTION = 'branchSection',
    CURRENT_BRANCH = 'currentBranch',
    BRANCH_ITEM = 'branchItem',
    CHANGES_SECTION = 'changesSection',
    STAGED_CHANGES = 'stagedChanges',
    UNSTAGED_CHANGES = 'unstagedChanges',
    FILE_CHANGE = 'fileChange',
    COMMITS_SECTION = 'commitsSection',
    COMMIT_ITEM = 'commitItem',
    REMOTES_SECTION = 'remotesSection',
    REMOTE_ITEM = 'remoteItem',
    STASHES_SECTION = 'stashesSection',
    STASH_ITEM = 'stashItem',
    TAGS_SECTION = 'tagsSection',
    TAG_ITEM = 'tagItem',
    OPERATIONS_SECTION = 'operationsSection',
    OPERATION_ITEM = 'operationItem',
    REPOSITORY_SELECTOR = 'repositorySelector'
}

export interface MenuItemData {
    type: MenuItemType;
    data?: any;
}

export class MenuItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: MenuItemType,
        public readonly itemData?: any,
        commandId?: string,
        icon?: string,
        description?: string
    ) {
        super(label, collapsibleState);
        
        if (commandId) {
            this.command = {
                command: commandId,
                title: label,
                arguments: [this]
            };
        }
        
        if (icon) {
            this.iconPath = new vscode.ThemeIcon(icon);
        }
        
        this.tooltip = description || label;
        this.contextValue = itemType;
        this.description = description;
    }
}

export class RepositoryContext {
    private static _selectedRepo: string | undefined;
    private static _onDidChangeRepo = new vscode.EventEmitter<string | undefined>();
    
    static readonly onDidChangeRepo = RepositoryContext._onDidChangeRepo.event;
    
    static get selectedRepo(): string | undefined {
        return this._selectedRepo;
    }
    
    static setSelectedRepo(repo: string | undefined) {
        this._selectedRepo = repo;
        this._onDidChangeRepo.fire(repo);
    }
    
    static async selectRepository(): Promise<string | undefined> {
        const gitFolders = await git.getGitWorkspaceFolders();
        
        if (gitFolders.length === 0) {
            vscode.window.showErrorMessage('No git repositories found in workspace');
            return undefined;
        }
        
        if (gitFolders.length === 1) {
            this._selectedRepo = gitFolders[0].gitRoot;
            return this._selectedRepo;
        }
        
        // Multiple repos - show picker
        const items = gitFolders.map(gf => ({
            label: path.basename(gf.gitRoot),
            description: gf.gitRoot,
            gitRoot: gf.gitRoot
        }));
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a git repository'
        });
        
        if (selected) {
            this._selectedRepo = selected.gitRoot;
            this._onDidChangeRepo.fire(this._selectedRepo);
        }
        
        return this._selectedRepo;
    }
    
    static async getGitRoot(): Promise<string> {
        if (this._selectedRepo) {
            return this._selectedRepo;
        }
        
        // Auto-select first repo if not already selected
        const gitFolders = await git.getGitWorkspaceFolders();
        if (gitFolders.length > 0) {
            this._selectedRepo = gitFolders[0].gitRoot;
            return this._selectedRepo;
        }
        
        throw new Error('No git repository found');
    }
}

export class MenuTreeProvider implements vscode.TreeDataProvider<MenuItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MenuItem | undefined | null | void> = new vscode.EventEmitter<MenuItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MenuItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {
        // Listen to repository changes and refresh tree
        RepositoryContext.onDidChangeRepo(() => this.refresh());
        
        // Auto-refresh every 2 seconds to keep commits and branches up to date
        setInterval(() => this.refresh(), 2000);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MenuItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: MenuItem): Promise<MenuItem[]> {
        try {
            if (!element) {
                return await this.getRootItems();
            }

            switch (element.itemType) {
                case MenuItemType.REPOSITORY:
                    return [];
                case MenuItemType.BRANCH_SECTION:
                    return await this.getBranchItems();
                case MenuItemType.CHANGES_SECTION:
                    return await this.getChangesItems();
                case MenuItemType.COMMITS_SECTION:
                    return await this.getCommitItems();
                case MenuItemType.REMOTES_SECTION:
                    return await this.getRemoteItems();
                case MenuItemType.STASHES_SECTION:
                    return await this.getStashItems();
                case MenuItemType.TAGS_SECTION:
                    return await this.getTagItems();
                case MenuItemType.OPERATIONS_SECTION:
                    return await this.getOperationItems();
                case MenuItemType.STAGED_CHANGES:
                    return await this.getStagedFiles();
                case MenuItemType.UNSTAGED_CHANGES:
                    return await this.getUnstagedFiles();
                default:
                    return [];
            }
        } catch (error) {
            return [
                new MenuItem(
                    `Error: ${error}`,
                    vscode.TreeItemCollapsibleState.None,
                    MenuItemType.OPERATION_ITEM,
                    undefined,
                    undefined,
                    'error'
                )
            ];
        }
    }

    private async getRootItems(): Promise<MenuItem[]> {
        const items: MenuItem[] = [];
        
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            const gitFolders = await git.getGitWorkspaceFolders();
            
            // Repository selector (always show at top if multiple repos)
            if (gitFolders.length > 1) {
                const repoName = path.basename(gitRoot);
                items.push(
                    new MenuItem(
                        `Repository: ${repoName}`,
                        vscode.TreeItemCollapsibleState.None,
                        MenuItemType.REPOSITORY_SELECTOR,
                        gitRoot,
                        'git-quickops.selectRepository',
                        'repo',
                        `Switch repository (${gitFolders.length} available)`
                    )
                );
            }
            
            // Changes section (like SCM) - always at top
            const status = await git.getStatus(gitRoot);
            const changeCount = status.split('\n').filter(l => l.trim()).length;
            items.push(
                new MenuItem(
                    'Changes',
                    vscode.TreeItemCollapsibleState.Expanded,
                    MenuItemType.CHANGES_SECTION,
                    undefined,
                    undefined,
                    'source-control',
                    `${changeCount} changes`
                )
            );
            
            // Commit history section (like Git Graph) - shows branch and commits
            const currentBranch = await git.getCurrentBranch(gitRoot);
            items.push(
                new MenuItem(
                    currentBranch,
                    vscode.TreeItemCollapsibleState.Expanded,
                    MenuItemType.COMMITS_SECTION,
                    currentBranch,
                    undefined,
                    'git-branch',
                    'Current branch - click commits for options'
                )
            );
            
            // Additional sections collapsed by default
            const branches = await git.getBranches(gitRoot, false);
            items.push(
                new MenuItem(
                    'Branches',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    MenuItemType.BRANCH_SECTION,
                    undefined,
                    undefined,
                    'git-branch',
                    `${branches.length} branches`
                )
            );
            
            const stashes = await git.getStashes(gitRoot);
            items.push(
                new MenuItem(
                    'Stashes',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    MenuItemType.STASHES_SECTION,
                    undefined,
                    undefined,
                    'archive',
                    `${stashes.length} stashes`
                )
            );
            
            items.push(
                new MenuItem(
                    'Remotes',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    MenuItemType.REMOTES_SECTION,
                    undefined,
                    undefined,
                    'cloud',
                    'Remote repositories'
                )
            );
            
            items.push(
                new MenuItem(
                    'Tags',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    MenuItemType.TAGS_SECTION,
                    undefined,
                    undefined,
                    'tag',
                    'Manage tags'
                )
            );
            
        } catch (error) {
            items.push(
                new MenuItem(
                    'No Git Repository',
                    vscode.TreeItemCollapsibleState.None,
                    MenuItemType.OPERATION_ITEM,
                    undefined,
                    undefined,
                    'warning',
                    'Open a git repository to use Git QuickOps'
                )
            );
        }
        
        return items;
    }

    private async getBranchItems(): Promise<MenuItem[]> {
        const gitRoot = await RepositoryContext.getGitRoot();
        const branches = await git.getBranches(gitRoot, false);
        const currentBranch = await git.getCurrentBranch(gitRoot);
        
        return branches.map(branch => {
            const isCurrent = branch === currentBranch;
            return new MenuItem(
                branch,
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.BRANCH_ITEM,
                branch,
                isCurrent ? undefined : 'git-quickops.branch.switch',
                isCurrent ? 'check' : 'git-branch',
                isCurrent ? 'Current branch' : 'Click to switch'
            );
        });
    }

    private async getChangesItems(): Promise<MenuItem[]> {
        const gitRoot = await RepositoryContext.getGitRoot();
        const status = await git.getStatus(gitRoot);
        
        if (!status.trim()) {
            return [
                new MenuItem(
                    'No changes',
                    vscode.TreeItemCollapsibleState.None,
                    MenuItemType.OPERATION_ITEM,
                    undefined,
                    undefined,
                    'check',
                    'Working tree clean'
                )
            ];
        }
        
        const items: MenuItem[] = [];
        const lines = status.split('\n').filter(l => l.trim());
        const stagedCount = lines.filter(l => l[0] !== ' ' && l[0] !== '?').length;
        const unstagedCount = lines.filter(l => l[1] !== ' ' || l[0] === '?').length;
        
        if (stagedCount > 0) {
            items.push(
                new MenuItem(
                    'Staged Changes',
                    vscode.TreeItemCollapsibleState.Expanded,
                    MenuItemType.STAGED_CHANGES,
                    undefined,
                    undefined,
                    'add',
                    `${stagedCount} staged files`
                )
            );
        }
        
        if (unstagedCount > 0) {
            items.push(
                new MenuItem(
                    'Unstaged Changes',
                    vscode.TreeItemCollapsibleState.Expanded,
                    MenuItemType.UNSTAGED_CHANGES,
                    undefined,
                    undefined,
                    'diff',
                    `${unstagedCount} unstaged files`
                )
            );
        }
        
        return items;
    }

    private async getStagedFiles(): Promise<MenuItem[]> {
        const gitRoot = await RepositoryContext.getGitRoot();
        const status = await git.getStatus(gitRoot);
        
        return status.split('\n')
            .filter(l => l.trim() && l[0] !== ' ' && l[0] !== '?')
            .map(line => {
                const statusCode = line.substring(0, 2);
                const filePath = line.substring(3);
                const icon = this.getFileIcon(statusCode[0]);
                
                const item = new MenuItem(
                    path.basename(filePath),
                    vscode.TreeItemCollapsibleState.None,
                    MenuItemType.FILE_CHANGE,
                    { path: filePath, staged: true, status: statusCode },
                    'git-quickops.file.openDiff',
                    icon,
                    filePath
                );
                
                // Add inline button to unstage
                item.resourceUri = vscode.Uri.file(path.join(gitRoot, filePath));
                
                return item;
            });
    }

    private async getUnstagedFiles(): Promise<MenuItem[]> {
        const gitRoot = await RepositoryContext.getGitRoot();
        const status = await git.getStatus(gitRoot);
        
        return status.split('\n')
            .filter(l => l.trim() && (l[1] !== ' ' || l[0] === '?'))
            .map(line => {
                const statusCode = line.substring(0, 2);
                const filePath = line.substring(3);
                const icon = this.getFileIcon(statusCode[1] || statusCode[0]);
                
                const item = new MenuItem(
                    path.basename(filePath),
                    vscode.TreeItemCollapsibleState.None,
                    MenuItemType.FILE_CHANGE,
                    { path: filePath, staged: false, status: statusCode },
                    'git-quickops.file.openDiff',
                    icon,
                    filePath
                );
                
                // Add inline button to stage
                item.resourceUri = vscode.Uri.file(path.join(gitRoot, filePath));
                
                return item;
            });
    }

    private getFileIcon(status: string): string {
        switch (status) {
            case 'M': return 'diff-modified';
            case 'A': return 'diff-added';
            case 'D': return 'diff-removed';
            case 'R': return 'diff-renamed';
            case '?': return 'question';
            default: return 'file';
        }
    }

    private async getCommitItems(): Promise<MenuItem[]> {
        const gitRoot = await RepositoryContext.getGitRoot();
        const commits = await git.getCommits(gitRoot, 50);
        
        if (commits.length === 0) {
            return [
                new MenuItem(
                    'No commits',
                    vscode.TreeItemCollapsibleState.None,
                    MenuItemType.OPERATION_ITEM,
                    undefined,
                    undefined,
                    'info',
                    'No commits found'
                )
            ];
        }
        
        // Display commits like in Git Graph - with message and metadata
        return commits.map((commit, index) => {
            const isFirst = index === 0;
            const icon = isFirst ? 'circle-filled' : 'circle-outline';
            
            return new MenuItem(
                commit.message,
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.COMMIT_ITEM,
                commit,
                'git-quickops.commit.view',
                icon,
                `${commit.hash} - ${commit.author} - ${commit.date}`
            );
        });
    }

    private async getRemoteItems(): Promise<MenuItem[]> {
        const gitRoot = await RepositoryContext.getGitRoot();
        const remotes = await git.getRemotes(gitRoot);
        
        if (remotes.length === 0) {
            return [
                new MenuItem(
                    'No remotes',
                    vscode.TreeItemCollapsibleState.None,
                    MenuItemType.OPERATION_ITEM,
                    undefined,
                    'git-quickops.remote.add',
                    'info',
                    'Click to add a remote'
                )
            ];
        }
        
        return remotes.map(remote => 
            new MenuItem(
                remote,
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.REMOTE_ITEM,
                remote,
                undefined,
                'cloud',
                `Remote: ${remote}`
            )
        );
    }

    private async getStashItems(): Promise<MenuItem[]> {
        const gitRoot = await RepositoryContext.getGitRoot();
        const stashes = await git.getStashes(gitRoot);
        
        if (stashes.length === 0) {
            return [
                new MenuItem(
                    'No stashes',
                    vscode.TreeItemCollapsibleState.None,
                    MenuItemType.OPERATION_ITEM,
                    undefined,
                    'git-quickops.cmd.stashSave',
                    'info',
                    'Click to create a stash'
                )
            ];
        }
        
        return stashes.map((stash, index) => 
            new MenuItem(
                stash,
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.STASH_ITEM,
                { stash, index },
                'git-quickops.stash.view',
                'archive',
                stash
            )
        );
    }

    private async getTagItems(): Promise<MenuItem[]> {
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            const tagsOutput = await git.execGit(gitRoot, ['tag', '-l']);
            const tags = tagsOutput.split('\n').filter(t => t.trim());
            
            if (tags.length === 0) {
                return [
                    new MenuItem(
                        'No tags',
                        vscode.TreeItemCollapsibleState.None,
                        MenuItemType.OPERATION_ITEM,
                        undefined,
                        'git-quickops.cmd.tagCreate',
                        'info',
                        'Click to create a tag'
                    )
                ];
            }
            
            return tags.map(tag => 
                new MenuItem(
                    tag,
                    vscode.TreeItemCollapsibleState.None,
                    MenuItemType.TAG_ITEM,
                    tag,
                    undefined,
                    'tag',
                    `Tag: ${tag}`
                )
            );
        } catch {
            return [];
        }
    }

    private async getOperationItems(): Promise<MenuItem[]> {
        return [
            new MenuItem(
                'Commit All Changes',
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.OPERATION_ITEM,
                undefined,
                'git-quickops.cmd.addCommitPush',
                'rocket',
                'Add, Commit, and Push'
            ),
            new MenuItem(
                'Pull',
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.OPERATION_ITEM,
                undefined,
                'git-quickops.cmd.pull',
                'cloud-download',
                'Pull from remote'
            ),
            new MenuItem(
                'Push',
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.OPERATION_ITEM,
                undefined,
                'git-quickops.cmd.push',
                'cloud-upload',
                'Push to remote'
            ),
            new MenuItem(
                'Fetch',
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.OPERATION_ITEM,
                undefined,
                'git-quickops.cmd.fetch',
                'sync',
                'Fetch from remote'
            ),
            new MenuItem(
                'Create Branch',
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.OPERATION_ITEM,
                undefined,
                'git-quickops.cmd.branchCreate',
                'add',
                'Create a new branch'
            ),
            new MenuItem(
                'Merge Branch',
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.OPERATION_ITEM,
                undefined,
                'git-quickops.cmd.merge',
                'git-merge',
                'Merge another branch'
            ),
            new MenuItem(
                'View Status',
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.OPERATION_ITEM,
                undefined,
                'git-quickops.cmd.status',
                'info',
                'Show git status'
            ),
            new MenuItem(
                'View Log',
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.OPERATION_ITEM,
                undefined,
                'git-quickops.cmd.log',
                'history',
                'Show commit log'
            ),
            new MenuItem(
                'Rewrite History',
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.OPERATION_ITEM,
                undefined,
                'git-quickops.cmd.historyRewriteToSingle',
                'git-commit',
                'Squash commits to single'
            ),
            new MenuItem(
                'Cleanup Branches',
                vscode.TreeItemCollapsibleState.None,
                MenuItemType.OPERATION_ITEM,
                undefined,
                'git-quickops.cmd.cleanupDeleteMerged',
                'trash',
                'Delete merged branches'
            )
        ];
    }
}
