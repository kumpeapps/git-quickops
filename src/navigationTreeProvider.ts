import * as vscode from 'vscode';
import * as git from './gitUtils';
import * as path from 'path';
import { RepositoryContext } from './menuTreeProvider';

export class NavigationTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        icon?: string | vscode.ThemeIcon,
        description?: string,
        command?: vscode.Command
    ) {
        super(label, collapsibleState);
        
        if (icon) {
            this.iconPath = typeof icon === 'string' ? new vscode.ThemeIcon(icon) : icon;
        }
        
        this.tooltip = description || label;
        this.description = description;
        
        if (command) {
            this.command = command;
        }
    }
}

export class NavigationTreeProvider implements vscode.TreeDataProvider<NavigationTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<NavigationTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<NavigationTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<NavigationTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor() {
        // Listen to repository changes
        RepositoryContext.onDidChangeRepo(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: NavigationTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: NavigationTreeItem): Promise<NavigationTreeItem[]> {
        if (element) {
            return [];
        }

        try {
            const gitRoot = await RepositoryContext.getGitRoot();
            const gitFolders = await git.getGitWorkspaceFolders();
            const items: NavigationTreeItem[] = [];
            
            // Repository selector
            const repoName = path.basename(gitRoot);
            const repoSelector = new NavigationTreeItem(
                `📁 ${repoName}`,
                vscode.TreeItemCollapsibleState.None,
                'repositorySelector',
                'database',
                gitFolders.length > 1 ? `Click to switch repository (${gitFolders.length} available)` : gitRoot
            );
            if (gitFolders.length > 1) {
                repoSelector.command = {
                    command: 'git-quickops.selectRepository',
                    title: 'Select Repository'
                };
            }
            items.push(repoSelector);
            
            // Extended menu button
            const menuButton = new NavigationTreeItem(
                '☰ Extended Menu',
                vscode.TreeItemCollapsibleState.None,
                'menuButton',
                'menu',
                'Open Git QuickOps extended menu',
                {
                    command: 'git-quickops.showMenu',
                    title: 'Show Menu'
                }
            );
            items.push(menuButton);
            
            return items;
            
        } catch (error) {
            return [
                new NavigationTreeItem(
                    'No git repository',
                    vscode.TreeItemCollapsibleState.None,
                    'error',
                    'warning',
                    'Open a git repository'
                )
            ];
        }
    }
}
