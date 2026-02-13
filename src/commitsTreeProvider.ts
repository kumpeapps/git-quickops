import * as vscode from 'vscode';
import * as git from './gitUtils';
import { RepositoryContext } from './menuTreeProvider';

export class CommitTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly commitData?: any,
        icon?: string | vscode.ThemeIcon,
        description?: string
    ) {
        super(label, collapsibleState);
        
        if (icon) {
            this.iconPath = typeof icon === 'string' ? new vscode.ThemeIcon(icon) : icon;
        }
        
        this.tooltip = description || label;
        this.description = description;
    }
}

export class CommitsTreeProvider implements vscode.TreeDataProvider<CommitTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CommitTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<CommitTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<CommitTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor() {
        // Listen to repository changes
        RepositoryContext.onDidChangeRepo(() => this.refresh());
        
        // Auto-refresh to keep commits up to date
        setInterval(() => this.refresh(), 5000);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: CommitTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CommitTreeItem): Promise<CommitTreeItem[]> {
        if (element) {
            return [];
        }

        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            const commits = await git.getCommits(gitRoot, 50);
            
            if (commits.length === 0) {
                return [
                    new CommitTreeItem(
                        'No commits',
                        vscode.TreeItemCollapsibleState.None,
                        'noCommits',
                        undefined,
                        'info',
                        'No commits found'
                    )
                ];
            }
            
            // Create commit items with graph visualization
            return commits.map((commit, index) => {
                // Keep the original git graph characters for proper lineage display
                const label = commit.graph 
                    ? `${commit.graph} ${commit.message.substring(0, 50)}${commit.message.length > 50 ? '...' : ''}`
                    : commit.message.substring(0, 60);
                
                const item = new CommitTreeItem(
                    label,
                    vscode.TreeItemCollapsibleState.None,
                    'commitItem',
                    commit,
                    undefined,
                    `${commit.hash} - ${commit.message}\n${commit.author} - ${commit.date}`
                );
                
                // Set colored icon based on position
                const colors = ['charts.red', 'charts.blue', 'charts.yellow', 'charts.green', 'charts.purple', 'charts.orange'];
                const colorIndex = index % colors.length;
                item.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor(colors[colorIndex]));
                
                // Show author and date in description
                item.description = `${commit.author.split(' ')[0]} • ${commit.date}`;
                
                item.command = {
                    command: 'git-quickops.commit.view',
                    title: 'View Commit',
                    arguments: [{ itemData: commit }]
                };
                
                return item;
            });
            
        } catch (error) {
            return [
                new CommitTreeItem(
                    'No git repository',
                    vscode.TreeItemCollapsibleState.None,
                    'error',
                    undefined,
                    'warning',
                    'Open a git repository to see commits'
                )
            ];
        }
    }
}
