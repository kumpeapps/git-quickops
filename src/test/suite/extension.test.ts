import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Build Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('KumpeAppsLLC.git-quickops'));
    });

    test('Extension should activate', async () => {
        const ext = vscode.extensions.getExtension('KumpeAppsLLC.git-quickops');
        assert.ok(ext);
        await ext.activate();
        assert.strictEqual(ext.isActive, true);
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        
        const expectedCommands = [
            'git-quickops.refresh',
            'git-quickops.showMenu',
            'git-quickops.cmd.status',
            'git-quickops.cmd.add',
            'git-quickops.cmd.commit',
            'git-quickops.cmd.push',
            'git-quickops.cmd.pull',
            'git-quickops.cmd.fetch',
            'git-quickops.cmd.branchCreate',
            'git-quickops.cmd.branchSwitch',
            'git-quickops.cmd.merge'
        ];

        for (const command of expectedCommands) {
            assert.ok(
                commands.includes(command),
                `Command ${command} should be registered`
            );
        }
    });
});
