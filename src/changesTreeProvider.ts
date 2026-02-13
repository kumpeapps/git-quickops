import * as vscode from 'vscode';
import * as git from './gitUtils';
import * as path from 'path';
import { RepositoryContext } from './menuTreeProvider';

export class ChangesTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly resourceUri?: vscode.Uri,
        public readonly fileData?: any,
        icon?: string | vscode.ThemeIcon,
        description?: string
    ) {
        super(label, collapsibleState);
        
        if (icon) {
            this.iconPath = typeof icon === 'string' ? new vscode.ThemeIcon(icon) : icon;
        }
        
        this.tooltip = description || label;
        this.description = description;
        
        if (resourceUri) {
            this.resourceUri = resourceUri;
        }
    }
}

export class ChangesTreeProvider implements vscode.TreeDataProvider<ChangesTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ChangesTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<ChangesTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ChangesTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor() {
        // Listen to repository changes
        RepositoryContext.onDidChangeRepo(() => this.refresh());
        
        // Auto-refresh to keep changes up to date
        setInterval(() => this.refresh(), 2000);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ChangesTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ChangesTreeItem): Promise<ChangesTreeItem[]> {
        try {
            if (!element) {
                return await this.getRootItems();
            }

            // Handle children of sections
            if (element.contextValue === 'stagedChanges') {
                return await this.getStagedFiles();
            } else if (element.contextValue === 'unstagedChanges') {
                return await this.getUnstagedFiles();
            }

            return [];
        } catch (error) {
            return [
                new ChangesTreeItem(
                    'No git repository',
                    vscode.TreeItemCollapsibleState.None,
                    'error',
                    undefined,
                    undefined,
                    'warning',
                    'Open a git repository to see changes'
                )
            ];
        }
    }

    private async getRootItems(): Promise<ChangesTreeItem[]> {
        const items: ChangesTreeItem[] = [];
        
        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            
            const status = await git.getStatus(gitRoot);
            
            if (!status.trim()) {
                return [
                    new ChangesTreeItem(
                        'No changes',
                        vscode.TreeItemCollapsibleState.None,
                        'noChanges',
                        undefined,
                        undefined,
                        'check',
                        'Working tree clean'
                    )
                ];
            }
            
            const lines = status.split('\n').filter(l => l.trim());
            const stagedFiles = lines.filter(l => l[0] !== ' ' && l[0] !== '?');
            const unstagedFiles = lines.filter(l => l[1] !== ' ' || l[0] === '?');
            
            // Staged changes section
            if (stagedFiles.length > 0) {
                items.push(
                    new ChangesTreeItem(
                        'Staged Changes',
                        vscode.TreeItemCollapsibleState.Expanded,
                        'stagedChanges',
                        undefined,
                        undefined,
                        'cloud-upload',
                        `${stagedFiles.length} file${stagedFiles.length !== 1 ? 's' : ''}`
                    )
                );
            }
            
            // Unstaged changes section
            if (unstagedFiles.length > 0) {
                items.push(
                    new ChangesTreeItem(
                        'Changes',
                        vscode.TreeItemCollapsibleState.Expanded,
                        'unstagedChanges',
                        undefined,
                        undefined,
                        'diff',
                        `${unstagedFiles.length} file${unstagedFiles.length !== 1 ? 's' : ''}`
                    )
                );
            }
            
        } catch (error) {
            // No git repo
        }
        
        return items;
    }

    private async getStagedFiles(): Promise<ChangesTreeItem[]> {
        const gitRoot = await RepositoryContext.getGitRoot();
        const status = await git.getStatus(gitRoot);
        
        return status.split('\n')
            .filter(l => l.length > 3 && l[0] !== ' ' && l[0] !== '?')
            .map(line => {
                // Git status format: XY filename where X=index, Y=worktree
                // Staged files have non-space in first position
                const statusChar = line.charAt(0);
                const filePath = line.slice(3);
                const icon = this.getFileIcon(statusChar);
                const fileUri = vscode.Uri.file(path.join(gitRoot, filePath));
                
                const item = new ChangesTreeItem(
                    filePath,
                    vscode.TreeItemCollapsibleState.None,
                    'stagedFile',
                    fileUri,
                    { path: filePath, staged: true, status: statusChar },
                    icon,
                    filePath
                );
                
                item.command = {
                    command: 'git-quickops.file.openDiff',
                    title: 'Open Diff',
                    arguments: [{ itemData: item.fileData }]
                };
                
                return item;
            });
    }

    private async getUnstagedFiles(): Promise<ChangesTreeItem[]> {
        const gitRoot = await RepositoryContext.getGitRoot();
        const status = await git.getStatus(gitRoot);
        
        return status.split('\n')
            .filter(l => l.length > 3 && (l[1] !== ' ' || l[0] === '?'))
            .map(line => {
                // Unstaged files have non-space in second position or ? in first
                const statusChar = line.charAt(1) !== ' ' ? line.charAt(1) : line.charAt(0);
                const filePath = line.slice(3);
                const icon = this.getFileIcon(statusChar);
                const fileUri = vscode.Uri.file(path.join(gitRoot, filePath));
                
                const item = new ChangesTreeItem(
                    filePath,
                    vscode.TreeItemCollapsibleState.None,
                    'unstagedFile',
                    fileUri,
                    { path: filePath, staged: false, status: statusChar },
                    icon,
                    filePath
                );
                
                item.command = {
                    command: 'git-quickops.file.openDiff',
                    title: 'Open Diff',
                    arguments: [{ itemData: item.fileData }]
                };
                
                return item;
            });
    }

    private getFileIcon(status: string): string {
        switch (status) {
            case 'M': return 'diff-modified';
            case 'A': return 'diff-added';
            case 'D': return 'diff-removed';
            case 'R': return 'diff-renamed';
            case '?': return 'diff-added';
            case 'C': return 'diff-modified';
            default: return 'file';
        }
    }
}
