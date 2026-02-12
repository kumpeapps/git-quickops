import * as vscode from 'vscode';

export class MenuItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly commandId: string,
        public readonly description?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.command = {
            command: commandId,
            title: label
        };
        this.tooltip = description || label;
        this.contextValue = 'menuItem';
    }
}

export class MenuTreeProvider implements vscode.TreeDataProvider<MenuItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<MenuItem | undefined | null | void> = new vscode.EventEmitter<MenuItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<MenuItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: MenuItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: MenuItem): Promise<MenuItem[]> {
        if (!element) {
            // Root level - show main menu categories
            return [
                new MenuItem('$(symbol-event) Common Commands', 'git-quickops.common', 'Status, add, commit, push, pull'),
                new MenuItem('$(git-branch) Branch Management', 'git-quickops.branches', 'Create, switch, merge, delete branches'),
                new MenuItem('$(history) Commit History', 'git-quickops.history', 'View log, show commit, cherry-pick'),
                new MenuItem('$(trash) Cleanup', 'git-quickops.cleanup', 'Reset, clean, amend commits'),
                new MenuItem('$(archive) Stash', 'git-quickops.stash', 'Save, apply, list, drop stashes'),
                new MenuItem('$(tag) Tags', 'git-quickops.tags', 'Create, list, delete tags'),
                new MenuItem('$(cloud-upload) Remotes', 'git-quickops.remotes', 'Push, set upstream, manage remotes'),
                new MenuItem('$(tools) Utilities', 'git-quickops.utils', 'Restore files, unstage, add alias, set prefix'),
                new MenuItem('$(info) Status', 'git-quickops.status', 'Show git status'),
                new MenuItem('$(rocket) Add → Commit → Push', 'git-quickops.addCommitPush', 'Quick workflow shortcut')
            ];
        }
        return [];
    }
}
